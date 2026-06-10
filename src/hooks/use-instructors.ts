/* ------------------------------------------------------------------ */
/* Instructors — single client-side source of truth                    */
/*                                                                     */
/* Every page that shows or assigns a Fahrlehrer/in (/fahrlehrer,      */
/* /kalendar, /fahrschueler, /fahrzeuge, /neue-schueler) reads the     */
/* same list from the server via this hook, so names stay consistent   */
/* across the whole app.                                               */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useState } from "react";

export type InstructorStatus = "aktiv" | "inaktiv";

export type Instructor = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  classes: string;
  vehicle: string;
  since: string;
  status: InstructorStatus;
};

export type InstructorInput = Omit<Instructor, "id">;

/* Sentinel used by students/events without an assigned instructor. */
export const UNASSIGNED_INSTRUCTOR = "Nicht zugeteilt";

export const instructorName = (
  instructor: Pick<Instructor, "firstName" | "lastName">
) => `${instructor.firstName} ${instructor.lastName}`.trim();

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

export async function fetchInstructors(): Promise<Instructor[]> {
  const data = await parseOrThrow<{ instructors: Instructor[] }>(
    await fetch("/api/instructors")
  );
  return data.instructors;
}

export async function createInstructor(
  input: InstructorInput
): Promise<Instructor> {
  return parseOrThrow<Instructor>(
    await fetch("/api/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateInstructor(
  id: number,
  input: Partial<InstructorInput>
): Promise<Instructor> {
  return parseOrThrow<Instructor>(
    await fetch(`/api/instructors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteInstructor(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/instructors/${id}`, { method: "DELETE" })
  );
}

export function useInstructors() {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setInstructors(await fetchInstructors());
    } catch (error) {
      console.error("Fahrlehrer konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* Full names of all instructors (active first), for filter lists. */
  const names = useMemo(() => instructors.map(instructorName), [instructors]);

  /* Names offered when assigning someone — active instructors only,
     plus the explicit "not assigned" option. */
  const assignableNames = useMemo(
    () => [
      ...instructors
        .filter(instructor => instructor.status === "aktiv")
        .map(instructorName),
      UNASSIGNED_INSTRUCTOR,
    ],
    [instructors]
  );

  return { instructors, names, assignableNames, loading, refresh };
}
