# 009 — Tighten tab content fades

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Easing & frequency
- **Estimated scope**: 1 file, under 10 lines

## Problem

Repeated accounting and student-detail tab changes use a 300ms bare `ease` fade rather than the repository's strong UI curve.

```css
/* src/index.css:136-150 — current */
@keyframes agenda-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-agenda-fade {
  animation: agenda-fade-in 0.3s ease both;
}
```

The class remounts on each tab change at `src/Buchhaltung.tsx:1051` and `src/FahrschuelerDetail.tsx:236`.

## Target

Normal motion:

```css
.animate-agenda-fade {
  animation: agenda-fade-in 150ms var(--ease-snappy) both;
}
```

Reduced motion retains an opacity-only explanatory fade using the audit catalog's exact reduced-motion example timing:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-agenda-fade {
    animation: agenda-fade-in 0.2s ease both;
  }
}
```

Remove `.animate-agenda-fade` from the selector group that currently sets `animation: none` under reduced motion.

## Repo conventions to follow

- Keep the existing opacity-only keyframes; no spatial direction is implied by these tabs.
- `--ease-snappy` is `cubic-bezier(0.23, 1, 0.32, 1)` in `src/index.css:63`.
- Reduced motion means gentler feedback, not necessarily no opacity feedback.

## Steps

1. In `src/index.css`, change `.animate-agenda-fade` to `150ms var(--ease-snappy)`.
2. Remove `.animate-agenda-fade` from the reduced-motion `animation: none` group.
3. Add the exact reduced-motion override from Target within the existing media query.
4. Do not change usages in Buchhaltung, FahrschuelerDetail, or Dashboard.

## Boundaries

- Do NOT add translate, scale, blur, or directional motion to tab changes.
- Do NOT alter tab state, markup, or mounting behavior.
- Do NOT change `animate-agenda-row` in this plan.
- Do NOT add dependencies.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: switch accounting and student-detail tabs repeatedly. Content should become readable promptly and never feel delayed by a 300ms wash.
- At 10% playback speed, confirm the fade changes opacity only and uses the strong fast-start curve in normal mode.
- Enable reduced motion and confirm a gentle 200ms opacity fade remains with no movement.
- **Done when**: tab fades use exact target timings and remain opacity-only in both motion modes.
