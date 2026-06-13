# Plan 028: Make student/instructor delete-and-rename contracts cover the new tables

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. Your reviewer maintains `plans/README.md` — do
> not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/server/students.ts src/server/instructors.ts src/server/calendar-events.ts src/server/theory-groups.ts src/server/ausbildungsnachweis.ts`
> If any of these changed since `2ee4bbe`, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Three tables added in the last feature wave (`theory_attendance`, `lesson_attestations`, and the `student_id` FK column on `calendar_events`) were never added to the repo's delete/rename contracts:

1. **Deleting a student who has linked calendar events throws a raw SQLite FK error.** `calendar_events.student_id` was added as `INTEGER REFERENCES students(id)` and `PRAGMA foreign_keys = ON` is set, but `deleteStudent` never clears those references — so `DELETE FROM students` fails with a constraint error that surfaces as a 500 "Interner Fehler". The lesson-billing back-fill (`migrateCalendarEventBilling`) populates `student_id` by name match, so real databases hit this.
2. **Deleting a student leaves orphaned `theory_attendance` rows** (no FK on `student_id`, no cleanup in `deleteStudent`).
3. **Deleting a calendar event that has a `lesson_attestation` throws a raw FK error** (`lesson_attestations.event_id REFERENCES calendar_events(id)`) instead of the clean German guard message the billed-event case already gets.
4. **Renaming an instructor leaves the old name in `lesson_attestations.instructor`** — every other name-keyed table is cascaded in `instructors.ts`, this one was missed.

## Current state

- `src/server/db.ts:405` — migration adds the FK column:
  ```ts
  "ALTER TABLE calendar_events ADD COLUMN student_id INTEGER REFERENCES students(id)"
  ```
  `src/server/db.ts:285` — `db.exec("PRAGMA foreign_keys = ON;");` (so the FK is enforced).
- `src/server/students.ts:322-377` — `deleteStudent(db, id)`: inside one `db.transaction`, it snapshots theory groups + conversations into the archive payload, removes the id from `theory_groups.student_ids` lists, orphans conversations (`student_id = NULL, orphaned = 1`), then `DELETE FROM students WHERE id = ?`. It never touches `calendar_events.student_id` or `theory_attendance`.
- `src/server/theory-groups.ts:84-94` — `theory_attendance` DDL: `student_id INTEGER NOT NULL` with **no** REFERENCES clause and `UNIQUE (group_id, student_id, session_date)`.
- `src/server/ausbildungsnachweis.ts:17-28` — `lesson_attestations` DDL: `event_id INTEGER NOT NULL UNIQUE REFERENCES calendar_events(id)`, `student_id INTEGER NOT NULL` (no FK), `instructor TEXT NOT NULL DEFAULT ''`. Header comment: attestations are IMMUTABLE compliance records — no UPDATE, no DELETE.
- `src/server/calendar-events.ts:330-351` — `deleteCalendarEvent`: has the billed guard
  ```ts
  if (event.billedTransactionId != null && event.billedActive) {
    throw new ValidationError("Termin ist abgerechnet — zuerst stornieren.");
  }
  ```
  then archives and deletes. No attestation guard.
- `src/server/instructors.ts:174-186` — rename cascade UPDATEs `students`, `calendar_events`, `theory_groups` (each behind `tableExists`); `:223-236` — delete cascade sets those tables' instructor to the UNASSIGNED constant. `lesson_attestations` appears in neither.
- Convention: all cross-table cleanup runs inside the module's existing `db.transaction(...)`; tables are guarded with `tableExists(db, "...")` (see `students.ts` and `instructors.ts` for the pattern).

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `bun install`       | exit 0              |
| Tests     | `bun test`          | 556+ pass, 0 fail   |
| Typecheck | `bun run typecheck` | exit 0              |
| One file  | `bun test src/server/calendar-events.test.ts` | all pass |

## Scope

**In scope** (the only files you may modify):
- `src/server/students.ts`
- `src/server/instructors.ts`
- `src/server/calendar-events.ts`
- `src/server/calendar-events.test.ts`
- `src/server/instructors.test.ts`
- `src/server/crud.test.ts` (student-delete tests)

**Out of scope** (do NOT touch):
- `src/server/ausbildungsnachweis.ts` — no schema change; attestations stay immutable. Do NOT add an FK to `lesson_attestations.student_id` or `theory_attendance.student_id` (SQLite would require a table rebuild; not worth it).
- `src/server/archive.ts` — restore relinking for calendar events is explicitly deferred (see Maintenance notes).
- `engine.ts`, `db.ts` — no changes to the accounting engine or migrations.

## Git workflow

- Branch: `advisor/028-soft-reference-cleanup`
- Commits: title-only, no body; split into self-explanatory chunks (e.g. `deleteStudent: clear calendar_events.student_id + theory_attendance`, `deleteCalendarEvent: attestation guard`, `instructors: cascade rename to lesson_attestations`).

## Steps

### Step 1: `deleteStudent` clears `calendar_events.student_id` and `theory_attendance`

In `src/server/students.ts`, inside the existing `remove` transaction of `deleteStudent`, BEFORE the final `DELETE FROM students`:

1. `if (tableExists(db, "calendar_events"))` → `UPDATE calendar_events SET student_id = NULL WHERE student_id = ?` (the event rows survive as operational history, name-keyed via `subtitle`, exactly as before the FK column existed).
2. `if (tableExists(db, "theory_attendance"))` → `DELETE FROM theory_attendance WHERE student_id = ?` (attendance is operational data, not a compliance record).
3. Do NOT touch `lesson_attestations` — they are retained compliance records (FahrSchAusbO); add a one-line comment in the code saying exactly that.

**Verify**: `bun test src/server/crud.test.ts` → all pass (new tests in step 4 will exercise this).

### Step 2: attestation guard in `deleteCalendarEvent`

In `src/server/calendar-events.ts`, after the billed guard in `deleteCalendarEvent`, add (mirroring its shape):

```ts
const attested = db
  .query<{ n: number }, [number]>(
    "SELECT count(*) AS n FROM lesson_attestations WHERE event_id = ?"
  )
  .get(id)!.n > 0;
if (attested) {
  throw new ValidationError(
    "Termin hat einen Ausbildungsnachweis und kann nicht gelöscht werden."
  );
}
```

Guard the query with a `tableExists`-style check if `calendar-events.ts` cannot assume the table exists (check how the module handles `transactions` in `getCalendarEvent` — `lesson_attestations` is created by `ensureAttestationTables`, which `src/index.ts`/`app-routes` wires at startup, but unit tests may construct leaner DBs; if `calendar-events.test.ts` setups don't create `lesson_attestations`, use `tableExists`).

**Verify**: `bun test src/server/calendar-events.test.ts` → all pass.

### Step 3: instructor rename cascades to `lesson_attestations`

In `src/server/instructors.ts`, in the RENAME path (next to the existing `theory_groups` UPDATE around line 183), add behind `tableExists(db, "lesson_attestations")`:

```ts
db.prepare(
  "UPDATE lesson_attestations SET instructor = ? WHERE instructor = ?"
).run(newName, oldName);
```

In the DELETE path: **deliberately do nothing** for `lesson_attestations` — the attestation records who actually gave the lesson; rewriting it to "Nicht zugeteilt" would falsify a compliance record. Add a one-line comment in the delete path stating this.

**Verify**: `bun test src/server/instructors.test.ts` → all pass.

### Step 4: tests

See Test plan. **Verify**: `bun test && bun run typecheck` → 556+ pass (plus your new tests), exit 0.

## Test plan

Model new tests on the existing co-located style (in-memory DB via the helpers each test file already uses).

- `src/server/crud.test.ts` (or the file where `deleteStudent` is already exercised):
  - *regression*: create student → create calendar event with that `studentId` (use `createCalendarEvent`) → `deleteStudent` succeeds (this throws an FK error before the fix); event still exists with `studentId` gone from its wire shape.
  - delete student with `theory_attendance` rows (insert via `recordAttendance`/the module's API or direct SQL matching existing test style) → rows for that student are gone.
  - delete student who has a `lesson_attestation` → attestation row still exists (retention).
- `src/server/calendar-events.test.ts`:
  - deleting an event with an attestation → throws `ValidationError` with the new German message (assert message contains "Ausbildungsnachweis").
- `src/server/instructors.test.ts`:
  - rename instructor → `lesson_attestations.instructor` updated.
  - delete instructor → `lesson_attestations.instructor` unchanged.

## Done criteria

- [ ] `bun test` exits 0; includes the FK-regression test that fails on `2ee4bbe`
- [ ] `bun run typecheck` exits 0
- [ ] `git status` shows only in-scope files modified
- [ ] No UPDATE/DELETE added on `transactions`, `bookings`, or `lesson_attestations` rows (grep your diff)

## STOP conditions

- The excerpts above don't match the live code (drift).
- The FK-regression test in step 4 does NOT fail when run against the unfixed code (would mean the FK analysis is wrong — report what you observe).
- Fixing requires touching `archive.ts` or `db.ts`.
- Any existing test breaks in a way not explained by your change after one fix attempt.

## Maintenance notes

- Deferred: archive-restore does not re-link `calendar_events.student_id` after a student restore (the link is NULLed on delete and stays NULL). If that matters later, extend the archive payload like the existing `theoryGroups`/`conversations` pattern.
- Reviewer: check that attestation retention on student delete is commented in code, and that the instructor DELETE path explicitly skips attestations.
