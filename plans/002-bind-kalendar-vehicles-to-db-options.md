# Plan 002: Bind calendar vehicle options to DB-backed vehicle list

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 6ed6880..HEAD -- src/Kalendar.tsx`
> If this diff is non-empty, reconcile plan scope before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `6ed6880`, 2026-06-10

## Why this matters

`/fahrzeuge` now stores vehicle names in DB, but `/kalendar` still hardcodes option values. This creates a split source of truth: lesson filters and event-edit dropdowns cannot represent newer models from `/api/vehicles`, which degrades usability and causes data-entry drift across screens.

## Current state

- `src/Kalendar.tsx:147` defines `const vehicleOptions = ["Golf", "BMW X1"];`.
- Same static list is passed to filter and event dialog controls (`src/Kalendar.tsx:848` and `src/Kalendar.tsx:1025`).
- A DB-backed options endpoint exists and is already used elsewhere via `useVehicleOptions` (`src/hooks/use-vehicle-options.ts:10`, `src/hooks/use-vehicle-options.ts:19`, and `src/server/routes.ts:124-133`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `bun install` | exits 0 |
| Build sanity check | `bun run build` | exits 0 |
| Verify no hardcoded list remains in calendar | `rg -n 'const vehicleOptions = \["Golf", "BMW X1"\]' src/Kalendar.tsx` | no matches |

## Suggested executor toolkit

- If available, use a lightweight manual browser check to confirm filter chip and event edit dropdown now show DB-derived vehicle values.

## Scope

**In scope** (the only files you should modify):
- `src/Kalendar.tsx`

**Out of scope**:
- Backend route changes in `src/server/routes.ts`
- `src/hooks/use-vehicle-options.ts` unless strictly required for type compatibility

## Git workflow

- Do not modify other pages in this plan.
- Keep behavior deterministic: keep `vehicleOptions` fallback list behavior through the hook only.

## Steps

### Step 1: Replace local static vehicle list with hook-backed source

Import and use `useVehicleOptions` in `src/Kalendar.tsx`.

- Remove `const vehicleOptions = ["Golf", "BMW X1"];`.
- Add `const { vehicleOptions } = useVehicleOptions();` near component-level hooks.

**Verify**: compile succeeds and no hardcoded static array remains in component logic.

### Step 2: Keep fallback behavior compatible

If filtering behavior is unchanged and no vehicles are selected, it should continue to behave as "all".

- Confirm initial render still works even before asynchronous fetch resolves (`vehicleOptions` fallback from hook).
- Ensure existing `vehicles` filter set logic keeps existing semantics.

**Verify**: no runtime errors when opening `/kalendar` with an empty/in-progress options fetch.

### Step 3: Verify event editing and filter UI receive dynamic values

Ensure both vehicle filter (`FilterGroup` in sidebar) and event dialog select (`EventEditDialog`) receive the hook values from `vehicleOptions`.

**Verify**:
- `bun run build`
- Manual smoke test: create/seed a new vehicle model, then confirm it appears in `/kalendar` vehicle filter and event edit dropdown within one refresh cycle.

## Test plan

No project-level automated test runner for this behavior exists yet in `package.json`; include smoke/manual checks with the build command.

## Done criteria

- [ ] `rg` command shows no hardcoded vehicle array in `src/Kalendar.tsx`.
- [ ] `bun run build` exits 0.
- [ ] New DB-backed vehicle names appear in calendar filter + event edit select after backend seed or DB insert.
- [ ] No files outside `src/Kalendar.tsx` changed.

## STOP conditions

- Hook import causes circular or unresolved module import in bundling after migration.
- `useVehicleOptions` fetch path fails consistently and prevents dashboard rendering in dev.
- The required behavior spans calendar pages outside `/kalendar` and needs a broader API change.

## Maintenance notes

- Consider centralizing options across calendar/instructor/student flows to avoid future drift.
- Once this is in place, remove `src/lib/vehicle-options.ts` if still used only as fallback seed.
