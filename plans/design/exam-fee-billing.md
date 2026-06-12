# Design spike: exam-fee billing and per-student revenue-account mapping

> Status: DESIGN — maintainer-decision document. No production code changed.
> Authored on branch `advisor/037-exam-fee-spike` (base `2ee4bbe`).
> Every factual claim cites a `file:line` read in this tree. Quoted UI strings
> stay German; the document language is English.
>
> Successor to `plans/design/lessons-billing.md` (plan 019), which deferred
> exam billing (its open question 4) and the 4400-vs-4100 revenue-account
> question (its open question 1). Both are now in scope here. Note: lesson
> billing has since been **built** — the "Current state" below describes the
> implemented system, not plan 019's proposal.

---

## 1. Current state — how lesson billing works end to end

**Trigger & gating (UI).** The Stunden tab renders an "abrechnen" action only
for practical lessons: `const isPraktisch = isFahrstunde(event)` and
`canBill = isPraktisch && state === "open" && hasStudent`
(`src/components/fahrschueler/StundenTab.tsx:417-420`). `isFahrstunde` is
`event.type === "Praktisch"` (`src/lib/calendar-data.ts:86-87`). Billing state
is derived client-side: `"billed"` iff `billedTransactionId != null &&
billedActive` (`src/components/fahrschueler/StundenTab.tsx:94-97`).

**Prefill.** Clicking the action opens the shared `PaymentDialog` prefilled
with `defaultType: "guthaben_uebertragung"`, the event date, the price from
`resolveLessonPrice(studentPlan)`, description `` `Fahrübungsstunde
(${durationMin})` `` and `defaultHabenKonto: "4400"`
(`src/components/fahrschueler/StundenTab.tsx:340-351`).
`resolveLessonPrice(plan, componentLabel = "Fahrübungsstunde")` looks the
component up in the student's price plan and returns `priceCents` or null
(`src/lib/price-plan.ts:37-46`); plans are per student via
`students.price_plan_id` (`src/server/db.ts:103`).

**Confirm & submit.** The operator can still change the Leistungskonto in the
dialog — the select offers all active `erloes` + `durchlaufend` accounts
(`src/components/buchhaltung/PaymentDialog.tsx:192`, `:408-418`; state default
`"4400"` at `:183`). On submit the dialog hands the built
`CreateTransactionInput` to the caller via `onSubmitOverride`
(`src/components/buchhaltung/PaymentDialog.tsx:143-148`, `:272-278`), which
posts it to `POST /api/calendar-events/:id/bill`
(`src/components/fahrschueler/StundenTab.tsx:353-358`,
`src/hooks/use-calendar-events.ts:53-64`).

**Server.** The bill endpoint (`src/server/routes.ts:265-313`) validates:
event type must be `"Praktisch"` — *"Nur praktische Fahrstunden können
abgerechnet werden."* (`src/server/routes.ts:275-279`); a linked `studentId`
is required (`:280-284`); an actively billed event is rejected (`:285-289`);
the body must be type `guthaben_uebertragung` (`:293-300`). Then it runs
`createTransaction` + `markEventBilled` atomically inside one
`db.transaction` (`src/server/routes.ts:302-310`;
`markEventBilled` at `src/server/calendar-events.ts:317-328`).

**Engine.** `guthaben_uebertragung` books `3272 Erhaltene Anzahlungen an
<habenKonto>`, where `habenKonto` is validated to kind `erloes` or
`durchlaufend`, and sets `hasBeleg = false` (no Beleg number)
(`src/server/engine.ts:258-281`). VAT is derived from the Haben account:
`vat_rate = vatAccount.vatRate ?? null`, split only when non-null
(`src/server/engine.ts:355-358`, `src/lib/money.ts:62-71`).

**Storno round-trip.** `billedActive` is derived in SQL from the linked
transaction's `storniert_by` (`src/server/calendar-events.ts:104-116`,
`:94-97`), so a storniert charge automatically flips the event back to
billable (asserted in `src/server/calendar-events.test.ts:315-334`). Deleting
an actively billed event is blocked — *"Termin ist abgerechnet — zuerst
stornieren."* (`src/server/calendar-events.ts:330-339`).

**What exists for exams today (STOP-condition check — nothing billable):**

- Exam *events*: types `"Theorieprüfung"` and `"Vorstellung zur prakt.
  Prüfung"` (`src/server/calendar-events.ts:11-16`,
  `src/lib/exams.ts:21-24`), with pass/fail recording
  (`recordExamResult`, `src/server/calendar-events.ts:357-377`; endpoint
  `src/server/routes.ts:316-337`; UI `src/Pruefungsplaner.tsx:534`).
- Exam *prices*: price-plan components `"Theorieprüfung"` (130/110 €) and
  `"Praktische Prüfung"` (280/240 €) exist in both seed tariffs
  (`src/lib/price-plan.ts:59-60`, `:74-75`) — but nothing reads them.
- Exam *bookings*: only in the demo seed, created manually through the
  engine — "Praktische Prüfung (55)" to `4400` and "TÜV Prüfungsgebühr
  (durchlaufender Posten)" to `1370` (`src/server/seed.ts:62-77`; booking
  shape asserted in `src/server/engine.test.ts:81-103`).
- Billing an exam event through the endpoint is **rejected** — proven by the
  test "billing a Theorie event → 400 'praktische Fahrstunden'"
  (`src/server/routes.test.ts:565-596`).

So exam-fee billing is genuinely unbuilt; this spike designs it.

---

## 2. Requirements

R1. **Two distinct charge kinds per exam.** The school's own contract template
already draws the line: Prüfstelle fees (TÜV/DEKRA) are *"durchlaufende
Posten und vom Fahrschüler … gesondert zu tragen"*
(`src/components/VertragDialog.tsx:268-274`), while the school's own
Vorstellungsentgelt is a priced service (price-plan components
`"Theorieprüfung"` / `"Praktische Prüfung"`, `src/lib/price-plan.ts:59-60`).
A practical-exam event therefore needs up to **two charges with different
Haben accounts**: the service charge (an Erlöskonto) and the fee pass-through
(today `1370`, `src/server/db.ts:179`). The single
`billed_transaction_id` column (`src/server/db.ts:423-427`) can only link one
transaction — this is the central schema question (§4).

R2. **Same money flow as lessons.** Both charges debit the student's prepaid
Guthaben (`3272`, `src/server/db.ts:186`) via `guthaben_uebertragung`
(`src/server/engine.ts:258-281`) — exactly how the seed books them
(`src/server/seed.ts:62-77`). The contract's payment clause (fees due
"spätestens drei Werktage vor dem jeweiligen Prüfungstermin",
`src/components/VertragDialog.tsx:277-288`) concerns when the *prepayment*
must arrive, not how the charge is booked; no new transaction type is needed.

R3. **Storno path: inherited, no new mechanism.** Reusing the `/bill` pattern
gives exam charges the existing Storno semantics for free: reversal
transaction with Soll/Haben swapped per booking line
(`src/server/engine.ts:445-506`), `billedActive` flips back automatically
(`src/server/calendar-events.ts:104-116`), delete-guard included
(`src/server/calendar-events.ts:333-339`). One nuance: if service charge and
fee are *separate* transactions, each needs its own Storno (see §4 option B).

R4. **Quittung implications: none for the charge itself.** Only
`zahlung_guthaben` and `direktzahlung` are printable
(`src/server/engine.ts:510-512`); `guthaben_uebertragung` charges never yield
a Quittung, for lessons today and exams tomorrow alike. Where a fee *is*
collected as a `direktzahlung`, the Quittung machinery already renders
durchlaufende Posten correctly: the line flag comes from the Haben account's
kind (`src/server/engine.ts:734-744`), the type carries it
(`src/lib/accounting-types.ts:150-157`), and the dialog explains it —
*"Durchlaufender Posten (§ 10 Abs. 1 UStG) — keine Umsatzsteuer."*
(`src/components/buchhaltung/PaymentDialog.tsx:497-501`). Nothing to build.

R5. **Gapless-sequence implications: confirmed none.**
`guthaben_uebertragung` consumes no Beleg number (`hasBeleg = false`,
`src/server/engine.ts:270`, `:325`). Buchungsnummern are allocated by
`nextSequence` *inside* the surrounding write transaction
(`src/server/db.ts:800-818`), and the bill endpoint wraps both writes in one
`db.transaction` (`src/server/routes.ts:302-310`), so a failed bill rolls the
sequence increment back too. Quittungsnummern are lazily assigned on first
print only (`src/server/engine.ts:709-724`) and are untouched by this design.
Exam billing adds booking lines, which is exactly what the sequences already
handle (multi-line transactions exist today: `transfer` writes two bookings,
`src/server/engine.ts:289-292`).

R6. **Student linkage.** Exam events already carry `student_id` (column +
back-fill migration, `src/server/db.ts:396-428`; validation
`src/server/calendar-events.ts:221-241`) — the lesson-billing prerequisite
applies unchanged; the `/bill` guard (`src/server/routes.ts:280-284`) stays.

---

## 3. The tax fork

The engine deliberately books to whatever Erlöskonto the caller passes
(`src/server/engine.ts:260-265`). The chart offers three relevant worlds:

| Account | Seed definition | Effect on a booking |
|---|---|---|
| `4400` "Erlöse 19 % USt" | `src/server/db.ts:190`, vatRate 19 | gross split into net + 19 % USt (`src/server/engine.ts:357-358`) |
| `4100` "Steuerfreie Umsätze § 4 Nr. 8 ff. UStG (Ausbildung § 4 Nr. 21)" | `src/server/db.ts:188`, vatRate 0 | `vat_rate = 0`, vatCents 0 (`src/lib/money.ts:62-71`) |
| `1370` "Durchlaufende Posten" | `src/server/db.ts:179`, vatRate null | no VAT row at all (`src/server/engine.ts:357-358`) |

**World A (today's demo behavior):** lessons and exam-service charges →
`4400` (19 %) (`src/server/seed.ts:62-69`, prefill
`src/components/fahrschueler/StundenTab.tsx:349`); TÜV/DEKRA fee → `1370`
pass-through (`src/server/seed.ts:70-77`), matching the contract clause
(`src/components/VertragDialog.tsx:268-274`).

**World B:** the school holds a § 4 Nr. 21 UStG Bescheinigung and some or all
training revenue books tax-free to `4100` — possibly only for some licence
classes/contracts, i.e. *per student*. The code cannot settle this; it is a
tax determination (already flagged as plan 019's open question 1,
`plans/design/lessons-billing.md` §6).

**Questions for the Steuerberater** (phrased so a non-developer can ask them
verbatim):

1. „Haben wir eine Bescheinigung nach § 4 Nr. 21 UStG? Für welche
   Ausbildungen gilt sie — nur berufsbezogene Klassen (z. B. C/CE/D, BKF)
   oder auch Klasse B?"
2. „Welche unserer Leistungen buchen wir steuerfrei und welche mit 19 %
   Umsatzsteuer? Bitte einzeln für: Grundbetrag, Fahrstunde,
   Sonderfahrt (Nacht/Autobahn/Überland), Vorstellungsentgelt zur Theorie-
   und zur praktischen Prüfung, Lernmaterial."
3. „Ist die TÜV/DEKRA-Prüfgebühr bei uns ein echter durchlaufender Posten
   (wir vereinnahmen sie im Namen und für Rechnung des Schülers), oder
   schulden wir die Gebühr selbst gegenüber der Prüfstelle und berechnen sie
   weiter (dann eigener Umsatz mit Umsatzsteuer)?"
4. „Kann die Antwort pro Schüler bzw. pro Vertrag unterschiedlich sein —
   z. B. Klasse B mit 19 %, Klasse C steuerfrei? Brauchen wir also das
   Erlöskonto pro Tarif/Schüler statt einmal global?"
5. „Unser Guthabenkonto ist 3272 ‚Erhaltene Anzahlungen **19 % USt**'
   — wie behandeln wir Anzahlungen, wenn die spätere Leistung steuerfrei
   oder ein durchlaufender Posten ist?" (Every prepayment currently books
   VAT-bearing against 3272: `src/server/engine.ts:215-231`,
   `src/server/db.ts:186` — if part of the revenue is exempt, the prepayment
   side needs an answer too.)

**NOT blocked on the answer** (can be built now, konto-agnostically):

- The `billableEventType` gating + UI extension (§4) — accounts stay
  operator-confirmable exactly as today
  (`src/components/buchhaltung/PaymentDialog.tsx:408-418`).
- The price-plan component schema (`erloesKonto` field, §4) — the *mechanism*
  is account-neutral; the Steuerberater answer only changes the *configured
  values* and prefill defaults.
- Multi-line charge support in the engine input (§4 option A).
- All Storno/delete-guard/migration/test work (§5).

Only the shipped *defaults* (4400 vs 4100 prefill per component, 1370 vs
revenue for the fee) wait for the answer — a one-line config change each.

---

## 4. Proposed design

Shared groundwork (both options):

1. **`billableEventType` concept.** Next to `isFahrstunde`
   (`src/lib/calendar-data.ts:86-91`), add
   `BILLABLE_EVENT_TYPES = ["Praktisch", "Theorieprüfung", "Vorstellung zur
   prakt. Prüfung"]` + `isBillableEvent()`, and relax the server guard
   `event.type !== "Praktisch"` (`src/server/routes.ts:275-279`) to the same
   list. The UI gate in StundenTab
   (`src/components/fahrschueler/StundenTab.tsx:417-420`) and an "abrechnen"
   action in the Prüfungsplaner exam cards
   (`src/Pruefungsplaner.tsx:300`-region) both use it.
2. **Price-plan component metadata.** `PriceComponent`
   (`src/lib/price-plan.ts:11-17`) gains two optional fields:
   - `erloesKonto?: string | null` — Haben-account default for this
     component (`null` = today's behavior: operator default `4400`);
   - `eventType?: CalendarEventType | null` — which event type this
     component prices (`"Praktisch"` → "Fahrübungsstunde",
     `"Theorieprüfung"` → "Theorieprüfung", `"Vorstellung zur prakt.
     Prüfung"` → "Praktische Prüfung"), replacing today's hard-coded label
     default in `resolveLessonPrice` (`src/lib/price-plan.ts:37-46`).
   No DB migration needed — components are a JSON TEXT column
   (`src/server/db.ts:72-78`) — but `normalizeComponents` **must** be
   extended, because it currently rebuilds each entry from exactly
   `{label, durationMin, priceCents}` and would silently strip new keys on
   every plan save (`src/server/price-plans.ts:45-79`).
3. **Fee as a plan component.** Add seed components `"TÜV-Gebühr Theorie"` /
   `"TÜV-Gebühr Praxis"` with `erloesKonto: "1370"` to `PRICE_PLAN_SEED`
   (`src/lib/price-plan.ts:48-79`) — amounts are set by the Prüfstelle and
   editable per plan like every other component.

Then the fork — how does one exam event carry a service charge *and* a fee?

### Option A — one transaction, multiple booking lines (recommended)

Extend the `guthaben_uebertragung` input with an optional `lines` array
(`{ habenKonto, amountCents, description }[]`; the existing single-field form
stays valid as the one-line case, keeping every current caller untouched —
`src/lib/accounting-types.ts:81-88`). The engine already supports multi-line
transactions structurally: `bookings` is an array, each line gets its own
Buchungsnummer and per-line VAT from its own Haben account
(`src/server/engine.ts:348-358`), `transfer` proves the two-line case
(`src/server/engine.ts:289-292`), Storno reverses *all* lines of a
transaction (`src/server/engine.ts:478-491`), and Quittung rendering is
already per booking line (`src/server/engine.ts:734-744`).

A practical-exam billing then writes **one** transaction:

```
3272 an 4400 (oder 4100)   280,00   "Praktische Prüfung (55)"
3272 an 1370               129,83   "TÜV Prüfungsgebühr (durchlaufender Posten)"
```

`billed_transaction_id` keeps working unchanged (one transaction per event,
`src/server/calendar-events.ts:317-328`), `billedActive` stays a single
boolean, and one Storno reverses the whole exam billing atomically.

- (+) Zero schema change on `calendar_events`; `/bill`, delete-guard, Storno
  round-trip all reuse the tested paths.
- (+) Matches reality: the operator settles "the exam" as one act.
- (−) Engine input change (additive, validated like today via
  `requireAccount(..., ["erloes", "durchlaufend"])`,
  `src/server/engine.ts:260-265`).
- (−) `PaymentDialog` is single-line (`src/components/buchhaltung/PaymentDialog.tsx:408-418`);
  exam billing needs a small two-line confirm dialog (prefilled from the two
  components, each line's Konto editable) — lessons keep the existing dialog.
- (−) Fee and service cannot be storniert independently; acceptable, since a
  wrong fee usually means the whole exam billing was wrong (re-bill after
  Storno, as for lessons today).

### Option B — one transaction per charge + link table

Keep the engine untouched; allow N bill calls per exam event and replace the
single `billed_transaction_id` (`src/server/db.ts:423-427`) with a
`calendar_event_billings(event_id, transaction_id)` table (back-filled from
the existing column).

- (+) No engine change; independent Storno per charge.
- (−) Migration of a live column plus rewrites of every consumer: the
  `billedActive` SQL derivation (`src/server/calendar-events.ts:104-116`),
  `markEventBilled` (`:317-328`), the delete-guard (`:333-339`), the wire
  shape (`src/lib/calendar-data.ts:31-37`) and the UI state machine
  (`src/components/fahrschueler/StundenTab.tsx:94-97`) — which now needs a
  "partially billed" state (fee booked, service not) that the operator must
  understand.
- (−) Two confirms per exam, or a batch wrapper that fakes Option A's UX.

**Recommendation: Option A.** It composes with future batch billing exactly
like lessons do: no batch mechanism exists today (the only "Batch" in the
codebase is Quittung batch *printing*,
`src/components/buchhaltung/QuittungDialog.tsx:240`), and plan 019 sketched
batch as "the same prefill, looped, human-confirmed"
(`plans/design/lessons-billing.md` §5 item 10) — under Option A an exam stays
one `/bill` call, so any future batch loop treats lessons and exams uniformly.

**Per-student revenue-account override:** put the account on the price-plan
component (`erloesKonto`, groundwork item 2), **not** on the student. Plans
are already the per-student pricing knob (`students.price_plan_id`,
`src/server/db.ts:103`), and if the Steuerberater answers "depends on licence
class", that is modeled as separate tariffs (e.g. "LKW Tarif steuerfrei") —
no second source of truth, no new student column, and the operator can still
override per booking in the dialog as today. Only if the answer is "same
plan, different tax per student" (considered unlikely, but ask question 4)
would a nullable `students.erloes_konto_override` column be added via the
established idempotent-ALTER pattern (`src/server/db.ts:381-389`).

---

## 5. Migration & test notes

**Data back-fill:**

- Price-plan components: no ALTER (JSON column, `src/server/db.ts:72-78`).
  Existing plans simply lack `erloesKonto`/`eventType` → readers must treat
  missing as `null` (today's behavior). `PRICE_PLAN_SEED` changes only affect
  fresh databases — the seed is guarded by a count check
  (`src/server/db.ts:453-457`); existing DBs get the fee components by the
  operator editing tariffs, or via an optional idempotent enrichment step.
- `calendar_events`: Option A needs **no** new columns. Existing exam events
  were never billable (`src/server/routes.test.ts:565-596`), so there are no
  legacy exam billings to back-fill.
- Any future ALTER (e.g. the per-student override) follows the
  `migrateExamResults` pattern: `PRAGMA table_info` check + `ALTER TABLE ...
  ADD COLUMN`, idempotent (`src/server/db.ts:433-449`).

**Test files covering the touched seams:**

- `src/server/engine.test.ts` — booking shapes incl. "3272 an 4400" and the
  TÜV "3272 an 1370 without VAT" cases (`:81-103`); extend with a
  multi-line `guthaben_uebertragung` case + its Storno.
- `src/server/routes.test.ts` — `/bill` endpoint suite (`:452` ff., happy
  path `:493-526`, double-billing `:528-563`); the "Theorie event → 400"
  test (`:565-596`) must be *inverted* for exam types and kept for `"Andere"`.
- `src/server/calendar-events.test.ts` — `markEventBilled` + delete-guard +
  storniert-reactivation (`:254-335`); extend to exam-type events.
- `src/lib/price-plan.test.ts` — `resolveLessonPrice` (`:20-56`); extend for
  `eventType`-based resolution.
- `src/server/price-plans.test.ts` — `normalizeComponents` round-trip
  (`:58-106`); **must** gain cases proving the new keys survive a save
  (today they would be stripped, `src/server/price-plans.ts:49-78`).
- `src/server/migration.test.ts` — column-migration suite
  (`:164-193`, `:281-296`) if any ALTER is added.

---

## 6. Out of scope

Building any of it. This document changes no schema, no engine code, no UI;
it exists so that the moment the Steuerberater answers §3, the build plan can
be written against settled decisions. Also out of scope: batch billing
(future plan; §4 only ensures this design does not preclude it), Mahnwesen /
payment reminders for the contract's 3-day fee deadline, and DATEV export
changes (the export reads bookings generically and is unaffected by new
account usage — `src/server/datev.ts` was not modified or analyzed beyond
that assumption; verify when building).
