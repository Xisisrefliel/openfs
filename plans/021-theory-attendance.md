# Plan 021: Theory attendance tracking (Anwesenheit) for theory groups

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/theory-groups.ts src/TheorieGruppen.tsx src/hooks/use-theory-groups.ts`
> On drift, compare excerpts below against live code; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (new table + additive UI)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

German driving-school law (FahrSchAusbO) obliges schools to prove students
attended their mandated theory units. The app has theory groups with members,
weekday, and time — but no record of who attended which session. Incumbent
software covers this; for the planned SaaS it is table-stakes compliance.
This plan adds an attendance table, per-session recording in the
TheorieGruppen page, and per-student attendance counts.

## Current state

- `src/server/theory-groups.ts` — the domain module. Types (lines 13–47):

  ```ts
  export type TheoryGroup = {
    id: number; name: string; klass: string;
    weekday: string;      // "Montag"… (THEORY_GROUP_WEEKDAYS, lines 51-59)
    time: string;         // "HH:MM" (TIME_RE, line 61)
    room: string; instructor: string; capacity: number;
    studentIds: number[]; // raw membership (JSON array column)
    members: TheoryGroupMember[]; // resolved names; deleted ids drop out
    status: TheoryGroupStatus;    // "aktiv" | "abgeschlossen"
    createdAt: string;
  };
  ```

  `ensureTheoryGroupTables(db)` (line 156) creates+seeds the table — this is
  the module-owned-table pattern (vs. central DDL in db.ts); the new
  attendance table belongs HERE, same pattern. `tableExists` helper and
  `parseStudentIds` (lines 185–195) already exist in the module.
  Routes: `theoryGroupRoutes(db)` (line 451). Tests:
  `src/server/theory-groups.test.ts` (in-memory DB, ensure call, CRUD asserts
  — model new tests after it).

- `src/TheorieGruppen.tsx` — the page (~23KB): group cards + edit dialog.
  READ IT before step 3 to find the group-detail surface where the attendance
  grid goes.

- `src/hooks/use-theory-groups.ts` — fetch hook for groups (useFetchList
  pattern over `/api/theory-groups`).

- Students are referenced by id in `studentIds` (NOT by name) — attendance
  rows reference `student_id` the same way. Deleted students drop out of
  `members` resolution but stay in studentIds (theory-groups.ts:197-199);
  attendance history must likewise survive student deletion (no FK CASCADE).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/server/theory-groups.ts` — attendance table DDL in
  `ensureTheoryGroupTables`, domain functions, routes.
- `src/server/theory-groups.test.ts` — extend.
- `src/hooks/use-theory-groups.ts` — attendance fetch/record functions (or a
  sibling `use-theory-attendance.ts` if cleaner; one file, not both).
- `src/TheorieGruppen.tsx` — attendance UI.

**Out of scope** (do NOT touch):
- `src/server/db.ts` (table is module-owned), `src/server/students.ts`
  (deletion semantics unchanged), `src/Theorie.tsx` (the per-student theory
  view has uncommitted design work in the main tree — do not touch it),
  `student.theory` JSON shape (progress sync deferred).

## Git workflow

- Branch: `advisor/021-theory-attendance` from `main` (`160eccc`)
- Commits: title-only per step.
- Do NOT push or open a PR.

## Steps

### Step 1: Table + domain functions

In `ensureTheoryGroupTables`'s DDL add:

```sql
CREATE TABLE IF NOT EXISTS theory_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES theory_groups(id),
  student_id INTEGER NOT NULL,
  session_date TEXT NOT NULL,        -- ISO "YYYY-MM-DD"
  attended INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (group_id, student_id, session_date)
);
```

Domain functions (exported, validation via `ValidationError` like the rest of
the module): `listAttendance(db, groupId): { sessionDate: string; entries:
{ studentId: number; attended: boolean }[] }[]` (grouped by date, newest
first); `setAttendance(db, groupId, sessionDate, entries: { studentId,
attended }[])` — validates group exists, date matches `^\d{4}-\d{2}-\d{2}$`,
every studentId is in the group's `studentIds`; upserts via
`INSERT ... ON CONFLICT (group_id, student_id, session_date) DO UPDATE SET
attended = excluded.attended`, all rows in one `db.transaction`;
`attendanceCounts(db, groupId): Record<studentId, number>` (count of
attended=1 rows per member).

**Verify**: `bun test src/server/theory-groups.test.ts` → pass with new tests.

### Step 2: Routes

In `theoryGroupRoutes` add `GET /api/theory-groups/:id/attendance` and
`PUT /api/theory-groups/:id/attendance` (body `{ sessionDate, entries }`).
Follow the module's existing route style exactly.

**Verify**: route-level test (follow how theory-groups.test.ts or
routes.test.ts tests routes — match the existing approach) → pass.

### Step 3: UI

In `TheorieGruppen.tsx`, in the group detail/edit surface add an
"Anwesenheit" section: a date picker defaulting to the most recent session
date matching the group's weekday (compute: today or the previous occurrence
of `group.weekday`), a checkbox row per member, save button calling the PUT,
and per-member attended-count display (e.g. "12 Einheiten"). Design rules
(design-guideline.md): `tabular-nums` for counts, no colored pills, quiet
hairlines; keep German labels ("Anwesenheit", "Einheiten", "Speichern").

**Verify**: `bun run typecheck` && `bun run build` → exit 0.

## Test plan

In `src/server/theory-groups.test.ts` (≥6 new):
happy upsert + re-record same date overwrites (no duplicate row);
student not in group rejected; bad date rejected; unknown group rejected;
counts correct across multiple dates; attendance survives a member being
removed from the group (history kept, validation only applies to NEW records
— assert `listAttendance` still returns the old entry).

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0; `bun run build` exits 0
- [ ] `grep -n "theory_attendance" src/server/theory-groups.ts` shows DDL + functions
- [ ] PUT twice with same (group, student, date) leaves exactly one row (tested)
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- Excerpts don't match live code (drift).
- `ON CONFLICT ... DO UPDATE` proves unsupported in the bun:sqlite version —
  report; fallback (DELETE+INSERT in the same transaction) needs reviewer
  sign-off first.
- TheorieGruppen.tsx has no group-detail surface to extend (only inline
  cards) — report its actual structure + a proposal before building new
  dialog scaffolding.

## Maintenance notes

- Plan 026 (SaaS spike) lists attendance as compliance evidence — exports may
  later need this table (DATEV is unaffected).
- A future "Pflichtstunden erfüllt" indicator on the student theory view can
  derive from `attendanceCounts` vs. a per-class required-units constant — out
  of scope here.
- Reviewer: check the upsert transaction and that validation reads
  `studentIds` (raw membership), not `members` (resolved) — deleted students'
  history must not break listing.
