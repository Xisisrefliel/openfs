# Plan 031: HTTP integration tests for attestation and exam-result routes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/server/routes.test.ts src/server/ausbildungsnachweis.ts src/server/routes.ts`
> On any change, compare excerpts below against live code; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

`routes.test.ts` spins up a real `Bun.serve` against the merged route table
and integration-tests every money/data path — except two recent additions:
the attestation routes (`attestationRoutes` is never mounted in the test
server at all) and `POST /api/calendar-events/:id/exam-result` (unit-tested
only). The attestation route layer is exactly where active refactoring is
happening, and today a handler-signature typo there would ship green.

## Current state

- `src/server/routes.test.ts:36-43` — the test server mounts route factories by spreading them into one object (accounting, calendar, export, instructor, price-plan, student, vehicle). `attestationRoutes` is absent; grep for "attestation" in the file returns nothing.
- `src/server/ausbildungsnachweis.ts:236-292` (at commit `2ee4bbe`) — `attestationRoutes(db)` returns **flat string keys**: `"GET /api/attestations"`, `"GET /api/calendar-events/:id/attestation"`, `"POST /api/calendar-events/:id/attestation"`. Match this committed shape (a working-tree refactor to nested keys exists but is NOT committed — the drift check above catches it if it lands first; if it has landed, mount works identically, only your expectations of the file content change).
- `createAttestation` validation (`ausbildungsnachweis.ts:124-214`): event must exist, must be type `"Praktisch"`, event.student_id must equal input.studentId, no duplicate, positive integer duration, signature must start with `data:image/png;base64,` and be ≤ 200000 chars.
- `src/server/routes.ts:316-340` — `POST /api/calendar-events/:id/exam-result` calls `recordExamResult(db, id, body.result)`; allowed only on types `"Theorieprüfung"` / `"Vorstellung zur prakt. Prüfung"`; result ∈ `'bestanden' | 'nicht_bestanden' | null`.
- Creating fixtures: `createCalendarEvent` accepts `studentId` (validated against students); create a student first via the student routes or module functions the test file already imports.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| This file | `bun test src/server/routes.test.ts` | all pass |
| Tests     | `bun test`          | 556+ pass, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |

## Scope

**In scope**:
- `src/server/routes.test.ts` only.

**Out of scope**:
- Any non-test file. If a route handler turns out to be broken, that is a STOP-and-report, not a fix.

## Git workflow

- Branch: `advisor/031-attestation-route-tests`
- Commit: title-only, e.g. `routes.test: mount attestationRoutes + exam-result endpoint coverage`.

## Steps

### Step 1: mount `attestationRoutes` in the test server

Import `attestationRoutes` and `ensureAttestationTables` from
`./ausbildungsnachweis`; call `ensureAttestationTables(db)` in the test
setup (the table is wired at app startup, not by `openDb`), and spread
`...attestationRoutes(db)` into the routes object alongside the others.

**Verify**: `bun test src/server/routes.test.ts` → existing tests still pass.

### Step 2: attestation endpoint tests

A valid signature fixture: `"data:image/png;base64,iVBORw0KGgo="`.

- `GET /api/attestations` without `studentId` → 400 with `{ error }`.
- `GET /api/attestations?studentId=<id>` → 200 `{ attestations: [] }` then non-empty after a POST.
- `POST /api/calendar-events/:id/attestation` happy path → 201, body `{ attestation }` with matching `eventId`/`studentId` (fixture: student + `"Praktisch"` event with that `studentId`).
- POST on a non-Praktisch event → 400.
- POST with mismatched `studentId` → 400.
- POST duplicate (second time, same event) → 400.
- POST with invalid JSON body → 400.
- `GET /api/calendar-events/:id/attestation` → 404 before create, 200 after.

### Step 3: exam-result endpoint tests

- POST `{ result: "bestanden" }` on a `"Theorieprüfung"` event → 200; re-GET the event shows `examResult`.
- POST `{ result: null }` clears it.
- POST invalid value (`"vielleicht"`) → 400.
- POST on a `"Praktisch"` event → 400.

**Verify**: `bun test && bun run typecheck` → all pass, exit 0.

## Test plan

Steps 2–3 ARE the test plan; model the fetch/assert style on the existing
`POST /api/calendar-events/:id/bill` block in the same file.

## Done criteria

- [ ] `bun test` exits 0; ≥ 12 new assertions across the two endpoint groups
- [ ] `grep -c "attestation" src/server/routes.test.ts` ≥ 8
- [ ] `git status` shows only `src/server/routes.test.ts` modified

## STOP conditions

- Mounting `attestationRoutes` makes existing tests fail (route key collision or shape mismatch) — report the exact error.
- Any new test exposes a real handler bug — report it; do not patch source files.

## Maintenance notes

- Plan 032 (route-helper consolidation) will rewrite these handlers; these tests are its safety net — land this first.
