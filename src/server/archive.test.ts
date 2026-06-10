/* ------------------------------------------------------------------ */
/* Archiv (Papierkorb) — delete → archive → restore round-trips.       */
/* All tests run against an in-memory DB seeded by openDb(":memory:"). */
/* ------------------------------------------------------------------ */

import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";

import { listArchive, purgeArchived, restoreArchived } from "./archive";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
} from "./calendar-events";
import { openDb } from "./db";
import { ValidationError } from "./engine";
import {
  createInstructor,
  deleteInstructor,
  listInstructors,
} from "./instructors";
import {
  createPricePlan,
  deletePricePlan,
} from "./price-plans";
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  updateStudent,
} from "./students";
import { createVehicle, deleteVehicle } from "./vehicles";

let db: Database;

beforeEach(() => {
  db = openDb(":memory:");
});

let counter = 0;
function uniq(prefix = "") {
  return `${prefix}${++counter}-${Date.now()}`;
}

function makeStudent() {
  const id = uniq();
  return {
    firstName: "Max",
    lastName: `Muster-${id}`,
    contractNumber: `V-${id}`,
    customerNumber: `K-${id}`,
  };
}

const EVENT = {
  date: "2026-06-15",
  start: "10:00",
  end: "11:00",
  title: "Fahrstunde Archivtest",
  instructor: "Anna Beispiel",
  type: "Praktisch" as const,
};

describe("archive", () => {
  test("deleting a student archives it; restore brings it back with the same id", () => {
    const student = createStudent(db, makeStudent());
    const before = listArchive(db).length;

    deleteStudent(db, student.id);
    expect(() => getStudent(db, student.id)).toThrow(ValidationError);

    const items = listArchive(db);
    expect(items.length).toBe(before + 1);
    const entry = items[0]!;
    expect(entry.entity).toBe("student");
    expect(entry.label).toContain(student.lastName);

    restoreArchived(db, entry.id);
    const restored = getStudent(db, student.id);
    expect(restored.contractNumber).toBe(student.contractNumber);
    expect(listArchive(db).length).toBe(before);
  });

  test("deleting a calendar event archives it; restore round-trips", () => {
    const event = createCalendarEvent(db, EVENT);
    const countBefore = listCalendarEvents(db).length;

    deleteCalendarEvent(db, Number(event.id));
    expect(listCalendarEvents(db).length).toBe(countBefore - 1);

    const entry = listArchive(db).find(item => item.entity === "calendar_event")!;
    expect(entry.label).toContain(EVENT.title);

    restoreArchived(db, entry.id);
    expect(listCalendarEvents(db).length).toBe(countBefore);
    expect(getCalendarEvent(db, Number(event.id)).title).toBe(EVENT.title);
  });

  test("restore fails readably when the contract number was reused", () => {
    const input = makeStudent();
    const student = createStudent(db, input);
    deleteStudent(db, student.id);
    // Someone re-registers with the same numbers while the original
    // sits in the archive.
    createStudent(db, input);

    const entry = listArchive(db).find(item => item.entity === "student")!;
    expect(() => restoreArchived(db, entry.id)).toThrow(ValidationError);
    // The snapshot must survive the failed restore.
    expect(listArchive(db).some(item => item.id === entry.id)).toBe(true);
  });

  test("restoring an instructor re-links students that were unassigned by the delete", () => {
    const instructor = createInstructor(db, {
      firstName: "Anna",
      lastName: "Relink",
      phone: "",
      email: "",
      classes: "B",
      vehicle: "",
      since: "2024-01-01",
      status: "aktiv",
    });
    const assigned = createStudent(db, {
      ...makeStudent(),
      instructor: "Anna Relink",
    });
    const reassigned = createStudent(db, {
      ...makeStudent(),
      instructor: "Anna Relink",
    });

    deleteInstructor(db, instructor.id);
    expect(getStudent(db, assigned.id).instructor).toBe("Nicht zugeteilt");

    // One student gets a new instructor while Anna sits in the archive —
    // that assignment must survive the restore.
    updateStudent(db, reassigned.id, { instructor: "Ben Anders" });

    const entry = listArchive(db).find(item => item.entity === "instructor")!;
    restoreArchived(db, entry.id);

    expect(listInstructors(db).some(i => i.id === instructor.id)).toBe(true);
    expect(getStudent(db, assigned.id).instructor).toBe("Anna Relink");
    expect(getStudent(db, reassigned.id).instructor).toBe("Ben Anders");
  });

  test("restoring a vehicle re-links students and instructors", () => {
    const vehicle = createVehicle(db, {
      model: "Relink-Mobil",
      plate: uniq("plate-"),
      klass: "B",
    });
    const student = createStudent(db, {
      ...makeStudent(),
      vehicle: "Relink-Mobil",
    });
    const instructor = createInstructor(db, {
      firstName: "Karl",
      lastName: "Fahrer",
      phone: "",
      email: "",
      classes: "B",
      vehicle: "Relink-Mobil",
      since: "2024-01-01",
      status: "aktiv",
    });

    deleteVehicle(db, vehicle.id);
    expect(getStudent(db, student.id).vehicle).toBe("Nicht zugeteilt");

    const entry = listArchive(db).find(item => item.entity === "vehicle")!;
    restoreArchived(db, entry.id);

    expect(getStudent(db, student.id).vehicle).toBe("Relink-Mobil");
    expect(
      listInstructors(db).find(i => i.id === instructor.id)!.vehicle
    ).toBe("Relink-Mobil");
  });

  test("restoring a price plan re-links students that fell back to no plan", () => {
    const plan = createPricePlan(db, {
      name: "Relink-Tarif",
      guaranteedMonths: 0,
      components: [{ label: "Grundbetrag", priceCents: 19900 }],
    });
    const student = createStudent(db, {
      ...makeStudent(),
      pricePlanId: plan.id,
    });

    deletePricePlan(db, plan.id);
    expect(getStudent(db, student.id).pricePlanId).toBeNull();

    const entry = listArchive(db).find(item => item.entity === "price_plan")!;
    restoreArchived(db, entry.id);

    expect(getStudent(db, student.id).pricePlanId).toBe(plan.id);
  });

  test("purge removes the snapshot for good", () => {
    const student = createStudent(db, makeStudent());
    deleteStudent(db, student.id);

    const entry = listArchive(db)[0]!;
    purgeArchived(db, entry.id);
    expect(listArchive(db).some(item => item.id === entry.id)).toBe(false);
    expect(() => purgeArchived(db, entry.id)).toThrow(ValidationError);
  });
});
