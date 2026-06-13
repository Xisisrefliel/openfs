# Plan 029: Harden the public appointment-request intake (length caps + rate limit)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report — do not improvise. Your
> reviewer maintains `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/server/appointment-requests.ts src/server/appointment-requests.test.ts`
> On any change, compare the excerpts below against the live code; mismatch = STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

`/anfrage` (public appointment form) is the app's first surface designed for
*external* users — the SaaS pivot will put it on the internet. Its POST
endpoint currently accepts unbounded `name`/`phone`/`email`/`message`
strings (only `.trim()` is applied) and has no abuse guard, so a single
client can bloat the SQLite DB with megabyte payloads or thousands of rows.
Sibling module `ausbildungsnachweis.ts` already caps its free-text fields —
this brings the intake module up to the same standard.

## Current state

- `src/server/appointment-requests.ts:352-359` — the `str()` helper inside `normalize()`: type-checks string, trims, no length check.
- `:361-397` — `normalize()` validates `name` (non-empty), `requestedDate` (ISO regex), `requestedTime` (HH:MM regex), `type`, `status`; `phone`, `email`, `message` pass through `str()` untouched.
- The POST route for creation lives in this module's route factory (search for `"POST"` / `createAppointmentRequest` near the bottom, around line 554). No rate limiting exists anywhere in the codebase.
- Length-cap precedent: `src/server/ausbildungsnachweis.ts:111-113` — `const SIG_MAX_LEN = 200_000; const CONTENT_MAX_LEN = 2000;` with `ValidationError` on exceed (`:183-194`). Match this pattern.
- Error type: `ValidationError` from `./engine` (already imported in this module). German messages throughout.
- Existing tests: `src/server/appointment-requests.test.ts` (in-memory DB; follow its setup style).

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Tests     | `bun test`          | 556+ pass, 0 fail |
| One file  | `bun test src/server/appointment-requests.test.ts` | all pass |
| Typecheck | `bun run typecheck` | exit 0   |

## Scope

**In scope**:
- `src/server/appointment-requests.ts`
- `src/server/appointment-requests.test.ts`

**Out of scope**:
- `src/Anfrage.tsx` / any frontend (client-side maxLength is cosmetic; server-side is the contract).
- Any other route module; no shared middleware layer — keep the limiter local to this module.
- CAPTCHA/email verification — deferred to the SaaS work.

## Git workflow

- Branch: `advisor/029-public-intake-hardening`
- Commits: title-only, e.g. `appointment-requests: length caps on free-text fields`, `appointment-requests: per-IP rate limit on public create`.

## Steps

### Step 1: length caps in `normalize()`

Add module constants near the top of the validation section:

```ts
const NAME_MAX_LEN = 200;
const PHONE_MAX_LEN = 50;
const EMAIL_MAX_LEN = 254;
const MESSAGE_MAX_LEN = 2000;
```

In `normalize()`, after the existing per-field handling, enforce each cap with a German `ValidationError`, e.g.
`throw new ValidationError("Feld 'message' darf maximal 2000 Zeichen lang sein.")`.
Also reject `email` values longer than 0 chars that don't match a minimal
`/^\S+@\S+\.\S+$/` pattern (empty email stays allowed — the form treats it as
optional; check the EMPTY default at `:335-344`).

**Verify**: `bun test src/server/appointment-requests.test.ts` → all pass.

### Step 2: per-IP rate limit on the public create endpoint

In the route factory, add a small in-memory limiter applied ONLY to the
public POST-create handler (admin status updates stay unlimited):

```ts
const RATE_LIMIT_MAX = 10;          // requests
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // per hour per IP
const recentByIp = new Map<string, number[]>();
function rateLimited(ip: string, now: number): boolean { /* prune + check + push */ }
```

Get the client IP via Bun's API: route handlers receive `(req, server)`;
use `server.requestIP(req)?.address ?? "unknown"`. If the factory's handler
signatures currently only declare `req`, add the second parameter — Bun
passes it. On limit hit return status 429 with
`{ error: "Zu viele Anfragen. Bitte später erneut versuchen." }`.

To keep tests deterministic, make the limiter injectable: the route factory
takes an optional options argument `{ rateLimit?: { max: number; windowMs: number } | false }`
defaulting to the constants; tests pass small values or `false`. Keep the
default export signature backward-compatible (existing callers in
`app-routes.ts` must not need changes).

**Verify**: `bun test` → all pass; `bun run typecheck` → exit 0.

## Test plan

In `src/server/appointment-requests.test.ts`, following its existing patterns:

- `message` of 2001 chars → `ValidationError` (and 2000 chars passes).
- `email` `"not-an-email"` → `ValidationError`; empty email → ok.
- `phone`/`name` over cap → `ValidationError`.
- Rate limit: construct the routes with `{ rateLimit: { max: 2, windowMs: 60_000 } }`, fire 3 POSTs from the test server, third returns 429. If the test file does not already spin up `Bun.serve`, test the limiter helper function directly instead (export it for tests) and assert the 429 path via one served request — choose whichever matches the file's existing style; do not introduce a new test harness.

## Done criteria

- [ ] `bun test` exits 0 with new cap + limiter tests
- [ ] `bun run typecheck` exits 0
- [ ] `git status` shows only the two in-scope files modified
- [ ] POST-create returns 429 after the configured limit; status-update routes are unaffected

## STOP conditions

- `normalize()` or the route factory doesn't match the excerpts (drift).
- `server.requestIP` is unavailable in the handler signature actually used by this repo's route tables — report what the signature is instead of inventing a workaround.
- Making the limiter testable requires changing `app-routes.ts`'s call signature.

## Maintenance notes

- The limiter is in-memory and per-process — correct for the current single-process deployment; the SaaS/tenancy work must replace it with something shared if the server is ever load-balanced.
- Reviewer: confirm the 429 path is only on the public create, not the admin PATCH/status routes.
