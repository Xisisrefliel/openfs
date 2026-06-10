# Plan 004: Add integration tests for the API routes and CRUD modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/server/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (tests only — no production code changes)
- **Depends on**: plans/003-dx-baseline-scripts-tsconfig-readme.md (for the `bun run test` script; not strictly blocking — `bun test` works either way)
- **Category**: tests
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

The accounting engine, DATEV export, and money helpers are well-tested (58
tests). But the layer every page talks to — `routes.ts` and the CRUD modules
`students.ts`, `instructors.ts`, `vehicles.ts`, `price-plans.ts` — has zero
coverage. These modules contain real validation logic (required fields,
status enums, UNIQUE-violation translation) that currently only manual
clicking exercises. Plans 008 (student delete) and 009 (calendar
persistence) modify this layer; this plan must land first so those changes
have a safety net.

## Current state

- `src/server/routes.ts` — HTTP wrappers. Pattern: each route group is a
  function returning a Bun.serve `routes` fragment; handlers wrap domain
  calls in `handle()`, which maps `ValidationError` → 400 JSON and anything
  else → 500 JSON (`routes.ts:50-62`):

```ts
function handle(fn: () => Response | Promise<Response>) {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: error.message }, 400);
      }
      console.error(error);
      return json({ error: "Interner Fehler." }, 500);
    }
  };
}
```

- `src/server/students.ts` — `listStudents`, `getStudent`, `createStudent`,
  `updateStudent`. Validation in `normalize()` (lines 106–174): string-type
  checks per field, status must be `aktiv|inaktiv`, progress 0–100,
  `lessons`/`documents` must be arrays, `pricePlanId` must be a positive int
  or null, first/last name and contract/customer number are required.
  `guardUnique()` (lines 208–219) converts SQLite UNIQUE violations on
  contract/customer number into `ValidationError("Kunden- oder
  Vertragsnummer ist bereits vergeben.")`.
- `src/server/instructors.ts` — same shape; `deleteInstructor` (lines
  169–182) also un-assigns the instructor from students inside a
  transaction.
- `src/server/vehicles.ts` — same shape; `createVehicle` requires model,
  plate, klass (`vehicles.ts:185-191`); status must be `aktiv|wartung`.
- `src/server/price-plans.ts` — same shape.
- `src/index.ts:20-30` — how routes are mounted in production:

```ts
const server = serve({
  routes: {
    "/*": index,
    ...accountingRoutes(db),
    ...instructorRoutes(db),
    ...pricePlanRoutes(db),
    ...studentRoutes(db),
    ...vehicleRoutes(db),
  },
  ...
});
```

- **Test conventions in this repo** (match them):
  - `bun:test` (`import { beforeEach, describe, expect, test } from "bun:test"`).
  - Test files live next to the code: `src/server/engine.test.ts`, etc.
  - DB fixture: `openDb(":memory:")` — see `src/server/migration.test.ts:58-62`:

```ts
beforeEach(() => {
  db = openDb(":memory:");
  seedTransactions(db);
  downgradeToSkr03(db);
});
```

  `openDb(":memory:")` (from `src/server/db.ts:256`) creates the full schema
  and seeds accounts, vehicles (3), instructors (4), students (from
  `src/lib/student-data.ts` seed), and price plans. Your tests can rely on
  seeded rows existing, or assert relative counts (`before + 1`) to stay
  robust.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Tests     | `bun test`                       | all pass            |
| One file  | `bun test src/server/crud`       | all pass            |
| Typecheck | `bunx tsc --noEmit`              | exit 0 (after plan 003; if 003 hasn't run, the only error is TS5101 about baseUrl — ignore it) |

## Scope

**In scope** (files to create — do NOT modify production code):
- `src/server/crud.test.ts` (create)
- `src/server/routes.test.ts` (create)

**Out of scope** (do NOT touch):
- Any non-test file. If a test reveals a real bug, write the test to
  document the CURRENT behavior, add a `// BUG:` comment above it, and report
  the bug in your final summary — do not fix production code in this plan.
- `src/server/engine.test.ts`, `datev.test.ts`, `migration.test.ts` — leave
  the existing suites untouched.

## Git workflow

- Branch: `advisor/004-api-tests` (or direct to `main`, matching repo habit).
- One commit, message style: `add integration tests for api routes and crud modules`.
- Do NOT push unless instructed.

## Steps

### Step 1: CRUD module tests — `src/server/crud.test.ts`

Structure: one `describe` block per module (students, instructors, vehicles,
price plans), `beforeEach` with `db = openDb(":memory:")` (no
`seedTransactions` needed — that's accounting data). Import the functions
directly from `./students`, `./instructors`, `./vehicles`, `./price-plans`.

Cover at minimum (≈25 tests):

**students**
- `createStudent` happy path: returns record with `id`, trimmed strings.
- missing firstName/lastName → throws `ValidationError` ("Vor- und Nachname…").
- missing contractNumber/customerNumber → throws `ValidationError`.
- duplicate customerNumber → throws `ValidationError` ("…bereits vergeben.").
- invalid status (`"weg"`) → throws; valid `"inaktiv"` → persists.
- progress 101 / -1 / `"abc"` → throws; 50.4 → rounds to 50.
- `lessons` not an array → throws.
- `pricePlanId: 0` → throws; `null` → ok.
- `updateStudent` merges partial input over current values (change phone
  only, assert name unchanged).
- `getStudent` with unknown id → throws `ValidationError`.

**instructors**
- create happy path; missing names → throws; bad status → throws.
- `deleteInstructor` removes the row AND re-assigns that instructor's
  students to `"Nicht zugeteilt"` (create a student assigned to the
  instructor's full name first, delete, re-fetch student, assert).

**vehicles**
- create happy path; missing model/plate/klass → throws; bad status →
  throws; duplicate plate → check what happens (UNIQUE on plate —
  if it surfaces as a raw SQLite error rather than ValidationError, document
  with `// BUG:` per the scope rule).
- `deleteVehicle` removes the row.

**price plans**
- create + update + delete happy paths; one validation failure.

**Verify**: `bun test src/server/crud` → all pass.

### Step 2: HTTP route tests — `src/server/routes.test.ts`

Spin up a real Bun server per test file so status codes and JSON shapes are
tested end-to-end:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { serve } from "bun";
import { openDb } from "./db";
import {
  accountingRoutes, instructorRoutes, pricePlanRoutes,
  studentRoutes, vehicleRoutes,
} from "./routes";

let db = openDb(":memory:");
const server = serve({
  port: 0, // random free port
  routes: {
    ...accountingRoutes(db),
    ...instructorRoutes(db),
    ...pricePlanRoutes(db),
    ...studentRoutes(db),
    ...vehicleRoutes(db),
  },
  fetch() { return new Response("not found", { status: 404 }); },
});
const url = (path: string) => new URL(path, server.url).href;
afterAll(() => server.stop(true));
```

Note: the routes close over `db`, so re-opening the DB per test won't reset
the server's reference. Either create all state with unique values per test
(recommended — unique customer/contract numbers via a counter), or rebuild
the server in `beforeEach`. Pick one and be consistent.

Cover at minimum (≈12 tests):
- `GET /api/students` → 200, body has `students` array.
- `POST /api/students` with valid body → 201, returns the record with `id`.
- `POST /api/students` with `{}` → 400, body `{ error: "..." }` (German message).
- `PATCH /api/students/abc` → 400 ("Ungültige Fahrschüler-ID.").
- `PATCH /api/students/999999` → 400 ("…nicht gefunden.").
- `POST /api/instructors` valid → 201; `DELETE /api/instructors/:id` → 200 `{ ok: true }`.
- `POST /api/vehicles` valid → 201; invalid (missing plate) → 400.
- `GET /api/vehicle-options` → 200, `vehicleOptions` is a string array ending with `"Nicht zugeteilt"`.
- `PATCH /api/accounting/accounts/1600` with `{ active: "yes" }` → 400
  ("Feld 'active' (boolean) erwartet.").
- `GET /api/profile` → 200, has `name`.
- `PUT /api/profile` with `{ name: "  Neue Fahrschule  " }` → 200, `name`
  comes back trimmed.

**Verify**: `bun test src/server/routes` → all pass.

### Step 3: Full suite + typecheck

**Verify**: `bun test` → old 58 + your new tests all pass, 0 fail.
`bunx tsc --noEmit` → no NEW errors (TS5101 about baseUrl is pre-existing if
plan 003 hasn't landed).

## Test plan

This plan IS the test plan. Model file structure after
`src/server/migration.test.ts` (in-memory DB, `describe`/`test`, German
domain strings in assertions are fine and match the codebase).

## Done criteria

- [ ] `src/server/crud.test.ts` exists with ≥ 25 tests, all passing
- [ ] `src/server/routes.test.ts` exists with ≥ 12 tests, all passing
- [ ] `bun test` exits 0; total test count ≥ 95
- [ ] `git status` shows only the two new test files
- [ ] Any `// BUG:` findings listed in your completion report
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `openDb(":memory:")` fails or does not seed instructors/vehicles/students
  (the fixture assumption is wrong).
- `serve({ port: 0, routes: ... })` rejects the routes object — Bun version
  incompatibility; report `bun --version`.
- More than 3 tests fail because of apparent production bugs (the layer is
  buggier than assessed — the user should re-prioritize before you encode
  current behavior as expected).

## Maintenance notes

- Plans 008 and 009 add routes/CRUD functions; they must extend these two
  test files, following the patterns you establish here.
- The `routes.test.ts` server-per-file pattern keeps the suite fast; if it
  ever flakes on port allocation, switch to `Bun.serve({ port: 0 })` per
  `describe` block.
- Reviewer should scrutinize: tests that encode buggy behavior must carry a
  `// BUG:` comment — silent codification of bugs is the failure mode here.
