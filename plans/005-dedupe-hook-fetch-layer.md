# Plan 005: Deduplicate the client fetch layer (shared `parseOrThrow` + `useFetchList`)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/hooks/ src/lib/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW–MED (mechanical refactor, but four hooks feed most pages)
- **Depends on**: none (plan 003 recommended first for the typecheck gate)
- **Category**: tech-debt
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

Four hooks re-declare the exact same 8-line `parseOrThrow<T>` helper and the
exact same `useState`/`useCallback(refresh)`/`useEffect` list-fetching
pattern: `use-students.ts`, `use-instructors.ts`, `use-vehicles.ts`,
`use-price-plans.ts`. Any improvement to error handling (or the calendar hook
that plan 009 adds as a fifth copy) currently has to be made four times and
can drift. This plan extracts one shared helper module and one generic hook,
then makes the four hooks thin wrappers. Behavior must not change.

## Current state

- The duplicated helper — byte-identical in all four files
  (`src/hooks/use-students.ts:16-24`, `src/hooks/use-vehicles.ts:29-37`,
  `src/hooks/use-instructors.ts:35-43`, `src/hooks/use-price-plans.ts:14-22`):

```ts
async function parseOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? "Anfrage fehlgeschlagen.");
  }
  return data;
}
```

- The duplicated hook pattern — e.g. `src/hooks/use-vehicles.ts:77-96`
  (students/instructors/price-plans differ only in names and the German
  console message):

```ts
export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setVehicles(await fetchVehicles());
    } catch (error) {
      console.error("Fahrzeuge konnten nicht geladen werden:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vehicles, loading, refresh };
}
```

- `use-instructors.ts:83-117` additionally derives `names` and
  `assignableNames` via `useMemo` — those memos stay in that hook.
- `use-mobile.ts` and `use-vehicle-options.ts` do NOT follow this pattern —
  leave them alone.
- Each hook also exports plain async functions (`fetchX`, `createX`,
  `updateX`, `deleteX`) that pages import directly — those exports and their
  signatures must remain identical (pages like `src/Fahrzeuge.tsx` import
  `createVehicle`, `deleteVehicle`, `updateVehicle` by name).
- A second, separate fetch layer exists at
  `src/components/buchhaltung/api.ts` (`request`/`useApi`) for the
  accounting pages. **Do not merge it** — it has different error semantics
  (`ApiError`, `error` state instead of console). Out of scope.
- Path alias: `@/*` → `./src/*` (see `tsconfig.json`); hooks import with
  `@/lib/...`.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `bunx tsc --noEmit` | exit 0 (or only the pre-existing TS5101 baseUrl error if plan 003 hasn't landed) |
| Tests     | `bun test`          | all pass            |
| Dev smoke | `bun dev`           | server starts; pages load (manual) |

## Scope

**In scope**:
- `src/lib/api.ts` (create — shared `parseOrThrow` + `useFetchList`)
- `src/hooks/use-students.ts`
- `src/hooks/use-instructors.ts`
- `src/hooks/use-vehicles.ts`
- `src/hooks/use-price-plans.ts`
- `src/lib/api.test.ts` (create)

**Out of scope** (do NOT touch):
- `src/components/buchhaltung/api.ts` — intentionally separate fetch layer.
- `src/hooks/use-vehicle-options.ts`, `src/hooks/use-mobile.ts` — different
  shapes, not part of the duplication.
- Any page component (`src/*.tsx`) — the hooks' public API must not change,
  so no caller updates should be needed. If a caller breaks, that's a STOP.

## Git workflow

- Branch: `advisor/005-dedupe-hooks` (or direct to `main`, matching repo habit).
- One commit: `dedupe hook fetch layer into shared helpers`.
- Do NOT push unless instructed.

## Steps

### Step 1: Create `src/lib/api.ts`

```ts
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
 *  -vehicles/-price-plans hooks. `errorLabel` feeds the console message. */
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
```

IMPORTANT: `useFetchList` depends on `fetcher` identity. The module-level
`fetchStudents` / `fetchVehicles` / etc. functions are stable references, so
passing them directly is safe. Never pass an inline arrow from a component —
note this in a comment.

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 2: Convert the four hooks

For each of `use-students.ts`, `use-vehicles.ts`, `use-price-plans.ts`:
delete the local `parseOrThrow`, import it from `@/lib/api`, and rewrite the
hook body as (students shown; adapt names/messages):

```ts
import { parseOrThrow, useFetchList } from "@/lib/api";

export function useStudents() {
  const { items: students, loading, refresh } = useFetchList(
    fetchStudents,
    "Fahrschüler konnten nicht geladen werden"
  );
  return { students, loading, refresh };
}
```

For `use-instructors.ts`: same conversion, but keep the existing `names` /
`assignableNames` `useMemo` blocks (lines 101–114) operating on the
`instructors` array returned by `useFetchList`.

All other exports in each file (types, `fetchX`/`createX`/`updateX`/`deleteX`,
`UNASSIGNED_INSTRUCTOR`, `instructorName`) stay byte-identical.

**Verify after each file**: `bunx tsc --noEmit` → no new errors.

### Step 3: Tests for the shared helpers — `src/lib/api.test.ts`

Use `bun:test`, model after `src/lib/money.test.ts` (plain describe/test).
Test `parseOrThrow` directly with constructed `Response` objects:

- 200 + valid JSON → resolves with the data.
- 400 + `{ "error": "Kaputt." }` → rejects with message `"Kaputt."`.
- 500 + non-JSON body → rejects with `"Anfrage fehlgeschlagen."`.
- 200 + empty/invalid JSON body → rejects with `"Anfrage fehlgeschlagen."`
  (this codifies the current `!data` behavior).

(`useFetchList` is a React hook; without a DOM test setup, do not test it
directly — the four pages exercise it. Do not add a DOM testing framework in
this plan.)

**Verify**: `bun test src/lib/api` → all pass.

### Step 4: Full gate + manual smoke

**Verify**: `bun test` → all pass. `bunx tsc --noEmit` → no new errors.
`grep -rn "async function parseOrThrow" src/hooks/` → no matches.
Manual: `bun dev`, open `/fahrschueler`, `/fahrlehrer`, `/fahrzeuge`,
`/preisangebot` — each lists data; create one record on one page and confirm
the list refreshes.

## Test plan

See Step 3. Pattern exemplar: `src/lib/money.test.ts`.

## Done criteria

- [ ] `grep -rn "async function parseOrThrow" src/hooks/` → 0 matches
- [ ] `src/lib/api.ts` exists; all four hooks import from it
- [ ] Public exports of the four hooks unchanged (`git diff` shows no
      removed/renamed exports)
- [ ] `bun test` exits 0, including ≥ 4 new tests in `src/lib/api.test.ts`
- [ ] `bunx tsc --noEmit` → no new errors
- [ ] No page component modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Converting a hook forces a change in any file under `src/` outside the
  in-scope list (the hooks' public API was less stable than assessed).
- The `useFetchList` dependency on `fetcher` causes a render loop in manual
  smoke testing (would mean a caller passes an unstable function — report
  which one).

## Maintenance notes

- Plan 009 (calendar persistence) should build its `use-calendar-events`
  hook on `useFetchList` — that's the payoff of this refactor.
- Future shared concerns (request dedup, optimistic updates) now have a
  single home: `src/lib/api.ts`. Both were considered and deliberately
  deferred — datasets are tiny and local.
- Reviewer: check that the four hooks' error console messages survived (the
  German labels are user-facing via devtools and were kept on purpose).
