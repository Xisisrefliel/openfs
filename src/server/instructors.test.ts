/* ------------------------------------------------------------------ */
/* Unit tests for the instructors module.                              */
/* Fixture pattern: openDb(":memory:") — same as crud.test.ts.         */
/* ------------------------------------------------------------------ */

import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "./sqlite";

import { openDb } from "./db";
import { ValidationError } from "./engine";
import {
  createInstructor,
  deleteInstructor,
  getInstructor,
  listInstructors,
  updateInstructor,
  type InstructorInput,
  type InstructorStatus,
} from "./instructors";
import { listArchive } from "./archive";
import { createStudent, getStudent } from "./students";

let db: Database;

beforeEach(() => {
  db = openDb(":memory:");
});

let counter = 0;
function uniq(prefix = "") {
  return `${prefix}${++counter}-${Date.now()}`;
}

function makeInstructor(overrides: Partial<InstructorInput> = {}): InstructorInput {
  return {
    firstName: "Anna",
    lastName: "Muster",
    phone: "0123456789",
    email: "anna@example.com",
    classes: "B",
    vehicle: "",
    since: "2024-01-01",
    status: "aktiv" as const,
    ...overrides,
  };
}

function makeStudent(overrides: Record<string, unknown> = {}) {
  const id = uniq();
  return {
    firstName: "Max",
    lastName: "Student",
    contractNumber: `V-${id}`,
    customerNumber: `C-${id}`,
    ...overrides,
  };
}

/* ================================================================== */
/* create                                                               */
/* ================================================================== */

describe("createInstructor", () => {
  test("happy path: returns record with id and correct fields", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "  Britta  ", lastName: "  Schmidt  " }));
    expect(instructor.id).toBeGreaterThan(0);
    expect(instructor.firstName).toBe("Britta");
    expect(instructor.lastName).toBe("Schmidt");
    expect(instructor.status).toBe("aktiv");
  });

  test("missing firstName → ValidationError", () => {
    expect(() => createInstructor(db, makeInstructor({ firstName: "" }))).toThrow(ValidationError);
  });

  test("missing lastName → ValidationError", () => {
    expect(() => createInstructor(db, makeInstructor({ lastName: "" }))).toThrow(ValidationError);
  });

  test("bad status → ValidationError", () => {
    expect(() =>
      createInstructor(db, makeInstructor({ status: "weg" as InstructorStatus }))
    ).toThrow(ValidationError);
  });

  test("valid status 'inaktiv' → persists", () => {
    const instructor = createInstructor(db, makeInstructor({ status: "inaktiv" }));
    expect(instructor.status).toBe("inaktiv");
  });

  test("listInstructors returns newly created instructor", () => {
    const before = listInstructors(db).length;
    createInstructor(db, makeInstructor());
    expect(listInstructors(db).length).toBe(before + 1);
  });
});

/* ================================================================== */
/* update / field merge                                                 */
/* ================================================================== */

describe("updateInstructor", () => {
  test("partial update merges — changing phone leaves name unchanged", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "Clara", lastName: "Klein" }));
    const updated = updateInstructor(db, instructor.id, { phone: "0987654321" });
    expect(updated.phone).toBe("0987654321");
    expect(updated.firstName).toBe("Clara");
    expect(updated.lastName).toBe("Klein");
  });

  test("update with unknown id → ValidationError", () => {
    expect(() => updateInstructor(db, 999999, { phone: "0000" })).toThrow(ValidationError);
  });
});

/* ================================================================== */
/* rename cascade                                                       */
/* ================================================================== */

describe("rename cascade", () => {
  test("renaming instructor updates students, calendar_events, and theory_groups", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "Max", lastName: "Muster" }));
    const fullName = `${instructor.firstName} ${instructor.lastName}`;

    // Arrange: student pointing at instructor by name
    const student = createStudent(db, makeStudent({ instructor: fullName }));

    // Arrange: calendar_event pointing at instructor by name
    db.prepare(
      "INSERT INTO calendar_events (date, start, end, title, instructor, vehicle, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("2026-01-10", "10:00", "11:00", "Fahrstunde", fullName, "", "Praktisch");

    // Arrange: theory_group pointing at instructor by name
    db.prepare(
      "CREATE TABLE IF NOT EXISTS theory_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, instructor TEXT, student_ids TEXT, capacity INTEGER)"
    ).run();
    db.prepare(
      "INSERT INTO theory_groups (name, instructor, student_ids, capacity) VALUES (?, ?, ?, ?)"
    ).run("Gruppe A", fullName, "[]", 10);

    // Arrange: unrelated student with a different instructor — must not be touched
    const unrelated = createStudent(db, makeStudent({ instructor: "Andere Lehrerin" }));

    // Act: rename instructor
    const renamed = updateInstructor(db, instructor.id, { firstName: "Max", lastName: "Neumann" });
    const newName = `${renamed.firstName} ${renamed.lastName}`;
    expect(newName).toBe("Max Neumann");

    // Assert: student reference updated
    const updatedStudent = getStudent(db, student.id);
    expect(updatedStudent.instructor).toBe("Max Neumann");

    // Assert: calendar_event reference updated
    const evRow = db
      .query<{ instructor: string }, [string]>(
        "SELECT instructor FROM calendar_events WHERE instructor = ?"
      )
      .get("Max Neumann");
    expect(evRow?.instructor).toBe("Max Neumann");

    // Assert: theory_group reference updated
    const groupRow = db
      .query<{ instructor: string }, [string]>(
        "SELECT instructor FROM theory_groups WHERE instructor = ?"
      )
      .get("Max Neumann");
    expect(groupRow?.instructor).toBe("Max Neumann");

    // Assert: old name gone
    const oldInstructor = db
      .query<{ instructor: string }, [string]>(
        "SELECT instructor FROM students WHERE instructor = ?"
      )
      .get("Max Muster");
    expect(oldInstructor).toBeNull();

    // Assert: unrelated student not touched
    const unrelatedAfter = getStudent(db, unrelated.id);
    expect(unrelatedAfter.instructor).toBe("Andere Lehrerin");
  });

  test("namesake caveat: renaming one instructor moves ALL references with that display name (documented limitation)", () => {
    // Create two instructors with the same name — the name-keyed schema
    // cannot tell them apart, so a rename of one cascades to all references.
    // This is the documented limitation in instructors.ts:170-173.
    const a = createInstructor(db, makeInstructor({ firstName: "Same", lastName: "Name" }));
    const _b = createInstructor(db, makeInstructor({ firstName: "Same", lastName: "Name" }));
    const sharedName = "Same Name";

    // Two students both assigned to "Same Name"
    const s1 = createStudent(db, makeStudent({ instructor: sharedName }));
    const s2 = createStudent(db, makeStudent({ instructor: sharedName }));

    // Rename instructor A only
    updateInstructor(db, a.id, { firstName: "Same", lastName: "Renamed" });

    // BUG (known limitation): BOTH students get the new name, even though only
    // one instructor was intended to be renamed. The schema cannot distinguish
    // between namesakes.
    const after1 = getStudent(db, s1.id);
    const after2 = getStudent(db, s2.id);
    expect(after1.instructor).toBe("Same Renamed");
    expect(after2.instructor).toBe("Same Renamed");
  });
});

/* ================================================================== */
/* delete                                                               */
/* ================================================================== */

describe("deleteInstructor", () => {
  test("removes the row from instructors", () => {
    const before = listInstructors(db).length;
    const instructor = createInstructor(db, makeInstructor());
    expect(listInstructors(db).length).toBe(before + 1);
    deleteInstructor(db, instructor.id);
    expect(listInstructors(db).length).toBe(before);
  });

  test("re-assigns students to 'Nicht zugeteilt'", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "Lena", lastName: "Lehr" }));
    const fullName = `${instructor.firstName} ${instructor.lastName}`;
    const student = createStudent(db, makeStudent({ instructor: fullName }));

    deleteInstructor(db, instructor.id);

    const updated = getStudent(db, student.id);
    expect(updated.instructor).toBe("Nicht zugeteilt");
  });

  test("re-assigns calendar_events to 'Nicht zugeteilt'", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "Tom", lastName: "Fahr" }));
    const fullName = `${instructor.firstName} ${instructor.lastName}`;
    const student = createStudent(db, makeStudent());
    db.prepare(
      "INSERT INTO calendar_events (date, start, end, title, instructor, vehicle, type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("2026-02-01", "09:00", "10:00", "Fahrstunde", fullName, "", "Praktisch");

    deleteInstructor(db, instructor.id);

    const ev = db
      .query<{ instructor: string }, []>(
        "SELECT instructor FROM calendar_events WHERE date = '2026-02-01'"
      )
      .get();
    expect(ev?.instructor).toBe("Nicht zugeteilt");
  });

  test("writes archive entry with correct entity and label", () => {
    const instructor = createInstructor(db, makeInstructor({ firstName: "Karl", lastName: "Archiv" }));
    const fullName = "Karl Archiv";
    const archiveBefore = listArchive(db).length;

    deleteInstructor(db, instructor.id);

    const archiveAfter = listArchive(db);
    expect(archiveAfter.length).toBe(archiveBefore + 1);
    const entry = archiveAfter[0]!;
    expect(entry.entity).toBe("instructor");
    expect(entry.label).toBe(fullName);
  });

  test("unknown id → ValidationError", () => {
    expect(() => deleteInstructor(db, 999999)).toThrow(ValidationError);
  });

  test("getInstructor on deleted id → ValidationError", () => {
    const instructor = createInstructor(db, makeInstructor());
    deleteInstructor(db, instructor.id);
    expect(() => getInstructor(db, instructor.id)).toThrow(ValidationError);
  });
});
