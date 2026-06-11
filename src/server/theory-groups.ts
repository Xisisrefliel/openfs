/* ------------------------------------------------------------------ */
/* Theory groups (Theorie Gruppen) — DB access + validation.           */
/* Self-contained module: ensureTheoryGroupTables(db) creates + seeds  */
/* the table, theoryGroupRoutes(db) returns the Bun.serve() entries    */
/* (mounted in src/index.ts).                                          */
/* ------------------------------------------------------------------ */

import type { Database } from "bun:sqlite";
import type { BunRequest } from "bun";

import { ValidationError } from "./engine";

export type TheoryGroupStatus = "aktiv" | "abgeschlossen";

export type TheoryGroupMember = {
  id: number;
  name: string;
};

export type TheoryGroup = {
  id: number;
  name: string;
  klass: string;
  weekday: string;
  time: string;
  room: string;
  instructor: string;
  capacity: number;
  /** Raw membership as stored (JSON array of student ids). */
  studentIds: number[];
  /** studentIds resolved against the students table (missing ids drop out). */
  members: TheoryGroupMember[];
  status: TheoryGroupStatus;
  createdAt: string;
};

export type TheoryGroupInput = {
  name: string;
  klass: string;
  weekday: string;
  time: string;
  room: string;
  instructor: string;
  capacity: number;
  studentIds: number[];
  status: TheoryGroupStatus;
};

const UNASSIGNED_INSTRUCTOR = "Nicht zugeteilt";

export const THEORY_GROUP_WEEKDAYS = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
] as const;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/* ------------------------------------------------------------------ */
/* Schema + seed                                                       */
/* ------------------------------------------------------------------ */

const TABLE_DDL = `
CREATE TABLE IF NOT EXISTS theory_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  klass TEXT NOT NULL,
  weekday TEXT NOT NULL,
  time TEXT NOT NULL,
  room TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT 'Nicht zugeteilt',
  capacity INTEGER NOT NULL DEFAULT 20,
  student_ids TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'abgeschlossen')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

function tableExists(db: Database, name: string): boolean {
  return (
    db
      .query<{ name: string }, [string]>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
      )
      .get(name) !== null
  );
}

const FALLBACK_INSTRUCTORS = [
  "Köksal Gül",
  "Nadine Aksoy",
  "Emre Gül",
  "Sven Kappel",
];

/* Seed groups — only on an empty table. Instructor names come from the
   instructors table when it exists and has rows; member ids from the
   students table when present (distributed round-robin). */
function seedTheoryGroups(db: Database) {
  let instructorNames = FALLBACK_INSTRUCTORS;
  if (tableExists(db, "instructors")) {
    const rows = db
      .query<{ name: string }, []>(
        `SELECT trim(first_name || ' ' || last_name) AS name
         FROM instructors WHERE status = 'aktiv' ORDER BY id`
      )
      .all()
      .map(row => row.name)
      .filter(Boolean);
    if (rows.length > 0) instructorNames = rows;
  }

  const studentIds = tableExists(db, "students")
    ? db
        .query<{ id: number }, []>("SELECT id FROM students ORDER BY id LIMIT 12")
        .all()
        .map(row => row.id)
    : [];

  const seeds = [
    { name: "Gruppe B-1 · Abendkurs", klass: "B", weekday: "Montag", time: "18:00", room: "Schulungsraum 1", capacity: 20, status: "aktiv" },
    { name: "Gruppe B-2 · Abendkurs", klass: "B", weekday: "Mittwoch", time: "18:00", room: "Schulungsraum 1", capacity: 20, status: "aktiv" },
    { name: "Gruppe A · Kompaktkurs", klass: "A", weekday: "Dienstag", time: "19:00", room: "Schulungsraum 2", capacity: 12, status: "aktiv" },
    { name: "Gruppe BE · Anhängerkurs", klass: "BE", weekday: "Donnerstag", time: "17:30", room: "Schulungsraum 2", capacity: 10, status: "aktiv" },
    { name: "Ferienkurs B · Intensiv", klass: "B", weekday: "Samstag", time: "09:00", room: "Schulungsraum 1", capacity: 16, status: "abgeschlossen" },
  ] as const;

  const insert = db.prepare(
    `INSERT INTO theory_groups
       (name, klass, weekday, time, room, instructor, capacity, student_ids, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const seedAll = db.transaction(() => {
    seeds.forEach((seed, index) => {
      const memberIds = studentIds.filter((_, i) => i % seeds.length === index);
      insert.run(
        seed.name,
        seed.klass,
        seed.weekday,
        seed.time,
        seed.room,
        instructorNames[index % instructorNames.length]!,
        seed.capacity,
        JSON.stringify(memberIds),
        seed.status
      );
    });
  });
  seedAll();
}

export function ensureTheoryGroupTables(db: Database) {
  db.exec(TABLE_DDL);
  const count = db
    .query<{ n: number }, []>("SELECT count(*) AS n FROM theory_groups")
    .get()!.n;
  if (count === 0) seedTheoryGroups(db);
}

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

type TheoryGroupRow = {
  id: number;
  name: string;
  klass: string;
  weekday: string;
  time: string;
  room: string;
  instructor: string;
  capacity: number;
  student_ids: string;
  status: TheoryGroupStatus;
  created_at: string;
};

const SELECT = `SELECT id, name, klass, weekday, time, room, instructor,
  capacity, student_ids, status, created_at FROM theory_groups`;

function parseStudentIds(raw: string): number[] {
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

/* Resolve member ids to display names. Ids of since-deleted students
   silently drop out of `members` (they stay in studentIds). */
function resolveMembers(db: Database, ids: number[]): TheoryGroupMember[] {
  if (ids.length === 0 || !tableExists(db, "students")) return [];
  const lookup = db.query<{ id: number; name: string }, [number]>(
    "SELECT id, trim(first_name || ' ' || last_name) AS name FROM students WHERE id = ?"
  );
  const members: TheoryGroupMember[] = [];
  for (const id of ids) {
    const row = lookup.get(id);
    if (row) members.push({ id: row.id, name: row.name });
  }
  return members;
}

function toGroup(db: Database, row: TheoryGroupRow): TheoryGroup {
  const studentIds = parseStudentIds(row.student_ids);
  return {
    id: row.id,
    name: row.name,
    klass: row.klass,
    weekday: row.weekday,
    time: row.time,
    room: row.room,
    instructor: row.instructor,
    capacity: row.capacity,
    studentIds,
    members: resolveMembers(db, studentIds),
    status: row.status,
    createdAt: row.created_at,
  };
}

export function listTheoryGroups(db: Database): TheoryGroup[] {
  return db
    .query<TheoryGroupRow, []>(`${SELECT} ORDER BY name`)
    .all()
    .map(row => toGroup(db, row));
}

export function getTheoryGroup(db: Database, id: number): TheoryGroup {
  const row = db
    .query<TheoryGroupRow, [number]>(`${SELECT} WHERE id = ?`)
    .get(id);
  if (!row) throw new ValidationError("Theorie-Gruppe nicht gefunden.");
  return toGroup(db, row);
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

function normalizeStudentIds(
  db: Database,
  value: unknown,
  current: number[]
): number[] {
  if (value === undefined) return current;
  if (!Array.isArray(value)) {
    throw new ValidationError("Feld 'studentIds' muss eine Liste sein.");
  }
  const ids: number[] = [];
  for (const raw of value) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(
        "Feld 'studentIds' darf nur Fahrschüler-IDs enthalten."
      );
    }
    if (!ids.includes(id)) ids.push(id); // de-dupe
  }
  if (tableExists(db, "students")) {
    const exists = db.query<{ id: number }, [number]>(
      "SELECT id FROM students WHERE id = ?"
    );
    for (const id of ids) {
      if (!exists.get(id)) {
        throw new ValidationError(`Fahrschüler/in mit ID ${id} nicht gefunden.`);
      }
    }
  }
  return ids;
}

type GroupTextKey = "name" | "klass" | "weekday" | "time" | "room" | "instructor";

/* Merge a partial payload over current values, trimming strings and
   rejecting anything that would leave the group unusable. */
function normalize(
  db: Database,
  input: Partial<TheoryGroupInput>,
  current: TheoryGroupInput
): TheoryGroupInput {
  const str = (key: GroupTextKey): string => {
    const value = input[key];
    if (value === undefined) return current[key];
    if (typeof value !== "string") {
      throw new ValidationError(`Feld '${key}' muss ein Text sein.`);
    }
    return value.trim();
  };

  const next: TheoryGroupInput = {
    name: str("name"),
    klass: str("klass"),
    weekday: str("weekday"),
    time: str("time"),
    room: str("room"),
    instructor: str("instructor") || UNASSIGNED_INSTRUCTOR,
    capacity: current.capacity,
    studentIds: current.studentIds,
    status: current.status,
  };

  if (input.capacity !== undefined) {
    const capacity = Number(input.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new ValidationError("Kapazität muss eine ganze Zahl ab 1 sein.");
    }
    next.capacity = capacity;
  }

  if (input.status !== undefined) {
    if (input.status !== "aktiv" && input.status !== "abgeschlossen") {
      throw new ValidationError(
        "Status muss 'aktiv' oder 'abgeschlossen' sein."
      );
    }
    next.status = input.status;
  }

  next.studentIds = normalizeStudentIds(db, input.studentIds, current.studentIds);

  if (!next.name) {
    throw new ValidationError("Name ist ein Pflichtfeld.");
  }
  if (!next.klass) {
    throw new ValidationError("Klasse ist ein Pflichtfeld.");
  }
  if (!(THEORY_GROUP_WEEKDAYS as readonly string[]).includes(next.weekday)) {
    throw new ValidationError(
      "Wochentag muss ein gültiger Wochentag sein (Montag–Sonntag)."
    );
  }
  if (!TIME_RE.test(next.time)) {
    throw new ValidationError("Uhrzeit muss im Format HH:MM angegeben werden.");
  }
  if (next.studentIds.length > next.capacity) {
    throw new ValidationError(
      `Die Gruppe ist voll (max. ${next.capacity} Teilnehmer).`
    );
  }

  return next;
}

const EMPTY: TheoryGroupInput = {
  name: "",
  klass: "",
  weekday: "Montag",
  time: "18:00",
  room: "",
  instructor: UNASSIGNED_INSTRUCTOR,
  capacity: 20,
  studentIds: [],
  status: "aktiv",
};

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export function createTheoryGroup(
  db: Database,
  input: Partial<TheoryGroupInput>
): TheoryGroup {
  const data = normalize(db, input, EMPTY);
  const row = db
    .query<
      { id: number },
      [string, string, string, string, string, string, number, string, string]
    >(
      `INSERT INTO theory_groups
         (name, klass, weekday, time, room, instructor, capacity, student_ids, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .get(
      data.name,
      data.klass,
      data.weekday,
      data.time,
      data.room,
      data.instructor,
      data.capacity,
      JSON.stringify(data.studentIds),
      data.status
    )!;
  return getTheoryGroup(db, row.id);
}

export function updateTheoryGroup(
  db: Database,
  id: number,
  input: Partial<TheoryGroupInput>
): TheoryGroup {
  const current = getTheoryGroup(db, id);
  const data = normalize(db, input, current);
  db.prepare(
    `UPDATE theory_groups
     SET name = ?, klass = ?, weekday = ?, time = ?, room = ?, instructor = ?,
         capacity = ?, student_ids = ?, status = ?
     WHERE id = ?`
  ).run(
    data.name,
    data.klass,
    data.weekday,
    data.time,
    data.room,
    data.instructor,
    data.capacity,
    JSON.stringify(data.studentIds),
    data.status,
    id
  );
  return getTheoryGroup(db, id);
}

export function deleteTheoryGroup(db: Database, id: number): void {
  getTheoryGroup(db, id); // throws ValidationError if unknown
  db.prepare("DELETE FROM theory_groups WHERE id = ?").run(id);
}

/* ------------------------------------------------------------------ */
/* HTTP layer — same thin JSON wrapper shape as src/server/routes.ts.  */
/* ------------------------------------------------------------------ */

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function handle(fn: () => Response | Promise<Response>) {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: error.message }, 400);
      }
      console.error(error);
      return json({ error: "Interner Fehler." }, 500);
    }
  };
}

export function theoryGroupRoutes(db: Database) {
  const parseId = (raw: string): number => {
    const id = Number(raw);
    if (!Number.isInteger(id)) {
      throw new ValidationError("Ungültige Gruppen-ID.");
    }
    return id;
  };

  return {
    "/api/theory-groups": {
      GET: (req: BunRequest) =>
        handle(() => json({ groups: listTheoryGroups(db) }))(),
      POST: (req: BunRequest) =>
        handle(async () =>
          json(
            createTheoryGroup(db, (await req.json()) as Partial<TheoryGroupInput>),
            201
          )
        )(),
    },

    "/api/theory-groups/:id": {
      PATCH: (req: BunRequest<"/api/theory-groups/:id">) =>
        handle(async () =>
          json(
            updateTheoryGroup(
              db,
              parseId(req.params.id),
              (await req.json()) as Partial<TheoryGroupInput>
            )
          )
        )(),
      DELETE: (req: BunRequest<"/api/theory-groups/:id">) =>
        handle(() => {
          deleteTheoryGroup(db, parseId(req.params.id));
          return json({ ok: true });
        })(),
    },
  };
}
