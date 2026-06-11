/* ------------------------------------------------------------------ */
/* Instructors (Fahrlehrer/innen) — DB access + validation.            */
/* The HTTP wrappers live in routes.ts (instructorRoutes).             */
/* ------------------------------------------------------------------ */

import type { Database } from "./sqlite";

import { archiveRow, tableExists } from "./archive";
import { ValidationError } from "./engine";

const UNASSIGNED_INSTRUCTOR = "Nicht zugeteilt";

export type InstructorStatus = "aktiv" | "inaktiv";

export type Instructor = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  classes: string;
  vehicle: string;
  since: string;
  status: InstructorStatus;
};

export type InstructorInput = Omit<Instructor, "id">;

type InstructorRow = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  classes: string;
  vehicle: string;
  since: string;
  status: InstructorStatus;
};

const toInstructor = (row: InstructorRow): Instructor => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  email: row.email,
  classes: row.classes,
  vehicle: row.vehicle,
  since: row.since,
  status: row.status,
});

const SELECT =
  "SELECT id, first_name, last_name, phone, email, classes, vehicle, since, status FROM instructors";

export function listInstructors(db: Database): Instructor[] {
  return db
    .query<InstructorRow, []>(`${SELECT} ORDER BY last_name, first_name`)
    .all()
    .map(toInstructor);
}

export function getInstructor(db: Database, id: number): Instructor {
  const row = db
    .query<InstructorRow, [number]>(`${SELECT} WHERE id = ?`)
    .get(id);
  if (!row) throw new ValidationError("Fahrlehrer/in nicht gefunden.");
  return toInstructor(row);
}

/* Merge a partial payload over current values, trimming strings and
   rejecting anything that would leave the record unusable. */
function normalize(
  input: Partial<InstructorInput>,
  current: InstructorInput
): InstructorInput {
  const str = (key: keyof InstructorInput): string => {
    const value = input[key];
    if (value === undefined) return current[key];
    if (typeof value !== "string") {
      throw new ValidationError(`Feld '${key}' muss ein Text sein.`);
    }
    return value.trim();
  };

  const next: InstructorInput = {
    firstName: str("firstName"),
    lastName: str("lastName"),
    phone: str("phone"),
    email: str("email"),
    classes: str("classes"),
    vehicle: str("vehicle"),
    since: str("since"),
    status: current.status,
  };

  if (input.status !== undefined) {
    if (input.status !== "aktiv" && input.status !== "inaktiv") {
      throw new ValidationError("Status muss 'aktiv' oder 'inaktiv' sein.");
    }
    next.status = input.status;
  }

  if (!next.firstName || !next.lastName) {
    throw new ValidationError("Vor- und Nachname sind Pflichtfelder.");
  }

  return next;
}

const EMPTY: InstructorInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  classes: "",
  vehicle: "",
  since: "",
  status: "aktiv",
};

export function createInstructor(
  db: Database,
  input: Partial<InstructorInput>
): Instructor {
  const data = normalize(input, EMPTY);
  const row = db
    .query<{ id: number }, [string, string, string, string, string, string, string, string]>(
      `INSERT INTO instructors (first_name, last_name, phone, email, classes, vehicle, since, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .get(
      data.firstName,
      data.lastName,
      data.phone,
      data.email,
      data.classes,
      data.vehicle,
      data.since,
      data.status
    )!;
  return getInstructor(db, row.id);
}

export function updateInstructor(
  db: Database,
  id: number,
  input: Partial<InstructorInput>
): Instructor {
  const current = getInstructor(db, id);
  const data = normalize(input, current);
  db.prepare(
    `UPDATE instructors
     SET first_name = ?, last_name = ?, phone = ?, email = ?, classes = ?, vehicle = ?, since = ?, status = ?
     WHERE id = ?`
  ).run(
    data.firstName,
    data.lastName,
    data.phone,
    data.email,
    data.classes,
    data.vehicle,
    data.since,
    data.status,
    id
  );
  return getInstructor(db, id);
}

export function deleteInstructor(db: Database, id: number): void {
  const instructor = getInstructor(db, id);
  const name = `${instructor.firstName} ${instructor.lastName}`.trim();

  const remove = db.transaction(() => {
    // Remember who was assigned so a restore can re-link them.
    const students = db
      .query<{ id: number }, [string]>(
        "SELECT id FROM students WHERE instructor = ?"
      )
      .all(name)
      .map(row => row.id);
    const theoryGroups = tableExists(db, "theory_groups")
      ? db
          .query<{ id: number }, [string]>(
            "SELECT id FROM theory_groups WHERE instructor = ?"
          )
          .all(name)
          .map(row => row.id)
      : [];
    archiveRow(db, "instructor", id, name || "Fahrlehrer/in", {
      students,
      theoryGroups,
    });
    db.prepare("UPDATE students SET instructor = ? WHERE instructor = ?").run(
      UNASSIGNED_INSTRUCTOR,
      name
    );
    if (theoryGroups.length > 0) {
      db.prepare(
        "UPDATE theory_groups SET instructor = ? WHERE instructor = ?"
      ).run(UNASSIGNED_INSTRUCTOR, name);
    }
    db.prepare("DELETE FROM instructors WHERE id = ?").run(id);
  });

  remove();
}
