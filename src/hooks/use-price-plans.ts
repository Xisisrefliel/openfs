/* ------------------------------------------------------------------ */
/* Preispläne — single client-side source of truth.                    */
/*                                                                     */
/* The /preisangebot page and the Fahrschüler detail "Preise" tab      */
/* read the same DB-backed list from /api/price-plans via this hook.   */
/* Edits go through createPricePlan / updatePricePlan / deletePricePlan */
/* so they persist across reloads.                                     */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";

import type { PricePlanInput, PricePlanRecord } from "@/lib/price-plan";

async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

export async function fetchPricePlans(): Promise<PricePlanRecord[]> {
  const data = await parseOrThrow<{ plans: PricePlanRecord[] }>(
    await fetch("/api/price-plans")
  );
  return data.plans;
}

export async function createPricePlan(
  input: PricePlanInput
): Promise<PricePlanRecord> {
  return parseOrThrow<PricePlanRecord>(
    await fetch("/api/price-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function updatePricePlan(
  id: number,
  input: Partial<PricePlanInput>
): Promise<PricePlanRecord> {
  return parseOrThrow<PricePlanRecord>(
    await fetch(`/api/price-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function deletePricePlan(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/price-plans/${id}`, { method: "DELETE" })
  );
}

export function usePricePlans() {
  const [plans, setPlans] = useState<PricePlanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setPlans(await fetchPricePlans());
    } catch (error) {
      console.error("Preispläne konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plans, loading, refresh };
}
