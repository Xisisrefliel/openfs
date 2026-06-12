# OpenFS

Management software for German driving schools (Fahrschulen). It covers the full operational workflow: a week-based lesson calendar, student and instructor management, vehicle fleet tracking, configurable price plans, and a GoBD-shaped double-entry accounting engine (SKR 04, immutable bookings, Storno-only corrections, gapless receipt sequences) with Quittungen printing and DATEV CSV export. On top of that: lesson billing (confirm-to-bill per lesson, plus batch billing), exam result tracking with a Prüfungsplaner, a digital Ausbildungsnachweis (signed per lesson, printable per student), theory attendance, statistics, an internal chat, and a public appointment request form at `/anfrage`.

Currently a single-tenant Bun web app; being rebuilt as a multi-tenant SaaS (one portal per school at `schoolname.openfs.de`) — see `plans/saas-plan.md`.

## Stack

- **Runtime/server:** Bun.serve with bundler-mode HTML imports, bun test
- **Database:** SQLite (WAL) via `bun:sqlite` (`src/server/sqlite.ts`)
- **Frontend:** React 19 SPA, Tailwind CSS v4, shadcn/ui
- **Language:** TypeScript (strict mode)

## Getting started

```bash
bun install              # install dependencies
bun dev                  # dev server with HMR at http://localhost:3000
bun test                 # run the test suite
bun run typecheck        # type-check without emitting
bun run build            # production renderer bundle → dist/
bun run start            # production server
```

`data/fahrschule.db` is created and seeded automatically on first start — no migration step needed.

## Security & deployment

This application currently has **no authentication**. It is designed for single-user local use on a trusted machine. The database holds personal data (student names, addresses, phone numbers) and financial records. Do not expose the server to a network or the internet without first adding an authentication layer; doing so would give anyone with network access full read and write access to all data. (Multi-tenant auth is part of the SaaS plan.) The one deliberate exception is `/anfrage` and its POST endpoint, which are intentionally public (rate-limited per IP and length-capped); everything else keeps this no-auth local posture.

## Architecture

```
src/index.ts              Bun.serve entry point; serves the SPA and mounts /api/*
src/server/app-routes.ts  All API route factories merged into one routes object
src/server/sqlite.ts      SQLite layer (bun:sqlite); single seam for opening databases
src/server/routes.ts      HTTP route definitions, delegates to domain modules
src/server/              Domain modules: students.ts, vehicles.ts, instructors.ts,
                          price-plans.ts, engine.ts (accounting), datev.ts, etc.
src/server/db.ts          Schema, migrations, and GoBD constraints (immutable bookings,
                          Storno-only corrections, gapless number sequences)
src/*.tsx                 React page components (calendar, students, vehicles, …)
src/lib/                  Shared utilities and data-shape definitions
src/hooks/               React query hooks (one source of truth per resource)
plans/                    Plans, incl. the SaaS decision record (saas-plan.md)
```
