/* ------------------------------------------------------------------ */
/* Archiv (Papierkorb) — soft-delete fallback for accidental deletes.  */
/*                                                                     */
/* Every delete* function snapshots the raw table row into `archive`   */
/* before removing it. Restore re-inserts the snapshot verbatim        */
/* (including the original id), so references that survive by name or  */
/* id keep working. The HTTP wrappers live in routes.ts.               */
/* ------------------------------------------------------------------ */

import type { Database } from "./sqlite";

import { ValidationError } from "./engine";

export type ArchiveEntity =
  | "student"
  | "calendar_event"
  | "instructor"
  | "vehicle"
  | "price_plan";

/* Whitelist — entity → table. Restore builds SQL from this map only,
   never from client input. */
const TABLES: Record<ArchiveEntity, string> = {
  student: "students",
  calendar_event: "calendar_events",
  instructor: "instructors",
  vehicle: "vehicles",
  price_plan: "price_plans",
};

/* Both students.instructor/vehicle and instructors.vehicle fall back to
   this marker when their target is deleted (see the delete* functions). */
const UNASSIGNED = "Nicht zugeteilt";

/* Records that pointed at the deleted row and were reset to UNASSIGNED
   (or NULL for price plans / conversations, removed from the member
   list for theory groups). Restore re-links them — but only the ones
   still unassigned, so reassignments made in the meantime survive. */
export type ArchiveLinks = {
  students?: number[];
  instructors?: number[];
  theoryGroups?: number[];
  conversations?: number[];
};

/* Tables created lazily by their route modules (theory_groups,
   conversations) may be absent in a bare openDb() database. */
export function tableExists(db: Database, name: string): boolean {
  return (
    db
      .query<{ name: string }, [string]>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      )
      .get(name) !== null
  );
}

type ArchivePayload = {
  row: Record<string, unknown>;
  links?: ArchiveLinks;
};

export type ArchiveRecord = {
  id: number;
  entity: ArchiveEntity;
  label: string;
  deletedAt: string;
};

type ArchiveRow = {
  id: number;
  entity: ArchiveEntity;
  label: string;
  payload: string;
  deleted_at: string;
};

const toRecord = (row: ArchiveRow): ArchiveRecord => ({
  id: row.id,
  entity: row.entity,
  label: row.label,
  // datetime('now') stores UTC without zone marker — make it ISO.
  deletedAt: `${row.deleted_at.replace(" ", "T")}Z`,
});

/* Snapshot a row into the archive. Call this inside the same
   transaction that deletes the row. */
export function archiveRow(
  db: Database,
  entity: ArchiveEntity,
  id: number,
  label: string,
  links?: ArchiveLinks
): void {
  const row = db
    .query<Record<string, unknown>, [number]>(
      `SELECT * FROM ${TABLES[entity]} WHERE id = ?`
    )
    .get(id);
  if (!row) throw new ValidationError("Eintrag nicht gefunden.");
  const payload: ArchivePayload = { row };
  if (links && Object.values(links).some(ids => ids?.length)) {
    payload.links = links;
  }
  db.prepare(
    "INSERT INTO archive (entity, label, payload) VALUES (?, ?, ?)"
  ).run(entity, label, JSON.stringify(payload));
}

export function listArchive(db: Database): ArchiveRecord[] {
  return db
    .query<ArchiveRow, []>(
      "SELECT id, entity, label, payload, deleted_at FROM archive ORDER BY deleted_at DESC, id DESC"
    )
    .all()
    .map(toRecord);
}

function getArchiveRow(db: Database, id: number): ArchiveRow {
  const row = db
    .query<ArchiveRow, [number]>(
      "SELECT id, entity, label, payload, deleted_at FROM archive WHERE id = ?"
    )
    .get(id);
  if (!row) throw new ValidationError("Archiveintrag nicht gefunden.");
  return row;
}

/* Put records that were reset to UNASSIGNED when their target was
   deleted back onto the restored target — skipping any that have been
   reassigned since. Runs inside the restore transaction. */
function relink(
  db: Database,
  entity: ArchiveEntity,
  snapshot: Record<string, unknown>,
  links: ArchiveLinks
): void {
  const idList = (ids: number[]) => ids.map(() => "?").join(", ");

  if (links.students?.length) {
    const ids = links.students;
    if (entity === "instructor") {
      const name = `${snapshot.first_name} ${snapshot.last_name}`.trim();
      db.prepare(
        `UPDATE students SET instructor = ?
         WHERE instructor = '${UNASSIGNED}' AND id IN (${idList(ids)})`
      ).run(name, ...ids);
    } else if (entity === "vehicle") {
      db.prepare(
        `UPDATE students SET vehicle = ?
         WHERE vehicle = '${UNASSIGNED}' AND id IN (${idList(ids)})`
      ).run(String(snapshot.model), ...ids);
    } else if (entity === "price_plan") {
      db.prepare(
        `UPDATE students SET price_plan_id = ?
         WHERE price_plan_id IS NULL AND id IN (${idList(ids)})`
      ).run(Number(snapshot.id), ...ids);
    }
  }

  if (links.instructors?.length && entity === "vehicle") {
    const ids = links.instructors;
    db.prepare(
      `UPDATE instructors SET vehicle = ?
       WHERE vehicle = '${UNASSIGNED}' AND id IN (${idList(ids)})`
    ).run(String(snapshot.model), ...ids);
  }

  if (links.theoryGroups?.length && tableExists(db, "theory_groups")) {
    const ids = links.theoryGroups;
    if (entity === "instructor") {
      const name = `${snapshot.first_name} ${snapshot.last_name}`.trim();
      db.prepare(
        `UPDATE theory_groups SET instructor = ?
         WHERE instructor = '${UNASSIGNED}' AND id IN (${idList(ids)})`
      ).run(name, ...ids);
    } else if (entity === "student") {
      // Re-add the student to each group it was removed from — unless
      // the seat has been filled or the student re-added in the meantime.
      const studentId = Number(snapshot.id);
      const lookup = db.query<
        { student_ids: string; capacity: number },
        [number]
      >("SELECT student_ids, capacity FROM theory_groups WHERE id = ?");
      const update = db.prepare(
        "UPDATE theory_groups SET student_ids = ? WHERE id = ?"
      );
      for (const groupId of ids) {
        const group = lookup.get(groupId);
        if (!group) continue;
        const members = parseIdList(group.student_ids);
        if (members.includes(studentId) || members.length >= group.capacity) {
          continue;
        }
        members.push(studentId);
        update.run(JSON.stringify(members), groupId);
      }
    }
  }

  if (
    links.conversations?.length &&
    entity === "student" &&
    tableExists(db, "conversations")
  ) {
    const ids = links.conversations;
    db.prepare(
      `UPDATE conversations SET student_id = ?
       WHERE student_id IS NULL AND id IN (${idList(ids)})`
    ).run(Number(snapshot.id), ...ids);
  }
}

/* Same tolerant parse as theory-groups.ts uses for student_ids. */
function parseIdList(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(value => Number(value))
      .filter(id => Number.isInteger(id) && id > 0);
  } catch {
    return [];
  }
}

/* Re-insert the snapshot verbatim and drop the archive entry. UNIQUE /
   FK violations (e.g. the Vertragsnummer was reused, or a referenced
   price plan is itself still deleted) become readable errors. */
export function restoreArchived(db: Database, id: number): ArchiveRecord {
  const row = getArchiveRow(db, id);
  const parsed = JSON.parse(row.payload) as
    | ArchivePayload
    | Record<string, unknown>;
  // Early snapshots stored the bare row without the { row, links } wrapper.
  const { row: snapshot, links } =
    "row" in parsed && typeof parsed.row === "object"
      ? (parsed as ArchivePayload)
      : { row: parsed as Record<string, unknown>, links: undefined };
  const columns = Object.keys(snapshot);

  const restore = db.transaction(() => {
    db.prepare(
      `INSERT INTO ${TABLES[row.entity]} (${columns.map(c => `"${c}"`).join(", ")})
       VALUES (${columns.map(() => "?").join(", ")})`
    ).run(...(columns.map(c => snapshot[c]) as (string | number | null)[]));
    if (links) relink(db, row.entity, snapshot, links);
    db.prepare("DELETE FROM archive WHERE id = ?").run(id);
  });

  try {
    restore();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      throw new ValidationError(
        "Wiederherstellen nicht möglich: Eine Nummer oder ID ist inzwischen neu vergeben."
      );
    }
    if (error instanceof Error && error.message.includes("FOREIGN KEY")) {
      throw new ValidationError(
        "Wiederherstellen nicht möglich: Ein verknüpfter Eintrag ist noch gelöscht."
      );
    }
    throw error;
  }
  return toRecord(row);
}

export function purgeArchived(db: Database, id: number): void {
  getArchiveRow(db, id); // throws ValidationError if unknown
  db.prepare("DELETE FROM archive WHERE id = ?").run(id);
}
