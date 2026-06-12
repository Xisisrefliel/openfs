# Plan 014: Stop deleted students' chat threads from being reused by name match

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/chat.ts src/server/students.ts src/server/chat.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

When a student is deleted, their chat thread survives as history: the delete
path sets `conversations.student_id = NULL` but keeps the denormalized
`student_name`. Conversation creation deduplicates by `student_id` first, then
falls back to a plain `student_name` match. The fallback can therefore match a
*deleted* student's orphaned thread: if a new student with the same name is
later created (names are not unique), or if the API is called with only a
name, the old thread is silently reused — chat history from one person leaks
into another person's conversation. The Plaudern UI always sends `student_id`,
so this is reachable today via `POST /api/conversations` without `student_id`,
but it becomes a real UI bug the moment any caller relies on the name path.

## Current state

- `src/server/chat.ts` — chat domain module. `createConversation` (lines
  344–385) dedupes: by `student_id` when given, else by `student_name`:

  ```ts
  // src/server/chat.ts:364-376
  const existing =
    studentId !== null
      ? db.query<{ id: number }, [number]>(
            "SELECT id FROM conversations WHERE student_id = ? LIMIT 1"
          ).get(studentId)
      : db.query<{ id: number }, [string]>(
            "SELECT id FROM conversations WHERE student_name = ? LIMIT 1"
          ).get(name);
  if (existing) return getConversation(db, existing.id);
  ```

- `src/server/students.ts` — `deleteStudent` (lines 302–356) orphans threads
  deliberately ("Chat threads survive as history; only the live link is cut"):

  ```ts
  // src/server/students.ts:348-352
  if (conversations.length > 0) {
    db.prepare(
      "UPDATE conversations SET student_id = NULL WHERE student_id = ?"
    ).run(id);
  }
  ```

- `src/server/chat.test.ts` — existing tests for the module; in-memory DB per
  test (same pattern as `src/server/campaigns.test.ts`: `openSqlite(":memory:")`
  in `beforeEach`, ensure-tables call, then assertions).

The intended semantics (from the code comments): an orphaned thread is
*history* — it must never be matched again, neither by name nor by id.

## The fix

Make the name-based fallback only match conversations that are **not**
orphaned remnants of a deleted student. The cleanest discriminator: a thread
that ever belonged to a registered student has `student_id` set; after the
owner's deletion it is `NULL`. A name-only conversation created via the API
also has `student_id NULL`, though — so "NULL student_id" alone cannot
distinguish "name-only thread" from "orphaned thread".

Therefore add an explicit marker: on student delete, set a new
`orphaned INTEGER NOT NULL DEFAULT 0` column to `1` (instead of relying on
NULL alone), and exclude `orphaned = 1` rows from BOTH dedup branches in
`createConversation`. Add the column idempotently (check `PRAGMA table_info`,
`ALTER TABLE conversations ADD COLUMN ...` when absent) inside
`ensureChatTables` in `src/server/chat.ts` — follow the idempotent-migration
pattern used in `src/server/db.ts` (`migrateStudentPricePlan`, lines 292–300
in that file, checks PRAGMA before ALTER).

Restore symmetry: `src/server/archive.ts` re-links conversations on student
restore (it stores conversation ids in the archive payload — see
`students.ts:315-329`). Find where restore re-links `student_id` on
conversations and clear `orphaned` back to `0` there.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0, no errors   |
| Tests     | `bun test`           | all pass (387+ tests) |
| One file  | `bun test src/server/chat.test.ts` | all pass |

## Scope

**In scope** (the only files you should modify):
- `src/server/chat.ts`
- `src/server/students.ts`
- `src/server/archive.ts` (only the student-restore re-link spot)
- `src/server/chat.test.ts`

**Out of scope** (do NOT touch):
- `src/Plaudern.tsx`, `src/hooks/use-chat.ts` — UI is unaffected.
- `src/server/db.ts` — the conversations table is owned by chat.ts
  (`ensureChatTables`), not the central DDL.
- Any change to the wire shape of `Conversation` — the `orphaned` flag is
  server-internal; do not add it to the JSON response.

## Git workflow

- Branch: `advisor/014-chat-orphan-dedup` from `main` (`160eccc`)
- Commit style: title-only, no body, small logical chunks (matches repo
  history, e.g. "db integrity: propagate renames/deletes through name-keyed references")
- Do NOT push or open a PR.

## Steps

### Step 1: Add the idempotent `orphaned` column migration

In `src/server/chat.ts`, inside `ensureChatTables` (the function that creates
the conversations/chat_messages tables), after the DDL: query
`PRAGMA table_info(conversations)`; if no column named `orphaned`, run
`ALTER TABLE conversations ADD COLUMN orphaned INTEGER NOT NULL DEFAULT 0`.

**Verify**: `bun test src/server/chat.test.ts` → existing tests still pass.

### Step 2: Mark threads orphaned on student delete

In `src/server/students.ts` `deleteStudent`, change the conversation update to
`UPDATE conversations SET student_id = NULL, orphaned = 1 WHERE student_id = ?`.
Guard with the same `tableExists(db, "conversations")` check already there.
Note: `deleteStudent` runs against DBs whose chat table may predate the new
column (it checks `tableExists` only). Guard the `orphaned` assignment: check
the column exists via `PRAGMA table_info` (extract a small helper if one
doesn't exist), or accept that `openDb`/`ensureChatTables` always runs first
in both server and tests — verify which is true by checking how
`src/server/chat.test.ts` and `src/index.ts` initialize tables, and state
your conclusion in the report.

**Verify**: `bun test src/server/students.test.ts` if it exists, else `bun test` → pass.

### Step 3: Exclude orphaned threads from dedup

In `createConversation` (`src/server/chat.ts:364-376`), add
`AND orphaned = 0` to both SELECTs (the `student_id` branch and the
`student_name` branch).

**Verify**: `bun test src/server/chat.test.ts` → pass.

### Step 4: Clear the flag on restore

In `src/server/archive.ts`, locate the student-restore path that re-links
conversations (search for `conversations` in that file; the archive payload
carries the conversation ids saved at delete time). Where `student_id` is
restored onto those conversation rows, also set `orphaned = 0`.

**Verify**: `bun test src/server/archive.test.ts` → pass.

## Test plan

Add to `src/server/chat.test.ts`, modeled after its existing tests:

1. **Regression (the bug)**: create student A (use the students module or
   insert directly, matching how existing tests arrange data), create a
   conversation linked to A, delete A via `deleteStudent`, then call
   `createConversation({ student_name: "<A's exact name>" })` → expect a NEW
   conversation id, not the orphaned one.
2. Same scenario but `createConversation({ student_id: <new student with same
   name> })` → new thread, not the orphan.
3. Orphaned thread still readable: `getConversation` on the orphaned id
   succeeds (history is preserved).
4. Restore: delete student, restore from archive, then
   `createConversation({ student_id })` → matches the restored (un-orphaned)
   original thread again.

**Verification**: `bun test src/server/chat.test.ts` → all pass including 4 new tests.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0; ≥4 new tests covering the scenarios above exist and pass
- [ ] `grep -n "orphaned" src/server/chat.ts src/server/students.ts src/server/archive.ts` shows the column in all three places
- [ ] The JSON response shape of `/api/conversations` is unchanged (no `orphaned` field in `toConversation`)
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the cited locations doesn't match the excerpts (drifted).
- `src/server/archive.ts` turns out NOT to re-link conversations on restore
  (the payload key exists but no restore code uses it) — report; step 4 then
  shrinks to "nothing to do", but confirm first rather than adding new restore
  behavior.
- Step 2's column-existence question cannot be answered conclusively.

## Maintenance notes

- If a future "merge threads" or "re-attach orphan to student" admin feature
  is built, it must clear `orphaned`.
- Reviewer: check the new tests assert on conversation **ids**, not just
  counts — id equality is what proves reuse vs. fresh creation.
