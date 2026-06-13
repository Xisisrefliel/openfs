/* Cross-entity referential integrity: renames/deletes of name-keyed
   entities (instructors, vehicles, students) must follow into every
   table that references them, and repairSoftReferences() must heal
   whatever historical data still dangles. */

import { beforeEach, describe, expect, test } from "bun:test";

import { openDb, repairSoftReferences } from "./db";
import type { Database } from "./sqlite";
import { listArchive, restoreArchived } from "./archive";
import { createCalendarEvent, getCalendarEvent } from "./calendar-events";
import { ensureChatTables } from "./chat";
import { createInstructor, deleteInstructor, updateInstructor } from "./instructors";
import { createStudent, getStudent, updateStudent } from "./students";
import { ensureTheoryGroupTables } from "./theory-groups";
import { createVehicle, deleteVehicle, getVehicle, updateVehicle } from "./vehicles";

const UNASSIGNED = "Nicht zugeteilt";

let db: Database;
beforeEach(() => {
  db = openDb(":memory:");
});

function makeInstructor(first: string, last: string) {
  return createInstructor(db, {
    firstName: first,
    lastName: last,
    classes: "B",
  });
}

function makeStudent(overrides: Record<string, unknown> = {}) {
  return createStudent(db, {
    firstName: "Mia",
    lastName: "Muster",
    contractNumber: `V-IT-${Math.random().toString(36).slice(2, 8)}`,
    customerNumber: `IT-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  });
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return createCalendarEvent(db, {
    date: "2026-07-01",
    start: "10:00",
    end: "11:00",
    title: "Fahrstunde",
    type: "Praktisch",
    instructor: UNASSIGNED,
    ...overrides,
  });
}

function insertTheoryGroup(instructor: string, studentIds: number[] = []) {
  return Number(
    db
      .prepare(
        `INSERT INTO theory_groups (name, klass, weekday, time, instructor, student_ids)
         VALUES ('Gruppe T', 'B', 'Montag', '18:00', ?, ?)`,
      )
      .run(instructor, JSON.stringify(studentIds)).lastInsertRowid,
  );
}

describe("instructor rename", () => {
  test("follows into students, calendar events and theory groups", () => {
    ensureTheoryGroupTables(db);
    const instructor = makeInstructor("Anna", "Alt");
    const student = makeStudent({ instructor: "Anna Alt" });
    const event = makeEvent({ instructor: "Anna Alt" });
    const groupId = insertTheoryGroup("Anna Alt");

    updateInstructor(db, instructor.id, { lastName: "Neu" });

    expect(getStudent(db, student.id).instructor).toBe("Anna Neu");
    expect(getCalendarEvent(db, Number(event.id)).instructor).toBe("Anna Neu");
    expect(
      db
        .query<{ instructor: string }, [number]>(
          "SELECT instructor FROM theory_groups WHERE id = ?",
        )
        .get(groupId)!.instructor,
    ).toBe("Anna Neu");
  });
});

describe("instructor delete", () => {
  test("unassigns calendar events; restore re-links them", () => {
    const instructor = makeInstructor("Bernd", "Weg");
    const event = makeEvent({ instructor: "Bernd Weg" });

    deleteInstructor(db, instructor.id);
    expect(getCalendarEvent(db, Number(event.id)).instructor).toBe(UNASSIGNED);

    const archived = listArchive(db).find((r) => r.entity === "instructor");
    restoreArchived(db, archived!.id);
    expect(getCalendarEvent(db, Number(event.id)).instructor).toBe("Bernd Weg");
  });
});

describe("vehicle model rename", () => {
  test("follows into students, instructors and calendar events", () => {
    const vehicle = createVehicle(db, {
      model: "Opel Corsa",
      plate: "DA-IT 100",
      klass: "B",
    });
    const student = makeStudent({ vehicle: "Opel Corsa" });
    const instructor = createInstructor(db, {
      firstName: "Carla",
      lastName: "Fahr",
      classes: "B",
      vehicle: "Opel Corsa",
    });
    const event = makeEvent({ vehicle: "Opel Corsa" });

    updateVehicle(db, vehicle.id, { model: "Opel Astra" });

    expect(getStudent(db, student.id).vehicle).toBe("Opel Astra");
    expect(
      db
        .query<{ vehicle: string }, [number]>(
          "SELECT vehicle FROM instructors WHERE id = ?",
        )
        .get(instructor.id)!.vehicle,
    ).toBe("Opel Astra");
    expect(getCalendarEvent(db, Number(event.id)).vehicle).toBe("Opel Astra");
  });

  test("leaves references alone while a fleet mate keeps the model", () => {
    const first = createVehicle(db, {
      model: "Opel Corsa",
      plate: "DA-IT 101",
      klass: "B",
    });
    createVehicle(db, { model: "Opel Corsa", plate: "DA-IT 102", klass: "B" });
    const student = makeStudent({ vehicle: "Opel Corsa" });

    updateVehicle(db, first.id, { model: "Opel Astra" });

    expect(getStudent(db, student.id).vehicle).toBe("Opel Corsa");
  });
});

describe("vehicle delete", () => {
  test("clears calendar events when the last of its model goes; restore re-links", () => {
    const vehicle = createVehicle(db, {
      model: "Opel Corsa",
      plate: "DA-IT 103",
      klass: "B",
    });
    const event = makeEvent({ vehicle: "Opel Corsa" });

    deleteVehicle(db, vehicle.id);
    expect(getCalendarEvent(db, Number(event.id)).vehicle).toBeUndefined();

    const archived = listArchive(db).find((r) => r.entity === "vehicle");
    restoreArchived(db, archived!.id);
    expect(getCalendarEvent(db, Number(event.id)).vehicle).toBe("Opel Corsa");
  });

  test("keeps references while a fleet mate of the same model remains", () => {
    const first = createVehicle(db, {
      model: "Opel Corsa",
      plate: "DA-IT 104",
      klass: "B",
    });
    const second = createVehicle(db, {
      model: "Opel Corsa",
      plate: "DA-IT 105",
      klass: "B",
    });
    const student = makeStudent({ vehicle: "Opel Corsa" });

    deleteVehicle(db, first.id);
    expect(getStudent(db, student.id).vehicle).toBe("Opel Corsa");
    expect(getVehicle(db, second.id).model).toBe("Opel Corsa");
  });
});

describe("student rename", () => {
  test("syncs the denormalized conversation name", () => {
    ensureChatTables(db);
    const student = makeStudent({ firstName: "Lara", lastName: "Lang" });
    db.prepare("INSERT INTO conversations (student_id, student_name) VALUES (?, ?)").run(
      student.id,
      "Lara Lang",
    );

    updateStudent(db, student.id, { lastName: "Kurz" });

    expect(
      db
        .query<{ student_name: string }, [number]>(
          "SELECT student_name FROM conversations WHERE student_id = ?",
        )
        .get(student.id)!.student_name,
    ).toBe("Lara Kurz");
  });
});

describe("repairSoftReferences", () => {
  test("normalizes orphaned name references and dead ids", () => {
    ensureTheoryGroupTables(db);
    ensureChatTables(db);
    const student = makeStudent();
    const event = makeEvent();

    // Simulate historical damage: phantom names and dead ids.
    db.prepare("UPDATE students SET instructor = ?, vehicle = ? WHERE id = ?").run(
      "Geist Lehrer",
      "Geist Mobil",
      student.id,
    );
    db.prepare("UPDATE calendar_events SET instructor = ?, vehicle = ? WHERE id = ?").run(
      "Geist Lehrer",
      "Geist Mobil",
      Number(event.id),
    );
    const groupId = insertTheoryGroup("Geist Lehrer", [student.id, 99999]);
    db.prepare("INSERT INTO conversations (student_id, student_name) VALUES (?, ?)").run(
      99999,
      "Geist Schüler",
    );

    repairSoftReferences(db);

    expect(getStudent(db, student.id).instructor).toBe(UNASSIGNED);
    expect(getStudent(db, student.id).vehicle).toBe(UNASSIGNED);
    const repaired = getCalendarEvent(db, Number(event.id));
    expect(repaired.instructor).toBe(UNASSIGNED);
    expect(repaired.vehicle).toBeUndefined();
    const group = db
      .query<{ instructor: string; student_ids: string }, [number]>(
        "SELECT instructor, student_ids FROM theory_groups WHERE id = ?",
      )
      .get(groupId)!;
    expect(group.instructor).toBe(UNASSIGNED);
    expect(JSON.parse(group.student_ids)).toEqual([student.id]);
    expect(
      db
        .query<{ n: number }, []>(
          "SELECT count(*) AS n FROM conversations WHERE student_id = 99999",
        )
        .get()!.n,
    ).toBe(0);
  });

  test("leaves valid references untouched", () => {
    makeInstructor("Dora", "Da");
    const student = makeStudent({ instructor: "Dora Da" });
    repairSoftReferences(db);
    expect(getStudent(db, student.id).instructor).toBe("Dora Da");
  });
});
