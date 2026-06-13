# Plan 032: One shared json/err/handle helper set for all server route factories

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/server/`
> This plan deliberately runs AFTER plans 028–031 land, so server files WILL
> have drifted from `2ee4bbe` — that is expected. The real gate: the helper
> excerpts below must still match `src/server/routes.ts`, and `bun test`
> must be green before you start. Run `bun test` first and record the count.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plan 031 (attestation route tests must exist first)
- **Category**: tech-debt
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Ten server modules each define their own private `json()` (and often
`err()`) helper; `routes.ts` additionally has the canonical `handle()`
wrapper that converts `ValidationError` → 400 and everything else → logged
500 "Interner Fehler.". The copies have already diverged (manual
`new Response(JSON.stringify(...))` vs `Response.json`), and the
attestation GET handlers have **no** error wrapping at all — an unexpected
throw there bypasses the repo's error contract. Every future module copies
the boilerplate again. One shared module ends that.

## Current state

- Canonical helpers — `src/server/routes.ts:58-74`:
  ```ts
  function json(data: unknown, status = 200): Response {
    return Response.json(data, { status });
  }
  function handle(fn: () => Response | Promise<Response>) {
    return async () => {
      try {
        return await fn();
      } catch (error) {
        if (error instanceof ValidationError) {
          return json({ error: error.message }, 400);
        }
        console.error(error);
        return json({ error: "Interner Fehler." }, 500);
      }
    };
  }
  ```
- Modules with a private `function json(` (verified by grep): `routes.ts`, `branches.ts`, `appointment-requests.ts`, `campaigns.ts`, `ausbildungsnachweis.ts`, `chat.ts`, `reviews.ts`, `school-profile.ts`, `statistics.ts`, `theory-groups.ts`.
- `src/server/ausbildungsnachweis.ts:222-234` — local `json` (manual Response) + `err`; GET handlers at `:240-262` run unwrapped; POST catches only `ValidationError` and rethrows the rest (also unwrapped beyond that).
- Error contract: 400 body `{ error: <German message> }` for `ValidationError`; 500 body `{ error: "Interner Fehler." }` + `console.error` for everything else. Many modules currently return 404s via their local `err(message, 404)` — that behavior must be preserved.
- `ValidationError` is exported from `src/server/engine.ts`.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Tests     | `bun test`          | same count as your pre-change baseline, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |

## Scope

**In scope**:
- `src/server/http.ts` (create)
- The ten modules listed above (helper replacement + wrapping only — no behavior changes)

**Out of scope**:
- Route key shapes/paths, handler logic, validation rules — nothing observable may change except previously-unwrapped exceptions now returning the standard 500 body.
- `engine.ts`, `db.ts`, any frontend file, any test file except where an error-shape assertion genuinely must follow (report it in NOTES if so).

## Git workflow

- Branch: `advisor/032-http-helper-consolidation`
- Commits: title-only, one commit for `http.ts` + `routes.ts`, then roughly one per migrated module (or small groups) — e.g. `server/http: shared json/err/handle`, `ausbildungsnachweis: shared http helpers + wrapped GETs`.

## Steps

### Step 1: create `src/server/http.ts`

Export `json`, `err`, and `handle` with the exact semantics of the
`routes.ts` versions, with `handle` generalized so handlers that take
arguments keep working:

```ts
import { ValidationError } from "./engine";

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function err(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function handle<A extends unknown[]>(
  fn: (...args: A) => Response | Promise<Response>
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ValidationError) return err(error.message);
      console.error(error);
      return err("Interner Fehler.", 500);
    }
  };
}
```

**Verify**: `bun run typecheck` → exit 0.

### Step 2: migrate `routes.ts`

Replace its local `json`/`handle` with imports from `./http`. No call-site
changes should be needed.

**Verify**: `bun test src/server/routes.test.ts` → all pass.

### Step 3: migrate the other nine modules, one at a time

For each module: delete the local `json`/`err`, import from `./http`, and
wrap every handler that is not already inside `handle()` — including the
ausbildungsnachweis GET handlers. Where a module's local `json` set
explicit headers manually, confirm `Response.json` is equivalent
(Content-Type: application/json is set by both). Run that module's test
file after each migration before moving to the next.

**Verify** (after each module): `bun test src/server/<module>.test.ts` → all pass.

### Step 4: full gates

**Verify**: `bun test` → baseline count, 0 fail; `bun run typecheck` → 0; `bun run build` → 0; `grep -rn "function json(" src/server/ | grep -v http.ts | grep -v test` → no matches.

## Test plan

No new tests required — plans 004/016/031 supply the coverage; the suite
passing unchanged IS the verification. If you find a handler whose error
shape was observably different before (e.g. returned a bare 500 with no
JSON body) note it in NOTES; the new standard shape is the intended fix.

## Done criteria

- [ ] `bun test` exits 0 at the pre-change count
- [ ] `bun run typecheck` and `bun run build` exit 0
- [ ] `grep -rn "function json(" src/server/ | grep -v "http.ts" | grep -v ".test."` → empty
- [ ] Every route handler in the ten modules is wrapped by `handle()` or returns only via `json`/`err` with its own try/catch (spot-check: no bare `throw` can escape a handler)
- [ ] `git status` shows only in-scope files

## STOP conditions

- `bun test` is not green BEFORE you start (baseline broken — report, don't fix).
- A module's tests assert an error shape the shared helpers change and the fix would require touching handler logic (not just the helper swap).
- You find a handler whose signature Bun calls with arguments `handle()` cannot pass through after the generalization in step 1.

## Maintenance notes

- New route factories must import from `./http` — a future lint rule (plan 038's Biome setup) could ban local `function json(` in `src/server/`.
- The user's uncommitted working-tree refactor of `ausbildungsnachweis.ts` (flat → nested route keys) overlaps this file; the reviewer will reconcile at integration time.
