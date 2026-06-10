# Plan 003: Establish the DX baseline — test/typecheck scripts, fix the tsconfig deprecation, write a real README

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- package.json tsconfig.json README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

Every other plan in `plans/` uses `bun test` and `bunx tsc --noEmit` as its
verification gates. Today neither is registered as a package script, and the
typecheck does not exit 0: `tsconfig.json` uses the deprecated `baseUrl`
option, so `bunx tsc --noEmit` fails with TS5101 even though the code itself
is clean. The README is still the unmodified Bun template, which means the
project's purpose, setup, and an important security assumption (no
authentication — local single-user tool) are all undocumented. This plan
makes "is the codebase healthy?" a one-command question and records the
deployment assumption before anyone deploys this with real PII in it.

## Current state

- `package.json` — scripts section (lines 6–10) has only `dev`, `build`, `start`:

```json
"scripts": {
  "dev": "bun --hot src/index.ts",
  "build": "bun build ./src/index.html --outdir=dist --sourcemap --target=browser --minify --define:process.env.NODE_ENV='\"production\"' --env='BUN_PUBLIC_*'",
  "start": "NODE_ENV=production bun src/index.ts"
}
```

- `tsconfig.json:24-27` — the deprecated option and the alias it supports:

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

  With `"moduleResolution": "bundler"` (line 12), `paths` works **without**
  `baseUrl` as long as the entries are relative (they already are: `./src/*`).
  The correct fix is to delete the `baseUrl` line, not to add
  `ignoreDeprecations`.

- `bunx tsc --noEmit` currently outputs exactly one error:

```
tsconfig.json(24,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. ...
```

- `bun test` currently passes: 58 tests across 5 files
  (`src/lib/money.test.ts`, `src/lib/amount-in-words.test.ts`,
  `src/server/engine.test.ts`, `src/server/datev.test.ts`,
  `src/server/migration.test.ts`).

- `README.md` — 294 bytes, the default Bun template ("To install
  dependencies… bun install…"). Nothing about the app.

- What the app actually is (for the README rewrite): a single-user web app
  for managing a German driving school (Fahrschule Gül). Bun.serve backend
  (`src/index.ts`) + React 19 SPA. SQLite database at `data/fahrschule.db`
  (`bun:sqlite`, WAL mode). Features: dashboard, week calendar (`/kalendar`),
  student management (`/fahrschueler`, `/neue-schueler`), instructors
  (`/fahrlehrer`), vehicles (`/fahrzeuge`), theory (`/theorie`), price plans
  (`/preisangebot`), double-entry accounting with SKR 04 accounts, Quittungen
  (receipts) and DATEV CSV export (`/buchhaltung`), company profile
  (`/profil`). There is **no authentication** anywhere — every `/api/*` route
  is open. That is acceptable for local single-user use but must be stated.
  GoBD principles in the accounting layer: bookings are immutable,
  corrections only via Storno, gapless Beleg/Buchungs/Quittungs number
  sequences (see header comment of `src/server/db.ts:1-9`).

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Install   | `bun install`       | exit 0              |
| Tests     | `bun test`          | 58 pass, 0 fail     |
| Typecheck | `bunx tsc --noEmit` | currently FAILS with TS5101; exits 0 after Step 1 |

## Scope

**In scope** (the only files you should modify):
- `package.json`
- `tsconfig.json`
- `README.md`

**Out of scope** (do NOT touch, even though they look related):
- `CLAUDE.md` / `AGENTS.md` — Bun convention docs, intentionally generic.
- `vite.config.ts` — looks like dead config but is a documented shim so the
  shadcn CLI can resolve the `@/*` alias (see its header comment). Leave it.
- Any file under `src/` — this plan is config + docs only.
- CI workflow files — explicitly deferred (see Maintenance notes).

## Git workflow

- Branch: `advisor/003-dx-baseline` (or commit directly to `main` if that is
  how the operator works — recent history commits straight to `main`).
- Commit message style: short lowercase imperative, e.g. `add test/typecheck scripts, fix tsconfig, write README` (matches `git log` style like "improved fahrschüler page").
- Do NOT push unless the operator instructed it.

## Steps

### Step 1: Remove the deprecated `baseUrl` from tsconfig.json

Delete only the line `"baseUrl": ".",` (line 24). Keep `paths` exactly as is.

**Verify**: `bunx tsc --noEmit` → exits 0, no output. (If new errors about
`@/...` imports appear, `paths` resolution broke — STOP, restore the line,
and report.)

### Step 2: Add `test` and `typecheck` scripts to package.json

In the `scripts` object add:

```json
"test": "bun test",
"typecheck": "tsc --noEmit"
```

(`tsc` resolves from `node_modules/.bin` via Bun's script runner; typescript
is already available — `bunx tsc` worked during recon.)

**Verify**: `bun run test` → 58 pass, 0 fail. `bun run typecheck` → exit 0.

### Step 3: Rewrite README.md

Replace the template content with (German or English — match the operator's
preference; the UI is German, English docs are fine):

1. **Title + one-paragraph description** — what the app is (use the facts in
   "Current state" above; do not invent features).
2. **Stack** — Bun (serve + bundler + test runner), React 19, Tailwind v4,
   shadcn/ui, `bun:sqlite`.
3. **Getting started** — `bun install`, `bun dev` (server on the URL Bun
   prints), `bun test`, `bun run typecheck`, `bun run build`. Note the SQLite
   file is created at `data/fahrschule.db` on first start and is seeded with
   demo data.
4. **Security & deployment** section — copy this intent, in your own words:
   > This app has **no authentication**. It is designed to run locally for a
   > single user on a trusted machine. The database contains personal data
   > (students' names, contact details) and financial records. Do **not**
   > expose the server to a network or the internet without adding an
   > authentication layer first.
5. **Architecture** — 5–8 lines: `src/index.ts` mounts routes from
   `src/server/routes.ts`; domain modules in `src/server/`; accounting engine
   is GoBD-shaped (immutable bookings, Storno-only corrections, gapless
   sequences); pages in `src/*.tsx`; shared types/helpers in `src/lib/`;
   plans for agents in `plans/`.

**Verify**: `grep -ci "authentif\|authentication" README.md` → ≥ 1, and
`grep -c "bun-react-template\|To install dependencies" README.md` → 0.

## Test plan

No new tests — this plan changes config and docs only. The verification is
that the existing suite and the typecheck both pass via the new scripts.

## Done criteria

- [ ] `bun run typecheck` exits 0 with no output
- [ ] `bun run test` exits 0, 58+ tests pass
- [ ] `README.md` describes the app and contains the no-auth warning
- [ ] `git status` shows changes only to `package.json`, `tsconfig.json`, `README.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Removing `baseUrl` produces new `Cannot find module '@/...'` errors from
  `tsc` (would mean the TypeScript version in `node_modules` is older than
  expected — report the version from `bunx tsc --version`).
- `bun test` does not pass 58 tests before you change anything (baseline is
  already broken — report instead of fixing unrelated tests).

## Maintenance notes

- Plans 004–009 reference `bun run test` / `bun run typecheck` as gates; if
  you rename the scripts, update those plans.
- **Deferred**: a CI workflow (GitHub Actions: install → typecheck → test →
  build). Deferred because no remote/CI provider is configured in this repo;
  add it when the repo gets a remote. The scripts added here are the
  prerequisite.
- A linter/formatter (Biome would fit Bun) was considered and deferred — the
  codebase is consistent enough that it's not the bottleneck; revisit if more
  contributors join.
