# Plan 008: Add a delete path for students (server, route, hook, UI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/server/students.ts src/server/routes.ts src/hooks/use-students.ts src/Fahrschueler.tsx src/FahrschuelerDetail.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (destructive operation on the app's central entity)
- **Depends on**: plans/004-api-integration-tests.md (extend its test files; if 004 hasn't run, create the tests standalone following its patterns)
- **Category**: tech-debt / direction
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

Every entity in the app has full CRUD except the central one: instructors,
vehicles, and price plans all expose `DELETE /api/.../:id`, but students can
only be created and updated. A mistyped duplicate or a withdrawn applicant
can never be removed. The asymmetry is accidental, not designed — and it is
safe to close: the accounting layer deliberately **denormalizes** student
data onto transactions (`student_customer_no`, `student_name`, … — see the
schema below), so deleting a student row cannot orphan or alter any booking,
Quittung, or DATEV export. GoBD immutability of the books is preserved by
construction.

## Current state

- `src/server/students.ts` — exports `listStudents`, `getStudent`,
  `createStudent`, `updateStudent`. No delete.
- The pattern to copy — `deleteInstructor` in `src/server/instructors.ts:169-182`:

```ts
export function deleteInstructor(db: Database, id: number): void {
  const instructor = getInstructor(db, id);
  const name = `${instructor.firstName} ${instructor.lastName}`.trim();

  const remove = db.transaction(() => {
    db.prepare("UPDATE students SET instructor = ? WHERE instructor = ?").run(
      UNASSIGNED_INSTRUCTOR,
      name
    );
    db.prepare("DELETE FROM instructors WHERE id = ?").run(id);
  });

  remove();
}
```

- Why hard delete is safe here — `src/server/db.ts:29-45`, the
  `transactions` table stores its own snapshot of student fields and has NO
  foreign key to `students`:

```sql
CREATE TABLE IF NOT EXISTS transactions (
  ...
  student_customer_no TEXT,
  student_name TEXT,
  student_address TEXT,
  student_contract_no TEXT,
  student_classes TEXT,
  ...
);
```

  Nothing else references `students.id` (`price_plan_id` points FROM
  students TO price_plans; calendar events are not persisted as of this
  plan's writing).

- Route pattern to copy — `src/server/routes.ts:94-102` (instructor DELETE):

```ts
DELETE: (req: BunRequest<"/api/instructors/:id">) =>
  handle(() => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      throw new ValidationError("Ungültige Fahrlehrer-ID.");
    }
    deleteInstructor(db, id);
    return json({ ok: true });
  })(),
```

  `studentRoutes` is at `routes.ts:107-127` and currently has GET/POST on
  `/api/students` and PATCH on `/api/students/:id`.

- Hook pattern to copy — `deleteVehicle` in `src/hooks/use-vehicles.ts:71-75`:

```ts
export async function deleteVehicle(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/vehicles/${id}`, { method: "DELETE" })
  );
}
```

- UI: students are listed on `src/Fahrschueler.tsx` and edited on
  `src/FahrschuelerDetail.tsx` (tabs under `src/components/fahrschueler/`).
  The vehicles page (`src/Fahrzeuge.tsx`) has a working delete affordance
  added recently — a destructive icon button on the card:

```tsx
<Button
  type="button"
  variant="destructive"
  size="icon-sm"
  aria-label={`${vehicle.model} löschen`}
  onClick={onDelete}
>
  <Trash2 />
</Button>
```

  Read `src/Fahrschueler.tsx` and `src/FahrschuelerDetail.tsx` before
  choosing placement (Step 4) — the plan intentionally does not dictate the
  exact JSX location because the detail page's action area is the natural
  home and its structure may evolve.

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Tests     | `bun test`                   | all pass            |
| One file  | `bun test src/server/crud`   | all pass            |
| Typecheck | `bunx tsc --noEmit`          | no new errors       |
| Dev smoke | `bun dev`                    | manual delete works |

## Scope

**In scope**:
- `src/server/students.ts` — add `deleteStudent`
- `src/server/routes.ts` — add DELETE to `studentRoutes`
- `src/hooks/use-students.ts` — add `deleteStudent` fetch helper
- `src/Fahrschueler.tsx` and/or `src/FahrschuelerDetail.tsx` — delete
  affordance with confirmation
- `src/server/crud.test.ts`, `src/server/routes.test.ts` — extend (create
  standalone if plan 004 hasn't landed)

**Out of scope** (do NOT touch):
- The accounting engine and its tables — transactions referencing a deleted
  student keep their snapshot on purpose. No cascade, no cleanup.
- Soft-delete/archive flags — considered and rejected: the schema's `status`
  CHECK allows only `aktiv|inaktiv`, "inaktiv" already covers the
  "kept but not active" case, and the accounting snapshot covers history.
  Hard delete matches the instructor/vehicle convention.
- `src/lib/student-data.ts` (seed data and types) — no type change is
  needed.

## Git workflow

- Branch: `advisor/008-student-delete` (or direct to `main`).
- One commit: `add student delete path with confirmation`.
- Do NOT push unless instructed.

## Steps

### Step 1: `deleteStudent` in `src/server/students.ts`

```ts
export function deleteStudent(db: Database, id: number): void {
  getStudent(db, id); // throws ValidationError if unknown
  db.prepare("DELETE FROM students WHERE id = ?").run(id);
}
```

(No transaction needed — single statement, no dependent rows to update.)

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 2: DELETE route in `studentRoutes`

In `src/server/routes.ts`, import `deleteStudent` alongside the existing
student imports (line 24) and add to `"/api/students/:id"`, copying the
instructor DELETE shape exactly (German error: `"Ungültige
Fahrschüler-ID."` — the same string PATCH uses at line 121).

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 3: Fetch helper in `src/hooks/use-students.ts`

Copy the `deleteVehicle` shape:

```ts
export async function deleteStudent(id: number): Promise<void> {
  await parseOrThrow<{ ok: true }>(
    await fetch(`/api/students/${id}`, { method: "DELETE" })
  );
}
```

(If plan 005 landed, `parseOrThrow` comes from `@/lib/api`; otherwise the
local copy in the file.)

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 4: UI affordance with confirmation

Read `src/FahrschuelerDetail.tsx` and `src/Fahrschueler.tsx`. Add a
destructive "Löschen" action where the student's other actions live
(detail page preferred; list page acceptable if the detail page has no
action area). Requirements:

- MUST require confirmation before deleting — students carry contract and
  payment history. Use the repo's dialog primitives
  (`src/components/ui/alert-dialog.tsx` if present — check with
  `ls src/components/ui/ | grep -i alert` — otherwise a regular `Dialog`
  with a destructive confirm button, modeled on
  `src/components/buchhaltung/StornoDialog.tsx`).
- Confirmation copy: title `Fahrschüler/in löschen?`, body must mention the
  name and that Buchungen/Quittungen bleiben erhalten (they do — snapshot),
  confirm button `Endgültig löschen` with `variant="destructive"`.
- On success: `toast.success("Fahrschüler/in gelöscht.")`, refresh the list
  (`refresh()` from `useStudents`) and, if on the detail page, navigate back
  to the list (check how `src/App.tsx` routing navigates — read the file's
  navigation helpers before guessing).
- On failure: `toast.error(...)` with the thrown message.

**Verify**: `bun dev` → create a throwaway student via `/neue-schueler`,
delete it via the new affordance, confirm it disappears from
`/fahrschueler` after the confirmation dialog.

### Step 5: Tests

Extend `src/server/crud.test.ts` (or create, following plan 004's
conventions: `bun:test`, `openDb(":memory:")`):

- `deleteStudent` removes the row (`listStudents` length drops by 1).
- `deleteStudent` with unknown id → throws `ValidationError`.
- **The invariant that justifies hard delete**: create a student, create a
  transaction for them via `createTransaction` from `./engine` (copy a
  working payload from `src/server/engine.test.ts`), delete the student,
  then assert `listLedger(db, {})` / `listJournal(db, {})` still contain the
  student's name — the accounting snapshot survives.

Extend `src/server/routes.test.ts`:
- `DELETE /api/students/:id` → 200 `{ ok: true }`, then GET list no longer
  contains it.
- `DELETE /api/students/abc` → 400.

**Verify**: `bun test` → all pass.

## Test plan

See Step 5. Pattern exemplars: `src/server/migration.test.ts` (fixture),
`src/server/engine.test.ts` (transaction payloads), plan 004's files if
they exist.

## Done criteria

- [ ] `grep -n "deleteStudent" src/server/students.ts src/server/routes.ts src/hooks/use-students.ts` → one hit in each
- [ ] Deleting requires a confirmation dialog (manual check)
- [ ] New tests pass, including the accounting-snapshot invariant test
- [ ] `bun test` exits 0; `bunx tsc --noEmit` → no new errors
- [ ] `git status` shows only in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- You find ANY table or code path that references `students.id` or joins on
  student identity beyond the denormalized transaction columns (the
  hard-delete safety argument would be wrong — report what you found).
- The detail/list pages have no sane place for the action without
  restructuring them (report a placement proposal instead of restructuring).
- The accounting-snapshot test FAILS (ledger loses the name after delete) —
  that would falsify this plan's core assumption.

## Maintenance notes

- If calendar persistence (plan 009) later stores `studentId` on events,
  `deleteStudent` must then decide what happens to that student's events
  (likely: keep with the snapshotted name, or unassign). Revisit this
  function in that plan's review.
- Reviewer: confirm the confirmation dialog cannot be submitted by Enter
  alone from the list view (accidental destructive action).
