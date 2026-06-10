/* ------------------------------------------------------------------ */
/* Calendar events (Termine) — DB access + validation.                 */
/* The HTTP wrappers live in routes.ts (calendarEventRoutes).          */
/* ------------------------------------------------------------------ */

import type { Database } from "bun:sqlite";

import { archiveRow } from "./archive";
import { ValidationError } from "./engine";

export type CalendarEventType =
  | "Praktisch"
  | "Theorie"
  | "Vorstellung zur prakt. Prüfung"
  | "Theorieprüfung"
  | "Andere";

const EVENT_TYPES: CalendarEventType[] = [
  "Praktisch",
  "Theorie",
  "Vorstellung zur prakt. Prüfung",
  "Theorieprüfung",
  "Andere",
];

/* The wire shape matches CalEvent in src/lib/calendar-data.ts: id is a
   string, and the optional fields are omitted when empty/false. */
export type CalendarEvent = {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  subtitle?: string;
  location?: string;
  instructor: string;
  vehicle?: string;
  type: CalendarEventType;
  tentative?: boolean;
};

export type CalendarEventInput = Omit<CalendarEvent, "id">;

type CalendarEventRow = {
  id: number;
  date: string;
  start: string;
  end: string;
  title: string;
  subtitle: string;
  location: string;
  instructor: string;
  vehicle: string;
  type: CalendarEventType;
  tentative: number;
};

const toEvent = (row: CalendarEventRow): CalendarEvent => {
  const event: CalendarEvent = {
    id: String(row.id),
    date: row.date,
    start: row.start,
    end: row.end,
    title: row.title,
    instructor: row.instructor,
    type: row.type,
  };
  if (row.subtitle) event.subtitle = row.subtitle;
  if (row.location) event.location = row.location;
  if (row.vehicle) event.vehicle = row.vehicle;
  if (row.tentative) event.tentative = true;
  return event;
};

const SELECT =
  'SELECT id, date, start, "end", title, subtitle, location, instructor, vehicle, type, tentative FROM calendar_events';

export function listCalendarEvents(
  db: Database,
  filter?: { from?: string; to?: string }
): CalendarEvent[] {
  const clauses: string[] = [];
  const params: string[] = [];
  if (filter?.from) {
    clauses.push("date >= ?");
    params.push(filter.from);
  }
  if (filter?.to) {
    clauses.push("date <= ?");
    params.push(filter.to);
  }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  return db
    .query<CalendarEventRow, string[]>(
      `${SELECT}${where} ORDER BY date, start`
    )
    .all(...params)
    .map(toEvent);
}

export function getCalendarEvent(db: Database, id: number): CalendarEvent {
  const row = db
    .query<CalendarEventRow, [number]>(`${SELECT} WHERE id = ?`)
    .get(id);
  if (!row) throw new ValidationError("Termin nicht gefunden.");
  return toEvent(row);
}

const toMinutes = (value: string): number => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};

const EMPTY: CalendarEventInput = {
  date: "",
  start: "",
  end: "",
  title: "",
  subtitle: "",
  location: "",
  instructor: "Nicht zugeteilt",
  vehicle: "",
  type: "Praktisch",
  tentative: false,
};

/* Merge a partial payload over current values, trimming strings and
   applying the validation rules shared by create and update. */
function normalize(
  input: Partial<CalendarEventInput>,
  current: CalendarEventInput
): CalendarEventInput {
  const str = (key: keyof CalendarEventInput, fallback: string): string => {
    const value = input[key];
    if (value === undefined) return fallback;
    if (typeof value !== "string") {
      throw new ValidationError(`Feld '${key}' muss ein Text sein.`);
    }
    return value.trim();
  };

  const date = str("date", current.date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError("Feld 'date' muss ein ISO-Datum sein.");
  }

  const start = str("start", current.start);
  const end = str("end", current.end);
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    throw new ValidationError("Beginn und Ende müssen im Format HH:MM sein.");
  }
  if (toMinutes(end) <= toMinutes(start)) {
    throw new ValidationError("Ende muss nach Beginn liegen.");
  }

  const title = str("title", current.title);
  if (!title) {
    throw new ValidationError("Titel ist ein Pflichtfeld.");
  }

  const type = input.type === undefined ? current.type : input.type;
  if (!EVENT_TYPES.includes(type as CalendarEventType)) {
    throw new ValidationError("Ungültiger Termin-Typ.");
  }

  let tentative = current.tentative ?? false;
  if (input.tentative !== undefined) {
    if (typeof input.tentative !== "boolean") {
      throw new ValidationError("Feld 'tentative' muss ein Wahrheitswert sein.");
    }
    tentative = input.tentative;
  }

  const instructor = str("instructor", current.instructor) || "Nicht zugeteilt";

  return {
    date,
    start,
    end,
    title,
    subtitle: str("subtitle", current.subtitle ?? ""),
    location: str("location", current.location ?? ""),
    instructor,
    vehicle: str("vehicle", current.vehicle ?? ""),
    type: type as CalendarEventType,
    tentative,
  };
}

export function createCalendarEvent(
  db: Database,
  input: Partial<CalendarEventInput>
): CalendarEvent {
  const data = normalize(input, EMPTY);
  const row = db
    .query<{ id: number }, [string, string, string, string, string, string, string, string, string, number]>(
      `INSERT INTO calendar_events
         (date, start, "end", title, subtitle, location, instructor, vehicle, type, tentative)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .get(
      data.date,
      data.start,
      data.end,
      data.title,
      data.subtitle ?? "",
      data.location ?? "",
      data.instructor,
      data.vehicle ?? "",
      data.type,
      data.tentative ? 1 : 0
    )!;
  return getCalendarEvent(db, row.id);
}

export function updateCalendarEvent(
  db: Database,
  id: number,
  input: Partial<CalendarEventInput>
): CalendarEvent {
  const current = getCalendarEvent(db, id);
  const data = normalize(input, current);
  db.prepare(
    `UPDATE calendar_events
     SET date = ?, start = ?, "end" = ?, title = ?, subtitle = ?, location = ?,
         instructor = ?, vehicle = ?, type = ?, tentative = ?
     WHERE id = ?`
  ).run(
    data.date,
    data.start,
    data.end,
    data.title,
    data.subtitle ?? "",
    data.location ?? "",
    data.instructor,
    data.vehicle ?? "",
    data.type,
    data.tentative ? 1 : 0,
    id
  );
  return getCalendarEvent(db, id);
}

export function deleteCalendarEvent(db: Database, id: number): void {
  const event = getCalendarEvent(db, id);
  const remove = db.transaction(() => {
    archiveRow(
      db,
      "calendar_event",
      id,
      `${event.title} · ${event.date} ${event.start}`
    );
    db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
  });
  remove();
}
