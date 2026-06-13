# Plan 023: Digital Ausbildungsnachweis MVP — per-lesson attestation with signature

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 160eccc..HEAD -- src/server/calendar-events.ts src/components/fahrschueler/StundenTab.tsx`
> This plan assumes plan 019 has landed on your base branch
> (`calendar_events.student_id` exists). If absent: STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (new table + canvas component; no engine involvement)
- **Depends on**: 019 (student_id on calendar_events)
- **Category**: direction
- **Planned at**: commit `160eccc`, 2026-06-12

## Why this matters

FahrSchAusbO obliges driving schools to document each Fahrstunde
(Ausbildungsnachweis), typically signed by the student. The SaaS plan
(plans/saas-plan.md, Phase 2) calls the digital Ausbildungsnachweis the
feature that makes the product indispensable. This MVP records, per practical
lesson: content notes, duration, and a drawn student signature with timestamp
— stored against the lesson event, viewable in the student's Stunden tab.
Mobile instructor UI comes later; this builds the data model and the desktop
capture flow it will reuse.

## Current state

- After plan 019, `calendar_events` rows carry `student_id` (nullable FK) and
  the Stunden tab matches lessons by it (`src/components/fahrschueler/
  StundenTab.tsx`), with an "Abrechnen" action pattern per event row you can
  mirror for "Nachweis".
- No attestation/signature table exists anywhere
  (`grep -rn "signature\|attest\|nachweis" src/server/` → nothing).
- Storage exemplar for binary-ish payloads: uploaded student documents are
  base64 `dataUrl` strings inside the students.documents JSON
  (`src/lib/student-data.ts:18-26`, `UploadedStudentDocument.dataUrl`). The
  signature follows the same approach (PNG data-URL), but in its own table —
  attestations are per-event records, not per-student blobs.
- Module-owned-table exemplar: `ensureTheoryGroupTables`
  (`src/server/theory-groups.ts:156`) — create table on startup from the
  module, called from `src/index.ts:15`. A new `ausbildungsnachweis.ts`
  module follows this pattern (add its ensure call in `src/index.ts` next to
  `ensureTheoryGroupTables(db)`).
- Route factory exemplar: `theoryGroupRoutes(db)` merged in
  `src/server/app-routes.ts` (buildApiRoutes).
- Dialog/canvas: the repo uses shadcn/radix dialogs everywhere (e.g.
  `src/components/fahrschueler/` tabs). There is NO signature library in
  package.json — implement a minimal `<SignaturePad>` with a raw
  `<canvas>` + pointer events (~60 lines); do NOT add a dependency.

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0              |

## Scope

**In scope**:
- `src/server/ausbildungsnachweis.ts` (create) + `src/server/ausbildungsnachweis.test.ts` (create)
- `src/server/app-routes.ts` (merge the new route factory)
- `src/index.ts` (ensure-tables call)
- `src/components/fahrschueler/StundenTab.tsx` ("Nachweis" action + status)
- `src/components/SignaturePad.tsx` (create)
- `src/hooks/use-ausbildungsnachweis.ts` (create — fetch/save functions)

**Out of scope** (do NOT touch):
- `src/server/engine.ts`, `src/server/db.ts` (table is module-owned),
  `src/Kalendar.tsx`, mobile/responsive instructor view, PDF export of the
  Nachweis (later), qualified e-signature schemes (a drawn signature +
  timestamp is the MVP; legal review is the maintainer's call — note it).

## Git workflow

- Branch: `advisor/023-ausbildungsnachweis` from the branch carrying plan
  019's result (dispatcher names it; default `advisor/019-lesson-billing`).
- Commits: title-only per step.
- Do NOT push or open a PR.

## Steps

### Step 1: Module + table + CRUD

`src/server/ausbildungsnachweis.ts`:

```sql
CREATE TABLE IF NOT EXISTS lesson_attestations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL UNIQUE REFERENCES calendar_events(id),
  student_id INTEGER NOT NULL,
  instructor TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',          -- what was practiced
  duration_min INTEGER NOT NULL,
  signature_data_url TEXT NOT NULL,          -- "data:image/png;base64,..."
  signed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Functions: `ensureAttestationTables(db)`,
`getAttestationForEvent(db, eventId)`, `listAttestationsForStudent(db,
studentId)`, `createAttestation(db, input)` — validation: event exists, is
type "Praktisch", has `student_id` matching input, no attestation yet
(UNIQUE), `duration_min` positive integer, `signature_data_url` starts with
`data:image/png;base64,` and is < 200 KB, content ≤ 2000 chars. Attestations
are immutable: no update; `deleteAttestation` only while... NO — provide no
delete in the MVP (a compliance record; corrections = future concern). Errors
via `ValidationError` from `./engine`.

**Verify**: `bun test src/server/ausbildungsnachweis.test.ts` → pass
(happy; duplicate rejected; wrong event type rejected; student mismatch
rejected; bad data-url rejected).

### Step 2: Routes + wiring

Route factory `attestationRoutes(db)`: `GET /api/attestations?studentId=…`,
`GET /api/calendar-events/:id/attestation`,
`POST /api/calendar-events/:id/attestation`. Merge in app-routes.ts; ensure
call in index.ts after `ensureTheoryGroupTables(db)`.

**Verify**: `bun run typecheck` → exit 0; route test → pass.

### Step 3: SignaturePad

`src/components/SignaturePad.tsx`: canvas with pointer-event drawing
(pointerdown/move/up, `setPointerCapture`), clear button, exposes
`toDataURL()` via ref or callback; fixed aspect (e.g. 3:1), devicePixelRatio-
aware. Hairline border per design-guideline.md; respects dark mode (draw in
`currentColor`-resolved ink, white-ish on dark).

**Verify**: `bun run build` → exit 0.

### Step 4: StundenTab integration

Per practical lesson row: if no attestation → "Nachweis erfassen" action
opening a dialog (content textarea prefilled empty, duration prefilled from
event start/end, the SignaturePad, "Unterschreiben & speichern" disabled until
the canvas has strokes); if attested → quiet "Nachweis ✓ <date>" state opening
a read-only view (content, duration, signature image, signed_at). Disabled
with tooltip when the event has no `studentId`.

**Verify**: `bun run typecheck` && `bun run build` → exit 0.

## Test plan

Server tests per step 1 (≥6). No DOM tests (repo has none — do not add a
framework); describe your manual verification of the pad in the report.

## Done criteria

- [ ] `bun run typecheck` exits 0; `bun test` exits 0; `bun run build` exits 0
- [ ] `grep -n "lesson_attestations" src/server/ausbildungsnachweis.ts` shows DDL
- [ ] No UPDATE/DELETE statements against `lesson_attestations` anywhere:
      `grep -rn "lesson_attestations" src/ | grep -iE "update|delete"` → empty
- [ ] POST a second attestation for the same event → 400 (tested)
- [ ] No new dependency in package.json (`git diff 160eccc -- package.json` empty)
- [ ] No files outside the in-scope list modified (`git status`)

## STOP conditions

- Plan 019's `student_id` column is absent on the base branch.
- The size guard (200 KB) conflicts with real canvas output at reasonable
  resolution — measure and report instead of silently raising the limit.
- StundenTab's row layout cannot fit a second action without redesign —
  report with a proposal (e.g. a row kebab menu) before building it.

## Maintenance notes

- Phase 2 (instructor mobile) reuses table + endpoints; only the capture UI
  moves.
- Immutability is deliberate (compliance record). If corrections become
  needed, follow the engine's Storno philosophy: supersede, don't edit.
- Reviewer: check the data-url validation actually bounds size (base64 length
  check), and that `signed_at` comes from the DB default, not the client.
