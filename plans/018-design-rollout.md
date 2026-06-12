# Plan 018: Design-system rollout — migrate the remaining pages to the guideline archetypes

> **Executor instructions**: Follow this plan step by step. This plan is a
> PER-PAGE CHECKLIST; execute pages in the order given, one commit per page.
> Run every verification command per page. If anything in the "STOP
> conditions" section occurs, stop and report — do not improvise. When done,
> update the status row in `plans/README.md` — unless a reviewer dispatched
> you and told you they maintain the index.
>
> **BLOCKED until the design refresh is committed.** The reference
> implementations (Profil, NeueSchueler, Dashboard, Theorie, FormSection,
> index.css tokens) live as uncommitted changes in the maintainer's tree.
> Execute ONLY from a base commit containing them (dispatcher confirms).
>
> **Read first, in order**: `design-guideline.md` (the rules — §4 archetypes
> and §5 don'ts are binding), then the four reference pages listed there as
> Done (`src/Profil.tsx`, `src/NeueSchueler.tsx`, `src/Dashboard.tsx`,
> `src/Theorie.tsx`), then `src/components/FormSection.tsx` and
> `src/components/PageHeader.tsx`.

## Status

- **Priority**: P2
- **Effort**: L (mechanical per page; ~14 pages)
- **Risk**: MED (broad UI surface; no DOM tests — regressions are visual)
- **Depends on**: design-refresh commit; 017 recommended first (App.tsx quiets down)
- **Category**: tech-debt / dx
- **Planned at**: working tree over `160eccc`, 2026-06-12 (re-stamp at execution)

## Why this matters

design-guideline.md §6 lists the rollout as half done: tokens + four pages
follow the "quiet craft" system; ~14 pages still hand-roll diverging tables,
dialogs, filled status pills, and per-page spacing. Every un-migrated page
weakens the system ("if a styling choice draws attention to itself, it's
probably wrong") and duplicates scaffolding that FormSection/PageHeader now
own.

## Page order (one commit each, easiest archetype-fit first)

Table pages (archetype: `Theorie.tsx`): 1. `src/Fahrlehrer.tsx`
2. `src/Fahrzeuge.tsx` 3. `src/Fahrschueler.tsx` 4. `src/Vertraege.tsx`
5. `src/Bewertungen.tsx` 6. `src/Terminanfragen.tsx` 7. `src/TheorieGruppen.tsx`
8. `src/Archiv.tsx`
Dashboard-ish (archetype: `Dashboard.tsx`): 9. `src/Statistik.tsx`
10. `src/Marketing.tsx` 11. `src/Pruefungsplaner.tsx`
Form pages (archetype: `Profil.tsx` + FormSection): 12. `src/Schulprofil.tsx`
13. `src/Preisangebot.tsx`
Special: 14. `src/Plaudern.tsx` (two-pane chat — apply tokens/typography/
density rules only; no archetype force-fit).
EXCLUDED: `src/Kalendar.tsx` and `src/Buchhaltung.tsx` (large bespoke
surfaces — separate plans if ever), `src/FahrschuelerDetail.tsx` and
`src/Fahrschule.tsx` ONLY IF already covered by the refresh commit — check
`git log -1 --stat` and skip what's done.

## Per-page checklist (apply ALL)

1. PageHeader top bar (h-11): filters/actions in `end` slot; title +
   `tabular-nums` live counter left (table pages).
2. Body = one rounded bordered surface; `bg-sidebar` gutter; no nested Cards
   for layout.
3. Status: dot + plain text in outline badge (`size-1.5 rounded-full`,
   `gap-1.5 font-normal`) — NO pastel-filled pills, no per-section accent
   colors, no purple, no gradients (guideline §5).
4. Typography: `text-[15px] font-semibold tracking-[-0.01em]` titles,
   `text-sm` body, `text-[11px] font-medium text-muted-foreground`
   micro-labels, NO uppercase/letterspacing; `tabular-nums` on every dynamic
   number; `font-mono` ONLY for true identifiers (Vertrags-/Kundennummern).
5. Rows 32–40px; entity rows navigate (cursor-pointer, `tabIndex={0}`,
   Enter/Space) with action cells `stopPropagation()`.
6. Hover fills `hover:duration-0` (fade out only); one `stagger-in`/
   `animate-enter` per page; `prefers-reduced-motion` respected (the shared
   CSS already handles it — don't add bespoke animation).
7. Empty states: icon + one muted line, no illustration.
8. Dialogs: keep each page's existing dialog logic; restyle internals only.
   Do NOT extract shared EditDialog/FilterBar components in this plan — that
   abstraction decision belongs to the maintainer after the visual pass
   (explicitly out of scope).

## Commands you will need

| Purpose   | Command              | Expected on success |
|-----------|----------------------|---------------------|
| Install   | `bun install`        | exit 0              |
| Typecheck | `bun run typecheck`  | exit 0              |
| Tests     | `bun test`           | all pass            |
| Build     | `bun run build`      | exit 0 (run per page) |

## Scope

**In scope**: the 14 pages listed; `src/components/PageHeader.tsx` /
`FormSection.tsx` ONLY for additive optional props if a page genuinely needs
one (state it in the report).

**Out of scope**: Kalendar.tsx, Buchhaltung.tsx, index.css tokens (done),
behavior changes of any kind (data flow, handlers, sorting — visual layer
only), new shared abstractions (see checklist item 8).

## Git workflow

- Branch: `advisor/018-design-rollout` from the design-refresh commit.
- One commit per page: "design: <page> auf Guideline-Archetyp" style
  (title-only).
- Do NOT push or open a PR.

## Verification per page

- `bun run typecheck` && `bun run build` → exit 0 after each page.
- Grep the page for violations: `grep -nE "uppercase|tracking-wide(r|st)?|bg-(green|red|amber|purple|violet)-[0-9]+ " src/<Page>.tsx` → no decorative hits
  (semantic dot/text colors with dark: variants are fine).
- In the report, per page: 2–3 lines on what changed structurally.

## Done criteria

- [ ] All 14 pages committed individually; typecheck/test/build green at HEAD
- [ ] design-guideline.md §6 "Pending" list updated to reflect the new state
      (move migrated pages to Done — this file edit is in scope)
- [ ] Zero behavior diffs: `git diff <base> -- src/hooks src/server src/lib` is empty
- [ ] No new shared components created (`git status` shows no new files except none)

## STOP conditions

- A page's migration requires touching its data flow or handlers beyond
  moving JSX — report that page, skip to the next, list it as BLOCKED-page in
  the report.
- The base commit's reference pages contradict design-guideline.md (the
  refresh may have evolved past the doc) — the PAGES win; note the doc drift
  in the report and follow the pages.

## Maintenance notes

- After this lands, the duplication across pages becomes visible enough to
  judge whether a shared `EditDialog`/`FilterBar` is worth it — that is the
  deferred follow-up.
- Reviewer: spot-check 3 pages against the checklist + the §5 don'ts; check
  the per-page report lines against the diffs.
