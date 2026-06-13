# Plan 033: Remove dead dependencies and their orphaned UI wrappers

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- package.json src/components/ui/`
> On any change, re-run the import greps in "Current state" before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt / deps
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Seven entries in `package.json` ship zero app code: five packages whose only
importers are generated shadcn wrapper files that nothing imports
(`embla-carousel-react`, `vaul`, `cmdk`, `input-otp`,
`react-resizable-panels`), one with no importer at all (`next-themes`), and
one redundant direct entry (`date-fns` — required transitively by
`react-day-picker` regardless). The `shadcn` CLI also sits in runtime
`dependencies` though it is a dev tool. The manifest should tell the truth.

## Current state

- `package.json` dependencies include: `embla-carousel-react ^8.6.0`, `vaul ^1.1.2`, `cmdk ^1.1.1`, `input-otp ^1.4.2`, `react-resizable-panels ^4.11.2`, `next-themes ^0.4.6`, `date-fns ^4.4.0`, `shadcn ^4.11.0`.
- Verified import graph (re-verify yourself in step 1):
  - `embla-carousel-react` → only `src/components/ui/carousel.tsx`; `carousel.tsx` has zero importers.
  - `vaul` → only `src/components/ui/drawer.tsx`; zero importers.
  - `cmdk` → only `src/components/ui/command.tsx`; zero importers.
  - `input-otp` → only `src/components/ui/input-otp.tsx`; zero importers.
  - `react-resizable-panels` → only `src/components/ui/resizable.tsx`; zero importers.
  - `next-themes` → zero imports anywhere in `src/`.
  - `date-fns` → zero direct imports in `src/` (outside `components/ui`); `bun.lock` line ~768 shows `react-day-picker@10.0.1` declares `date-fns ^4.1.0` as a hard dependency, so it remains installed transitively.
  - `shadcn` → no code imports; `src/index.css:3` has `@import "shadcn/tailwind.css";` which is resolved at **build/dev time** by the bundler (the package must be installed, but `devDependencies` suffices since this app is never installed with `--production`; `bun run build` pre-bundles CSS into `dist/`).
- Removing a package whose wrapper file imports it would break `bun run typecheck` — so the orphaned wrapper files must be deleted in the same change.
- A previous audit note ("unused ui/ components are tree-shaken — leave them") applied to deleting wrapper *files for tidiness alone*; it does not conflict with removing them together with their packages.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0, lockfile updated |
| Tests     | `bun test`          | 556+ pass, 0 fail |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |
| Dev smoke | `bun run dev` (briefly) | serves on :3000 without import errors |

## Scope

**In scope**:
- `package.json`, `bun.lock`
- Delete: `src/components/ui/carousel.tsx`, `drawer.tsx`, `command.tsx`, `input-otp.tsx`, `resizable.tsx`

**Out of scope**:
- Any other file in `src/components/ui/` (in particular `sidebar.tsx`, `sheet.tsx`, `calendar.tsx`, `chart.tsx` — they wrap packages that stay).
- `recharts` version pin, `radix-ui`/`@base-ui/react` duality — explicitly considered and left alone.
- `src/index.css` — the shadcn @import stays.

## Git workflow

- Branch: `advisor/033-dependency-cleanup`
- Commits: title-only, e.g. `deps: drop six unused packages + orphaned ui wrappers`, `deps: move shadcn to devDependencies`.

## Steps

### Step 1: re-verify the import graph

For each package P in the removal list run
`grep -rn "from \"P\"\|from 'P'" src/ --include="*.ts*"` and for each
wrapper W run `grep -rln "components/ui/W" src/`. Expected: matches only as
described in Current state. If ANY new importer exists, exclude that
package+wrapper from removal and note it.

### Step 2: edit `package.json`

Remove from `dependencies`: `embla-carousel-react`, `vaul`, `cmdk`,
`input-otp`, `react-resizable-panels`, `next-themes`, `date-fns`. Move
`shadcn` to `devDependencies`. Delete the five wrapper files. Run
`bun install` (updates `bun.lock`).

**Verify**: `bun install` → exit 0.

### Step 3: gates

**Verify**: `bun run typecheck` → 0; `bun test` → all pass; `bun run build` → 0. Start `bun run dev`, curl `http://localhost:3000/` → 200, then stop it.

## Test plan

No new tests — the four gates plus the dev-server smoke are the verification.

## Done criteria

- [ ] All four gates green, dev server serves
- [ ] `grep -c "embla-carousel-react\|\"vaul\"\|\"cmdk\"\|input-otp\|react-resizable-panels\|next-themes\|\"date-fns\"" package.json` → 0
- [ ] `shadcn` appears under devDependencies only
- [ ] The five wrapper files are gone; no other `src/components/ui/` file changed
- [ ] `git status` shows only in-scope files

## STOP conditions

- Step 1 finds an unexpected importer.
- `bun run build` fails resolving `shadcn/tailwind.css` after the devDeps move (would falsify the build-time-resolution assumption — report, do not vendor the CSS without instruction).
- Typecheck errors in files outside the five deleted wrappers.

## Maintenance notes

- If a carousel/drawer/command-palette/OTP/resizable component is ever needed, re-add the package and regenerate the wrapper via the shadcn CLI (`bunx shadcn add <component>` — the vite.config.ts shim exists for exactly this).
- `recharts` stays pinned at exactly `3.8.0` (no documented reason found; left as-is deliberately — relax only with a verified test pass).
