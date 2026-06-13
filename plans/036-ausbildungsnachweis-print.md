# Plan 036: Printable cumulative Ausbildungsnachweis per student

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> any STOP condition occurs, stop and report. Your reviewer maintains
> `plans/README.md` — do not edit it.
>
> **Drift check (run first)**: `git diff --stat 2ee4bbe..HEAD -- src/components/fahrschueler/ src/components/buchhaltung/QuittungDialog.tsx src/index.css src/hooks/use-ausbildungsnachweis.ts`
> Drift in `src/components/fahrschueler/` is EXPECTED (plan 035 lands
> first). Gate: `bun test` green before starting; QuittungDialog's print
> mechanism still matches the excerpt below.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: soft — run after 035 to avoid StundenTab merge conflicts
- **Category**: direction
- **Planned at**: commit `2ee4bbe`, 2026-06-13

## Why this matters

Plan 023 captures per-lesson attestations (content, duration, instructor,
drawn student signature) — but there is no way to produce the artifact
schools actually need: the cumulative, printable Ausbildungsnachweis for a
student (handed to TÜV/DEKRA at exam registration, kept in the compliance
file). All data exists; the print infrastructure exists (Quittungen print
via a hidden portal + `window.print()`). This composes the two.

## Current state

- Data: `GET /api/attestations?studentId=N` → `{ attestations: [...] }`, each `{ id, eventId, studentId, instructor, content, durationMin, signatureDataUrl, signedAt }` (`src/server/ausbildungsnachweis.ts:38-48`). Frontend hook: `src/hooks/use-ausbildungsnachweis.ts`.
- Student fields incl. `licenseDate`, name, birthday, classes: see `src/lib/student-data.ts` and the student prop StundenTab already receives.
- School data (name/address for the letterhead): `src/hooks/use-school-profile.ts` / `src/server/school-profile.ts`.
- Print mechanism — `src/components/buchhaltung/QuittungDialog.tsx:5-7` header comment: renders a preview and "portals a copy into `<div id="print-root">` (outside #root); @media print CSS in index.css hides everything else, so window.print() emits exactly the receipt." Key lines: `:263` `document.getElementById("print-root")`, `:319-333` the portal, `:345` `onClick={() => window.print()}`. **Model the new dialog on this file.**
- Entry point: `src/components/fahrschueler/StundenTab.tsx` already shows the per-lesson Nachweis actions (plan 023 wave: "Nachweis erfassen + view dialogs"); add the cumulative print there.

## Commands you will need

| Purpose   | Command             | Expected |
|-----------|---------------------|----------|
| Install   | `bun install`       | exit 0   |
| Tests     | `bun test`          | green at pre-change count |
| Typecheck | `bun run typecheck` | exit 0   |
| Build     | `bun run build`     | exit 0   |

## Scope

**In scope**:
- `src/components/fahrschueler/AusbildungsnachweisPrintDialog.tsx` (create)
- `src/components/fahrschueler/StundenTab.tsx` (one header action wiring the dialog)
- `src/index.css` ONLY if the print CSS needs a class addition mirroring the Quittung pattern (check whether the existing `@media print` rules are generic to `#print-root` — if so, no CSS change needed)

**Out of scope**:
- Server changes of any kind — the list endpoint suffices.
- PDF generation libraries — browser print only, like Quittungen.
- The per-lesson capture/view dialogs from plan 023.

## Git workflow

- Branch: `advisor/036-nachweis-print`
- Commits: title-only, e.g. `AusbildungsnachweisPrintDialog: cumulative print view`, `StundenTab: Nachweis drucken action`.

## Steps

### Step 1: the dialog

`AusbildungsnachweisPrintDialog` receives the student object and uses the
existing attestations hook. Layout (all German):

- Letterhead: school name/address (school-profile hook), title
  "Ausbildungsnachweis", student block (name, birthday, classes,
  contract number, license date if set).
- Table: one row per attestation, ascending by `signedAt` — date, duration
  (min), instructor, content, and the signature rendered as
  `<img src={signatureDataUrl} ...>` at a small fixed height (~40px).
- Footer: total lessons + total minutes; print date.
- Preview inside the dialog + portal copy into `#print-root` + a
  "Drucken" button calling `window.print()` — copy the structural pattern
  from QuittungDialog verbatim, including how it guards `printRoot` null.

### Step 2: entry point

In StundenTab, add a header-level action "Ausbildungsnachweis drucken"
(near the existing Nachweis actions), enabled when the student has ≥ 1
attestation; opens the dialog.

**Verify**: `bun run typecheck` → 0; `bun test` → green; `bun run build` → 0.

## Test plan

No DOM tests (repo decision). Backend untouched. Reviewer smoke: seed DB,
create an attestation, print-preview shows letterhead + row + signature
image, `window.print()` preview contains only the document.

## Done criteria

- [ ] `bun test`, `bun run typecheck`, `bun run build` all exit 0
- [ ] New dialog portals into `#print-root` exactly like QuittungDialog
- [ ] All strings German; signature images rendered from stored data-URLs
- [ ] `git status` shows only in-scope files

## STOP conditions

- The `@media print` CSS turns out to be Quittung-specific in a way that
  printing a second document type requires restructuring `index.css`
  beyond adding a parallel class (report the CSS shape instead).
- StundenTab after plan 035 has no stable place for another header action.

## Maintenance notes

- Follow-up explicitly deferred: an official per-Bundesland form layout (the generic table is sufficient for the compliance file; TÜV-specific forms can come from user feedback).
- If attestation volume grows, the dialog should paginate print pages — browsers handle table page breaks; reviewer should check `break-inside` behavior on long tables.
