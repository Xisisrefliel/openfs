/* ------------------------------------------------------------------ */
/* Student balances — real Guthaben aggregated from the ledger.        */
/*                                                                     */
/* Fetches /api/student-balances once on mount; call refresh() after   */
/* a new payment or storno to update the display without a full reload. */
/* ------------------------------------------------------------------ */

import { parseOrThrow, useFetchList } from "@/lib/api";

export type StudentBalanceRecord = {
  customerNo: string;
  name: string;
  balanceCents: number;
};

export async function fetchStudentBalances(): Promise<StudentBalanceRecord[]> {
  const data = await parseOrThrow<{ balances: StudentBalanceRecord[] }>(
    await fetch("/api/student-balances"),
  );
  return data.balances;
}

export function useStudentBalances() {
  const {
    items: balances,
    loading,
    refresh,
  } = useFetchList(fetchStudentBalances, "Guthaben konnten nicht geladen werden");
  return { balances, loading, refresh };
}
