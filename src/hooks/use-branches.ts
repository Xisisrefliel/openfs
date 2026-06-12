/* ------------------------------------------------------------------ */
/* Branches (Standorte) — single client-side source of truth           */
/*                                                                     */
/* The /fahrschule admin page reads the DB-backed branch list from     */
/* /api/branches via this hook so all edits persist across reloads.    */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export type BranchStatus = "offen" | "geschlossen";

export type Branch = {
  id: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  isMain: boolean;
  status: BranchStatus;
  createdAt: string;
};

export type BranchInput = Omit<Branch, "id" | "createdAt">;

export async function fetchBranches(): Promise<Branch[]> {
  const data = await parseOrThrow<{ branches: Branch[] }>(await fetch("/api/branches"));
  return data.branches;
}

export async function createBranch(input: Partial<BranchInput>): Promise<Branch> {
  return parseOrThrow<Branch>(
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateBranch(
  id: number,
  input: Partial<BranchInput>,
): Promise<Branch> {
  return parseOrThrow<Branch>(
    await fetch(`/api/branches/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteBranch(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/branches/${id}`, { method: "DELETE" }),
  );
}

export function useBranches() {
  const {
    items: branches,
    loading,
    refresh,
  } = useFetchList(fetchBranches, "Standorte konnten nicht geladen werden");
  return { branches, loading, refresh };
}
