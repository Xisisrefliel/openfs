# Plan 019: Link Fahrstunden to accounting — confirm-to-bill from the Stunden tab

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Read first**: `plans/design/lessons-billing.md` (committed in this repo) —
> the approved design this plan implements: **option A (confirm-to-bill) on
> linkage option 1 (`student_id` column)**. This plan is self-contained, but
> the design doc carries the full rationale and GoBD constraints.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/calendar-events.ts src/server/db.ts src/components/fahrschueler/StundenTab.tsx src/components/buchhaltung/PaymentDialog.tsx src/lib/price-plan.ts src/hooks/use-calendar-events.ts`
> On any drift, compare the "Current state" excerpts against live code; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED (schema migration + touches the money path's UI; the engine itself is NOT modified)
- **Depends on**: 016 (soft — its tests are the regression net)
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The app has a tested double-entry engine, per-student price plans, and
persisted lessons — but no link between them. Every driven Fahrstunde must be
manually re-typed as a charge in the Zahlung tab. This plan adds the link:
lessons know their student by id (not display-name string), the Stunden tab
shows which practical lessons are un-billed, and one click opens the existing
PaymentDialog prefilled; confirming posts through the existing
`createTransaction` and stores the link back on the event. No new accounting
concepts: no drafts, no auto-posting, immutability and gapless numbering
untouched.

## Decisions already made (do not re-litigate)

From the design doc's open questions, resolved as its suggested defaults:

1. Revenue account: prefill `4400` (the PaymentDialog default), operator can
   change per booking. Never hard-code tax logic.
2. Price component: prefill the price-plan component labeled
   `"Fahrübungsstunde"`; operator can change amount/description.
3. A lesson with a `billed_transaction_id` cannot be deleted (server rejects;
   require Storno first). Moving a billed lesson keeps the link.
4. Scope: only `type = "Praktisch"` events are billable in this plan.
5. Storno handling: an event whose linked transaction is storniert counts as
   un-billed again in the UI (the link is kept, the state derived).

## Current state

- `src/server/db.ts:137-151` — `calendar_events` DDL (no student/billing
  columns):

  ```sql
  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
    title TEXT NOT NULL, subtitle TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    instructor TEXT NOT NULL DEFAULT 'Nicht zugeteilt',
    vehicle TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('Praktisch','Theorie','Vorstellung zur prakt. Prüfung','Theorieprüfung','Andere')),
    tentative INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```

- Migration exemplar — `migrateStudentPricePlan` pattern (db.ts, around
  lines 292–300 region; openDb calls it at db.ts:288): check
  `PRAGMA table_info`, `ALTER TABLE ... ADD COLUMN` if absent, idempotent.

- `src/server/calendar-events.ts` — `CalendarEvent` wire type (lines 28–41,
  string id, optional fields omitted when empty), `normalize` (129–188),
  `createCalendarEvent` (190–214), `updateCalendarEvent` (216–242),
  `deleteCalendarEvent` (244–256, archives then hard-deletes).

- `src/components/fahrschueler/StundenTab.tsx:59-73` — matches lessons by
  display name (this stays for rendering; billing must NOT rely on it):

  ```tsx
  const fullName = `${student.firstName} ${student.lastName}`;
  const { events: allEvents } = useCalendarEvents();
  const events = useMemo(() =>
    allEvents.filter(event => event.subtitle === fullName)...
  ```

- `src/components/buchhaltung/PaymentDialog.tsx` — already supports
  `guthaben_uebertragung` with `defaultCustomerNo` re-pinning (lines 140–145)
  and builds `description: "FS <name> - <classes>, <text>"` (lines ~214–219).
  Check its props before extending: it takes `open/onOpenChange`,
  `defaultCustomerNo`, accounts, students, and an on-created callback —
  read the actual prop list at the top of the file.

- `src/lib/price-plan.ts:11-26` — `PriceComponent { label, durationMin?,
  priceCents | null }`, `PricePlanRecord`; seed has "Fahrübungsstunde"
  (45 min, 65_00).

- Engine — NOT to be modified. `createTransaction(db, input)`
  (`src/server/engine.ts:198`) with `type: "guthaben_uebertragung"` books
  `anzahlung an habenKonto` and requires a student + description
  (engine.ts:258-281). Transactions snapshot the student
  (`student_customer_no` etc., db.ts:29-45). `stornoTransaction` marks the
  original via `storniert_by` (engine.ts:422+).

- `src/hooks/use-calendar-events.ts` — the events hook all consumers share.

- Tests exemplars: `src/server/calendar-events.test.ts`,
  `src/server/engine.test.ts`, `src/server/migration.test.ts`.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/server/db.ts` (new idempotent migration function + call in `openDb`)
- `src/server/calendar-events.ts` (carry `studentId`/`billedTransactionId`)
- `src/server/routes.ts` (only if the events routes need the new fields passed through / the delete-guard error)
- `src/lib/calendar-data.ts` (wire type `CalEvent` — add optional fields; check `isFahrstunde` at line ~54)
- `src/lib/price-plan.ts` (add a pure `resolveLessonPrice` helper) + new tests in `src/lib/price-plan.test.ts`
- `src/hooks/use-calendar-events.ts` (expose new fields + a `refresh`)
- `src/components/fahrschueler/StundenTab.tsx` (un-billed indicator + "Abrechnen" action)
- `src/components/buchhaltung/PaymentDialog.tsx` (accept optional prefill props; additive only)
- `src/server/calendar-events.test.ts`, `src/server/migration.test.ts` (extend)

**Out of scope** (do NOT touch):
- `src/server/engine.ts` — the engine is frozen; billing goes through its
  existing public API only.
- `src/Kalendar.tsx` — the calendar page keeps working through the unchanged
  optional-field wire shape; do not add billing UI there in this plan.
- Back-fill of `student_id` for pre-existing events beyond the unique-name
  match described in step 2.
- Batch billing ("alle abrechnen") — explicitly deferred.

## Git workflow

- Branch: `advisor/019-lesson-billing` from `main` (`160eccc`)
- Commits: title-only, one per step, e.g. "calendar_events: student_id + billed_transaction_id migration"
- Do NOT push or open a PR.

## Steps

### Step 1: Schema migration

In `src/server/db.ts` add `migrateCalendarEventBilling(db)`: via
`PRAGMA table_info(calendar_events)`, add (when absent)
`student_id INTEGER REFERENCES students(id)` and
`billed_transaction_id INTEGER REFERENCES transactions(id)`. Call it in
`openDb` right after `migrateStudentPricePlan(db)` (db.ts:288). Mirror the
existing migration function's style exactly.

**Verify**: `bun test src/server/migration.test.ts` → pass; add a test that a
DB created from old DDL gains both columns and that running twice is a no-op.

### Step 2: One-time best-effort back-fill

In the same migration (guarded so it runs only when the column was just
added): set `student_id` where `subtitle` matches exactly one student's
`trim(first_name || ' ' || last_name)`; leave NULL on 0 or >1 matches.

**Verify**: migration test: two students "A B" and a namesake → ambiguous
subtitle stays NULL; unique subtitle gets the id.

### Step 3: Carry the fields through calendar-events.ts

Extend `CalendarEventRow`, `CalendarEvent` (optional `studentId?: number`,
`billedTransactionId?: number` — omitted when NULL, matching the existing
optional-field convention at lines 58–73), `CalendarEventInput`, `normalize`
(validate `studentId` is a positive integer referencing an existing student —
look up via the students table; reject otherwise), SELECT/INSERT/UPDATE.
`billed_transaction_id` is NOT settable through the generic update payload:
add a dedicated exported `markEventBilled(db, eventId, transactionId)` and
`getUnbilledState` logic instead, so a client cannot forge billing state via
PUT. In `deleteCalendarEvent`, throw `ValidationError("Termin ist abgerechnet
— zuerst stornieren.")` when `billed_transaction_id` is set AND the linked
transaction is not storniert (join `transactions.storniert_by`).

**Verify**: `bun test src/server/calendar-events.test.ts` → pass with new
tests (create with studentId, reject unknown studentId, delete-guard).

### Step 4: Billing endpoint

In `src/server/routes.ts` (calendarEventRoutes factory), add
`POST /api/calendar-events/:id/bill` → body is the `CreateTransactionInput`
for `guthaben_uebertragung` (the client builds it exactly as PaymentDialog
does today); handler: load event (must be type "Praktisch", must have
`student_id`, must not be already billed-and-not-storniert), call
`createTransaction(db, body)`, then `markEventBilled(db, id, tx.id)` —
wrap BOTH in `db.transaction(...)` so a failed link rolls back the booking.
Return the created transaction + updated event. Reuse the existing `handle()`
wrapper and `json()` helper (routes.ts:54-70).

**Verify**: new route test in `src/server/calendar-events.test.ts` or
`routes.test.ts` (follow where existing calendar-event route tests live):
bill an event → 200, transaction exists, event linked; bill again → 400;
storno the transaction via the engine, bill again → 200 with a NEW transaction.

### Step 5: Price-resolution helper

In `src/lib/price-plan.ts` add pure
`resolveLessonPrice(plan: PricePlanRecord | undefined, componentLabel = "Fahrübungsstunde"): { component: PriceComponent; priceCents: number } | null`
— returns null when plan missing, component missing, or `priceCents` null.
Tests in `src/lib/price-plan.test.ts` (create it; model after
`src/lib/contracts.test.ts`).

**Verify**: `bun test src/lib/price-plan.test.ts` → pass.

### Step 6: StundenTab UI

In `StundenTab.tsx`: prefer matching lessons by `event.studentId ===
student.id` and fall back to the existing subtitle match only for events with
no `studentId` (keeps old data visible). For `type === "Praktisch"` events:
show a quiet "Offen" indicator (outline badge, dot + text — follow
`design-guideline.md` §3: `size-1.5 rounded-full` dot, no filled pills) when
un-billed, "Abgerechnet" muted text when billed, and an "Abrechnen" action
that opens `PaymentDialog` with: `type=guthaben_uebertragung`,
`defaultCustomerNo=student.customerNumber`, date = event.date, amount/
description prefilled from `resolveLessonPrice` + the component label and the
event duration. Events with `studentId` NULL render the action disabled with
tooltip "Kein Fahrschüler verknüpft". On dialog success call the new bill
endpoint... 

**Correction — single write path**: the PaymentDialog currently posts the
transaction itself. To keep ONE write path, extend PaymentDialog with an
optional `onSubmitOverride?: (input: CreateTransactionInput) => Promise<void>`
prop: when present, the dialog calls it instead of its own API call. StundenTab
passes an override that POSTs to `/api/calendar-events/:id/bill`. All other
PaymentDialog usages are unchanged (prop optional).

**Verify**: `bun run typecheck` && `bun run build` → exit 0.

### Step 7: Events created from a student context carry the id

Where lessons are created with a student attached: the EventEditDialog /
Kalendar create flow uses free-text subtitle today — out of scope. But the
appointment-requests accept path (`src/server/appointment-requests.ts`,
`acceptAppointmentRequest` ~line 467) creates calendar events; leave it (no
student id available there). The only in-scope producer: nothing currently
creates events FROM a student page. So: no producer changes in this plan —
new events get `studentId` only via the back-fill or future callers.
State this explicitly in your report so the reviewer knows it's intentional.

**Verify**: `bun test` → all pass.

## Test plan

Summarized from steps: migration (idempotent, back-fill unique-only), wire
shape (optional fields omitted), validation (unknown studentId rejected),
delete-guard (billed events refuse deletion until storno), bill endpoint
(happy, double-bill rejected, re-bill after storno), price resolution (plan
missing / component missing / null price / happy). Existing exemplars:
`calendar-events.test.ts`, `migration.test.ts`, `contracts.test.ts`.

## Done criteria

- [ ] `bun run typecheck` exits 0
- [ ] `bun test` exits 0 with ≥10 new tests across migration/events/price/route
- [ ] `bun run build` exits 0
- [ ] `grep -n "billed_transaction_id" src/server/db.ts src/server/calendar-events.ts` shows migration + module wiring
- [ ] `grep -rn "createTransaction" src/server/` shows NO new call sites outside `routes.ts` (engine API used, not modified)
- [ ] `git diff --stat 160eccc -- src/server/engine.ts` is EMPTY
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- The engine appears to need modification to satisfy any step — it does not;
  stop and report your reasoning.
- PaymentDialog's actual props diverge so much from the description that the
  override-prop approach needs a redesign of the dialog.
- The transaction-wrapping in step 4 fails because `createTransaction` opens
  its own transaction and bun:sqlite nesting errors — report what you observe
  (the engine may already run inside `db.transaction`; nested transactions in
  bun:sqlite are savepoint-based — verify, don't assume).
- Migration test reveals existing user data (data/fahrschule.db is NOT part of
  the repo — tests must use in-memory DBs only; if any test touches
  `data/fahrschule.db`, stop).

## Maintenance notes

- Plan 023 (Ausbildungsnachweis) builds on `calendar_events.student_id` — land
  this first.
- Plan 020 (exam results) adds further columns to calendar_events — its
  migration must compose with this one (separate ALTER statements, both
  idempotent).
- Reviewer: scrutinize step 4's transactionality and the delete-guard
  storno-awareness; those are the two spots where money state and calendar
  state could drift apart.
- Deferred: batch billing, producer-side studentId on Kalendar event creation,
  exams/fees billing (design doc §6 Q4).
