/* ------------------------------------------------------------------ */
/* Students — single client-side source of truth                       */
/*                                                                     */
/* Every page that shows students (/fahrschueler, /theorie, the        */
/* dashboard, payment dialog) reads the same DB-backed list from       */
/* /api/students via this hook. Edits go through updateStudent /       */
/* createStudent so they persist across reloads.                       */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";

import type { Student } from "@/lib/student-data";

export type StudentRecord = Student & { id: number };

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

export async function fetchStudents(): Promise<StudentRecord[]> {
  const data = await parseOrThrow<{ students: StudentRecord[] }>(
    await fetch("/api/students")
  );
  return data.students;
}

export async function createStudent(
  input: Partial<Student>
): Promise<StudentRecord> {
  return parseOrThrow<StudentRecord>(
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateStudent(
  id: number,
  input: Partial<Student>
): Promise<StudentRecord> {
  return parseOrThrow<StudentRecord>(
    await fetch(`/api/students/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export function useStudents() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setStudents(await fetchStudents());
    } catch (error) {
      console.error("Fahrschüler konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { students, loading, refresh };
}
