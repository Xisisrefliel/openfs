# Plan 001: Enable creation of vehicles from the /fahrzeuge page

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise.
>
> **Drift check (run first)**: `git diff --stat 6ed6880..HEAD -- src/Fahrzeuge.tsx`
> If this diff is non-empty, reconcile plan scope before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `6ed6880`, 2026-06-10
-
## Why this matters

`/fahrzeuge` now reads and saves vehicle data from `/api/vehicles`, but the page has no path for creating a new DB vehicle from UI. Users can only edit seeded entries, so adding real-world roster data requires direct API calls or DB edits and leads to persistent inconsistency between the business process and the system's data entry flow. This is a high-visibility interaction gap rather than a backend defect.

## Current state

- `src/Fahrzeuge.tsx`: `createVehicle` UI affordance is rendered but not wired.
  - Evidence: `src/Fahrzeuge.tsx:416` renders the "Fahrzeug hinzufügen" button without an `onClick` handler.
  - Evidence: `src/Fahrzeuge.tsx:447` only submits `updateVehicle(...)`; no create path is used in this component.
- `src/hooks/use-vehicles.ts`:
  - `createVehicle` API helper exists and points at `POST /api/vehicles` (`src/hooks/use-vehicles.ts:46`).
- Backend is ready:
  - `src/server/routes.ts` exposes `POST /api/vehicles` (`src/server/routes.ts:138-142`).
  - `src/server/vehicles.ts` implements insertion validation for vehicle creation (`src/server/vehicles.ts:223-241`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install deps | `bun install` | exits 0 |
| Build sanity check | `bun run build` | exits 0 |
| Run local DB-backed route check | `bun run dev >/tmp/empty-dev.log 2>&1 &\nDEV_PID=$!; sleep 2; curl -s http://localhost:3000/api/vehicles | head -c 1200; kill $DEV_PID` | command exits 0 and JSON with `vehicles` key |

## Suggested executor toolkit

- If available, use existing frontend debugging tooling to smoke-test the dialog path after implementation.

## Scope

**In scope** (the only files you should modify):
- `src/Fahrzeuge.tsx`

**Out of scope**:
- `src/server/**` (already implemented and should not be changed here)
- global style/layout refactors outside `/fahrzeuge`

## Git workflow

- Branch naming should follow repo conventions when an executor opens a branch.
- Do not push unless explicitly requested.

## Steps

### Step 1: Add a create-vehicle dialog state and payload path

Introduce local state in `src/Fahrzeuge.tsx` for "create mode" with defaults matching `EMPTY` equivalent in the backend (`model`, `plate`, `klass`, `status`, `accent`, `details`) and reuse the existing `VehicleEditDialog` flow or a compact form so users can enter at least model/plate/class first.

**Verify**: The page should show a working create action without blocking existing edit behavior.

### Step 2: Wire the add button to open the create dialog

Attach `onClick` on the existing plus-button (`Fahrzeug hinzufügen`) to set create mode, and ensure cancel closes it without affecting `editingVehicleId` state.

**Verify**: Button is clickable, dialog appears, and no existing card edit flow regresses.

### Step 3: Persist and refresh after create

In submit handler, call `createVehicle(...)` from `src/hooks/use-vehicles.ts` and then refresh the vehicle list. Keep API error handling user-visible (toast or inline notice) and only close the dialog on success.

**Verify**:
- `bun run build`
- Start dev server and `POST` a new vehicle via UI flow, then confirm it appears immediately from `GET /api/vehicles`.

## Test plan

No existing automated test script is declared in `package.json`. Add a minimal regression test only if it fits project conventions later.

For this executor run:
- Manual acceptance steps above; no repo-level unit test command available.

## Done criteria

- [ ] `bun run build` exits 0.
- [ ] Clicking `Fahrzeug hinzufügen` opens a create flow in `/fahrzeuge`.
- [ ] Submitting new model/plate persists and list refresh shows the new vehicle.
- [ ] Existing edit flow still works and updates an existing vehicle when editing.
- [ ] Only `src/Fahrzeuge.tsx` is modified.

## STOP conditions

- `/api/vehicles` returns 400/500 due payload mismatch during create flow after two consecutive attempts.
- State shape changes in other files are required to satisfy this feature (out-of-scope by default).
- Required design constraints in `/fahrzeuge` cannot be met due missing form components.

## Maintenance notes

- Next follow-up: add validation for duplicate plate feedback in the UI if backend duplicate error remains too generic.
- If create requirements grow (bulk import, file upload), this should be implemented as a separate dialog to avoid overloading one form.
