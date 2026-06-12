# Plan 016: Unit tests for instructors/vehicles/price-plans modules and lib formatters

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/instructors.ts src/server/vehicles.ts src/server/price-plans.ts src/lib/student-documents.ts`
> If any in-scope-for-reading file changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (tests only — no production code changes)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

Most server domain modules have co-located unit tests; `instructors.ts`,
`vehicles.ts`, and `price-plans.ts` do not — they are covered only at the HTTP
level by `routes.test.ts`. The riskiest uncovered logic is the **instructor
rename cascade**: renaming an instructor rewrites name-keyed references in
`students`, `calendar_events`, and `theory_groups` inside one transaction. A
bug there silently corrupts cross-references. Pure formatters in
`src/lib/student-documents.ts` are also untested. This plan adds
characterization tests so future refactors (several feature plans touch these
modules) have a safety net.

## Current state

- `src/server/instructors.ts` — CRUD + cascade. The cascade under test:

  ```ts
  // src/server/instructors.ts:174-186 (inside updateInstructor's transaction)
  if (newName !== oldName && oldName) {
    db.prepare("UPDATE students SET instructor = ? WHERE instructor = ?").run(newName, oldName);
    db.prepare("UPDATE calendar_events SET instructor = ? WHERE instructor = ?").run(newName, oldName);
    if (tableExists(db, "theory_groups")) {
      db.prepare("UPDATE theory_groups SET instructor = ? WHERE instructor = ?").run(newName, oldName);
    }
  }
  ```

  `deleteInstructor` (lines 192+) similarly snapshots assigned students/groups
  into the archive payload and re-points references to "Nicht zugeteilt".

- `src/server/vehicles.ts` — `parseDetails` JSON-recovery (around lines
  60–100), `listVehicleModels` (line 113), create/update/delete with the same
  name-propagation pattern for `students.vehicle` / `calendar_events.vehicle`.

- `src/server/price-plans.ts` — `normalizeComponents` validation (lines
  45–79), CRUD (lines 126–160).

- `src/lib/student-documents.ts` — pure helpers: `isUploadedStudentDocument`,
  `getStudentDocumentName`, `getStudentDocumentKey`,
  `formatStudentDocumentSize`, `formatStudentDocumentUploadedAt` (lines 17–58).

- **Test exemplar** — `src/server/campaigns.test.ts`:

  ```ts
  // src/server/campaigns.test.ts:6-24
  import { beforeEach, describe, expect, test } from "bun:test";
  import { openSqlite, type Database } from "./sqlite";
  ...
  let db: Database;
  beforeEach(() => {
    db = openSqlite(":memory:");
    ensureCampaignTables(db);
  });
  ```

  NOTE: instructors/vehicles/price-plans tables are created by the central DDL
  in `src/server/db.ts` (`openDb`), not by per-module ensure functions. For
  in-memory tests either call the exported DDL/init path from db.ts if one is
  exported, or look at how `src/server/crud.test.ts` / `routes.test.ts` build
  their test DB and copy that arrangement. Do NOT invent a new fixture style.

- Lib test exemplar: `src/lib/money.test.ts` / `src/lib/contracts.test.ts` —
  plain `describe/test/expect` on pure functions.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| All tests | `bun test`           | all pass (387 before this plan) |
| One file  | `bun test src/server/instructors.test.ts` | all pass |

## Scope

**In scope** (create only — no production code edits):
- `src/server/instructors.test.ts` (create)
- `src/server/vehicles.test.ts` (create)
- `src/server/price-plans.test.ts` (create)
- `src/lib/student-documents.test.ts` (create)

**Out of scope** (do NOT touch):
- ANY production source file. If a test reveals a real bug, write the test to
  document current behavior with a `// BUG:` comment and report it — do not fix.
- `routes.test.ts` — existing HTTP coverage stays as is.

## Git workflow

- Branch: `advisor/016-unit-tests` from `main` (`160eccc`)
- Commits: title-only, one per test file, e.g. "tests: instructor CRUD + rename/delete cascade"
- Do NOT push or open a PR.

## Steps

### Step 1: Discover the fixture pattern for db.ts-owned tables

Read `src/server/crud.test.ts` and `src/server/integrity.test.ts` — find how
they obtain a Database with the students/instructors/vehicles tables (likely
`openDb(":memory:")` or an exported schema helper). Use exactly that pattern.

**Verify**: write a trivial smoke test (`listInstructors(db)` returns an
array) and run `bun test src/server/instructors.test.ts` → passes.

### Step 2: instructors.test.ts

Cover: create (happy + validation errors: missing names, bad status), update
(field merge over current), **rename cascade** (arrange: instructor "Max
Muster", a student with `instructor = "Max Muster"`, a calendar_event and a
theory_group with the same; act: rename to "Max Neumann"; assert all three
references updated and an unrelated reference untouched), **namesake caveat**
(two instructors with the same display name — rename one, observe both
references move; assert and mark with a comment that this is the documented
limitation from instructors.ts:170-173), delete (references re-pointed to
"Nicht zugeteilt", archive row written — assert via `listArchive` from
`./archive`).

**Verify**: `bun test src/server/instructors.test.ts` → all pass.

### Step 3: vehicles.test.ts

Cover: `parseDetails` recovery on malformed JSON (insert a row with
`details = "not json"` directly, then `getVehicle` → details fall back without
throwing), create validation (duplicate plate → error; bad status → error),
rename/plate-change propagation to students/calendar_events (mirror step 2's
arrangement), `listVehicleModels` distinct/sorted behavior, delete + archive.

**Verify**: `bun test src/server/vehicles.test.ts` → all pass.

### Step 4: price-plans.test.ts

Cover: component normalization (negative price rejected? empty label? — assert
whatever `normalizeComponents` actually enforces, reading it first),
create/update/get roundtrip preserving `components` JSON, delete behavior when
students reference the plan (`students.price_plan_id`) — read
`deletePricePlan` (price-plans.ts:154+) first and assert its actual contract.

**Verify**: `bun test src/server/price-plans.test.ts` → all pass.

### Step 5: student-documents.test.ts

Pure-function table tests: `isUploadedStudentDocument` on a valid upload
object, a plain string, null-ish/malformed shapes; `formatStudentDocumentSize`
on 0, 512, 1024, 1048576, 2.5 MB; `formatStudentDocumentUploadedAt` on a valid
ISO string and garbage input; `getStudentDocumentName`/`getStudentDocumentKey`
on both variants of `StudentDocument`.

**Verify**: `bun test src/lib/student-documents.test.ts` → all pass.

## Test plan

This plan IS the test plan. Target: ≥35 new meaningful assertions across 4
files. Tests must assert concrete values (ids, names, euro strings), not just
"doesn't throw".

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0; total test count strictly greater than 387 by ≥25
- [ ] The four new files exist and each contains ≥5 `test(` blocks
- [ ] `git status` shows ONLY the four new test files (+ plans/README.md row)
- [ ] No production file modified: `git diff --stat -- src/server/*.ts src/lib/*.ts ':!*.test.ts'` is empty

## STOP conditions

- A test reveals behavior that looks like a real bug (e.g. the cascade misses
  a table, delete corrupts references): document with `// BUG:` and report —
  do not fix production code.
- No existing test demonstrates how to get a Database with the central-DDL
  tables, and `openDb(":memory:")` pulls in seeding that makes assertions
  brittle — report what you found before improvising a new fixture style.

## Maintenance notes

- Plans 019/020/023 modify `calendar_events` consumers; these tests are their
  regression net — run this plan first.
- Reviewer: scan for assertion-free tests and for tests that duplicate
  routes.test.ts at lower value (the point is the cascade + parse edges, not
  re-testing HTTP plumbing).
