# Plan 024: Public appointment-request form (/anfrage) — students submit, school triages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/appointment-requests.ts src/App.tsx src/index.ts`
> On drift, compare excerpts below; mismatch = STOP. KNOWN: `src/App.tsx` has
> uncommitted changes in the maintainer's working tree — your change to it is
> ONE route line + one import; keep it minimal to ease the later merge.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

The Terminanfragen module is a complete, tested triage pipeline — list,
accept (creates a calendar event in one transaction), decline — but nothing
feeds it: there is no page where a student or prospect can actually submit a
request; the admin would have to type requests in on their behalf. This plan
adds the missing entry point: a public, unauthenticated form page at
`/anfrage` posting to the existing `POST /api/appointment-requests`. It is the
first student-facing surface and the seed of the Phase-2 booking flow.

## Current state

- `src/server/appointment-requests.ts` — `createAppointmentRequest`
  (lines 402–427) validates via `normalize` and inserts name/phone/email/
  message/requested_date/requested_time/type/status. The route factory
  `appointmentRequestRoutes` (line 545) already exposes POST. Read `normalize`
  to learn the exact required fields and formats BEFORE building the form
  (status defaults to "offen"; clients must NOT set status — verify whether
  normalize accepts it and, if it does, do NOT send it from the form).
- `src/Terminanfragen.tsx` — the admin triage page; unchanged here, but reuse
  its German wording for types (e.g. request type values — read the
  `AppointmentRequest` type at appointment-requests.ts:32-45).
- Routing: `src/App.tsx` maps paths to pages in a ternary chain
  (lines 382–431, `path === "/terminanfragen" ? <Terminanfragen/> : …`) and
  pages are listed in the sidebar nav array (~lines 100–131). The new page
  gets a route BUT NOT a sidebar entry (it is the public form, not an admin
  page). The page itself must not render the admin sidebar chrome — check how
  App.tsx wraps routed pages: if every route renders inside the sidebar
  layout, render /anfrage BEFORE/OUTSIDE that wrapper (a separate early
  return on `path === "/anfrage"`), matching how the app handles… nothing
  else today — you are the first chrome-less page; keep it a clean early
  return.
- Server: `src/index.ts` serves the SPA for all unmatched routes
  (`"/*": index`) — /anfrage needs no server change.
- Form-page conventions: `design-guideline.md` §4 "Form page" — but that
  archetype assumes admin chrome. For the public page: centered single column
  (`max-w-md`), the existing Card/Input/Select/Button/Textarea shadcn
  components (`src/components/ui/`), school name from `useSchoolProfile`
  (`src/hooks/use-school-profile.ts`) as the page title, `sonner` toast on
  success + a clear inline confirmation state ("Anfrage gesendet — wir melden
  uns.").

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/Anfrage.tsx` (create — the public form page)
- `src/App.tsx` (ONE early-return route + import, nothing else)
- `src/server/appointment-requests.test.ts` (extend only if the POST route
  lacks a test for the exact payload the form sends)

**Out of scope** (do NOT touch):
- `src/server/appointment-requests.ts` — the API is sufficient as-is. If the
  form needs something the API rejects, STOP (see below).
- Sidebar/nav arrays, `src/Terminanfragen.tsx`, auth/rate-limiting (the whole
  app is local + unauthenticated today; SaaS auth is plan 026's concern),
  email notifications.

## Git workflow

- Branch: `advisor/024-public-anfrage` from `main` (`160eccc`)
- Commits: title-only.
- Do NOT push or open a PR.

## Steps

### Step 1: Read the validation contract

Read `normalize` in appointment-requests.ts and list (in your report) the
fields, formats (date/time regexes), and which are required vs. defaulted.

**Verify**: `bun test src/server/appointment-requests.test.ts` → pass
(baseline).

### Step 2: Build src/Anfrage.tsx

Fields: Name*, Telefon, E-Mail, Terminart (Select over the API's type
values), Wunschdatum* (date input, ISO), Wunschzeit* (time input HH:MM),
Nachricht (Textarea). Client-side required checks mirror the server's; submit
POSTs JSON to `/api/appointment-requests` with `parseOrThrow`-style res.ok
handling (see `src/lib/api.ts` helpers — use them). Success → swap form for
the confirmation state; failure → toast with the server's German error.
No admin chrome; school name + address from `useSchoolProfile` in the header.

**Verify**: `bun run typecheck` && `bun run build` → exit 0.

### Step 3: Route it

In App.tsx, before the sidebar-layout return, early-return `<Anfrage />` when
`path === "/anfrage"`. One import. Nothing else in the file.

**Verify**: `bun run build` → exit 0; `git diff --stat -- src/App.tsx` shows a
minimal diff (≤ ~6 lines).

## Test plan

Server behavior already tested; add one test only if the form's exact payload
shape (omitting status, optional fields empty) lacks coverage. Frontend: no
DOM tests (repo convention); report a manual walkthrough.

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0; `bun run build` exits 0
- [ ] `src/Anfrage.tsx` exists; `grep -n "anfrage" src/App.tsx` shows the early return
- [ ] The form never sends a `status` field (grep the page)
- [ ] App.tsx diff ≤ ~6 lines
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- The POST route requires fields a public user cannot sensibly provide, or
  rejects the form's payload in a way only an API change could fix — stop and
  report; appointment-requests.ts is out of scope.
- App.tsx's structure (post-design-refresh) has no clean early-return seam —
  report the structure you find rather than restructuring the router.

## Maintenance notes

- When SaaS tenancy lands, /anfrage becomes the per-school public booking
  URL — keep it dependency-light.
- A follow-up may add an unread-Terminanfragen badge in the sidebar; the
  admin page already polls its hook.
- Reviewer: confirm the page is reachable without the admin layout and that
  direct navigation (hard reload on /anfrage) works — the server serves the
  SPA for all paths, so it should.
