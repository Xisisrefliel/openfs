/* ------------------------------------------------------------------ */
/* Statistik — read-only aggregations over the existing tables.        */
/* No new tables, no writes: students, instructors, vehicles,          */
/* calendar_events, accounts, transactions and bookings are queried    */
/* as-is. The HTTP wrapper (statisticsRoutes) lives at the bottom and  */
/* is mounted into Bun.serve() in src/index.ts like the factories in   */
/* routes.ts.                                                          */
/* ------------------------------------------------------------------ */

import type { Database } from "./sqlite";
import type { BunRequest } from "bun";

import { ValidationError } from "./engine";

/* ------------------------------- types ----------------------------- */

export type MonthCount = {
  /** ISO month "YYYY-MM". */
  month: string;
  count: number;
};

export type StudentStatistics = {
  total: number;
  aktiv: number;
  inaktiv: number;
  registrationsPerMonth: MonthCount[];
};

export type LessonTypeCount = {
  type: string;
  count: number;
};

export type LessonsPerMonth = {
  /** ISO month "YYYY-MM". */
  month: string;
  praktisch: number;
  theorie: number;
  pruefung: number;
  andere: number;
  total: number;
};

export type LessonStatistics = {
  total: number;
  byType: LessonTypeCount[];
  perMonth: LessonsPerMonth[];
};

export type InstructorUtilization = {
  instructor: string;
  events: number;
  minutes: number;
};

export type InstructorStatistics = {
  total: number;
  aktiv: number;
  utilization: InstructorUtilization[];
};

export type VehicleStatistics = {
  total: number;
  aktiv: number;
  wartung: number;
};

export type RevenuePerMonth = {
  /** ISO month "YYYY-MM". */
  month: string;
  cents: number;
};

export type RevenueStatistics = {
  totalCents: number;
  perMonth: RevenuePerMonth[];
};

export type Statistics = {
  students: StudentStatistics;
  lessons: LessonStatistics;
  instructors: InstructorStatistics;
  vehicles: VehicleStatistics;
  revenue: RevenueStatistics;
};

/* ------------------------------ students --------------------------- */

/* registration_date is free text in the schema — seeds use the German
   "DD.MM.YYYY" form, ISO "YYYY-MM-DD" also occurs. Normalize both to
   "YYYY-MM"; anything else (incl. empty) is skipped. */
export function registrationMonth(raw: string): string | null {
  const value = raw.trim();
  const german = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (german) return `${german[3]}-${german[2]}`;
  const iso = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return null;
}

export function studentStatistics(db: Database): StudentStatistics {
  const rows = db
    .query<{ status: string; registration_date: string }, []>(
      "SELECT status, registration_date FROM students"
    )
    .all();

  const perMonth = new Map<string, number>();
  let aktiv = 0;
  for (const row of rows) {
    if (row.status === "aktiv") aktiv += 1;
    const month = registrationMonth(row.registration_date);
    if (month) perMonth.set(month, (perMonth.get(month) ?? 0) + 1);
  }

  return {
    total: rows.length,
    aktiv,
    inaktiv: rows.length - aktiv,
    registrationsPerMonth: [...perMonth.entries()]
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => (a.month < b.month ? -1 : 1)),
  };
}

/* ------------------------------ lessons ---------------------------- */

/* Stacked-chart buckets for the five event types. Both exam types land
   in "pruefung" so the chart stays readable. */
const LESSON_BUCKETS: Record<string, keyof Omit<LessonsPerMonth, "month" | "total">> = {
  Praktisch: "praktisch",
  Theorie: "theorie",
  "Vorstellung zur prakt. Prüfung": "pruefung",
  Theorieprüfung: "pruefung",
  Andere: "andere",
};

export function lessonStatistics(db: Database): LessonStatistics {
  const rows = db
    .query<{ month: string; type: string; count: number }, []>(
      `SELECT substr(date, 1, 7) AS month, type, count(*) AS count
       FROM calendar_events
       GROUP BY month, type
       ORDER BY month`
    )
    .all();

  const byType = new Map<string, number>();
  const perMonth = new Map<string, LessonsPerMonth>();
  let total = 0;

  for (const row of rows) {
    total += row.count;
    byType.set(row.type, (byType.get(row.type) ?? 0) + row.count);

    let bucket = perMonth.get(row.month);
    if (!bucket) {
      bucket = {
        month: row.month,
        praktisch: 0,
        theorie: 0,
        pruefung: 0,
        andere: 0,
        total: 0,
      };
      perMonth.set(row.month, bucket);
    }
    bucket[LESSON_BUCKETS[row.type] ?? "andere"] += row.count;
    bucket.total += row.count;
  }

  return {
    total,
    byType: [...byType.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "de")),
    perMonth: [...perMonth.values()],
  };
}

/* ---------------------------- instructors -------------------------- */

export function instructorStatistics(db: Database): InstructorStatistics {
  const counts = db
    .query<{ total: number; aktiv: number }, []>(
      `SELECT count(*) AS total,
              sum(CASE WHEN status = 'aktiv' THEN 1 ELSE 0 END) AS aktiv
       FROM instructors`
    )
    .get()!;

  /* start/end are fixed "HH:MM" strings (validated on write), so the
     duration arithmetic is safe inline. */
  const utilization = db
    .query<InstructorUtilization, []>(
      `SELECT instructor,
              count(*) AS events,
              sum(
                (CAST(substr("end", 1, 2) AS INTEGER) * 60 + CAST(substr("end", 4, 2) AS INTEGER))
                - (CAST(substr(start, 1, 2) AS INTEGER) * 60 + CAST(substr(start, 4, 2) AS INTEGER))
              ) AS minutes
       FROM calendar_events
       WHERE instructor <> ''
       GROUP BY instructor
       ORDER BY minutes DESC, instructor`
    )
    .all();

  return {
    total: counts.total,
    aktiv: counts.aktiv ?? 0,
    utilization,
  };
}

/* ------------------------------ vehicles --------------------------- */

export function vehicleStatistics(db: Database): VehicleStatistics {
  const row = db
    .query<{ total: number; aktiv: number }, []>(
      `SELECT count(*) AS total,
              sum(CASE WHEN status = 'aktiv' THEN 1 ELSE 0 END) AS aktiv
       FROM vehicles`
    )
    .get()!;
  const aktiv = row.aktiv ?? 0;
  return { total: row.total, aktiv, wartung: row.total - aktiv };
}

/* ------------------------------ revenue ---------------------------- */

/* Umsatz = booking lines credited (Haben) to an Erlöskonto. Storno
   pairs cancel out by definition, so both the reversal transaction
   (storno_of) and the reversed original (storniert_by) are excluded —
   what remains is the active revenue ledger. */
export function revenueStatistics(db: Database): RevenueStatistics {
  const perMonth = db
    .query<RevenuePerMonth, []>(
      `SELECT substr(t.date, 1, 7) AS month, sum(b.amount_cents) AS cents
       FROM bookings b
       JOIN transactions t ON t.id = b.transaction_id
       JOIN accounts a ON a.number = b.haben_account
       WHERE a.kind = 'erloes'
         AND t.storno_of IS NULL
         AND t.storniert_by IS NULL
       GROUP BY month
       ORDER BY month`
    )
    .all();

  return {
    totalCents: perMonth.reduce((sum, row) => sum + row.cents, 0),
    perMonth,
  };
}

/* ------------------------------ payload ---------------------------- */

export function getStatistics(db: Database): Statistics {
  return {
    students: studentStatistics(db),
    lessons: lessonStatistics(db),
    instructors: instructorStatistics(db),
    vehicles: vehicleStatistics(db),
    revenue: revenueStatistics(db),
  };
}

/* ------------------------------- HTTP ------------------------------ */

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

export function statisticsRoutes(db: Database) {
  return {
    "/api/statistics": {
      GET: (req: BunRequest) => handle(() => json(getStatistics(db)))(),
    },
  };
}
