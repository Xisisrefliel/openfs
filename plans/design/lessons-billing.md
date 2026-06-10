# Design spike: link completed Fahrstunden to accounting

> Status: DESIGN — maintainer-decision document. No production code changed.
> Authored against branch `advisor/010-lessons-billing-design`
> (base `advisor/009-calendar-persistence`, HEAD `2448aec`).
> Every factual claim cites `file:line` or quotes code read in this tree.

---

## 1. Problem

The app already has the three pieces a lessons-to-billing link would need, but
not the link itself. (1) A tested double-entry booking engine —
`createTransaction(db, input)` in `src/server/engine.ts:198` is the only write
path for charges, and it snapshots the student onto each transaction
(`src/server/engine.ts:328-345`). (2) Per-student price plans —
`students.price_plan_id` (`src/server/db.ts:103`) points at a `price_plans` row
whose `components` carry per-unit prices (`src/lib/price-plan.ts:11-24`).
(3) Persisted lessons — since plan 009, practical lessons live in
`calendar_events` (`src/server/db.ts:137-151`) and are read per student in the
Stunden tab (`src/components/fahrschueler/StundenTab.tsx:62-73`). What is
missing is the connection: when a Fahrstunde happens, nothing creates the
matching charge. Today that is manual work in the Zahlung tab / Buchhaltung
page (`src/components/fahrschueler/ZahlungTab.tsx:306-315`,
`PaymentDialog` → `createTransaction`). This spike decides **how** the link
should work before anyone builds it.

---

## 2. Constraints

**GoBD (baked into the schema and engine — these are hard constraints):**

- **Bookings are immutable.** `src/server/db.ts:5-8` states "bookings are
  immutable (no UPDATE/DELETE code paths exist)". The engine confirms it:
  `createTransaction` only ever `INSERT`s into `transactions`/`bookings`
  (`src/server/engine.ts:326-369`); there is no update/delete export for
  posted bookings.
- **Corrections only via Storno.** `stornoTransaction`
  (`src/server/engine.ts:422-506`) writes a *reversal* transaction with Soll
  and Haben swapped (`src/server/engine.ts:481-491`) and marks the original
  `storniert_by` (`src/server/engine.ts:499-502`). A Storno of a Storno is
  rejected (`src/server/engine.ts:433-438`).
- **Gapless sequences.** Beleg-/Buchungs-/Quittungsnummern come from DB
  sequences allocated inside the surrounding write transaction
  (`src/server/db.ts:651-674`); Quittungsnummern are assigned lazily on first
  print so the sequence stays gapless (`src/server/engine.ts:709-732`).
- **There is NO draft / pending / uncommitted concept in the engine.** Searched
  the engine and types: the only `transactions.type` values are
  `zahlung_guthaben | direktzahlung | guthaben_uebertragung | transfer |
  ausgabe` (`src/lib/accounting-types.ts:37-42`,
  `src/server/engine.ts:214-322`). No "draft" column exists on `transactions`
  (`src/server/db.ts:29-45`). (This satisfies the spike's STOP-condition check:
  the engine does **not** already have a draft/pending mechanism, so option B's
  premise stands.)

**Single-user local app:** SQLite on disk (`openDb("data/fahrschule.db")`,
`src/server/db.ts:272`); no concurrency/auth layer. So a "human confirms each
charge" flow is cheap — there is exactly one operator.

**Which revenue account a Fahrstunde books to:** the engine routes a charge to
whatever `habenKonto` the caller passes, validated to be `erloes` or
`durchlaufend` (`src/server/engine.ts:236-241`, `:262-265`). The relevant
revenue accounts in the seed are:

- `4400` "Erlöse 19 % USt" (`src/server/db.ts:180`)
- `4300` "Erlöse 7 % USt" (`src/server/db.ts:179`)
- `4100` "Steuerfreie Umsätze § 4 Nr. 8 ff. UStG (Ausbildung § 4 Nr. 21)",
  `vatRate: 0` (`src/server/db.ts:178`)
- `1370` "Durchlaufende Posten" — used for the TÜV-Gebühr
  (`src/server/seed.ts:75-77`, `src/server/engine.test.ts:93-104`)

The existing demo books a "Fahrübungsstunde (90)" to **`4400` (19 %)**
(`src/server/seed.ts:78-85`; asserted in `src/server/engine.test.ts:80-91`),
and the `PaymentDialog` defaults `habenKonto` to `4400`
(`src/components/buchhaltung/PaymentDialog.tsx:150`). **However**, account
`4100`'s own seed name says driving-school training can be tax-exempt under
§ 4 Nr. 21 UStG (`src/server/db.ts:178`). Whether a given practical Fahrstunde
is 19 % (4400) or exempt (4100) is a tax determination, not something the code
settles. → **OPEN QUESTION 1 (do not guess tax law).** The design must let the
operator/price-plan choose the revenue account, not hard-code one.

---

## 3. Design options

All three reuse the existing `guthaben_uebertragung` transaction type
(charge against the student's prepaid Guthaben: `3272 an <Erlöskonto>`,
no Beleg — `src/server/engine.ts:258-281`, `src/server/seed.ts:62-69`),
because that is exactly how a lesson is billed against a prepaid
Ausbildungskonto today.

### A. Confirm-to-bill (human confirms each charge)

Flow:

```
Fahrstunde happens (calendar_events row, type "Praktisch")
        │
        ▼
StundenTab / Kalendar shows an "abrechnen" action on un-billed lessons
        │   (un-billed = no transaction linked to this event yet)
        ▼
Operator clicks → PaymentDialog opens, PREFILLED:
   type=guthaben_uebertragung, student=<resolved>, date=event.date,
   amountCents=<price-plan lookup>, habenKonto=<4400 default>,
   description="FS <name> - <classes>, <component label> (duration)"
        │
        ▼
Operator reviews / edits / confirms → createTransaction()  (engine.ts:198)
        │
        ▼
Event marked billed (records the transaction id — see §4 / option C mechanism)
```

Files touched (build phase, not now): `src/components/fahrschueler/StundenTab.tsx`
(add action + un-billed indicator), reuse
`src/components/buchhaltung/PaymentDialog.tsx` (already supports
`guthaben_uebertragung` with prefilled `student`/`habenKonto`/`description` —
`PaymentDialog.tsx:214-219`), a price-resolution helper over
`PricePlanRecord.components` (`src/lib/price-plan.ts:11-24`), and a small
link column on `calendar_events` (`src/server/db.ts:137-151`,
`src/server/calendar-events.ts`).

Trade-offs:
- (+) Smallest delta; reuses the existing dialog and engine verbatim.
- (+) GoBD-clean: nothing is posted without a human commit; immutability and
  gapless numbering are untouched.
- (+) Sidesteps OPEN QUESTION 1 — the operator picks/confirms the
  revenue account in the dialog (`PaymentDialog.tsx:366-375`).
- (−) Manual per lesson (mitigated: single-user app, and a future batch
  "abrechnen alle" can wrap the same prefill).
- (−) Needs the link column anyway to know which lessons are still un-billed.

### B. Auto-draft (server job creates draft charges)

Flow:

```
Server endpoint/job scans calendar_events (type "Praktisch") with no linked tx
        │
        ▼
Creates a DRAFT charge per lesson  ──✗── engine has NO draft concept
        │
        ▼
Operator later reviews drafts → "commit" turns each into a real booking
```

Files touched: a new draft table + new engine code paths (drafts are
explicitly outside today's engine — `src/lib/accounting-types.ts:37-42`,
`src/server/db.ts:29-45`), a scan endpoint in `src/server/routes.ts`, a review
UI.

**Honest conflict analysis with immutability:** the engine's whole contract is
that *anything written to `transactions`/`bookings` is final and only
reversible by Storno* (`src/server/db.ts:5-8`, `engine.ts:422-506`). A "draft"
is by definition a mutable, deletable, pre-commit record. To do B safely you
**cannot** put drafts in `transactions` — you'd have to add a *parallel*
`charge_drafts` table that lives entirely outside GoBD scope, plus a
commit step that calls `createTransaction` and then deletes the draft. That is
a second bookkeeping surface to keep consistent with the real ledger, and the
deletion of "rejected" drafts must be provably outside the books. It also
re-implements option A's confirm step (drafts still need human commit to be
GoBD-legal) while adding a whole storage/sync layer. Net: B's automation buys
little over A and adds real architectural risk. Not recommended.

### C. Billing-on-completion flag

Flow:

```
calendar_events gains a "stattgefunden" flag + billed_transaction_id
        │
        ▼
Operator marks a lesson "stattgefunden"
        │
        ▼
That toggle IMMEDIATELY calls createTransaction()  (engine.ts:198)
        │
        ▼
billed_transaction_id stored on the event
```

Files touched: `calendar_events` schema (`src/server/db.ts:137-151`) +
validation (`src/server/calendar-events.ts:128-187` `normalize`), the toggle in
StundenTab/Kalendar, the same price-resolution helper.

Trade-offs:
- (+) One gesture; the "did it happen" and "bill it" states stay in sync.
- (+) Same engine path as A; GoBD-clean as long as the charge is a normal
  immutable booking.
- (−) Couples a *calendar* state change to an *accounting* write — a misfired
  toggle posts a real booking that now needs a Storno to undo
  (`engine.ts:422`). Less forgiving than A's explicit confirm.
- (−) Still needs the revenue-account/price decision (OPEN QUESTION 1) made
  silently at toggle time, or a confirm step — at which point it collapses
  into A.

---

## 4. Student-linkage decision

The gap: a `calendar_events` row identifies its student **only** by the
free-text `subtitle` display name. The Stunden tab matches lessons by
`event.subtitle === fullName` (`src/components/fahrschueler/StundenTab.tsx:67`),
and `subtitle` is a plain trimmed string with no FK
(`src/server/calendar-events.ts:180`, schema `src/server/db.ts:143`). Billing,
by contrast, identifies the student by a stable key: the Zahlung tab passes
`defaultCustomerNo={student.customerNumber}`
(`src/components/fahrschueler/ZahlungTab.tsx:308-310`) and `PaymentDialog`
resolves a full `StudentRef` via `studentRef(students, customerNo)`
(`src/components/buchhaltung/PaymentDialog.tsx:190-192`). Names are not unique
or stable (two "Köksal Gül" entries already appear as instructor subtitles in
the seed — `src/server/db.ts:421,442`), so name-matching is unsafe for money.

Options:

1. **`student_id` column on `calendar_events`** (FK → `students.id`). Set when
   a lesson is created from a known student; the display `subtitle` stays for
   rendering. Billing reads `student_id` → resolves the snapshot the same way
   `PaymentDialog` does today.
2. **Name matching at billing time** (`subtitle` === fullName). Zero schema
   change, but ambiguous (duplicate/renamed names) and silently wrong for
   money. Reject for billing.
3. **Pick-at-billing** (operator selects the student in the prefilled dialog).
   Safe, but re-asks every time and can't power an "un-billed lessons" badge.

**Recommendation: option 1 — add `student_id` to `calendar_events`.** It is the
only one that gives billing a stable reference and lets the UI know which
lessons are un-billed. The `subtitle` display name stays as-is for the calendar
rendering, so no UI regresses.

**Migration note for pre-link events:** the column is added the same
idempotent way `price_plan_id` was back-filled — see the
`migrateStudentPricePlan` pattern (`src/server/db.ts:292-300`): check
`PRAGMA table_info`, `ALTER TABLE ... ADD COLUMN student_id INTEGER REFERENCES
students(id)` if absent. Pre-existing events (seed + anything created before the
link) will have `student_id = NULL`. A best-effort one-time back-fill can match
`subtitle` against `first_name || ' ' || last_name` and set `student_id` only
where the match is **unique** (leave NULL on 0 or >1 matches). The billing UI
then treats `student_id IS NULL` events as "needs a student picked before it can
be billed" (falls back to option 3 for those rows only).

---

## 5. Recommendation

**Adopt option A (Confirm-to-bill) on top of student-linkage option 1
(`student_id` column).** A is the smallest change that respects every GoBD
constraint — it reuses `createTransaction` and the existing `PaymentDialog`
unchanged, never invents a draft state the engine deliberately lacks, and keeps
a human in the loop for the tax-account choice that the code cannot settle
(OPEN QUESTION 1). Linkage option 1 is the prerequisite that makes "which
lessons are still un-billed" answerable and keeps money tied to a stable
student key rather than a display name.

Build-plan sketch (a future plan expands this):

1. Migration: `ALTER TABLE calendar_events ADD COLUMN student_id` (idempotent,
   mirror `migrateStudentPricePlan`, `src/server/db.ts:292-300`); add a
   nullable `billed_transaction_id INTEGER REFERENCES transactions(id)`.
2. Back-fill `student_id` from `subtitle` on unique name match only; leave NULL
   otherwise.
3. Extend `CalendarEvent`/`CalendarEventInput` + `normalize`
   (`src/server/calendar-events.ts:27-41,128-187`) and the create/update paths
   to carry `student_id`; set it when lessons are created from a student
   context.
4. Price-resolution helper: given a student's `price_plan_id` → `price_plans`
   `components` (`src/lib/price-plan.ts:11-24`), map a practical lesson to a
   component (which label/duration? → OPEN QUESTION 2) and return
   `priceCents`; handle `price_plan_id` NULL and `priceCents` NULL.
5. UI: in `StundenTab` (`src/components/fahrschueler/StundenTab.tsx`) show an
   "abrechnen" action on `isFahrstunde` events (`src/lib/calendar-data.ts:54`)
   that have no `billed_transaction_id`, plus an un-billed indicator.
6. Wire the action to open `PaymentDialog` prefilled
   (`type=guthaben_uebertragung`, resolved student, event date, looked-up
   amount, default `habenKonto=4400`, description).
7. On successful `createTransaction`, store `billed_transaction_id` on the
   event; surface "abgerechnet" state.
8. Handle Storno: if the linked transaction is storniert
   (`engine.ts:422`), clear/flag the event back to un-billed.
9. Tests mirroring `src/server/engine.test.ts` for the price-resolution helper
   and the link/back-fill migration.
10. (Optional, later) batch "alle offenen Fahrstunden abrechnen" over the same
    prefill — *not* an auto-poster (keeps the human confirm).

---

## 6. Open questions for the maintainer

1. **Which revenue account does a practical Fahrstunde book to?** The demo and
   the dialog default to `4400` (19 %) (`src/server/seed.ts:78-85`,
   `PaymentDialog.tsx:150`), but `4100` exists for § 4 Nr. 21 UStG-exempt
   driving training (`src/server/db.ts:178`). This is a tax determination — I
   will not guess. *Suggested default:* keep `4400` (19 %) selectable-and-
   prefilled in the confirm dialog, decided per booking by the operator;
   confirm the correct account(s) with the Steuerberater before building.
2. **Which price-plan component represents a billable practical lesson?** The
   seed plan has several priced practical components — "Fahrübungsstunde"
   (45 min, 65 €), "Nachtfahrt"/"Autobahnfahrt"/"Überlandfahrt" (45 min, 75 €),
   "Praktische Prüfung" (`src/lib/price-plan.ts:32-43`) — but a
   `calendar_events` row only knows it is `type: "Praktisch"`
   (`src/lib/calendar-data.ts:54`), not which component. *Suggested default:*
   prefill "Fahrübungsstunde" as the standard lesson and let the operator
   change the component/amount in the confirm dialog; consider adding an
   explicit lesson-kind field to practical events later.
3. **What happens to a billed lesson that is later deleted or moved?**
   `deleteCalendarEvent` currently hard-deletes
   (`src/server/calendar-events.ts:243-246`); the booking would be orphaned but
   immutable. *Suggested default:* block deletion of a lesson with a
   `billed_transaction_id` (require Storno first), and on move just keep the
   link (the booking date is independent of the event date).
4. **Prüfungs- and TÜV-Gebühren (exams, fees) — in scope?** The demo books
   "Praktische Prüfung" to `4400` and the TÜV-Gebühr to `1370` durchlaufender
   Posten (`src/server/seed.ts:70-85`); these are not `isFahrstunde`
   (`src/lib/calendar-data.ts:54-55`). *Suggested default:* phase 1 covers only
   practical Fahrstunden (`type "Praktisch"`); treat exams/fees as a later
   extension using the same confirm flow with different components/accounts.
5. **Confirm vs. flag (option A vs. C)?** A keeps an explicit confirm step; C
   posts on a "stattgefunden" toggle. *Suggested default:* A — the extra click
   is cheap on a single-user app and avoids a misfired toggle posting a real
   booking that needs a Storno.
