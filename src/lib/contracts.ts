/* ------------------------------------------------------------------ */
/* Verträge — pure helpers for the /vertraege dashboard.               */
/*                                                                     */
/* Contracts are NOT a separate table: every student row carries its   */
/* contract fields (contractNumber, customerNumber, registrationDate,  */
/* classes, status, pricePlanId). These helpers derive display rows    */
/* from the DB-backed students + price-plans lists (use-students /     */
/* use-price-plans) and compute the KPI numbers. No fetching here so   */
/* everything is unit-testable with bun:test.                          */
/* ------------------------------------------------------------------ */

import type { StudentRecord } from "@/hooks/use-students";
import type { StudentStatus } from "@/lib/student-data";
import type { PricePlanRecord } from "@/lib/price-plan";

export type ContractRow = {
  /** students.id — row click navigates to /fahrschueler/:id. */
  studentId: number;
  contractNumber: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  /** "Nachname, Vorname" for display/search. */
  name: string;
  /** Split class list for badges, e.g. "B, A1" → ["B", "A1"]. */
  classes: string[];
  /** Resolved Preisplan name (assigned plan, else first/default plan). */
  planName: string;
  registrationDate: string;
  /** Epoch ms parsed from DD.MM.YYYY — NaN when unparseable. */
  registrationTime: number;
  status: StudentStatus;
};

export type ContractKpis = {
  total: number;
  active: number;
  inactive: number;
  thisMonth: number;
};

/** "12.05.2026" (DD.MM.YYYY, optional ", HH:MM" tail) → epoch ms; NaN otherwise. */
export function parseGermanDate(value: string): number {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(value.trim());
  if (!match) return Number.NaN;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return Number.NaN;
  const date = new Date(year, month - 1, day);
  // Reject rollovers like 31.02. → 03.03.
  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    return Number.NaN;
  }
  return date.getTime();
}

/** "B, A1" / "B,A1" / "B" → ["B", "A1"] (deduplicated, empty-safe). */
export function splitClasses(classes: string): string[] {
  return [
    ...new Set(
      classes
        .split(/[,/]+/)
        .map(part => part.trim())
        .filter(Boolean)
    ),
  ];
}

/** Mirrors PreiseTab: assigned plan, else the first plan as default. */
export function resolvePlanName(
  pricePlanId: number | null | undefined,
  plans: PricePlanRecord[]
): string {
  const plan =
    plans.find(candidate => candidate.id === pricePlanId) ?? plans[0] ?? null;
  return plan?.name ?? "—";
}

export function deriveContractRows(
  students: StudentRecord[],
  plans: PricePlanRecord[]
): ContractRow[] {
  return students.map(student => ({
    studentId: student.id,
    contractNumber: student.contractNumber,
    customerNumber: student.customerNumber,
    firstName: student.firstName,
    lastName: student.lastName,
    name: `${student.lastName}, ${student.firstName}`,
    classes: splitClasses(student.classes),
    planName: resolvePlanName(student.pricePlanId, plans),
    registrationDate: student.registrationDate,
    registrationTime: parseGermanDate(student.registrationDate),
    status: student.status,
  }));
}

/** True when the contract was registered in the same month as `now`. */
export function isInMonth(registrationTime: number, now: Date): boolean {
  if (Number.isNaN(registrationTime)) return false;
  const date = new Date(registrationTime);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function computeContractKpis(
  rows: ContractRow[],
  now: Date = new Date()
): ContractKpis {
  let active = 0;
  let inactive = 0;
  let thisMonth = 0;
  for (const row of rows) {
    if (row.status === "aktiv") active += 1;
    else inactive += 1;
    if (isInMonth(row.registrationTime, now)) thisMonth += 1;
  }
  return { total: rows.length, active, inactive, thisMonth };
}

export type ContractStatusFilter = StudentStatus | "alle";

/** Search by name / contract number / customer number, plus status filter. */
export function filterContractRows(
  rows: ContractRow[],
  query: string,
  status: ContractStatusFilter
): ContractRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter(row => {
    const matchesStatus = status === "alle" || row.status === status;
    if (!matchesStatus) return false;
    if (normalizedQuery.length === 0) return true;
    return [
      row.firstName,
      row.lastName,
      row.name,
      row.contractNumber,
      row.customerNumber,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}
