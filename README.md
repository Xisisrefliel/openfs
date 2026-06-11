# Fahrschule Gül

A single-user desktop application (Electron) for managing a German driving school (Fahrschule Gül). It covers the full operational workflow: a week-based lesson calendar, student and instructor management, vehicle fleet tracking, configurable price plans, and a GoBD-shaped double-entry accounting engine (SKR 04, immutable bookings, Storno-only corrections, gapless receipt sequences) with Quittungen printing and DATEV CSV export.

## Stack

- **Desktop app:** Electron; API + static assets served over a custom `app://` protocol (no localhost server), SQLite via `node:sqlite`
- **Web dev runtime:** Bun.serve with bundler-mode HTML imports, bun test
- **Database:** SQLite (WAL) behind a runtime adapter — `bun:sqlite` under Bun, `node:sqlite` under Electron (`src/server/sqlite.ts`)
- **Frontend:** React 19 SPA, Tailwind CSS v4, shadcn/ui
- **Language:** TypeScript (strict mode)

## Getting started

```bash
bun install              # install dependencies
bun run electron         # build and launch the desktop app
bun run electron:smoke   # headless self-check of the desktop app (API + render)
bun dev                  # browser dev server with HMR at http://localhost:3000
bun test                 # run the test suite
bun run typecheck        # type-check without emitting
bun run build            # renderer bundle → dist/
```

`data/fahrschule.db` is created and seeded automatically on first start — no migration step needed.

## Security & deployment

This application has **no authentication**. It is designed for single-user local use on a trusted machine. The database holds personal data (student names, addresses, phone numbers) and financial records. Do not expose the server to a network or the internet without first adding an authentication layer; doing so would give anyone with network access full read and write access to all data.

## Architecture

```
electron/main.ts          Electron entry point; app:// protocol serves dist/ and
                          dispatches /api/* through src/server/router.ts
src/index.ts              Bun.serve entry point (browser dev); mounts the same routes
src/server/app-routes.ts  All API route factories merged; shared by both entry points
src/server/router.ts      Bun-routes-compatible matcher for the app:// protocol
src/server/sqlite.ts      Runtime adapter: bun:sqlite (Bun) / node:sqlite (Electron)
src/server/routes.ts      HTTP route definitions, delegates to domain modules
src/server/              Domain modules: students.ts, vehicles.ts, instructors.ts,
                          price-plans.ts, engine.ts (accounting), datev.ts, etc.
src/server/db.ts          Schema, migrations, and GoBD constraints (immutable bookings,
                          Storno-only corrections, gapless number sequences)
src/*.tsx                 React page components (calendar, students, vehicles, …)
src/lib/                  Shared utilities and data-shape definitions
src/hooks/               React query hooks (one source of truth per resource)
plans/                    Advisor plans for future improvements
```
