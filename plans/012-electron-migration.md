# 012 — Electron migration (implemented on branch `electron-rewrite`)

> Status: **implemented** (this document is a record, not a pending plan).

## Goal

Run the app as a native desktop application (Electron) while staying on
SQLite, without forking the server code away from the Bun toolchain
(`bun test`, `bun dev` keep working unchanged).

## Architecture decisions

1. **No localhost server inside Electron.** The renderer loads
   `app://bundle/`; Electron's `protocol.handle()` receives web-standard
   `Request`s and returns `Response`s — the exact contract the existing
   Bun.serve route factories already implement. A ~80-line router
   (`src/server/router.ts`) replicates Bun's path matching (static
   segments beat `:params`, per-method maps, 405 on method mismatch)
   and attaches `req.params`.

2. **SQLite driver adapter** (`src/server/sqlite.ts`). Bun 1.3 does not
   implement `node:sqlite`, and `bun:sqlite` does not exist under Node,
   so one driver for both runtimes is impossible. The adapter exposes
   the shared API surface (`query`/`prepare`/`exec`/`run`/`transaction`/
   `close`) and picks the driver via `process.versions.bun`:
   - Bun (dev server, `bun test`): `bun:sqlite`, unchanged behavior.
   - Electron (Node 24): `node:sqlite` with a savepoint-based
     `transaction()` shim mirroring bun:sqlite semantics, boolean/
     undefined param normalization, `get() → null` normalization, and
     `changes` coerced to number.
   All server modules and tests import the `Database` *type* from the
   adapter; driver casts exist only inside `sqlite.ts`.

3. **Shared route table** (`src/server/app-routes.ts`): the merge of all
   route factories moved out of `src/index.ts` so both entry points
   (Bun.serve and Electron) mount identical routes.

4. **Renderer build**: `Bun.build()` via `scripts/build-renderer.ts`
   because the `bun build` CLI does not load `bun-plugin-tailwind`
   (bunfig only wires it into the dev server) — the old `bun run build`
   produced unstyled CSS. Electron loads the same `dist/` bundle through
   the `app://` protocol with SPA fallback to `index.html`.

5. **Database location**: dev uses the repo's `./data/fahrschule.db`
   (same file as the Bun dev server); packaged builds will use
   `userData/data`. The main process seeds exactly like `src/index.ts`.

## Verification

- `bun test`: 385 pass (378 pre-existing + 7 new router tests).
- `bunx tsc --noEmit`: clean.
- Adapter exercised under plain Node 24 (reads, seeding, write
  transaction with gapless sequence allocation).
- `bun run electron:smoke`: headless Electron boot asserting
  `fetch("/api/students")` → 200 through `app://` and a rendered React
  root; screenshot confirmed full Tailwind styling.
- `bun dev` (Bun.serve) still serves HTML + API after the refactor.

## Not done (follow-ups)

- Packaging/distribution (electron-builder, code signing, icons).
- HMR inside Electron (currently rebuild + relaunch; `bun dev` remains
  the fast iteration path).
- `electron/main.ts` is bundled with `bun build --target=node`; the
  `--external=electron` flag must come *after* a `./`-prefixed entry
  path (plain `electron/main.ts` trips an EISDIR resolution bug in Bun
  when the repo has an `electron/` directory).
