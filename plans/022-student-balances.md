# Plan 022: Real per-student balances from the ledger (replace the static balance text)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/engine.ts src/components/fahrschueler/ZahlungTab.tsx src/Vertraege.tsx src/lib/contracts.ts`
> On drift, compare excerpts below against live code; mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (new read-only aggregation; one display swap on the money UI)
- **Depends on**: none (independent of 019; composes with it)
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The student "balance" shown in the app is a **static text column**
(`students.balance TEXT NOT NULL DEFAULT '0,00 EUR'`, db.ts:96) seeded once
and never derived from actual bookings — recording payments does not move it.
Meanwhile the ledger knows the truth: prepay deposits (`zahlung_guthaben`)
credit the student's Ausbildungskonto, lesson charges
(`guthaben_uebertragung`) debit it, and every transaction snapshots
`student_customer_no`. This plan adds a real, read-only per-student Guthaben
aggregation, shows it in the Zahlung tab, and adds a Saldo column to the
Verträge view — so "who still has credit / who owes" is finally answerable
and correct.

## Current state

- Schema (`src/server/db.ts:29-58`): `transactions` snapshot the student
  (`student_customer_no`, `student_name`, …); `bookings` rows carry
  `soll_account`, `haben_account`, `amount_cents` and FK `transaction_id`.
  Stornos are ordinary transactions with Soll/Haben swapped, so a plain SUM
  over bookings handles them with no special-casing.
- Engine (`src/server/engine.ts`): `zahlung_guthaben` books
  `geldkonto an anzahlung` (lines 215–232); `guthaben_uebertragung` books
  `anzahlung an erloes` (lines 258–281). The Ausbildungskonto is found by
  KIND: `requireAccountOfKind(db, "anzahlung", …)` — do the same; never
  hard-code the account number (seeds use 3272 but the kind is the contract).
- **Definition**: studentGuthaben(customerNo) =
  SUM(amount_cents of bookings whose `haben_account` = anzahlung-account and
  whose transaction has this `student_customer_no`)
  − SUM(amount_cents of bookings whose `soll_account` = anzahlung-account,
  same filter). Positive = credit; negative = owes.
- `src/components/fahrschueler/ZahlungTab.tsx` — displays the static field:

  ```tsx
  // ZahlungTab.tsx:92 and :211
  const hasDebt = student.balance.startsWith("-");
  ...
  {student.balance}
  ```

  Its header comment (lines 1–5) still says "SKR 03" — stale, the chart is
  SKR 04 now; fix the comment while in the file.
  Money formatting helpers: `formatEuro, formatCents` from `src/lib/money.ts`.
- `src/Vertraege.tsx` + `src/lib/contracts.ts` — contracts are a pure view
  derived from students + price plans (`ContractRow`, contracts.ts:16-33);
  the page builds rows from the `useStudents()` + `usePricePlans()` hooks.
- Engine tests exemplar: `src/server/engine.test.ts` (in-memory DB, seeds
  accounts, posts transactions, asserts cents).
- The `students.balance` column itself: leave it in the schema (removal is a
  destructive migration out of scope), but nothing user-facing should read it
  after this plan.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/server/engine.ts` — ONE new read-only export `listStudentBalances(db):
  { customerNo: string; name: string; balanceCents: number }[]` (+ a single
  `getStudentBalance(db, customerNo)` if the list version is awkward for the
  tab). Read-only SELECTs only — no write-path changes.
- `src/server/routes.ts` — `GET /api/student-balances` in `accountingRoutes`.
- `src/server/engine.test.ts` — extend.
- `src/components/fahrschueler/ZahlungTab.tsx` — show the computed balance
  (+ comment fix).
- `src/lib/contracts.ts` + `src/lib/contracts.test.ts` — `ContractRow` gains
  `balanceCents: number | null` (null = no ledger activity), derived by the
  existing pure-helper pattern from a balances list passed in.
- `src/Vertraege.tsx` — fetch balances, pass into the row builder, render a
  Saldo column (`tabular-nums`; negative red text per design-guideline.md
  semantic-color rule).
- (new) `src/hooks/use-student-balances.ts` — small fetch hook following
  `src/hooks/use-students.ts`'s useFetchList pattern.

**Out of scope** (do NOT touch):
- Any engine WRITE path; `createTransaction`/`stornoTransaction` unchanged.
- Removing/repurposing the `students.balance` column or its API field.
- `src/Fahrschueler.tsx` list page (its uncommitted-design sibling pages make
  cross-page consistency a later concern), `src/Buchhaltung.tsx`.
- Payment reminders / Mahnwesen — future work.

## Git workflow

- Branch: `advisor/022-student-balances` from `main` (`160eccc`)
- Commits: title-only per step.
- Do NOT push or open a PR.

## Steps

### Step 1: Aggregation + tests

`listStudentBalances` in engine.ts: resolve the anzahlung account by kind
(reuse the module's existing account lookup helpers — find
`requireAccountOfKind` and use the non-throwing variant if one exists), then
one SQL aggregation over `bookings JOIN transactions` grouped by
`student_customer_no` (skip NULL customer numbers), computing the haben-sum
minus soll-sum per the definition above. Names: latest `student_name`
snapshot per customerNo (MAX by transaction id is fine).

**Verify**: `bun test src/server/engine.test.ts` → new tests pass:
deposit 500 € → +50000; deposit 500 € then 65 € lesson charge → +43500;
storno the charge → back to +50000; student with no transactions absent from
the list.

### Step 2: Route + hook

`GET /api/student-balances` (handle()/json() wrappers, routes.ts:54-70).
`use-student-balances.ts` modeled on `src/hooks/use-students.ts`.

**Verify**: `bun run typecheck` → exit 0; add a route test where the
accounting route tests live (check `src/server/routes.test.ts`).

### Step 3: ZahlungTab

Replace the `student.balance` readout (lines 92, 211) with the computed
balance for `student.customerNumber` (fetch via the new hook or — simpler —
extend the tab's existing `useApi` data source if it already loads ledger
data for this student; read the tab's data flow first and pick the smaller
change, stating which in your report). Format with `formatCents`. Negative →
existing debt styling. Fix the "SKR 03" comment to "SKR 04".

**Verify**: `bun run build` → exit 0.

### Step 4: Verträge Saldo column

Pure derivation in contracts.ts (`balanceCents` looked up by
`customerNumber`), tests in contracts.test.ts (matching row, missing row →
null). Column in Vertraege.tsx with `tabular-nums`, "—" for null.

**Verify**: `bun test src/lib/contracts.test.ts` → pass; `bun run build` → exit 0.

## Test plan

Engine: 4 scenarios in step 1. Contracts: 2 in step 4. Route: 1 in step 2.
Key regression: storno neutrality (a storniert charge must not change the
balance vs. before the charge).

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0; `bun run build` exits 0
- [ ] `grep -n "listStudentBalances" src/server/engine.ts src/server/routes.ts` shows export + route
- [ ] `grep -n "student.balance" src/components/fahrschueler/ZahlungTab.tsx` returns no display usage
- [ ] `grep -n "SKR 03" src/components/fahrschueler/ZahlungTab.tsx` returns nothing
- [ ] Engine write paths untouched: `git diff 160eccc -- src/server/engine.ts` contains no changes inside `createTransaction`/`stornoTransaction`
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- Excerpts don't match live code (drift).
- The anzahlung account lookup has no non-throwing path AND multiple anzahlung
  accounts exist in the seed — report; the aggregation's correctness depends
  on a single Guthaben account assumption.
- ZahlungTab's data flow makes the balance display require restructuring the
  tab beyond ~30 lines — report with the actual structure.

## Maintenance notes

- When plan 019 (lesson billing) lands, billed lessons flow through
  `guthaben_uebertragung` and show up here automatically — no integration
  needed, but worth a manual sanity check.
- The static `students.balance` column is now dead weight; removing it (and
  its seed/demo data) is a candidate for a later cleanup plan once nothing
  reads it.
- Reviewer: verify the SQL handles stornos by construction (swapped sides),
  not by filtering `storniert_by` — filtering would double-count.
