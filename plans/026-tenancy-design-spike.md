# Plan 026: Design spike — multi-tenant architecture mapping (doc only, no code)

> **Executor instructions**: This is a DESIGN plan: the deliverable is ONE
> markdown document, `plans/design/tenancy.md`. You must not modify any file
> outside `plans/design/`. Investigate by reading code; cite `file:line` for
> every factual claim, exactly like the exemplar
> `plans/design/lessons-billing.md` (read it first for tone and rigor).
> If anything in the "STOP conditions" section occurs, stop and report.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (no code changes)
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The SaaS decision record (plans/saas-plan.md) ends with: "Next step: map
exactly what in the current codebase transfers to the multi-tenant server and
what needs rethinking (tenancy, auth, subdomain routing, uploads, backups)."
That mapping does not exist. Phase 1 (the revenue launch) is gated on it.
This spike produces the maintainer-decision document.

## Inputs (read all)

- `plans/saas-plan.md` — the decided business/architecture constraints:
  one SQLite DB per tenant, `schoolname.openfs.de` subdomains, Hetzner +
  Hetzner Object Storage, Litestream-style backup, AVV/DSGVO obligations.
- `src/server/sqlite.ts` — the declared tenancy seam ("single seam for
  opening databases, which the multi-tenant SaaS will extend to 'open the
  database for tenant X'", lines 1–8).
- `src/index.ts` — single global `openDb()` + `buildApiRoutes(db)` at startup
  (lines 10–22): the routes object closes over ONE db. This is the central
  thing tenancy must restructure.
- `src/server/app-routes.ts` — every route factory takes `db` once at build
  time.
- `src/server/db.ts` — `openDb` runs DDL + migrations + seeds per open.
- Module-owned ensure-tables (`theory-groups.ts:156`,
  `appointment-requests.ts:223`, chat/campaigns/reviews equivalents) — all
  must run per tenant DB.
- Seeding: `src/server/seed.ts` + `initStudents` etc. in db.ts — demo seeds
  must NOT run for real tenants; map what "empty school" provisioning means.
- `bun-types` docs if needed: `node_modules/bun-types/docs/**.mdx`
  (Bun.serve routes API, request.url handling).

## The document must cover

1. **Request → tenant resolution**: subdomain parsing in Bun.serve; local
   dev story (e.g. `demo.localhost:3000`); what happens to the current
   `"/*": index` SPA serving per tenant.
2. **DB-per-tenant lifecycle**: extend the sqlite.ts seam — open/cache/close
   per tenant (an LRU? open-on-demand?), where files live
   (`data/tenants/<slug>.db`?), migration runs (on open vs. on deploy),
   seed policy (no demo data; what minimal init a fresh school needs).
3. **Routes refactor shape**: the smallest change that turns
   `buildApiRoutes(db)` into per-request db resolution — e.g. route factories
   take a `getDb(req)` instead of `db`, or a wrapper resolves the tenant and
   passes db through. Estimate blast radius in files (count the factories) and
   propose the mechanical transform.
4. **Auth**: minimum viable for Phase 1 — per-school login (single shared
   school account? per-user accounts?), session mechanism compatible with
   Bun.serve, where the user table lives (per-tenant DB vs. a central
   registry DB), and how the registry maps subdomain → tenant + subscription
   status.
5. **Public vs. authenticated surfaces**: /anfrage (plan 024) stays public
   per tenant; everything else gates.
6. **Files/uploads**: today documents are base64 data-URLs inside the
   students.documents JSON (`src/lib/student-data.ts:18-26`) — assess whether
   that survives Phase 1 or must move to object storage (size math: avg PDF
   size × students × tenants vs. SQLite file bloat + the plan-025 export
   path).
7. **Backups/export**: per-tenant serialize endpoint (plan 025) + the
   Litestream-style replication story; what needs to be true operationally.
8. **What transfers untouched**: enumerate the domain modules that work
   per-tenant as-is (engine, datev, archive, …) — the encouraging list.
9. **Open questions for the maintainer**: numbered, each with a suggested
   default — same format as lessons-billing.md §6.
10. **Phasing**: a dependency-ordered build sequence (tenancy seam → auth →
    provisioning → backups), each phase S/M/L coarse-estimated.

## Scope

**In scope**: `plans/design/tenancy.md` (create). Nothing else.
**Out of scope**: ALL source files; package.json; any prototype code.

## Git workflow

- Branch: `advisor/026-tenancy-spike` from `main` (`160eccc`)
- One commit: "plans: tenancy design spike"

## Done criteria

- [ ] `plans/design/tenancy.md` exists, covers all 10 sections
- [ ] Every architectural claim about current code cites `file:line`
- [ ] Open questions are numbered with suggested defaults
- [ ] `git status` shows only the new doc
- [ ] `bun test` still passes (nothing changed, sanity)

## STOP conditions

- You find yourself writing prototype/production code — stop; doc only.
- A claim in saas-plan.md contradicts what the code allows (e.g. a constraint
  that makes DB-per-tenant infeasible) — surface it prominently in the doc's
  open questions rather than silently designing around it.

## Maintenance notes

- The maintainer reviews this doc and turns approved sections into build
  plans (027+ numbering continues in plans/README.md).
