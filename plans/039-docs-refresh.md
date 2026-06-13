# Plan 039: Refresh AGENTS.md and README after the 2026-06 feature waves

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check**: none needed — this plan documents whatever HEAD is at
> execution time; run it LAST.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: all other plans in this wave (it documents the final state)
- **Category**: docs
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

The agent-facing docs drifted behind two feature waves: AGENTS.md promises
"387+ tests" when the suite is far past that, and the README's feature
summary and architecture notes predate the public `/anfrage` form, lesson
billing, exam tracking, attestations, and statistics. Agents calibrate
against these files; stale numbers and missing surfaces cause wrong
assumptions.

## Current state

- `AGENTS.md:21` (Commands table): `| Test | bun test | 387+ pass, 0 fail |`.
- `README.md` intro paragraph lists features (calendar, students, instructors, vehicles, price plans, accounting/DATEV) — no mention of: public appointment form (`/anfrage`), lesson billing link, exam results + Prüfungsplaner, Ausbildungsnachweis signatures, theory attendance, statistics, chat, DB export endpoint.
- `README.md` architecture section lists `src/server/` modules with "etc."; the security note ("no authentication...") is still accurate — but `/anfrage` deserves a sentence since it's designed to be public.
- If plan 038 landed, `bun run lint` / `bun run format` exist and belong in both files' command lists.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Install | `bun install` | exit 0 |
| Count   | `bun test 2>&1 \| tail -3` | the real pass count |
| Gates   | `bun run typecheck && bun run build` | exit 0 |

## Scope

**In scope**: `AGENTS.md`, `README.md`.
**Out of scope**: `plans/README.md` (reviewer-owned), `CLAUDE.md`, `design-guideline.md`, all code.

## Git workflow

- Branch: `advisor/039-docs-refresh`
- One or two commits, title-only: `docs: AGENTS.md test baseline + commands`, `docs: README feature list + anfrage note`.

## Steps

### Step 1: AGENTS.md

Run `bun test`, take the actual count N. Replace `387+ pass, 0 fail` with
`N pass, 0 fail (count grows — treat "fewer than last documented" as a red
flag, not the exact number)`. If lint/format scripts exist (plan 038), add
rows to the Commands table. Check the rest of AGENTS.md against reality
(e.g. the "permitted write paths" and name-keyed-reference sections —
update the cascade pointer if plan 028 moved line numbers materially;
keep edits minimal).

### Step 2: README.md

- Extend the intro feature sentence to cover: lesson billing (confirm-to-
  bill), exam results/Prüfungsplaner, digital Ausbildungsnachweis (signed
  per lesson), theory attendance, statistics, internal chat, and the
  public appointment form.
- Add one sentence near the security note: `/anfrage` and its POST
  endpoint are intentionally public (rate-limited, length-capped — if plan
  029 landed) while everything else remains the documented
  no-auth-local-tool posture.
- Update the Getting-started command list if lint/format exist.

**Verify**: `bun run typecheck && bun test` still green (docs-only change, sanity only).

## Test plan

None — docs only. Reviewer reads the diff against the shipped feature set.

## Done criteria

- [ ] AGENTS.md test row matches the real count and framing above
- [ ] README mentions every feature listed in step 2 and the `/anfrage` posture
- [ ] `git status` shows only the two files
- [ ] No German/English mixing introduced (docs are English; UI strings stay German)

## STOP conditions

- Reality contradicts a hard AGENTS.md rule (e.g. a write path outside `createTransaction`/`stornoTransaction` appeared) — that is a finding, not a docs edit; report it.

## Maintenance notes

- The "N pass" figure goes stale by design; the added framing makes that harmless. Next audit re-stamps it.
