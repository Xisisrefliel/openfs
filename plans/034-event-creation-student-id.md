# Plan 034: Set studentId when a calendar event is created or edited in the UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/components/EventEditDialog.tsx src/Kalendar.tsx src/server/calendar-events.ts src/hooks/use-calendar-events.ts`
> On any change, compare the excerpts below against live code; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction (deferred follow-up of plan 019)
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

The lesson-billing link (plan 019) gave `calendar_events` a `student_id`
column, and the server's normalize path already accepts and validates it —
but the calendar UI still creates events with only the free-text student
*name* (`subtitle`). The id the dialog already has in hand is discarded, so
new lessons get `student_id = NULL` until a billing action back-fills it by
name match (ambiguous with duplicate names). Exam statistics filter on
`student_id IS NOT NULL` and silently skip unlinked events. Wiring the id
through at creation removes the ambiguity at the source.

## Current state

- `src/components/EventEditDialog.tsx:297-305` — props include `studentOptions: string[]` (names only).
- `:491-516` — the "Fahrschüler" field: a combobox over `studentOptions` writing the chosen **name** to `draft.subtitle` (`update("subtitle", value || undefined)`). There is no `studentId` anywhere in the dialog (verified by grep).
- `src/Kalendar.tsx:676` — `const studentOptions = useMemo(...)` builds the name list (from the students hook); `:1406` passes it to the dialog.
- `src/server/calendar-events.ts` — `normalize()` already handles `studentId`: validates positive integer and existence (`SELECT count(*) ... FROM students WHERE id = ?`, throws `Fahrschüler mit ID ... nicht gefunden.`). The wire shape exposes `studentId`; `CalendarEventInput` includes it (`:56-59` region).
- `src/hooks/use-calendar-events.ts` — create/update post the draft object as JSON; no `studentId` handling (grep: zero hits).
- Events that are not student lessons (Theorieunterricht, Sonstiges…) legitimately have no student — `studentId` must stay optional.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Tests     | `bun test`          | 556+ pass, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |

## Scope

**In scope**:
- `src/components/EventEditDialog.tsx`
- `src/Kalendar.tsx`
- `src/hooks/use-calendar-events.ts` (only if the draft type needs the field)
- `src/server/calendar-events.test.ts` (one roundtrip test if not already present)

**Out of scope**:
- `src/server/calendar-events.ts` — the server already supports this; do not change it.
- Back-filling existing NULL events (the billing-time name-match back-fill keeps covering legacy rows).
- `src/components/fahrschueler/StundenTab.tsx` and billing UI.

## Git workflow

- Branch: `advisor/034-event-student-id`
- Commits: title-only, e.g. `Kalendar: pass students with ids to EventEditDialog`, `EventEditDialog: resolve studentId from selected name`.

## Steps

### Step 1: give the dialog access to ids

In `src/Kalendar.tsx`, alongside `studentOptions`, build a
`studentIdByName: Map<string, number>` (or pass a
`students: { id: number; name: string }[]` prop — pick whichever needs the
smaller diff given how `studentOptions` is built at `:676`; if two students
share a display name, map to the FIRST and keep current name-display
behavior). Pass it to `EventEditDialog`.

### Step 2: resolve on save

In `EventEditDialog`, when building the payload on save: if
`draft.subtitle` exactly matches a known student name, include
`studentId: <id>`; otherwise send `studentId: null` (free-text non-student
subtitles keep working). Also: when the user EDITS an existing event and
clears/changes the name, the resolved value (id or null) must overwrite the
old link — never silently keep a stale id.

Type updates: extend the dialog's draft/payload type and, if the hook's
input type is explicit, `use-calendar-events.ts` — follow the existing
field patterns.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: roundtrip test

In `src/server/calendar-events.test.ts`, if not already covered: create an
event with `studentId` set → read it back → `studentId` matches; update
with `studentId: null` → cleared. (Skip with a NOTE if both cases already
exist.)

**Verify**: `bun test` → all pass; `bun run build` → exit 0.

## Test plan

Backend roundtrip per step 3. There is deliberately no DOM test framework
in this repo (decision documented in plans/README.md) — do not add one;
the UI wiring is verified by typecheck + the reviewer's manual smoke.

## Done criteria

- [ ] `bun test`, `bun run typecheck`, `bun run build` all exit 0
- [ ] `grep -n "studentId" src/components/EventEditDialog.tsx` → ≥ 2 hits (resolve + payload)
- [ ] Creating an event through the API with the dialog's payload shape carries `studentId`
- [ ] `git status` shows only in-scope files

## STOP conditions

- The dialog's save path doesn't build a JSON payload you can extend (e.g. it serializes `draft` opaquely through code outside scope).
- `normalize()` on the server rejects the payload in a way requiring server changes.

## Maintenance notes

- Duplicate display names map to the first match — same limitation the billing back-fill has; a future student-picker storing ids directly (instead of name strings) would remove it. Note for the batch-billing work (plan 035): events created after this plan land carry reliable ids.
