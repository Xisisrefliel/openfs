# Plan 007: Fix four small correctness gaps (response checks, swallowed error, hardcoded date)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/Profil.tsx src/components/buchhaltung/api.ts src/server/routes.ts src/components/VertragDialog.tsx src/NeueSchueler.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

Four independent, small gaps that each silently produce wrong state instead
of failing loudly: (a) the profile page parses error responses as if they
were profile data; (b) the Buchhaltung fetch helper can return `null`
typed as a valid object; (c) the company-profile fetch inside the contract
dialog swallows every error, so a printed Vertrag/Quittung can silently
miss the issuer block; (d) new students are stamped with a hardcoded
registration date of "09.06.2026" forever. Each fix is a few lines; they are
bundled because none justifies a plan alone.

## Current state

**(a)** `src/Profil.tsx:307-311` — load path doesn't check `res.ok` (the
save path directly below it, lines 318–323, does):

```ts
useEffect(() => {
  fetch("/api/profile")
    .then(res => res.json())
    .then((profile: CompanyProfile) => setCompany(profile))
    .catch(() => toast.error("Profil konnte nicht geladen werden."));
}, [formVersion]);
```

If the server returns a 500 with `{"error":"Interner Fehler."}`, that object
is set as the company profile.

**(b)** `src/components/buchhaltung/api.ts:18-29` — on a 200 response whose
body fails to parse, `body` is `null` and is returned `as T`:

```ts
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      body && typeof body.error === "string"
        ? body.error
        : "Anfrage fehlgeschlagen.";
    throw new ApiError(message);
  }
  return body as T;
}
```

**(c)** `src/components/VertragDialog.tsx:449-461` — the company-profile
fetch ends in `.catch(() => {});` (line 457). On failure the dialog renders
with an empty issuer and the user prints an incomplete legal document with
no warning.

**(d)** `src/NeueSchueler.tsx:82` — `const TODAY = "09.06.2026";`, used at
line 146 as `registrationDate: TODAY` for every newly created student.

**(e)** `src/server/routes.ts:160-181` — within `vehicleRoutes`, the two GET
handlers are the only handlers in the file NOT wrapped in `handle()`:

```ts
"/api/vehicle-options": {
  GET: () => {
    const models = listVehicleModels(db);
    ...
    return json({ vehicleOptions: [...options, unassigned] });
  },
},

"/api/vehicles": {
  GET: () => json({ vehicles: listVehicles(db) }),
  ...
```

A DB error here becomes an unhandled rejection instead of a JSON 500.
`handle()` is defined at `routes.ts:50-62`.

Repo conventions that apply: user-facing errors surface via
`toast.error("German message.")` (sonner) — see `src/Profil.tsx:310`;
fetch-parsing belongs in `parseOrThrow`-style helpers.

## Commands you will need

| Purpose   | Command             | Expected on success |
|-----------|---------------------|---------------------|
| Typecheck | `bunx tsc --noEmit` | no new errors       |
| Tests     | `bun test`          | all pass            |
| Dev smoke | `bun dev`           | pages load (manual) |

## Scope

**In scope**:
- `src/Profil.tsx` (fix a)
- `src/components/buchhaltung/api.ts` (fix b)
- `src/components/VertragDialog.tsx` (fix c)
- `src/NeueSchueler.tsx` (fix d)
- `src/server/routes.ts` (fix e)

**Out of scope** (do NOT touch):
- Consolidating this fetch code with `src/hooks/*` or `src/lib/api.ts` —
  that is plan 005's territory; here you make minimal local fixes only.
- `src/lib/calendar-data.ts` `TODAY` constant — that anchor is the calendar
  demo-data seam and is handled by plan 009. Only the `NeueSchueler.tsx`
  string is in scope.
- Any change to API response shapes.

## Git workflow

- Branch: `advisor/007-small-fixes` (or direct to `main`).
- One commit: `fix response checks, swallowed vertrag error, hardcoded registration date`.
- Do NOT push unless instructed.

## Steps

### Step 1 (a): Profile load checks `res.ok`

In `src/Profil.tsx`, change the effect to:

```ts
useEffect(() => {
  fetch("/api/profile")
    .then(res => {
      if (!res.ok) throw new Error("Profil-Request fehlgeschlagen.");
      return res.json();
    })
    .then((profile: CompanyProfile) => setCompany(profile))
    .catch(() => toast.error("Profil konnte nicht geladen werden."));
}, [formVersion]);
```

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 2 (b): `request<T>` rejects null bodies

In `src/components/buchhaltung/api.ts`, after the `!res.ok` block, add:

```ts
if (body == null) {
  throw new ApiError("Ungültige Antwort vom Server.");
}
return body as T;
```

Note: verify no caller expects a body-less 200. Check call sites:
`grep -n "request<" src/components/buchhaltung/api.ts` — all current calls
(`ledger`, `journal`, `accounts`, `setAccountActive`, `createTransaction`,
`storno`, `quittung`) hit routes that always return JSON (see
`src/server/routes.ts` — every handler returns `json(...)`). If you find a
route that returns an empty body, STOP.

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 3 (c): Surface the VertragDialog profile failure

In `src/components/VertragDialog.tsx`, the effect around lines 449–461
fetches `/api/profile` with a `cancelled` flag and ends in `.catch(() => {});`.
Replace the empty catch with a toast (the file's surroundings will show
whether `toast` from `"sonner"` is already imported — if not, add the
import, matching e.g. `src/Fahrzeuge.tsx`):

```ts
.catch(() => {
  if (!cancelled) {
    toast.error("Firmenprofil konnte nicht geladen werden — Angaben im Dokument unvollständig.");
  }
});
```

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 4 (d): Real registration date in NeueSchueler

In `src/NeueSchueler.tsx:82`, replace:

```ts
const TODAY = "09.06.2026";
```

with a computed value in the same `DD.MM.YYYY` format used across the app:

```ts
const now = new Date();
const TODAY = `${String(now.getDate()).padStart(2, "0")}.${String(
  now.getMonth() + 1
).padStart(2, "0")}.${now.getFullYear()}`;
```

(Local time on purpose — the app is single-user local; do not use
`toISOString`, which shifts across timezones.)

**Verify**: `bunx tsc --noEmit` → no new errors. Manual: `bun dev`, open
`/neue-schueler`, confirm the Anmeldedatum field shows today's real date.

### Step 5 (e): Wrap the vehicle GET routes in `handle()`

In `src/server/routes.ts` (`vehicleRoutes`), wrap both GET handlers exactly
like every other handler in the file:

```ts
"/api/vehicle-options": {
  GET: () =>
    handle(() => {
      const models = listVehicleModels(db);
      const defaults = getVehicleOptions();
      const unassigned = "Nicht zugeteilt";
      const options = new Set<string>(defaults.filter(value => value !== unassigned));
      for (const model of models) {
        options.add(model);
      }
      return json({ vehicleOptions: [...options, unassigned] });
    })(),
},

"/api/vehicles": {
  GET: () => handle(() => json({ vehicles: listVehicles(db) }))(),
  ...
```

Keep the body logic identical — only add the wrapper.

**Verify**: `bun test` → all pass (if plan 004 has landed, its
`routes.test.ts` covers these endpoints; expect them to still return 200).

### Step 6: Full gate

**Verify**: `bun test` → all pass. `bunx tsc --noEmit` → no new errors.
`grep -n "catch(() => {})" src/components/VertragDialog.tsx` → 0 matches.
`grep -n '"09.06.2026"' src/NeueSchueler.tsx` → 0 matches.

## Test plan

These are frontend/file-local fixes with no DOM test infrastructure in the
repo (deliberate — see plan 004's scope). Server-side fix (e) is covered by
plan 004's route tests if present. No new test files; the greps and manual
smoke in the steps are the gates.

## Done criteria

- [ ] All five fixes applied; verification greps in Step 6 pass
- [ ] `bun test` exits 0
- [ ] `bunx tsc --noEmit` → no new errors
- [ ] `git status` shows only the five in-scope files
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any accounting route is found to return a 200 with an empty body (Step 2's
  assumption fails).
- `VertragDialog.tsx` around line 449–461 doesn't match the described shape
  (`cancelled` flag + `.catch(() => {})`) — the file has drifted.
- Wrapping the GET routes changes any existing test's result other than to
  pass.

## Maintenance notes

- Plan 005 may later absorb `Profil.tsx`'s inline fetch into the shared
  helper — fix (a) keeps the change minimal so that refactor stays clean.
- Reviewer: confirm fix (d) didn't change the displayed date FORMAT anywhere
  (the app uses `DD.MM.YYYY` strings in student data).
