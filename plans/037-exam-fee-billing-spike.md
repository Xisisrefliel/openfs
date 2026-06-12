# Plan 037: Design spike — exam-fee billing and per-student revenue-account mapping (doc only)

> **Executor instructions**: This is a DOC-ONLY plan: you investigate the
> codebase and write ONE design document. You must not modify any source
> file. If any STOP condition occurs, stop and report. Your reviewer
> maintains `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- plans/design/`
> (Informational only — your deliverable is a new file.)

## Status

- **Priority**: P3
- **Effort**: M (investigation + writing)
- **Risk**: LOW (no code)
- **Depends on**: none
- **Category**: direction / design
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Plan 019's design (`plans/design/lessons-billing.md`) deliberately scoped
billing to practical Fahrstunden and deferred two intertwined questions:
(1) billing exam events (TÜV/DEKRA fees, exam-accompaniment charges), and
(2) which Erlöskonto charges book to — the doc's OPEN QUESTION on
4400 (19% USt) vs 4100 (§4 Nr. 21 UStG-exempt), which varies per school and
possibly per student/contract. Both block on a Steuerberater answer; this
spike prepares the decision so that the answer can be implemented quickly
and correctly, instead of being designed under time pressure.

## Current state (starting points for your investigation)

- `plans/design/lessons-billing.md` — the phase-1 design; read fully, especially the deferred-scope and open-question sections (~lines 284-318).
- `src/server/seed.ts:70-85` — demo transactions include "TÜV Prüfungsgebühr" against account 1370 (durchlaufender Posten pattern).
- `src/server/engine.ts` — SKR 04 chart and account roles; `src/lib/accounting-types.ts` — type definitions.
- `src/lib/calendar-data.ts:54` — `isFahrstunde` filter gating the billing UI; `src/server/calendar-events.ts:11-16` — event types include `"Theorieprüfung"` and `"Vorstellung zur prakt. Prüfung"`.
- `resolveLessonPrice` (grep in `src/lib/price-plan.ts` / `src/server/price-plans.ts`) — current price resolution, practical lessons only; price-plan structure in `src/server/price-plans.ts`.
- `src/components/buchhaltung/PaymentDialog.tsx` — where the operator currently picks the account per charge.

## Deliverable

ONE file: `plans/design/exam-fee-billing.md`, structured as:

1. **Current state** — how lesson billing works end to end (one page max, with file:line refs you verified yourself).
2. **Requirements** — what exam-fee billing must do (fee pass-through vs own service charge; Storno path; receipt/Quittung implications; gapless-sequence implications — confirm none).
3. **The tax fork** — lay out both worlds (4400 vs 4100; TÜV fee as durchlaufender Posten 1370 vs revenue) and exactly which questions the Steuerberater must answer, phrased so a non-developer can ask them. List what is NOT blocked on the answer.
4. **Proposed design** — schema deltas (e.g. price-plan exam-fee components; optional per-student or per-plan `erloes_konto` override), UI deltas (extend `isFahrstunde` to a `billableEventType` concept), and how it composes with batch billing (plan 035). Two options max, with a recommendation.
5. **Migration & test notes** — what existing data needs back-fill, which test files cover the touched seams.
6. **Out of scope** — explicitly: building any of it.

Every factual claim about the codebase must carry a `file:line` you read.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Install | `bun install` | exit 0 |
| Sanity  | `bun test` | green (you change nothing) |

## Scope

**In scope**: `plans/design/exam-fee-billing.md` (create).
**Out of scope**: every other file in the repository.

## Git workflow

- Branch: `advisor/037-exam-fee-spike`
- One commit, title-only: `design: exam-fee billing + revenue-account mapping spike`.

## Done criteria

- [ ] The doc exists with all six sections and verified `file:line` refs
- [ ] `git status` shows only the new doc
- [ ] `bun test` still green (nothing else changed)

## STOP conditions

- You find that exam-fee billing was partially implemented already (some commits mention exam billing) — report what exists instead of designing around guesses.

## Maintenance notes

- The Steuerberater answer should be recorded IN this doc when it arrives; the implementation plan gets written from it afterwards.
