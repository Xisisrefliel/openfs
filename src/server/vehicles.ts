/* ------------------------------------------------------------------ */
/* Vehicles (Fahrzeuge) — DB access + validation.                      */
/* The HTTP wrappers live in routes.ts (vehicleRoutes).                 */
/* ------------------------------------------------------------------ */

import type { Database } from "./sqlite";

import { archiveRow } from "./archive";
import { ValidationError } from "./engine";

export type VehicleStatus = "aktiv" | "wartung";

export type VehicleDetail = {
  label: string;
  value: string;
};

export type Vehicle = {
  id: number;
  model: string;
  plate: string;
  klass: string;
  status: VehicleStatus;
  accent: string;
  details: VehicleDetail[];
};

const UNASSIGNED_VEHICLE = "Nicht zugeteilt";

export type VehicleInput = Omit<Vehicle, "id">;

type VehicleRow = {
  id: number;
  model: string;
  plate: string;
  klass: string;
  status: VehicleStatus;
  accent: string;
  details: string;
};

const DETAIL_LABELS = [
  "Getriebe",
  "Kraftstoff",
  "Kilometerstand",
  "Fahrlehrer/in",
  "Nächste HU",
  "Versicherung",
] as const;

const BASE_DETAILS: VehicleDetail[] = [
  { label: "Getriebe", value: "" },
  { label: "Kraftstoff", value: "" },
  { label: "Kilometerstand", value: "" },
  { label: "Fahrlehrer/in", value: "Nicht zugeteilt" },
  { label: "Nächste HU", value: "" },
  { label: "Versicherung", value: "" },
];

function parseDetails(raw: string): VehicleDetail[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return BASE_DETAILS;
    const next = new Map<string, string>(
      parsed
        .filter(
          item =>
            item !== null &&
            typeof item === "object" &&
            "label" in item &&
            "value" in item
        )
        .map(item => [
          String((item as { label: unknown }).label).trim(),
          String((item as { value: unknown }).value).trim(),
        ])
    );
    return DETAIL_LABELS.map(label => ({
      label,
      value: next.get(label) ?? "",
    }));
  } catch {
    return BASE_DETAILS;
  }
}

const toVehicle = (row: VehicleRow): Vehicle => ({
  id: row.id,
  model: row.model,
  plate: row.plate,
  klass: row.klass,
  status: row.status,
  accent: row.accent,
  details: parseDetails(row.details),
});

const SELECT =
  "SELECT id, model, plate, klass, status, accent, details FROM vehicles";

export function listVehicles(db: Database): Vehicle[] {
  return db
    .query<VehicleRow, []>(`${SELECT} ORDER BY model`)
    .all()
    .map(toVehicle);
}

export function getVehicle(db: Database, id: number): Vehicle {
  const row = db.query<VehicleRow, [number]>(`${SELECT} WHERE id = ?`).get(id);
  if (!row) throw new ValidationError("Fahrzeug nicht gefunden.");
  return toVehicle(row);
}

export function listVehicleModels(db: Database): string[] {
  return db
    .query<{ model: string }, []>("SELECT DISTINCT model FROM vehicles ORDER BY model")
    .all()
    .map(row => row.model)
    .filter(Boolean);
}

function normalizeStatus(value: unknown): VehicleStatus {
  if (value === undefined) return "aktiv";
  if (value !== "aktiv" && value !== "wartung") {
    throw new ValidationError("Status muss 'aktiv' oder 'wartung' sein.");
  }
  return value;
}

function normalizeDetails(
  value: unknown,
  current: VehicleDetail[]
): VehicleDetail[] {
  if (value === undefined) return current;
  if (!Array.isArray(value)) {
    throw new ValidationError("Feld 'details' muss eine Liste sein.");
  }
  const next = new Map<string, string>();
  for (const row of value) {
    if (!row || typeof row !== "object") {
      throw new ValidationError("Feld 'details' enthält ungültige Einträge.");
    }
    const hasLabel = "label" in row && "value" in row;
    if (!hasLabel) {
      throw new ValidationError("Feld 'details' enthält ungültige Einträge.");
    }
    const label = String((row as { label: unknown }).label).trim();
    const detailValue = String((row as { value: unknown }).value).trim();
    next.set(label, detailValue);
  }
  return DETAIL_LABELS.map(label => ({ label, value: next.get(label) ?? "" }));
}

/* Merge partial payload over current values, trimming strings and applying
   minimal validation rules. */
type VehicleTextKey = "model" | "plate" | "klass" | "accent";
function normalize(input: Partial<VehicleInput>, current: Vehicle): Vehicle {
  const str = (key: VehicleTextKey): string => {
    const value = input[key as keyof VehicleInput];
    if (value === undefined) {
      const cur = current[key as keyof Omit<Vehicle, "id">];
      return Array.isArray(cur) ? "" : String(cur);
    }
    if (typeof value !== "string") {
      throw new ValidationError(`Feld '${key}' muss ein Text sein.`);
    }
    return value.trim();
  };

  const next: Vehicle = {
    id: current.id,
    model: str("model"),
    plate: str("plate"),
    klass: str("klass"),
    status: current.status,
    accent: str("accent"),
    details: current.details,
  };

  if (input.status !== undefined) {
    next.status = normalizeStatus(input.status);
  }

  next.details = normalizeDetails(
    input.details,
    current.details
  );

  if (!next.model) {
    throw new ValidationError("Modell ist ein Pflichtfeld.");
  }
  if (!next.plate) {
    throw new ValidationError("Kennzeichen ist ein Pflichtfeld.");
  }
  if (!next.klass) {
    throw new ValidationError("Klasse ist ein Pflichtfeld.");
  }

  return next;
}

const EMPTY: Omit<Vehicle, "id"> = {
  model: "",
  plate: "",
  klass: "",
  status: "aktiv",
  accent: "bg-slate-500/10 text-slate-600",
  details: BASE_DETAILS,
};

function guardUnique<T>(write: () => T): T {
  try {
    return write();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("UNIQUE") ||
        error.message.includes("unique constraint"))
    ) {
      throw new ValidationError("Kennzeichen ist bereits vergeben.");
    }
    throw error;
  }
}

function toJson(details: VehicleDetail[]) {
  return JSON.stringify(details);
}

export function createVehicle(
  db: Database,
  input: Partial<VehicleInput>
): Vehicle {
  const data = normalize(input, { ...EMPTY, id: 0 });
  const row = guardUnique(() =>
    db
      .query<{ id: number }, [string, string, string, string, string, string]>(
        `INSERT INTO vehicles (model, plate, klass, status, accent, details)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
      )
      .get(
        data.model,
        data.plate,
        data.klass,
        data.status,
        data.accent,
        toJson(data.details)
      )
  )!;
  return getVehicle(db, row.id);
}

export function updateVehicle(
  db: Database,
  id: number,
  input: Partial<VehicleInput>
): Vehicle {
  const current = getVehicle(db, id);
  const data = normalize(input, current);
  const write = db.transaction(() => {
    db.prepare(
      `UPDATE vehicles
       SET model = ?, plate = ?, klass = ?, status = ?, accent = ?, details = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      data.model,
      data.plate,
      data.klass,
      data.status,
      data.accent,
      toJson(data.details),
      id
    );
    // Students, instructors and Termine reference vehicles by model — a
    // model rename must follow, but only when no fleet mate still
    // carries the old model (their references stay valid).
    if (data.model !== current.model && current.model) {
      const sameModel = db
        .query<{ n: number }, [string]>(
          "SELECT count(*) AS n FROM vehicles WHERE model = ?"
        )
        .get(current.model)!.n;
      if (sameModel === 0) {
        db.prepare("UPDATE students SET vehicle = ? WHERE vehicle = ?").run(
          data.model,
          current.model
        );
        db.prepare(
          "UPDATE instructors SET vehicle = ? WHERE vehicle = ?"
        ).run(data.model, current.model);
        db.prepare(
          "UPDATE calendar_events SET vehicle = ? WHERE vehicle = ?"
        ).run(data.model, current.model);
      }
    }
  });
  guardUnique(write);
  return getVehicle(db, id);
}

export function deleteVehicle(db: Database, id: number): void {
  const vehicle = getVehicle(db, id);
  const remove = db.transaction(() => {
    // Remember who was assigned so a restore can re-link them.
    const byModel = (table: string) =>
      db
        .query<{ id: number }, [string]>(
          `SELECT id FROM ${table} WHERE vehicle = ?`
        )
        .all(vehicle.model)
        .map(row => row.id);
    // Only sever references when this is the LAST vehicle of its model —
    // fleet mates with the same model keep the assignments valid.
    const lastOfModel =
      db
        .query<{ n: number }, [string, number]>(
          "SELECT count(*) AS n FROM vehicles WHERE model = ? AND id != ?"
        )
        .get(vehicle.model, id)!.n === 0;
    archiveRow(db, "vehicle", id, `${vehicle.model} · ${vehicle.plate}`, {
      students: lastOfModel ? byModel("students") : [],
      instructors: lastOfModel ? byModel("instructors") : [],
      calendarEvents: lastOfModel ? byModel("calendar_events") : [],
    });
    if (lastOfModel) {
      db.prepare("UPDATE students SET vehicle = ? WHERE vehicle = ?").run(
        UNASSIGNED_VEHICLE,
        vehicle.model
      );
      db.prepare("UPDATE instructors SET vehicle = ? WHERE vehicle = ?").run(
        UNASSIGNED_VEHICLE,
        vehicle.model
      );
      // Events treat '' as "no vehicle" (optional field).
      db.prepare(
        "UPDATE calendar_events SET vehicle = '' WHERE vehicle = ?"
      ).run(vehicle.model);
    }
    db.prepare("DELETE FROM vehicles WHERE id = ?").run(id);
  });
  remove();
}
