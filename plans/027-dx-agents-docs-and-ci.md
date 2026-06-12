# Plan 027: DX — project-specific AGENTS.md/CLAUDE.md, CI workflow, package metadata

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- AGENTS.md CLAUDE.md package.json README.md`
> On drift, compare against live files; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

CLAUDE.md and AGENTS.md are identical generic Bun-template boilerplate with
zero OpenFS content — every agent session re-derives the domain (GoBD engine,
name-keyed references, test conventions) from scratch. There is no CI, so
nothing enforces `bun test` + `bun run typecheck` on pushes. package.json is
still named "bun-react-template". All three are small fixes with recurring
payoff.

## Current state

- `CLAUDE.md` and `AGENTS.md` (repo root) — byte-identical generic Bun
  guidance (verify with `diff CLAUDE.md AGENTS.md`): bun-vs-node command
  table, Bun.serve example, test example. Nothing about OpenFS.
- `README.md` — good architecture overview (keep as the long-form doc; do
  not duplicate it).
- `package.json:2-3` — `"name": "bun-react-template", "version": "0.1.0"`.
- No `.github/` directory exists.
- Verified facts to encode (from the 2026-06-12 audit — trust these):
  - Stack: Bun runtime, React 19 SPA via HTML imports (no vite at runtime;
    `vite.config.ts` is a deliberate shadcn-CLI shim — do not delete).
  - Verification: `bun test` (387+ tests), `bun run typecheck`,
    `bun run build`.
  - Accounting: SKR 04 (db.ts migrates legacy SKR 03 data), GoBD constraints
    — immutable bookings, Storno-only corrections, gapless sequences; the
    ONLY write path is `createTransaction`/`stornoTransaction` in
    `src/server/engine.ts`. Agents must never add UPDATE/DELETE on
    transactions/bookings.
  - Soft references: students/events/groups reference instructors & vehicles
    by display NAME; renames/deletes must propagate (see instructors.ts
    cascade); new cross-references should use ids.
  - Tests: in-memory SQLite (`openSqlite(":memory:")`), co-located
    `*.test.ts`, never touch `data/fahrschule.db`.
  - Frontend: shadcn/ui + Tailwind v4; design rules in `design-guideline.md`
    (pointer, don't duplicate); German UI strings; no DOM test framework by
    decision.
  - Commit style: title-only, no body, small chunks.
  - Plans/advisor workflow lives in `plans/` (pointer).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |

## Scope

**In scope**:
- `AGENTS.md` (rewrite), `CLAUDE.md` (replace content with a one-line include
  of AGENTS.md — see step 1)
- `.github/workflows/ci.yml` (create)
- `package.json` (name/version only)

**Out of scope** (do NOT touch):
- README.md, design-guideline.md, any src/ file, bunfig.toml, tsconfig.json.
- Lint/formatter configs (separate decision, not in this plan).
- Pre-commit hooks (`.git/hooks` is not committable; CI covers the gate).

## Git workflow

- Branch: `advisor/027-dx-docs-ci` from `main` (`160eccc`)
- Commits: title-only, one per step.
- Do NOT push or open a PR.

## Steps

### Step 1: Rewrite AGENTS.md; make CLAUDE.md defer to it

AGENTS.md: keep a SHORT "Bun not Node" section (5 lines: bun test/run/install,
bun:sqlite, Bun.serve), then add the OpenFS sections from "Verified facts"
above: What this is (2 lines), Commands, Architecture pointers (the README
diagram exists — link, don't copy), Hard rules (GoBD engine write-path rule,
name-keyed reference propagation, in-memory test DBs, no DOM test framework,
German UI strings, design-guideline.md pointer, commit style). Target ≤ 90
lines total — agents read this every session; brevity is the feature.

CLAUDE.md content becomes exactly:

```markdown
See AGENTS.md — single source of agent instructions for this repo.
```

plus the Bun boilerplate REMOVED (Claude Code reads CLAUDE.md; the pointer
keeps one source of truth).

**Verify**: `diff CLAUDE.md AGENTS.md` → differs; `wc -l AGENTS.md` ≤ 90.

### Step 2: CI workflow

`.github/workflows/ci.yml`: on push + pull_request; ubuntu-latest;
`oven-sh/setup-bun@v2`; `bun install --frozen-lockfile`; `bun run typecheck`;
`bun test`; `bun run build`. Single job named `verify`.

**Verify**: `bunx yaml-lint .github/workflows/ci.yml` if available, else
visually validate YAML by parsing it with
`bun -e "console.log(Object.keys(require('yaml').parse(await Bun.file('.github/workflows/ci.yml').text())))"`
only if the `yaml` package is already in node_modules — otherwise just ensure
`bun test` still passes and note that the workflow runs on first push.

### Step 3: package.json metadata

`"name": "openfs"`, keep `"version": "0.1.0"`. Nothing else.

**Verify**: `bun install` → exit 0 (lockfile may update its name field —
commit that too if it changes); `bun test` → pass.

## Test plan

No new tests; the gate is that existing verification stays green.

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0
- [ ] AGENTS.md mentions: GoBD, createTransaction, name-keyed references,
      in-memory test DBs, design-guideline.md (grep each)
- [ ] CLAUDE.md is the one-line pointer
- [ ] `.github/workflows/ci.yml` exists with typecheck+test+build steps
- [ ] `grep '"name"' package.json` → "openfs"
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- Anything in "Verified facts" contradicts what you see in the code — report
  the discrepancy instead of encoding it.

## Maintenance notes

- When the SaaS work starts (plan 026), AGENTS.md gains a tenancy section.
- Reviewer: check AGENTS.md against the facts list — wrong agent docs are
  worse than none.
