/* ------------------------------------------------------------------ */
/* Calendar data — single source of truth                              */
/*                                                                     */
/* Both the dashboard (/) and the calendar (/kalendar) read their      */
/* events from here, so every count/agenda/chart on the dashboard      */
/* reflects the same items shown on the calendar. When real data is    */
/* wired up later, only `getCalendarEvents()` needs to change.         */
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

/* Demo "now" — the seed week is anchored to this date. */
export const TODAY = new Date(2026, 5, 9); // Di, 09.06.2026

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

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/*                                                                     */
/* Authored by weekday (0 = Monday … 6 = Sunday) for convenience, then */
/* anchored to TODAY's week by getCalendarEvents().                    */
/* ------------------------------------------------------------------ */

type SeedEvent = Omit<CalEvent, "date"> & { day: number };

const seedEvents: SeedEvent[] = [
  {
    id: "evt-theory-mo-1800",
    day: 0,
    start: "18:00",
    end: "19:30",
    title: "Thema 9: Verkehrsverhalten bei Fahrmanöver; Verkehrsbeobachtung",
    subtitle: "Köksal Gül",
    location: "Fahrschule Gül",
    instructor: "Köksal Gül",
    type: "Theorie",
  },
  {
    id: "evt-drive-di-0900",
    day: 1,
    start: "09:00",
    end: "09:45",
    title: "Fahrstunde · Stadt",
    subtitle: "Lena Braun",
    instructor: "Nadine Aksoy",
    vehicle: "Golf",
    type: "Praktisch",
  },
  {
    id: "evt-theory-di-1800",
    day: 1,
    start: "18:00",
    end: "19:30",
    title: "Thema 10: Ruhender Verkehr",
    subtitle: "Köksal Gül",
    location: "Fahrschule Gül",
    instructor: "Köksal Gül",
    type: "Theorie",
  },
  {
    id: "evt-drive-mi-1100",
    day: 2,
    start: "11:00",
    end: "12:30",
    title: "Überlandfahrt · Klasse B",
    subtitle: "Jonas Meyer",
    instructor: "Emre Gül",
    vehicle: "BMW X1",
    type: "Praktisch",
  },
  {
    id: "evt-drive-do-0830",
    day: 3,
    start: "08:30",
    end: "09:15",
    title: "Fahrübungsstunde · B197",
    subtitle: "Zahra Rezaie",
    instructor: "Köksal Gül",
    vehicle: "Golf",
    type: "Praktisch",
    tentative: true,
  },
  {
    id: "evt-testprep-do-1400",
    day: 3,
    start: "14:00",
    end: "15:30",
    title: "Vorstellung · Prüfungsvorbereitung",
    subtitle: "Aylin Demir",
    instructor: "Emre Gül",
    vehicle: "BMW X1",
    type: "Vorstellung zur prakt. Prüfung",
  },
  {
    id: "evt-theory-test-fr-1000",
    day: 4,
    start: "10:00",
    end: "10:45",
    title: "Theorieprüfung · TÜV",
    subtitle: "Tom Richter",
    location: "TÜV Süd",
    instructor: "Nadine Aksoy",
    type: "Theorieprüfung",
  },
  {
    id: "evt-drive-fr-1600",
    day: 4,
    start: "16:00",
    end: "17:00",
    title: "Fahrstunde · Autobahn",
    subtitle: "Mara Köhler",
    instructor: "Nadine Aksoy",
    vehicle: "Golf",
    type: "Praktisch",
  },
  {
    id: "evt-first-aid-sa-0900",
    day: 5,
    start: "09:00",
    end: "11:00",
    title: "Erste-Hilfe Kurs",
    subtitle: "Gruppe A",
    location: "Fahrschule Gül",
    instructor: "Köksal Gül",
    type: "Andere",
  },
];

/* Resolve seed weekdays to absolute dates within TODAY's week. Returns a
   fresh array each call so callers can own/mutate it (e.g. drag, delete). */
export function getCalendarEvents(): CalEvent[] {
  const weekStart = startOfWeek(TODAY);
  return seedEvents.map(({ day, ...rest }) => ({
    ...rest,
    date: toISODate(addDays(weekStart, day)),
  }));
}
