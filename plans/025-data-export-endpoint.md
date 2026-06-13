# Plan 025: Data export — download the SQLite database from the Profil page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/routes.ts src/index.ts src/server/sqlite.ts`
> On drift, compare excerpts below; mismatch = STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction / dx
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The SaaS plan promises "Export all your data = hand them the file"
(plans/saas-plan.md, Architecture) — DSGVO data portability and the
anti-lock-in sales pitch. Nothing implements it. For the current local app it
doubles as one-click backup before risky operations. SQLite makes this nearly
free: serialize the live DB and stream it as a download.

## Current state

- `src/server/sqlite.ts` — the Database interface (lines 32–50) wraps
  bun:sqlite but does NOT expose `serialize()`. bun:sqlite's native
  `Database.serialize()` returns a `Uint8Array` snapshot of the database
  (works under WAL; it serializes the current committed state). The seam:
  `openSqlite` casts `new BunDatabase(...) as unknown as Database` (line 53).
  Extend the interface with `serialize(): Uint8Array` — the underlying
  bun:sqlite object already has it, so the cast keeps working. Confirm the
  method exists in this Bun version via
  `node_modules/bun-types` (search for `serialize` in the bun:sqlite types)
  before relying on it.
- `src/server/routes.ts` — route factories use `handle()` + `json()`
  (lines 54–70); the DATEV export route already returns a non-JSON download
  (search `generateDatevExport` usage in routes.ts for the
  Content-Disposition pattern, including the `bytes as unknown as BodyInit`
  cast used there — copy that idiom).
- `src/Profil.tsx` — has UNCOMMITTED design-refresh changes in the
  maintainer's tree. Therefore the UI half of this plan goes into…
  **decision**: put the download button on the Profil page LATER; this plan
  ships the endpoint only, plus a direct link. Rationale: avoid colliding
  with the in-flight redesign. The endpoint is directly usable via
  `<a href="/api/export/database">` from anywhere later.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |

## Scope

**In scope**:
- `src/server/sqlite.ts` (interface + nothing else)
- `src/server/routes.ts` (new `GET /api/export/database` in accountingRoutes
  or a tiny new factory — match file organization)
- `src/server/routes.test.ts` (extend)

**Out of scope** (do NOT touch):
- ANY frontend file (Profil.tsx is mid-redesign; the button is follow-up work
  noted in plans/README.md).
- Scheduled/automatic backups, object-storage replication (SaaS plan,
  DevOps scope), CSV exports.

## Git workflow

- Branch: `advisor/025-db-export` from `main` (`160eccc`)
- Commits: title-only.
- Do NOT push or open a PR.

## Steps

### Step 1: Expose serialize on the seam

Add `serialize(): Uint8Array;` to the `Database` interface in sqlite.ts after
confirming bun-types declares it on bun:sqlite's Database.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: The endpoint

`GET /api/export/database`: `const bytes = db.serialize();` → Response with
`Content-Type: application/vnd.sqlite3`,
`Content-Disposition: attachment; filename="openfs-export-<YYYY-MM-DD>.db"`
(date from `new Date().toISOString().slice(0,10)`), body per the DATEV
download idiom. Wrap in `handle()`.

**Verify**: `bun run typecheck` → exit 0.

### Step 3: Test

In routes.test.ts (follow its existing fetch-against-test-server or
direct-handler pattern — read how it invokes routes): GET the endpoint →
status 200, `content-disposition` contains `.db`, body length > 0, and the
bytes start with the SQLite magic header (`SQLite format 3\0` — first 16
bytes; assert the first 6 chars). Bonus assertion if cheap: write bytes to a
temp file, `openSqlite(tmpPath)`, `SELECT count(*) FROM students` succeeds.

**Verify**: `bun test src/server/routes.test.ts` → pass.

## Test plan

The step-3 test is the test plan (≥1 test, 3+ assertions).

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0
- [ ] `grep -n "export/database" src/server/routes.ts` shows the route
- [ ] Test asserts the SQLite magic header
- [ ] No frontend files modified (`git status`)

## STOP conditions

- bun-types does NOT declare `serialize()` on Database in this Bun version —
  report; do not shell out to `sqlite3` or copy the live WAL files as a
  workaround without review (copying db+wal mid-write is corruption-prone).

## Maintenance notes

- Follow-up (post design-refresh): a "Daten exportieren" button on Profil →
  plain anchor to the endpoint.
- SaaS: this endpoint becomes per-tenant; auth must gate it then — note for
  plan 026.
- Reviewer: confirm serialize() is a point-in-time snapshot (no partial-write
  risk) rather than a file copy.
