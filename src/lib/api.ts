/* ------------------------------------------------------------------ */
/* Shared client fetch helpers for the list hooks in src/hooks/.       */
/* (The Buchhaltung pages keep their own layer in                       */
/* src/components/buchhaltung/api.ts — different error semantics.)      */
/* ------------------------------------------------------------------ */

import { useCallback, useEffect, useState } from "react";

export async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}

/** Fetch-on-mount list state shared by the use-students/-instructors/
 *  -vehicles/-price-plans hooks. `errorLabel` feeds the console message.
 *
 *  IMPORTANT: `fetcher` must be a stable reference (e.g. a module-level
 *  function like `fetchStudents`). Never pass an inline arrow from a
 *  component — that would cause a render loop via the useCallback dep. */
export function useFetchList<T>(
  fetcher: () => Promise<T[]>,
  errorLabel: string
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await fetcher());
    } catch (error) {
      console.error(`${errorLabel}:`, error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, errorLabel]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, refresh };
}
