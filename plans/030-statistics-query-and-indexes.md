# Plan 030: Fix the quadratic first-attempt exam query and add student-keyed indexes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/server/statistics.ts src/server/db.ts src/server/ausbildungsnachweis.ts`
> On any change, compare excerpts below against live code; mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

The first-attempt pass-rate query in statistics re-scans `calendar_events`
once per exam row (correlated subquery) — O(N×M) on a table that grows
forever. It runs on every Dashboard/Statistik load. At a few years of real
data (thousands of events) this becomes the slowest query in the app. Two
hot lookups also lack indexes: `calendar_events.student_id` and
`lesson_attestations.student_id`. All fixes are small and behavior-preserving.

## Current state

- `src/server/statistics.ts:308-327` — the correlated subquery:
  ```ts
  const firstAttemptRows = db.query(
    `SELECT student_id, exam_result
     FROM calendar_events
     WHERE type = ? AND student_id IS NOT NULL AND exam_result IS NOT NULL
       AND id = (
         SELECT id FROM calendar_events AS ce2
         WHERE ce2.type = calendar_events.type
           AND ce2.student_id = calendar_events.student_id
           AND ce2.exam_result IS NOT NULL
         ORDER BY ce2.date, ce2.id
         LIMIT 1
       )`
  ).all(type);
  ```
  Semantics to preserve exactly: per (type, student), the row with the
  lowest `(date, id)` among rows **with a recorded result**.
- `src/server/db.ts:151` — only `idx_calendar_events_date` exists on calendar_events. `:163-164` — transactions/bookings indexes (pattern to copy).
- `src/server/ausbildungsnachweis.ts:17-32` — `TABLE_DDL` + `ensureAttestationTables(db)`; `:92-105` — `listAttestationsForStudent` queries `WHERE student_id = ?` with no index.
- Existing tests: `src/server/statistics.test.ts` covers `examStatistics` including first-attempt pass rate — these are the equivalence gate.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Stats tests | `bun test src/server/statistics.test.ts` | all pass |
| Tests     | `bun test`          | 556+ pass, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |

## Scope

**In scope**:
- `src/server/statistics.ts`
- `src/server/db.ts` (DDL index additions only)
- `src/server/ausbildungsnachweis.ts` (index in `TABLE_DDL`/`ensureAttestationTables` only)
- `src/server/statistics.test.ts` (only if you add an equivalence test)

**Out of scope**:
- Any other query in statistics.ts; any migration logic; `calendar-events.ts`.

## Git workflow

- Branch: `advisor/030-stats-query-indexes`
- Commits: title-only, e.g. `statistics: window-function first-attempt query`, `db: index calendar_events.student_id`, `ausbildungsnachweis: index lesson_attestations.student_id`.

## Steps

### Step 1: rewrite first-attempt query with a window function

Replace the correlated subquery with one pass (bun:sqlite supports window functions):

```sql
SELECT student_id, exam_result FROM (
  SELECT student_id, exam_result,
         ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY date, id) AS rn
  FROM calendar_events
  WHERE type = ? AND student_id IS NOT NULL AND exam_result IS NOT NULL
) WHERE rn = 1
```

Note the outer `type = ?` filter makes the original's `ce2.type = ...`
correlation redundant — partitioning by `student_id` alone is equivalent
because the WHERE already pins the type.

**Verify**: `bun test src/server/statistics.test.ts` → all pass unchanged.

### Step 2: add indexes

- In `src/server/db.ts` next to `idx_calendar_events_date` (line 151):
  `CREATE INDEX IF NOT EXISTS idx_calendar_events_student ON calendar_events(student_id);`
  (Important: this DDL block runs before `migrateCalendarEventBilling` adds
  the column on old DBs — check whether the DDL string at `:151` is part of
  the initial `CREATE TABLE` block executed at `db.exec(DDL)` time. If the
  `student_id` column does not yet exist at that point for fresh databases,
  put the CREATE INDEX **after** `migrateCalendarEventBilling(db)` in
  `openDb` instead (db.ts:286-300 shows the call order). Verify by running
  the test suite — an index on a missing column fails immediately.)
- In `src/server/ausbildungsnachweis.ts`, extend `ensureAttestationTables` to also exec:
  `CREATE INDEX IF NOT EXISTS idx_lesson_attestations_student ON lesson_attestations(student_id);`

**Verify**: `bun test` → all pass; `bun run typecheck` → exit 0.

## Test plan

Existing `statistics.test.ts` is the primary gate (results must be
byte-identical). Add one equivalence edge test if not already covered: two
students, one with results on two exam events out of date order
(later-created row has earlier date) → first attempt must be the earlier
**date**, not the earlier id.

## Done criteria

- [ ] `bun test` exits 0 (no statistics result changed)
- [ ] `bun run typecheck` exits 0
- [ ] `grep -n "SELECT id FROM calendar_events AS ce2" src/server/statistics.ts` → no matches
- [ ] Both new indexes exist: `grep -rn "idx_calendar_events_student\|idx_lesson_attestations_student" src/server/` → 2 hits
- [ ] `git status` shows only in-scope files

## STOP conditions

- Any statistics test changes result values after the rewrite (semantics drift — report the differing case).
- The index on `calendar_events(student_id)` cannot be placed without reordering `openDb` migration calls beyond inserting one `db.exec` line.

## Maintenance notes

- If exam types ever share a partition key (e.g. per-student-across-types stats), the dropped `ce2.type` correlation becomes load-bearing again — the WHERE pins it today.
- Reviewer: confirm the window-function SQL keeps `ORDER BY date, id` (id is the tiebreaker the old query had).
