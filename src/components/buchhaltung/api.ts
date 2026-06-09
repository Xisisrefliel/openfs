/* ------------------------------------------------------------------ */
/* Buchhaltung fetch layer — typed helpers + a small data hook.        */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";

import type {
  Account,
  CreateTransactionInput,
  JournalRow,
  LedgerResponse,
  QuittungData,
} from "@/lib/accounting-types";

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body.error === "string"
        ? body.error
        : "Anfrage fehlgeschlagen.";
    throw new ApiError(message);
  }
  return body as T;
}

function post<T>(url: string, payload: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* ------------------------------ params ----------------------------- */

/** Local-date ISO (no toISOString — that shifts across timezones). */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "2026-06-08" → "08.06.2026" */
export function formatIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export type StatusFilter = "all" | "active" | "storniert";

export function buildFilterQuery(
  range: DateRange | undefined,
  search: string,
  status: StatusFilter
): string {
  const params = new URLSearchParams();
  if (range?.from) params.set("from", toIsoDate(range.from));
  if (range?.to) params.set("to", toIsoDate(range.to));
  else if (range?.from) params.set("to", toIsoDate(range.from));
  if (search.trim()) params.set("q", search.trim());
  if (status !== "all") params.set("status", status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/* ------------------------------ calls ------------------------------ */

export const accountingApi = {
  ledger: (query: string) =>
    request<LedgerResponse>(`/api/accounting/transactions${query}`),
  journal: (query: string) =>
    request<{ rows: JournalRow[] }>(`/api/accounting/journal${query}`),
  accounts: () =>
    request<{ accounts: Account[] }>("/api/accounting/accounts"),
  setAccountActive: (number: string, active: boolean) =>
    request<{ ok: true }>(`/api/accounting/accounts/${number}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }),
  createTransaction: (input: CreateTransactionInput) =>
    post<{ id: number; belegNr: string | null }>(
      "/api/accounting/transactions",
      input
    ),
  storno: (id: number, reason: string) =>
    post<{ id: number }>(`/api/accounting/transactions/${id}/storno`, {
      reason,
    }),
  quittung: (id: number) =>
    request<QuittungData>(`/api/accounting/quittung/${id}`),
};

/* ------------------------------- hook ------------------------------ */

export function useApi<T>(
  load: () => Promise<T>,
  deps: unknown[]
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then(result => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Fehler beim Laden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}
