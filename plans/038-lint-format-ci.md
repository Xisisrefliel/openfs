# Plan 038: Biome lint + format, CI dependency cache and audit step

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: this plan runs LAST in its wave precisely
> because it reformats the tree — whole-repo drift from `2ee4bbe` is
> expected. Gate: `bun test` green and `bun run typecheck` exit 0 BEFORE
> you start; record the test count.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (large mechanical diff; zero semantic changes allowed)
- **Depends on**: all other code plans of this wave (028–036) merged first
- **Category**: dx
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

This repo's code is mostly written by AI agents executing plans. There is
no linter, no formatter, no editorconfig — nothing mechanical holding style
consistent across agent generations, and CI reinstalls ~340 packages cold
on every run and never checks for vulnerable deps. Biome (one tool, Bun-
friendly, fast) closes the consistency gap; two small CI additions close
the rest.

## Current state

- No `biome.json`, `.eslintrc*`, `.prettierrc*`, or `.editorconfig` anywhere (verified).
- `package.json` scripts: dev/build/start/test/typecheck only.
- `.github/workflows/ci.yml`: checkout → setup-bun@v2 → `bun install --frozen-lockfile` → typecheck → test → build. No caching, no audit.
- Code style in `src/`: 2-space indent, double quotes, semicolons, trailing commas in multiline — Biome's defaults are close; configure to match the EXISTING majority style so the reformat diff stays minimal.
- Generated/vendored code that must be excluded from LINTING: `src/components/ui/**` (shadcn-generated). Also exclude `dist/**`, `node_modules/**`, `plans/**`, `data/**`.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Add biome | `bun add -d @biomejs/biome` | exit 0 |
| Check     | `bunx biome check src` | exit 0 after your fixes |
| Format    | `bunx biome format --write src scripts` | files rewritten |
| Tests     | `bun test`          | exact same count as baseline, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |

## Scope

**In scope**:
- `biome.json`, `package.json` (devDep + `lint`/`format` scripts), `.github/workflows/ci.yml`
- Formatting-only rewrites across `src/` and `scripts/` (mechanical)
- Minimal mechanical lint fixes (unused imports/variables removal; nothing that changes behavior)

**Out of scope**:
- Any semantic code change. If a lint rule demands a refactor (e.g. complexity rules), DISABLE the rule instead.
- `src/components/ui/**` lint findings (excluded); `bun.lock` beyond the biome devDep.

## Git workflow

- Branch: `advisor/038-biome-ci`
- Commits: title-only, SEPARATED so review stays possible: `dx: add biome config + scripts`, `style: biome format src (mechanical)`, `dx: ci cache + bun audit step`, plus one commit per non-trivial lint-fix group.

## Steps

### Step 1: install + configure

`bun add -d @biomejs/biome`. Create `biome.json`:
- formatter: 2-space indent, double quotes, semicolons always, line width 90 (check a few long files first — pick 90 or 100, whichever changes fewer lines; state the measurement in NOTES);
- linter: recommended set; disable rules that fire en masse for stylistic reasons (list every disabled rule with a one-line reason in a `//` comment is impossible in JSON — record them in NOTES instead);
- files.ignore: `src/components/ui/**` (lint only — if Biome can't split lint vs format ignores cleanly, exclude it from both and say so in NOTES), `dist`, `node_modules`, `plans`, `data`, `bun.lock`.
- VCS integration on (`"vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true }`).

Add scripts: `"lint": "biome check src scripts"`, `"format": "biome format --write src scripts"`.

### Step 2: format + zero the lint findings

Run format (expect a large mechanical diff — commit it alone). Then
`bunx biome check src scripts`; fix mechanically (unused imports etc.) or
disable per-rule. Re-run until exit 0.

**Verify after each commit**: `bun test` → exact baseline count; `bun run typecheck` → 0.

### Step 3: CI

In `ci.yml`: add an `actions/cache@v4` step for `~/.bun/install/cache`
keyed on `hashFiles('bun.lock')` (setup-bun@v2 has no built-in cache);
add `bun run lint` after typecheck; add `bun audit` (after install).

**Verify**: `bunx action-validator .github/workflows/ci.yml` if available, else YAML-parse it (`bun -e "console.log(1)"`-level sanity: open the file, check indentation, run `git diff --check`).

### Step 4: full gates

**Verify**: `bun test` (baseline count), `bun run typecheck`, `bun run build`, `bunx biome check src scripts` — all exit 0.

## Test plan

No new tests. The invariant IS the test: identical test count before/after,
typecheck and build clean, lint clean.

## Done criteria

- [ ] `bunx biome check src scripts` exits 0
- [ ] `bun test` exits 0 at the recorded baseline count
- [ ] `bun run typecheck` and `bun run build` exit 0
- [ ] `ci.yml` has cache + lint + audit steps
- [ ] NOTES list every disabled lint rule with reasons
- [ ] No commit mixes formatting with lint fixes

## STOP conditions

- The format pass changes test results or typecheck output in ANY way.
- Zeroing lint findings would require a semantic change in `engine.ts`, `db.ts`, or any `src/server/` money path — disable the rule and note it instead; if even that fails, stop.
- Biome cannot exclude `src/components/ui/` from linting while formatting the rest (acceptable fallback: exclude entirely, note it).

## Maintenance notes

- Future idea (not now): a Biome `noRestrictedImports`-style rule banning local `function json(` redefinitions in `src/server/` (plan 032's contract).
- Reviewer: spot-check the mechanical diff for anything non-mechanical (the formatting commit must contain zero logic edits).
