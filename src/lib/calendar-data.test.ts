import { describe, expect, test } from "bun:test";

import { groupEventsByDay, layoutDay, type CalEvent } from "./calendar-data";

/* Minimal CalEvent factory for test fixtures. */
function makeEvent(
  overrides: Partial<CalEvent> & { id: string; date: string; start: string; end: string },
): CalEvent {
  return {
    title: "Fahrstunde",
    instructor: "Mustermann",
    type: "Praktisch",
    ...overrides,
  };
}

describe("groupEventsByDay", () => {
  test("empty input returns empty map", () => {
    const result = groupEventsByDay([]);
    expect(result.size).toBe(0);
  });

  test("events on two days group correctly and preserve input order within a day", () => {
    const monday1 = makeEvent({
      id: "1",
      date: "2026-06-08",
      start: "08:00",
      end: "08:45",
    });
    const monday2 = makeEvent({
      id: "2",
      date: "2026-06-08",
      start: "10:00",
      end: "11:30",
    });
    const tuesday = makeEvent({
      id: "3",
      date: "2026-06-09",
      start: "09:00",
      end: "09:45",
    });

    const result = groupEventsByDay([monday1, monday2, tuesday]);

    expect(result.size).toBe(2);
    expect(result.get("2026-06-08")).toEqual([monday1, monday2]);
    expect(result.get("2026-06-09")).toEqual([tuesday]);
  });

  test("single event ends up in its own day bucket", () => {
    const event = makeEvent({
      id: "1",
      date: "2026-06-10",
      start: "14:00",
      end: "15:00",
    });
    const result = groupEventsByDay([event]);
    expect(result.get("2026-06-10")).toEqual([event]);
    expect(result.size).toBe(1);
  });
});

describe("layoutDay", () => {
  test("non-overlapping events all land in column 0, columns === 1", () => {
    const a = makeEvent({ id: "1", date: "2026-06-08", start: "08:00", end: "08:45" });
    const b = makeEvent({ id: "2", date: "2026-06-08", start: "09:00", end: "10:00" });
    const c = makeEvent({ id: "3", date: "2026-06-08", start: "11:00", end: "11:45" });

    const { placed, columns } = layoutDay([a, b, c]);

    expect(columns).toBe(1);
    expect(placed.every((p) => p.column === 0)).toBe(true);
  });

  test("two overlapping events get columns 0 and 1, columns === 2", () => {
    // Both events cover 08:00–09:00 — they fully overlap.
    const a = makeEvent({ id: "1", date: "2026-06-08", start: "08:00", end: "09:00" });
    const b = makeEvent({ id: "2", date: "2026-06-08", start: "08:00", end: "09:00" });

    const { placed, columns } = layoutDay([a, b]);

    expect(columns).toBe(2);
    const usedColumns = placed.map((p) => p.column).sort();
    expect(usedColumns).toEqual([0, 1]);
  });

  test("event starting exactly when another ends reuses column 0", () => {
    // a ends at 09:00; b starts at 09:00 — they are adjacent, not overlapping.
    const a = makeEvent({ id: "1", date: "2026-06-08", start: "08:00", end: "09:00" });
    const b = makeEvent({ id: "2", date: "2026-06-08", start: "09:00", end: "10:00" });

    const { placed, columns } = layoutDay([a, b]);

    expect(columns).toBe(1);
    expect(placed.every((p) => p.column === 0)).toBe(true);
  });

  test("empty input returns placed: [], columns: 1", () => {
    const { placed, columns } = layoutDay([]);
    expect(placed).toEqual([]);
    expect(columns).toBe(1);
  });
});
