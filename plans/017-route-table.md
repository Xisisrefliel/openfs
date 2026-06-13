# Plan 017: Extract a route table in App.tsx (replace the 25-branch ternary chain)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **BLOCKED until the design refresh is committed.** The maintainer's working
> tree has large uncommitted changes to `src/App.tsx`. Execute this plan ONLY
> from a base commit that contains those changes (the dispatcher confirms the
> commit). The excerpts below were taken from the working tree on 2026-06-12
> and reflect the post-refresh file.
>
> **Drift check (run first)**: compare the excerpts below against the live
> `src/App.tsx`; if `usePath` or the routing chain moved or changed shape,
> STOP and report.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (routing is user-facing; a regex slip breaks navigation)
- **Depends on**: design-refresh commit landing; plan 024 (soft — if its
  /anfrage early-return exists, fold it into the table as a chrome-less route)
- **Category**: tech-debt
- **Planned at**: working tree over `160eccc`, 2026-06-12 (re-stamp at execution)

## Why this matters

App.tsx routes ~25 pages through a hand-wired ternary chain plus a regex
match for the one dynamic route. Adding a page means editing three distant
places; there is no 404 fallback (unknown paths render the Dashboard,
i.e. silently wrong); dynamic segments have no single definition. A declarative
route table makes adding pages one entry, gives a real fallback, and keeps the
hand-rolled history wrapper (no router dependency — deliberate).

## Current state

- `src/App.tsx:138-157` — `usePath()`: popstate listener + `navigate(to)`
  doing `pushState`; KEEP this mechanism unchanged.
- `src/App.tsx:382-431` — the chain (shape, abbreviated):

  ```tsx
  const studentDetailMatch = path.match(/^\/fahrschueler\/(\d+)$/);
  ... path === "/profil" ? (<Profil .../>)
    : path === "/theorie" ? (<Theorie .../>)
    : studentDetailMatch ? (<FahrschuelerDetail id={...} .../>)
    : path === "/fahrschueler" ? (...)
    : ... 20 more ...
    : (<Dashboard .../>)   // implicit fallback — also the "/" route
  ```

- Sidebar nav arrays earlier in the file (~lines 100–131) hold
  `{ route, label, icon }` items checked via `isActive={path === route}` —
  unchanged by this plan (they are navigation, not routing).
- Each page receives ad-hoc props (most take `navigate`; some take search
  params) — catalogue them while building the table; the table's render
  functions close over `navigate`/params, so no page component changes.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/App.tsx` only (the table can live in the same file; a separate
  `src/routes.tsx` is acceptable if App.tsx shrinks meaningfully — your call,
  state it).

**Out of scope** (do NOT touch):
- Any page component; `usePath`'s history mechanics; the sidebar nav arrays;
  adding a router dependency (wouter etc.) — explicitly rejected.

## Git workflow

- Branch: `advisor/017-route-table` from the design-refresh commit
  (dispatcher names it).
- Commits: title-only.
- Do NOT push or open a PR.

## Steps

### Step 1: Define the table

```tsx
type Route = {
  pattern: string;                     // "/fahrschueler/:id"
  render: (params: Record<string, string>) => ReactNode;
  chrome?: false;                      // chrome-less routes (e.g. /anfrage)
};
const ROUTES: Route[] = [ ... every existing path, same order ... ];
```

Plus a small matcher: split pattern and path on "/", `:name` segments
capture, others must equal; first match wins. Keep it ~20 lines, no regex
construction from strings.

**Verify**: `bun run typecheck` → exit 0.

### Step 2: Swap the chain

Replace the ternary chain with table lookup. `"/"` maps to Dashboard
EXPLICITLY; unknown paths render a minimal NotFound block (quiet empty state
per design-guideline.md: icon + one muted line + a "Zur Übersicht" button
calling `navigate("/")`). If plan 024's /anfrage early-return exists, fold it
in as a `chrome: false` route handled before the layout wrapper.

**Verify**: `bun run build` → exit 0.

### Step 3: Behavior parity sweep

For EVERY route in the old chain, confirm the table renders the same
component with the same props (mechanical diff of old branch vs. table
entry — list them in your report). Check `/fahrschueler/123` param flows and
that `/unbekannt` now renders NotFound, not Dashboard.

**Verify**: `bun test` → pass; `bun run build` → exit 0.

## Test plan

The matcher is pure — if extracted to `src/lib/` add `bun test` cases (exact
match, param match, no match, root); if kept inside App.tsx, the parity sweep
in step 3 is the verification (no DOM test infra by repo decision).

## Done criteria

- [ ] `bun run typecheck`, `bun test`, `bun run build` all exit 0
- [ ] `grep -c 'path === "' src/App.tsx` ≤ 3 (nav isActive checks may remain)
- [ ] Unknown path renders NotFound (state how you verified)
- [ ] Route count in the table equals the old chain's branch count (+1 for NotFound)
- [ ] Only in-scope files modified (`git status`)

## STOP conditions

- The post-refresh App.tsx routing diverges structurally from the excerpts.
- Any page turns out to depend on the implicit Dashboard-fallback behavior.

## Maintenance notes

- New pages: one ROUTES entry + one nav item.
- Reviewer: the parity list in the report is the review artifact — check it
  route by route.
