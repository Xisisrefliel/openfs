import { describe, expect, test } from "bun:test";

import type { CalEvent } from "@/lib/calendar-data";
import {
  countExamsThisWeek,
  examStats,
  groupExamsByDate,
  isExamEvent,
  rankByReadiness,
  suggestedExamType,
  upcomingExams,
} from "@/lib/exams";

const event = (overrides: Partial<CalEvent>): CalEvent => ({
  id: "1",
  date: "2026-06-15",
  start: "09:00",
  end: "09:45",
  title: "Theorieprüfung",
  instructor: "Nadine Aksoy",
  type: "Theorieprüfung",
  ...overrides,
});

describe("isExamEvent", () => {
  test("matches both exam types and nothing else", () => {
    expect(isExamEvent({ type: "Theorieprüfung" })).toBe(true);
    expect(isExamEvent({ type: "Vorstellung zur prakt. Prüfung" })).toBe(true);
    expect(isExamEvent({ type: "Praktisch" })).toBe(false);
    expect(isExamEvent({ type: "Theorie" })).toBe(false);
    expect(isExamEvent({ type: "Andere" })).toBe(false);
  });
});

describe("upcomingExams", () => {
  test("filters to exam types within the horizon and sorts chronologically", () => {
    const events: CalEvent[] = [
      event({ id: "late", date: "2026-08-20" }), // beyond 60 days
      event({ id: "past", date: "2026-06-10" }), // before today
      event({ id: "lesson", date: "2026-06-12", type: "Praktisch" }),
      event({
        id: "b",
        date: "2026-06-15",
        start: "11:00",
        type: "Vorstellung zur prakt. Prüfung",
      }),
      event({ id: "a", date: "2026-06-15", start: "08:30" }),
      event({ id: "today", date: "2026-06-11" }),
    ];

    const result = upcomingExams(events, "2026-06-11", 60);
    expect(result.map((item) => item.id)).toEqual(["today", "a", "b"]);
  });

  test("includes the horizon boundary day", () => {
    const events = [event({ id: "edge", date: "2026-08-10" })];
    expect(upcomingExams(events, "2026-06-11", 60)).toHaveLength(1);
    expect(upcomingExams(events, "2026-06-11", 59)).toHaveLength(0);
  });
});

describe("groupExamsByDate", () => {
  test("buckets a sorted list per day, preserving order", () => {
    const exams = [
      event({ id: "1", date: "2026-06-12", start: "09:00" }),
      event({ id: "2", date: "2026-06-12", start: "10:00" }),
      event({ id: "3", date: "2026-06-15", start: "08:00" }),
    ];

    const groups = groupExamsByDate(exams);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.date).toBe("2026-06-12");
    expect(groups[0]?.exams.map((item) => item.id)).toEqual(["1", "2"]);
    expect(groups[1]?.date).toBe("2026-06-15");
    expect(groups[1]?.exams.map((item) => item.id)).toEqual(["3"]);
  });

  test("returns an empty list for no exams", () => {
    expect(groupExamsByDate([])).toEqual([]);
  });
});

describe("countExamsThisWeek", () => {
  test("counts Monday through Sunday of the current week", () => {
    // 2026-06-11 is a Thursday → week is Mon 08.06. – Sun 14.06.
    const exams = [
      event({ id: "mon", date: "2026-06-08" }),
      event({ id: "sun", date: "2026-06-14" }),
      event({ id: "next-mon", date: "2026-06-15" }),
    ];
    expect(countExamsThisWeek(exams, "2026-06-11")).toBe(2);
  });
});

describe("examStats", () => {
  test("splits by type and counts tentative entries", () => {
    const exams = [
      event({ id: "1", date: "2026-06-12" }),
      event({
        id: "2",
        date: "2026-06-12",
        type: "Vorstellung zur prakt. Prüfung",
        tentative: true,
      }),
      event({ id: "3", date: "2026-06-30", tentative: true }),
    ];

    expect(examStats(exams, "2026-06-11")).toEqual({
      theory: 2,
      practical: 1,
      thisWeek: 2,
      tentative: 2,
    });
  });
});

describe("rankByReadiness", () => {
  const student = (
    status: "aktiv" | "inaktiv",
    progress: number,
    theoryProgress: number,
    name: string,
  ) => ({
    name,
    status,
    progress,
    theory: { status: "Aktiv", progress: theoryProgress },
  });

  test("keeps only active students, sorted by progress desc", () => {
    const ranked = rankByReadiness([
      student("aktiv", 42, 46, "Tom"),
      student("inaktiv", 99, 99, "Jonas"),
      student("aktiv", 91, 91, "Aylin"),
      student("aktiv", 78, 78, "Lena"),
    ]);
    expect(ranked.map((item) => item.name)).toEqual(["Aylin", "Lena", "Tom"]);
  });

  test("breaks progress ties via theory progress", () => {
    const ranked = rankByReadiness([
      student("aktiv", 50, 10, "Low"),
      student("aktiv", 50, 90, "High"),
    ]);
    expect(ranked.map((item) => item.name)).toEqual(["High", "Low"]);
  });
});

describe("suggestedExamType", () => {
  const withTheoryStatus = (status: string) => ({
    status: "aktiv" as const,
    progress: 50,
    theory: { status, progress: 50 },
  });

  test("suggests the practical exam once theory is done or running", () => {
    expect(suggestedExamType(withTheoryStatus("Bereit"))).toBe(
      "Vorstellung zur prakt. Prüfung",
    );
    expect(suggestedExamType(withTheoryStatus("In Prüfung"))).toBe(
      "Vorstellung zur prakt. Prüfung",
    );
  });

  test("suggests the theory exam otherwise", () => {
    expect(suggestedExamType(withTheoryStatus("Aktiv"))).toBe("Theorieprüfung");
    expect(suggestedExamType(withTheoryStatus("Pausiert"))).toBe("Theorieprüfung");
  });
});
