# Plan 020: Record exam results on exam events; license milestone; pass-rate KPI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/calendar-events.ts src/server/db.ts src/server/statistics.ts src/Pruefungsplaner.tsx src/Statistik.tsx`
> Note: this plan assumes plan 019 (`advisor/019-lesson-billing`) has landed
> on your base branch — its calendar_events migration must exist. If
> `migrateCalendarEventBilling` is absent from `src/server/db.ts`, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW–MED (additive schema + UI; no engine involvement)
- **Depends on**: 019 (migration composition + studentId on events)
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The Prüfungsplaner schedules exams (`calendar_events` of type
`"Theorieprüfung"` and `"Vorstellung zur prakt. Prüfung"`), but whether the
student passed is never recorded anywhere — the planner is calendar-only.
Schools need outcomes: per-student progress ("praktische Prüfung bestanden am
…"), an end-of-funnel milestone (Führerschein), and an aggregate first-attempt
pass rate for Statistik (a genuine marketing number for driving schools).
This plan adds result capture on exam events, a license date on students, and
the pass-rate KPI.

## Current state

- Event types: `src/server/calendar-events.ts:11-24` —
  `"Theorieprüfung"` and `"Vorstellung zur prakt. Prüfung"` are the two exam
  types (EVENT_TYPES array).
- After plan 019, `calendar_events` has `student_id` (nullable FK) and the
  module exposes the optional-field wire convention (fields omitted when
  empty — calendar-events.ts:58-73).
- `src/server/statistics.ts` — KPI module: `Statistics` type (lines 80–86)
  aggregates `students/lessons/instructors/vehicles/revenue`; each section has
  its own `xStatistics(db)` function and `getStatistics` (line 260) merges
  them; routes at `statisticsRoutes` (line 290). Tests:
  `src/server/statistics.test.ts`.
- `students` table: central DDL `src/server/db.ts:84-105`; no license field.
  Migration exemplar: `migrateStudentPricePlan` (db.ts, called at line 288) —
  PRAGMA-check + ALTER, idempotent. Plan 019 adds `migrateCalendarEventBilling`
  in the same style; compose with it, do not merge into it.
- `src/Pruefungsplaner.tsx` — exam planner page (reads exam-type calendar
  events). READ IT before step 4; this plan does not excerpt it. It is ~19KB
  and renders exam lists; you will add a result action per exam row.
- `src/Statistik.tsx` — statistics page consuming `/api/statistics` via
  `src/hooks/use-statistics.ts`.
- Student wire shape: `src/lib/student-data.ts` `Student` type (lines 37–66)
  — server students.ts maps rows ↔ this shape (read `toStudent`/`writeParams`
  in `src/server/students.ts` before adding a field).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/server/db.ts` — `migrateExamResults(db)`: on `calendar_events` add
  `exam_result TEXT CHECK (exam_result IN ('bestanden','nicht_bestanden')) `
  (nullable; SQLite allows adding CHECKed columns via ALTER only without
  violating existing rows — nullable is fine); on `students` add
  `license_date TEXT` (nullable).
- `src/server/calendar-events.ts` — carry `examResult?:
  "bestanden" | "nicht_bestanden"`; dedicated exported
  `recordExamResult(db, eventId, result | null)` (settable/clearable only on
  the two exam types; reject on others). NOT settable via generic update.
- `src/server/routes.ts` — `POST /api/calendar-events/:id/exam-result`.
- `src/server/students.ts` + `src/lib/student-data.ts` — optional
  `licenseDate?: string` on the student shape, persisted.
- `src/server/statistics.ts` — new `ExamStatistics` section: per exam type:
  total recorded, passed, failed, first-attempt pass rate (first attempt =
  the chronologically first exam event of that type for a given `student_id`
  with a recorded result; events with NULL student_id count in totals but not
  in first-attempt rate). Add to `Statistics` + `getStatistics`.
- `src/Pruefungsplaner.tsx` — per exam row: result control (Bestanden /
  Nicht bestanden / offen) calling the new endpoint; when a
  "Vorstellung zur prakt. Prüfung" is set to "bestanden" and the event has a
  `studentId`, show a confirm prompt "Führerschein-Datum setzen?" that PUTs
  `licenseDate` (event date) on the student.
- `src/Statistik.tsx` — render the exam section (pass rates as quiet stats,
  follow design-guideline.md: `tabular-nums`, no colored pills; green/red only
  as dot+text state).
- Tests: extend `src/server/calendar-events.test.ts`,
  `src/server/statistics.test.ts`, `src/server/migration.test.ts`.

**Out of scope** (do NOT touch):
- `src/server/engine.ts`, billing of exam fees (design doc lessons-billing §6 Q4 — deferred).
- `src/Kalendar.tsx` (exam results are recorded in the Prüfungsplaner, not the calendar).
- Theory progress recalculation (`student.theory` JSON) — separate concern.

## Git workflow

- Branch: `advisor/020-exam-results` from the branch containing plan 019's
  result (your dispatcher will tell you the exact base; default
  `advisor/019-lesson-billing`).
- Commits: title-only per step.
- Do NOT push or open a PR.

## Steps

### Step 1: Migration (+ tests)

`migrateExamResults` in db.ts, called after `migrateCalendarEventBilling` in
`openDb`. Idempotency test in `migration.test.ts` (run twice, columns exist
once).

**Verify**: `bun test src/server/migration.test.ts` → pass.

### Step 2: Domain + route (+ tests)

`recordExamResult` validation: event exists; type is one of the two exam
types; result is `'bestanden' | 'nicht_bestanden' | null` (null clears).
Wire shape: optional `examResult` omitted when NULL. Route
`POST /api/calendar-events/:id/exam-result` with `{ result }` body via the
existing `handle()`/`json()` helpers (routes.ts:54-70).

**Verify**: `bun test src/server/calendar-events.test.ts` → pass (happy, wrong
type rejected, invalid value rejected, clear works).

### Step 3: Student licenseDate (+ tests)

Add to `Student` type (`src/lib/student-data.ts`), map in
`src/server/students.ts` (`toStudent`, `writeParams`, the UPDATE column list
at students.ts:280-287 — extend carefully, the param order must match).
Optional ISO string; empty = not issued.

**Verify**: `bun test` → students/crud/routes tests pass; add one roundtrip
test where they live today (find the students CRUD test in
`src/server/crud.test.ts` and extend it).

### Step 4: Statistics section (+ tests)

`examStatistics(db)` per the scope description. First-attempt definition must
be implemented in SQL or a simple JS pass over the exam events — pick the
simpler, test it: student with fail-then-pass counts as NOT first-attempt
passed; single pass counts; NULL student_id excluded from rate, included in
totals.

**Verify**: `bun test src/server/statistics.test.ts` → pass with ≥3 new tests.

### Step 5: UI

Prüfungsplaner result control + license prompt; Statistik exam panel. Match
each page's existing component idioms (read the page first; reuse its
badge/select patterns). German labels: "Bestanden", "Nicht bestanden",
"Offen", "Erfolgsquote (1. Versuch)".

**Verify**: `bun run typecheck` && `bun run build` → exit 0.

## Test plan

Covered per step; ≥8 new tests total. Key regression: recording a result on a
`"Praktisch"` event must be rejected (keeps lesson billing and exam results
orthogonal).

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0; `bun run build` exits 0
- [ ] `grep -n "exam_result" src/server/db.ts src/server/calendar-events.ts` shows migration + module
- [ ] `grep -n "license_date\|licenseDate" src/server/students.ts src/lib/student-data.ts` shows the field mapped end-to-end
- [ ] `/api/statistics` response includes an `exams` section (assert in statistics.test.ts)
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- Plan 019's migration is absent from the base branch (dependency not landed).
- `students.ts` UPDATE param ordering is generated in a way that makes adding
  a column error-prone beyond a mechanical extension — report rather than
  guess at order.
- Pruefungsplaner.tsx's structure has no obvious place for a per-row action
  (e.g. it is purely read-only aggregated) — report with a short description
  of its actual structure and a proposal, wait for review.

## Maintenance notes

- The license prompt writes via the normal student PUT — if students gain
  optimistic-locking later, revisit.
- Reviewer: check the first-attempt SQL/JS against the three test scenarios;
  off-by-one orderings (same-day re-exam) are the likely bug.
- Deferred: exam-fee billing, B196/B197 class variants on results, theory
  progress sync.
