/* ------------------------------------------------------------------ */
/* Unit tests for the calendar-events DB module: seed, CRUD, validation */
/* and the optional date-range filter. In-memory DB per test.          */
/* ------------------------------------------------------------------ */

import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";

import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
} from "./calendar-events";
import { openDb } from "./db";
import { ValidationError } from "./engine";

let db: Database;

beforeEach(() => {
  db = openDb(":memory:");
});

const VALID = {
  date: "2026-06-10",
  start: "09:00",
  end: "10:00",
  title: "Fahrstunde",
  instructor: "Köksal Gül",
  type: "Praktisch" as const,
};

describe("seed", () => {
  test("a fresh DB seeds 9 calendar events", () => {
    expect(listCalendarEvents(db)).toHaveLength(9);
  });

  test("seeded events are ordered by date then start", () => {
    const events = listCalendarEvents(db);
    for (let i = 1; i < events.length; i++) {
      const prev = `${events[i - 1]!.date} ${events[i - 1]!.start}`;
      const curr = `${events[i]!.date} ${events[i]!.start}`;
      expect(prev <= curr).toBe(true);
    }
  });
});

describe("createCalendarEvent", () => {
  test("happy path returns event with string id and omits empty optionals", () => {
    const event = createCalendarEvent(db, VALID);
    expect(typeof event.id).toBe("string");
    expect(event.title).toBe("Fahrstunde");
    expect(event.instructor).toBe("Köksal Gül");
    expect(event.subtitle).toBeUndefined();
    expect(event.location).toBeUndefined();
    expect(event.vehicle).toBeUndefined();
    expect(event.tentative).toBeUndefined();
  });

  test("preserves provided optionals and tentative flag", () => {
    const event = createCalendarEvent(db, {
      ...VALID,
      subtitle: "Lena Braun",
      location: "Innenstadt",
      vehicle: "Golf",
      tentative: true,
    });
    expect(event.subtitle).toBe("Lena Braun");
    expect(event.location).toBe("Innenstadt");
    expect(event.vehicle).toBe("Golf");
    expect(event.tentative).toBe(true);
  });

  test("trims string fields", () => {
    const event = createCalendarEvent(db, { ...VALID, title: "  Spaced  " });
    expect(event.title).toBe("Spaced");
  });

  test("missing/invalid date → ValidationError", () => {
    expect(() => createCalendarEvent(db, { ...VALID, date: "10.06.2026" })).toThrow(
      ValidationError
    );
  });

  test("end before start → ValidationError 'Ende muss nach Beginn liegen.'", () => {
    expect(() =>
      createCalendarEvent(db, { ...VALID, start: "12:00", end: "11:00" })
    ).toThrow("Ende muss nach Beginn liegen.");
  });

  test("equal start and end → ValidationError", () => {
    expect(() =>
      createCalendarEvent(db, { ...VALID, start: "09:00", end: "09:00" })
    ).toThrow(ValidationError);
  });

  test("malformed time → ValidationError", () => {
    expect(() => createCalendarEvent(db, { ...VALID, start: "9:00" })).toThrow(
      ValidationError
    );
  });

  test("empty title → ValidationError 'Titel ist ein Pflichtfeld.'", () => {
    expect(() => createCalendarEvent(db, { ...VALID, title: "   " })).toThrow(
      "Titel ist ein Pflichtfeld."
    );
  });

  test("invalid type → ValidationError 'Ungültiger Termin-Typ.'", () => {
    expect(() =>
      createCalendarEvent(db, { ...VALID, type: "Quatsch" as never })
    ).toThrow("Ungültiger Termin-Typ.");
  });

  test("non-boolean tentative → ValidationError", () => {
    expect(() =>
      createCalendarEvent(db, { ...VALID, tentative: "yes" as never })
    ).toThrow(ValidationError);
  });
});

describe("getCalendarEvent", () => {
  test("missing id → ValidationError 'Termin nicht gefunden.'", () => {
    expect(() => getCalendarEvent(db, 999999)).toThrow("Termin nicht gefunden.");
  });
});

describe("updateCalendarEvent", () => {
  test("partial update merges over current values", () => {
    const created = createCalendarEvent(db, { ...VALID, subtitle: "Lena" });
    const updated = updateCalendarEvent(db, Number(created.id), {
      title: "Geändert",
    });
    expect(updated.title).toBe("Geändert");
    expect(updated.subtitle).toBe("Lena"); // unchanged field preserved
    expect(updated.start).toBe("09:00");
  });

  test("can move date/time", () => {
    const created = createCalendarEvent(db, VALID);
    const updated = updateCalendarEvent(db, Number(created.id), {
      date: "2026-06-11",
      start: "14:00",
      end: "15:00",
    });
    expect(updated.date).toBe("2026-06-11");
    expect(updated.start).toBe("14:00");
    expect(updated.end).toBe("15:00");
  });

  test("invalid update is rejected", () => {
    const created = createCalendarEvent(db, VALID);
    expect(() =>
      updateCalendarEvent(db, Number(created.id), { end: "08:00" })
    ).toThrow("Ende muss nach Beginn liegen.");
  });

  test("update on missing id → ValidationError", () => {
    expect(() => updateCalendarEvent(db, 999999, { title: "x" })).toThrow(
      "Termin nicht gefunden."
    );
  });
});

describe("deleteCalendarEvent", () => {
  test("removes the event", () => {
    const created = createCalendarEvent(db, VALID);
    const before = listCalendarEvents(db).length;
    deleteCalendarEvent(db, Number(created.id));
    expect(listCalendarEvents(db).length).toBe(before - 1);
    expect(() => getCalendarEvent(db, Number(created.id))).toThrow(
      "Termin nicht gefunden."
    );
  });

  test("delete on missing id → ValidationError", () => {
    expect(() => deleteCalendarEvent(db, 999999)).toThrow("Termin nicht gefunden.");
  });
});

describe("listCalendarEvents range filter", () => {
  test("inclusive from/to filters by date", () => {
    const fresh = openDb(":memory:");
    // Remove the seed so we control the dataset.
    fresh.exec("DELETE FROM calendar_events");
    createCalendarEvent(fresh, { ...VALID, date: "2026-01-01" });
    const middle = createCalendarEvent(fresh, { ...VALID, date: "2026-02-01" });
    createCalendarEvent(fresh, { ...VALID, date: "2026-03-01" });

    const filtered = listCalendarEvents(fresh, {
      from: "2026-01-15",
      to: "2026-02-15",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.id).toBe(middle.id);
  });

  test("from-only and to-only bounds work", () => {
    const fresh = openDb(":memory:");
    fresh.exec("DELETE FROM calendar_events");
    createCalendarEvent(fresh, { ...VALID, date: "2026-01-01" });
    createCalendarEvent(fresh, { ...VALID, date: "2026-03-01" });

    expect(listCalendarEvents(fresh, { from: "2026-02-01" })).toHaveLength(1);
    expect(listCalendarEvents(fresh, { to: "2026-02-01" })).toHaveLength(1);
  });
});
