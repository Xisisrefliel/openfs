/* ------------------------------------------------------------------ */
/* Theorie Gruppen — single client-side source of truth                */
/*                                                                     */
/* The /theorie-gruppen admin view reads the DB-backed list from       */
/* /api/theory-groups via this hook. Edits go through                  */
/* createTheoryGroup / updateTheoryGroup so they persist.              */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export type TheoryGroupStatus = "aktiv" | "abgeschlossen";

export type TheoryGroupMember = {
  id: number;
  name: string;
};

export type TheoryGroup = {
  id: number;
  name: string;
  klass: string;
  weekday: string;
  time: string;
  room: string;
  instructor: string;
  capacity: number;
  /** Raw membership (student ids) as stored on the server. */
  studentIds: number[];
  /** studentIds resolved to names via the students table. */
  members: TheoryGroupMember[];
  status: TheoryGroupStatus;
  createdAt: string;
};

export type TheoryGroupInput = Omit<TheoryGroup, "id" | "members" | "createdAt">;

export async function fetchTheoryGroups(): Promise<TheoryGroup[]> {
  const data = await parseOrThrow<{ groups: TheoryGroup[] }>(
    await fetch("/api/theory-groups")
  );
  return data.groups;
}

export async function createTheoryGroup(
  input: Partial<TheoryGroupInput>
): Promise<TheoryGroup> {
  return parseOrThrow<TheoryGroup>(
    await fetch("/api/theory-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updateTheoryGroup(
  id: number,
  input: Partial<TheoryGroupInput>
): Promise<TheoryGroup> {
  return parseOrThrow<TheoryGroup>(
    await fetch(`/api/theory-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deleteTheoryGroup(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/theory-groups/${id}`, { method: "DELETE" })
  );
}

export function useTheoryGroups() {
  const { items: groups, loading, refresh } = useFetchList(
    fetchTheoryGroups,
    "Theorie-Gruppen konnten nicht geladen werden"
  );
  return { groups, loading, refresh };
}
