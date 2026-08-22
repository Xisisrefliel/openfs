/* ------------------------------------------------------------------ */
/* Shared client fetch helpers for the list hooks in src/hooks/.       */
/* (The Buchhaltung pages keep their own layer in                       */
/* src/components/buchhaltung/api.ts — different error semantics.)      */
/* ------------------------------------------------------------------ */

import { useEffect } from "react";
import { useQuery, type QueryKey } from "@tanstack/react-query";

const EMPTY_LIST: never[] = [];

export async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

/** Cached list state shared by the DB-backed list hooks. TanStack Query
 *  deduplicates StrictMode mounts and shares results between components. */
export function useFetchList<T>(
  queryKey: QueryKey,
  fetcher: () => Promise<T[]>,
  errorLabel: string,
) {
  const query = useQuery({ queryKey, queryFn: fetcher });

  useEffect(() => {
    if (query.error) console.error(`${errorLabel}:`, query.error);
  }, [errorLabel, query.error]);

  return {
    items: query.data ?? (EMPTY_LIST as T[]),
    loading: query.isPending,
    refresh: query.refetch,
  };
}
