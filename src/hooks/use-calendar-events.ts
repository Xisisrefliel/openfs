/* ------------------------------------------------------------------ */
/* Calendar events — single client-side source of truth                 */
/*                                                                     */
/* The calendar (/kalendar), the dashboard (/) and the student Stunden  */
/* tab all read events from this hook so every create/move/edit/delete  */
/* persists and survives reloads.                                       */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";
import type { CalEvent } from "@/lib/calendar-data";
import type { CreateTransactionInput } from "@/lib/accounting-types";

export type CalendarEventInput = Omit<CalEvent, "id" | "billedTransactionId" | "billedActive">;

export async function fetchCalendarEvents(): Promise<CalEvent[]> {
  const data = await parseOrThrow<{ events: CalEvent[] }>(
    await fetch("/api/calendar-events")
  );
  return data.events;
}

export async function createCalendarEvent(
  input: Partial<CalendarEventInput>
): Promise<CalEvent> {
  return parseOrThrow<CalEvent>(
    await fetch("/api/calendar-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateCalendarEvent(
  id: number,
  input: Partial<CalendarEventInput>
): Promise<CalEvent> {
  return parseOrThrow<CalEvent>(
    await fetch(`/api/calendar-events/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteCalendarEvent(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/calendar-events/${id}`, { method: "DELETE" })
  );
}

export async function billCalendarEvent(
  id: string,
  input: CreateTransactionInput
): Promise<{ transaction: { id: number }; event: CalEvent }> {
  return parseOrThrow<{ transaction: { id: number }; event: CalEvent }>(
    await fetch(`/api/calendar-events/${id}/bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function recordExamResult(
  id: string,
  result: "bestanden" | "nicht_bestanden" | null
): Promise<CalEvent> {
  return parseOrThrow<CalEvent>(
    await fetch(`/api/calendar-events/${id}/exam-result`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    })
  );
}

export function useCalendarEvents() {
  const { items: events, loading, refresh } = useFetchList(
    fetchCalendarEvents,
    "Termine konnten nicht geladen werden"
  );
  return { events, loading, refresh };
}
