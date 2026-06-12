# Plan 035: Batch billing — "Alle offenen Fahrstunden abrechnen" in StundenTab

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/components/fahrschueler/StundenTab.tsx src/server/calendar-events.ts src/server/routes.ts`
> Drift in StundenTab/routes is EXPECTED (plans 028–034 land first) — the
> gate is `bun test` green before starting and the integration points below
> still existing (verify each with grep before step 1).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED
- **Depends on**: plan 034 (reliable studentId on new events)
- **Category**: direction (deferred follow-up of plan 019, see plans/design/lessons-billing.md)
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Plan 019 shipped per-lesson confirm-to-bill: each completed Fahrstunde gets
an "Abrechnen" action that opens a prefilled PaymentDialog and posts to the
atomic `POST /api/calendar-events/:id/bill` endpoint. The design doc
(`plans/design/lessons-billing.md`, "deferred" section) explicitly deferred
the batch variant. A school billing weekly faces dozens of clicks; batch
turns that into one review step. The hard parts (price resolution, atomic
bill endpoint, dialog prefill override) all exist — this plan composes them.

## Current state

- `src/components/fahrschueler/StundenTab.tsx`:
  - `:95` — billing state per event: `if (event.billedTransactionId != null && event.billedActive) return "billed";` (a helper classifying events; read the whole helper to learn the other states, e.g. open/unbillable).
  - `:488` — the per-lesson "Abrechnen" action.
  - `:539-545` — `<PaymentDialog ... defaultCustomerNo={...} onSubmitOverride={handleBillSubmit} />`; `handleBillSubmit` posts to the bill endpoint for ONE event id.
- `POST /api/calendar-events/:id/bill` — in `src/server/routes.ts` (search `"/bill"`); transactional: creates the engine transaction and `markEventBilled` atomically; enforces `guthaben_uebertragung` body type. Tested in `routes.test.ts`.
- Price resolution: `resolveLessonPrice` in `src/lib/price-plan.ts` (or `src/server/price-plans.ts` — grep `resolveLessonPrice`; tests exist in `price-plan.test.ts`).
- Design doc: `plans/design/lessons-billing.md` — read the "batch" deferred note (~line 284) and the confirm-to-bill flow it specifies; the batch UX must remain confirm-style (operator sees the list before anything posts), per GoBD culture in this app: nothing books without explicit confirmation.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Tests     | `bun test`          | green at pre-change count, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |

## Scope

**In scope**:
- `src/components/fahrschueler/StundenTab.tsx` (the batch action + confirmation list UI)
- A new component if the list dialog warrants it: `src/components/fahrschueler/BatchBillDialog.tsx`
- `src/server/routes.test.ts` ONLY if you add server coverage of sequential bill calls (no new endpoint — see below)

**Out of scope**:
- **No new server endpoint.** Bill each event via the existing per-event endpoint, sequentially from the client. Rationale: each lesson stays an individually-attributable GoBD transaction with its own receipt number; a partial failure leaves prior lessons correctly billed and reports the rest.
- `engine.ts`, `calendar-events.ts`, PaymentDialog's internals (use its existing props only).
- Exam-fee billing (separate spike, plan 037).

## Git workflow

- Branch: `advisor/035-batch-billing`
- Commits: title-only, e.g. `StundenTab: Alle offenen abrechnen action + BatchBillDialog`.

## Steps

### Step 1: collect billable lessons

In StundenTab, derive `openLessons`: events classified by the existing
state helper as billable-but-unbilled (same predicate the per-lesson
Abrechnen button uses — reuse it, do not re-derive), sorted by date
ascending. Add a header-level action "Alle offenen abrechnen (N)" visible
when N ≥ 2, styled like the existing header actions (follow
`design-guideline.md` conventions already applied in this file).

### Step 2: confirmation dialog

`BatchBillDialog` lists the open lessons (date, time, duration, resolved
price via the same price logic the single-lesson path uses) with a sum
row, and a single confirm button "N Fahrstunden abrechnen". Reuse the
existing dialog primitives (`src/components/ui/dialog.tsx`) and the visual
patterns of PaymentDialog. No per-row deselection in v1 (note it as a
follow-up) — the operator cancels and bills individually if the set is wrong.

### Step 3: sequential submit

On confirm: for each lesson in date order, POST to the existing bill
endpoint with the same payload shape `handleBillSubmit` uses today (read
it; reuse its body-building, extract a shared helper inside StundenTab if
needed). Stop at the first failure; report progress (`sonner` toast like
the rest of the app): success → "N Fahrstunden abgerechnet.", partial →
"X von N abgerechnet — Fehler bei <date>: <message>". Refresh the events
list once at the end (the hook's existing refresh function).

**Verify**: `bun run typecheck` → 0; `bun test` → green; `bun run build` → 0.

## Test plan

- Server behavior is already covered (atomic bill endpoint). If you can add
  a cheap test asserting two sequential bill calls on two events of the
  same student produce two transactions with distinct receipt numbers and
  both events `billedActive` — add it to `routes.test.ts`.
- UI: no DOM tests by repo decision; reviewer smoke-tests manually.

## Done criteria

- [ ] `bun test`, `bun run typecheck`, `bun run build` all exit 0
- [ ] The batch action appears only when ≥ 2 open lessons exist (code-inspectable condition)
- [ ] Submission is sequential with stop-on-first-failure and a partial-progress toast
- [ ] No new server endpoint added (`git diff --stat` shows no `routes.ts`/`calendar-events.ts` changes)
- [ ] `git status` shows only in-scope files

## STOP conditions

- The billing-state helper or `handleBillSubmit` no longer exists in a reusable form after plans 028–034 (report the new shape).
- Reusing the price-resolution path requires server changes.
- The payload the single-lesson path sends cannot be built without PaymentDialog-internal state.

## Maintenance notes

- Follow-ups deliberately out: per-row deselect; a school-wide (cross-student) batch view; batch over a date range. All compose on this dialog.
- Reviewer: scrutinize the failure-path UX (no silent partial success) and that the refresh happens once, not per event.
