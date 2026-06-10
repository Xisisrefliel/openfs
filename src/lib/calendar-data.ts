/* ------------------------------------------------------------------ */
/* Calendar data — single source of truth                              */
/*                                                                     */
/* Shared event type, date helpers, and labels for the calendar UI.    */
/* Events are persisted in the DB and read through the                  */
/* use-calendar-events hook; this file holds the pure types/helpers     */
/* the dashboard, calendar, and Stunden tab share.                      */
/* ------------------------------------------------------------------ */

export type EventType =
  | "Praktisch"
  | "Theorie"
  | "Vorstellung zur prakt. Prüfung"
  | "Theorieprüfung"
  | "Andere";

export type CalEvent = {
  id: string;
  date: string; // ISO calendar date, e.g. "2026-06-09"
  start: string;
  end: string;
  title: string;
  subtitle?: string;
  location?: string;
  instructor: string;
  vehicle?: string;
  type: EventType;
  tentative?: boolean;
};

/* The app's notion of "today" — drives week anchoring/highlighting.
   Events themselves are persisted in the DB (see use-calendar-events). */
export const TODAY = new Date();

export const eventTypeOptions: EventType[] = [
  "Praktisch",
  "Theorie",
  "Vorstellung zur prakt. Prüfung",
  "Theorieprüfung",
  "Andere",
];

/* Short, badge-friendly labels per event type. */
export const eventTypeShortLabel: Record<EventType, string> = {
  Praktisch: "Praxis",
  Theorie: "Theorie",
  "Vorstellung zur prakt. Prüfung": "Prüfung",
  Theorieprüfung: "TÜV",
  Andere: "Extra",
};

/* A "Fahrstunde" is a regular practical driving lesson. Theory lessons,
   exams, exam prep and other appointments are NOT Fahrstunden. */
export const isFahrstunde = (event: { type: EventType }) =>
  event.type === "Praktisch";

export const nonFahrstundeTypes = eventTypeOptions.filter(
  type => !isFahrstunde({ type })
);

/* ------------------------------------------------------------------ */
/* Date helpers                                                        */
/* ------------------------------------------------------------------ */

export const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (result.getDay() + 6) % 7; // Monday = 0
  result.setDate(result.getDate() - day);
  return result;
};

export const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const parseISODate = (value: string) => {
  const [year = 0, month = 1, day = 1] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const toMinutes = (value: string) => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};
