---
description: Agent instructions for OpenFS (Fahrschule management).
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: true
---

## Bun not Node

- `bun test` / `bun run <script>` / `bun install` / `bunx` — never npm/yarn/pnpm/npx.
- `bun:sqlite` not better-sqlite3; `Bun.serve()` not express; `Bun.file` not fs.readFile.
- `vite.config.ts` exists as a deliberate shadcn-CLI shim — do not delete it or run vite at runtime.

## What this is

OpenFS is a desktop Fahrschule (driving school) management app: student records, calendar, theory groups, and a GoBD-compliant accounting engine. The UI is German throughout.

## Commands

| Purpose    | Command             | Expected       |
|------------|---------------------|----------------|
| Test       | `bun test`          | 387+ pass, 0 fail |
| Typecheck  | `bun run typecheck` | exit 0         |
| Build      | `bun run build`     | exit 0         |

## Architecture

See `README.md` for the full diagram. Short version:

- **Frontend**: React 19 SPA, HTML imports via `Bun.serve()`, shadcn/ui + Tailwind v4. Design rules: `design-guideline.md`.
- **Backend**: `src/server/` — route handlers call the accounting engine and SQLite helpers.
- **DB**: `bun:sqlite`; schema migrations in `src/server/db.ts`. Production DB: `data/fahrschule.db`. Tests use in-memory DBs — never touch the file.
- **Plans/advisor workflow**: `plans/`.

## Hard rules

### GoBD accounting engine
The accounting module enforces GoBD: immutable bookings, Storno-only corrections, gapless sequences, SKR 04 chart (migrated from SKR 03 via `migrateSkr03ToSkr04` in `src/server/db.ts`).

**The only permitted write paths are `createTransaction` and `stornoTransaction` in `src/server/engine.ts`.**
Never add UPDATE or DELETE on the `transactions` or `bookings` tables.

### Name-keyed soft references
`students`, `calendar_events`, and `theory_groups` reference instructors and vehicles by **display name**, not by id. When an instructor or vehicle is renamed or deleted, every reference must be updated (see cascade in `src/server/instructors.ts` ~lines 174–186). New cross-references should use ids instead.

### Tests
- All tests use in-memory SQLite: `openSqlite(":memory:")`.
- Test files are co-located as `*.test.ts` alongside the module they test.
- Never read from or write to `data/fahrschule.db` in tests.
- No DOM test framework (by decision) — backend tests only.

### UI
- All user-visible strings are German.
- Follow `design-guideline.md` for visual/interaction rules — do not duplicate its content here.

### Commits
Title-only, no body. Split into small chunks until each title is self-explanatory.
