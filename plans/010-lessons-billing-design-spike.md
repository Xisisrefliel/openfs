# Plan 010: Design spike — link completed Fahrstunden to accounting (no production code)

> **Executor instructions**: This is a DESIGN plan. You will read code and
> write ONE design document — you will NOT modify any production code or
> tests. If anything in the "STOP conditions" section occurs, stop and
> report. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/server/engine.ts src/lib/price-plan.ts src/components/fahrschueler/`
> Drift here does not block you — it just means you must describe what IS
> there, not what this plan remembers.

## Status

- **Priority**: P3
- **Effort**: M (investigation + writing; coarse — this is a direction finding)
- **Risk**: LOW (no code changes)
- **Depends on**: plans/009-calendar-persistence.md (events must be persisted before linking them to anything; if 009 is not DONE, STOP)
- **Category**: direction
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

The audit found a surface asymmetry that the architecture makes cheap to
close: the app has (1) a tested double-entry accounting engine with student
snapshots on transactions, (2) per-student price plans
(`price_plan_id` on students, components with prices in `price_plans`), and
(3) — once plan 009 lands — persisted lessons in `calendar_events`. What it
does NOT have is the connection: when a Fahrstunde happens, nobody and
nothing creates the corresponding charge. Today that link is manual work in
the Buchhaltung page. This spike decides HOW the link should work before
anyone builds it, because the design space has real trade-offs (automatic
vs. confirmed billing, GoBD constraints, price resolution from plan
components).

This is a maintainer-decision document, not a build order. The output is a
written design with options and a recommendation, which the user approves
or amends before any build plan is written.

## Current state (verified leads — read these files first)

- `src/server/engine.ts` — `createTransaction(db, input)` is the only entry
  point for charges/payments; `ValidationError` on bad input; transactions
  snapshot student fields (`student_customer_no`, `student_name`, …).
  Read its input type and the existing transaction `type` values.
- `src/server/engine.test.ts` — working `createTransaction` payloads.
- `src/lib/price-plan.ts` — `PricePlanRecord` with `components` (priced
  items; read the component shape — it includes per-unit prices such as
  Übungsstunde/Sonderfahrt rates).
- `src/server/db.ts:80-105` — students have `price_plan_id`; `:29-45` —
  transactions table (immutable, Storno-only corrections, gapless numbers —
  the GoBD constraints any design must respect).
- `src/components/fahrschueler/StundenTab.tsx` — student detail's lessons
  tab (reads calendar events after plan 009).
- `src/components/fahrschueler/PreiseTab.tsx`, `ZahlungTab.tsx` — where
  price plan and payments surface per student today.
- `src/lib/calendar-data.ts` — `isFahrstunde()` (only `type === "Praktisch"`
  counts), and after plan 009: events store the student only as a display
  name in `subtitle`. **This is the main design gap** — billing needs a
  reliable student reference.

## Scope

**In scope** (the only file you create):
- `plans/design/lessons-billing.md`

**Out of scope**:
- ANY change to `src/`. No prototypes, no schema changes, no tests.
- Building the feature — a future plan does that after the user approves
  the design.

## Steps

### Step 1: Investigate

Read the files above. Establish and note in the doc:
- The exact `createTransaction` input shape and which `type`/accounts a
  lesson charge would use (find how existing seeded lesson-like charges
  are booked — `src/server/seed.ts`).
- The price-plan component shape and how a "Übungsstunde" price would be
  resolved for a student (`students.price_plan_id` → components → which
  component matches a practical lesson? What if the plan is null?).
- How events identify students after plan 009 (display name only — what
  are the options: add `student_id` column to `calendar_events`;
  match by name; explicit picker at billing time).

### Step 2: Write `plans/design/lessons-billing.md`

Sections:

1. **Problem** — 3–5 sentences, from "Why this matters".
2. **Constraints** — GoBD (immutability, Storno-only, gapless sequences),
   single-user local app, German VAT specifics already encoded in the
   account seed (driving school revenue accounts 4100/4300/4400 — note
   which applies to driving lessons; if unclear from code, mark as an OPEN
   QUESTION for the user/Steuerberater, do not guess tax law).
3. **Design options** (at least these three, each with flow diagram in
   text, touched files, and trade-offs):
   - A. **Confirm-to-bill**: lesson ends → StundenTab/Kalendar shows
     "abrechnen" action → prefilled PaymentDialog/`createTransaction`.
     Human confirms each charge. (Likely recommendation: smallest, safest,
     GoBD-clean, matches existing dialogs.)
   - B. **Auto-draft**: a server job/endpoint scans past events without a
     linked transaction and creates draft charges. Requires a
     "draft/uncommitted" concept the engine deliberately lacks — analyze
     the conflict with immutability honestly.
   - C. **Billing-on-completion flag**: event gets a `billedTransactionId`;
     marking a lesson "stattgefunden" triggers the charge immediately.
4. **Student linkage decision** — `student_id` on events vs. name matching
   vs. pick-at-billing; recommend one, with migration note for events
   created before the link existed.
5. **Recommendation** — one option, why, and a step-list sketch (5–10
   bullets) a future build plan would expand.
6. **Open questions for the maintainer** — numbered, each with your
   suggested default (e.g. which revenue account a Fahrstunde books to;
   what happens to billed lessons that get deleted/moved; Prüfung fees).

### Step 3: Summarize

In your completion report: the recommendation in 3 sentences + the open
questions. Update `plans/README.md` status to DONE (design delivered).

## Done criteria

- [ ] `plans/design/lessons-billing.md` exists with all six sections
- [ ] Every factual claim in it cites a `file:line` or quotes the code
- [ ] No file under `src/` modified (`git status`)
- [ ] Open questions are explicit and have suggested defaults
- [ ] `plans/README.md` status row updated

## STOP conditions

- Plan 009 is not DONE (events not persisted) — this spike would design
  against a fiction.
- `engine.ts` turns out to already have a draft/pending mechanism (the
  analysis premise would be wrong — report what you found).

## Maintenance notes

- The follow-up build plan should be written by the advisor after the user
  reacts to this document — do not expand this spike into a build.
