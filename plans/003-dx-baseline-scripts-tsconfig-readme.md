# Plan 003 (v2): Establish the DX baseline — test/typecheck scripts, fix the tsconfig deprecation AND the nine type errors it was masking, write a real README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 30287a8..HEAD -- package.json tsconfig.json README.md bun-env.d.ts src/App.tsx src/Fahrschueler.tsx src/Fahrzeuge.tsx src/server/routes.ts src/server/students.ts src/server/vehicles.ts src/components/ui/calendar.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M (was S in v1 — expanded after execution discovered masked type errors)
- **Risk**: LOW–MED
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `30287a8`, 2026-06-10 (v2; v1 was at `3d7e8c0`)

## Why this matters (v2 history included)

Every other plan uses `bun test` and `bunx tsc --noEmit` as verification
gates. The typecheck does not exit 0: `tsconfig.json` uses the deprecated
`baseUrl`, which under TypeScript 6.0.3 is a hard TS5101 error that **aborts
type-checking early**. The v1 executor discovered that removing `baseUrl`
lets the checker run to completion and surface **nine pre-existing type
errors** in `src/` that were invisible before. So a working typecheck gate
requires both removing `baseUrl` AND fixing those nine errors. The README is
still the unmodified Bun template; the app's purpose and its no-auth
assumption are undocumented.

## Current state

- `package.json` scripts (lines 6–10): only `dev`, `build`, `start`.
- `tsconfig.json:24` — `"baseUrl": ".",` followed by `paths: { "@/*": ["./src/*"] }`.
  With `"moduleResolution": "bundler"`, `paths` works without `baseUrl`
  (entries are relative). Verified by the v1 executor: removing `baseUrl`
  produces NO `@/...` resolution errors.
- `bun-env.d.ts` — declares `*.svg` and `*.module.css` only; **no plain
  `*.css` declaration** (causes error 1 below).
- `bunx tsc --noEmit` after removing `baseUrl` reports exactly these nine
  errors (verified during v1 execution at commit `30287a8`):

  1. `src/App.tsx(1,8) TS2882` — side-effect import `./index.css` has no
     module declaration.
  2. `src/components/ui/calendar.tsx(91,9) TS2353` — object literal property
     `table` does not exist on react-day-picker's `ClassNames` type
     (vendored shadcn component vs react-day-picker v10 type changes).
  3. `src/Fahrschueler.tsx(59,30) TS18048` — `datePart` is possibly
     undefined.
  4. `src/Fahrzeuge.tsx(163,5) TS2322` — detail array element type mismatch
     (missing `Icon`).
  5. `src/Fahrzeuge.tsx(417,35) TS2339` — property `Icon` does not exist on
     `VehicleDetail`.
  6. `src/server/routes.ts(261,31) TS2345` — `Uint8Array` not assignable to
     `BodyInit` (the DATEV export `new Response(bytes, ...)`).
  7. `src/server/students.ts(255,30) TS2344` — tuple type from
     `ReturnType<typeof writeParams>` incompatible with `SQLQueryBindings`.
  8. `src/server/students.ts(264,12) TS2554` — wrong argument count
     (follow-on from 7).
  9. `src/server/vehicles.ts(158,30) TS2322` — `string | VehicleDetail[]`
     not assignable to `string`.

- `bun test` passes (58+ tests). README.md is the 294-byte Bun template.
- App facts for the README rewrite: single-user web app for managing a
  German driving school (Fahrschule Gül). Bun.serve backend (`src/index.ts`)
  + React 19 SPA. SQLite at `data/fahrschule.db` (bun:sqlite, WAL).
  Features: dashboard, week calendar, student/instructor/vehicle/price-plan
  management, double-entry accounting (SKR 04, GoBD-shaped: immutable
  bookings, Storno-only corrections, gapless number sequences — see
  `src/server/db.ts:1-9`), Quittungen, DATEV CSV export, company profile.
  **No authentication anywhere** — acceptable for local single-user use,
  must be documented.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `bun install`       | exit 0              |
| Tests     | `bun test`          | all pass            |
| Typecheck | `bunx tsc --noEmit` | exit 0 after Steps 1–2 |

## Scope

**In scope**:
- `package.json`, `tsconfig.json`, `README.md`, `bun-env.d.ts`
- Minimal type-level fixes ONLY in: `src/App.tsx`,
  `src/components/ui/calendar.tsx`, `src/Fahrschueler.tsx`,
  `src/Fahrzeuge.tsx`, `src/server/routes.ts`, `src/server/students.ts`,
  `src/server/vehicles.ts`

**Out of scope**:
- ANY runtime behavior change. Every fix in Step 2 must be type-level
  (annotations, declarations, narrowing, targeted casts). If a fix seems to
  require changing runtime logic, STOP.
- `CLAUDE.md`/`AGENTS.md`, `vite.config.ts` (documented shadcn shim), CI
  workflows (deferred).
- Refactoring anything beyond the nine listed errors.

## Git workflow

- Branch: `advisor/003-dx-baseline` (recreate/reset it if a stale empty one
  exists from the v1 attempt).
- Commit message style: short lowercase imperative.
- Do NOT push unless instructed.

## Steps

### Step 1: Remove `baseUrl` from tsconfig.json

Delete the line `"baseUrl": ".",`. Keep `paths` as is.

**Verify**: `bunx tsc --noEmit` → exactly the nine errors listed above (no
TS5101, no `@/...` resolution errors). If you see different/extra errors,
compare carefully; >2 unexpected errors is a STOP.

### Step 2: Fix the nine errors, type-level only, one at a time

Run `bunx tsc --noEmit` after each fix; the error count must strictly
decrease.

1. **App.tsx / *.css**: add to `bun-env.d.ts` (above the `*.module.css`
   block so the more specific pattern still wins):
   ```ts
   declare module "*.css";
   ```
2. **ui/calendar.tsx `table`**: open the file and
   `node_modules/react-day-picker/dist/index.d.ts` (or wherever `ClassNames`
   is exported) to see the v10 key names. If the intent of the `table` entry
   maps to an obvious renamed key (e.g. `month_grid`), rename the key. If no
   obvious mapping exists, keep runtime output identical by casting that one
   object: `classNames={{ ... } as Partial<ClassNames>}` — wait: a cast that
   silently drops the class would change rendering. Prefer the rename if the
   v10 type clearly renamed it; otherwise add a single
   `// @ts-expect-error -- react-day-picker v10 renamed ClassNames keys; vendored shadcn file, revisit on next shadcn update`
   directly above the offending property. Do NOT delete the property.
3. **Fahrschueler.tsx `datePart`**: narrow with a fallback (`?? ""`) or an
   early guard — whichever matches the surrounding code; the displayed
   string for valid input must not change.
4. + 5. **Fahrzeuge.tsx Icon**: read lines ~90–170 and ~400–425. The local
   `Vehicle`/detail shape includes a rendered `Icon` component while the
   imported `VehicleDetail` (from `@/hooks/use-vehicles`) is `{ label,
   value }`. Fix by typing the LOCAL detail shape explicitly (e.g. a local
   `type VehicleDetailView = VehicleDetail & { Icon: LucideIcon }` used in
   the local `Vehicle` type and in `createEmptyVehicle`/render), so no cast
   is needed. Runtime values unchanged.
6. **routes.ts Response body**: change the DATEV response to satisfy
   `BodyInit` without copying bytes differently at runtime. Acceptable:
   `new Response(bytes as unknown as BodyInit, ...)` with a one-line comment
   (`Bun accepts Uint8Array bodies; DOM lib types lag`). Also acceptable:
   typing the `generateDatevExport` return as `Uint8Array<ArrayBuffer>` IF
   that compiles without touching datev.ts logic — note that plan 006 also
   edits datev.ts in a parallel branch; prefer the routes.ts-local cast to
   avoid a merge conflict.
7. + 8. **students.ts query typing**: the generic
   `db.query<{ id: number }, ReturnType<typeof writeParams>>(...)` tuple no
   longer satisfies `SQLQueryBindings[]` because `writeParams` returns a
   readonly tuple containing union types. Loosen the binding generic (e.g.
   use `SQLQueryBindings[]` as the params type, or type `writeParams`'s
   return as `SQLQueryBindings[]`) — runtime args unchanged. Error 8
   disappears with 7 if done right.
9. **vehicles.ts line ~158**: read the surrounding `normalize`/mapper code;
   a value typed `string | VehicleDetail[]` is assigned where `string` is
   expected — add the discriminating narrow (likely an
   `Array.isArray(...)` branch or a per-key conditional) WITHOUT changing
   which value is stored.

**Verify**: `bunx tsc --noEmit` → exit 0, no output.

### Step 3: Add `test` and `typecheck` scripts to package.json

```json
"test": "bun test",
"typecheck": "tsc --noEmit"
```

**Verify**: `bun run test` → all pass. `bun run typecheck` → exit 0.

### Step 4: Rewrite README.md

Replace the template with: title + one-paragraph description (use the app
facts above, invent nothing); stack list; getting-started commands
(`bun install`, `bun dev`, `bun test`, `bun run typecheck`,
`bun run build`; note `data/fahrschule.db` is created+seeded on first
start); a **Security & deployment** section stating in your own words: no
authentication, designed for single-user local use, DB contains personal
and financial data, do not expose to a network without adding auth; and a
5–8 line architecture sketch (`src/index.ts` → `src/server/routes.ts` →
domain modules; GoBD-shaped accounting engine; pages in `src/*.tsx`; shared
code in `src/lib/`; agent plans in `plans/`).

**Verify**: `grep -ci "authentif\|authentication" README.md` → ≥ 1;
`grep -c "bun-react-template\|To install dependencies" README.md` → 0.

## Test plan

No new tests. Gates: full existing suite via `bun run test`, plus
`bun run typecheck` exiting 0 — which is the deliverable.

## Done criteria

- [ ] `bun run typecheck` exits 0 with no output
- [ ] `bun run test` exits 0, all tests pass
- [ ] `git diff --stat` touches only in-scope files
- [ ] Each Step-2 fix is type-level (reviewer reads the diff for runtime changes)
- [ ] README describes the app and contains the no-auth warning
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- After Step 1 the error list differs from the nine listed by more than two
  entries (the baseline shifted).
- Any of the nine fixes cannot be done without changing runtime behavior.
- A fix in `src/components/ui/calendar.tsx` would change which CSS classes
  are applied at runtime (visual regression risk in a vendored file).
- `bun test` fails at any point after a Step-2 fix (type-level fixes must
  never break tests).

## Maintenance notes

- The `@ts-expect-error` (if used) in `ui/calendar.tsx` should be revisited
  whenever shadcn components are re-vendored.
- CI workflow and linter remain deferred (see v1 notes): add GitHub Actions
  (install → typecheck → test → build) when the repo gets a remote.
- Plans 004–009 cite `bun run test`/`bun run typecheck` once this lands.
