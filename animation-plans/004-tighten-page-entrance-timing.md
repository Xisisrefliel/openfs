# 004 — Tighten page entrance timing

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, about 25 lines

## Problem

The settled page-reveal convention exceeds the dashboard's motion budget. A normal entrance lasts 420ms, and the eighth staggered child finishes 810ms after mount.

```css
/* src/index.css:165-166 — current */
.animate-enter {
  animation: enter-up 0.42s var(--ease-snappy) both;
}
```

```css
/* src/index.css:193-218 — current */
.stagger-in > * { animation: enter-up 0.42s var(--ease-snappy) both; }
/* delays rise from 40ms through 390ms */
```

## Target

- `.animate-enter`: `220ms var(--ease-snappy)`.
- `.stagger-in > *`: `180ms var(--ease-snappy)`.
- Child delays: first `0ms`, second `30ms`, third `60ms`, fourth `90ms`, fifth `120ms`, and every child from sixth onward capped at `120ms`.
- The final child therefore finishes no later than 300ms.
- Keep the existing `translateY(10px)` and opacity endpoints and the existing reduced-motion behavior.

## Repo conventions to follow

- Motion tokens live in `@theme` in `src/index.css`.
- Use existing `--ease-snappy: cubic-bezier(0.23, 1, 0.32, 1)`.
- `design-guideline.md:90-92` explicitly preserves one orchestrated page reveal and reduced-motion support.

## Steps

1. In `src/index.css`, change `.animate-enter` from `0.42s` to `220ms`.
2. Change `.stagger-in > *` from `0.42s` to `180ms`.
3. Replace the eight current delay rules with the exact capped sequence in Target. A grouped selector for children 6–8 is acceptable.
4. Keep keyframe geometry and reduced-motion selectors unchanged.

## Boundaries

- Do NOT remove page entrances; they are a documented design decision.
- Do NOT change which pages use `animate-enter` or `stagger-in`.
- Do NOT alter keyframe distance or opacity.
- Do NOT add dependencies.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: navigate among Dashboard, Profil, Buchhaltung, and Fahrzeuge. Content should settle promptly without looking like it teleports. On an eight-child form, no child may still be moving after 300ms.
- At 10% playback speed, verify stagger order remains legible and sixth through eighth children share the 120ms cap.
- Enable reduced motion and confirm entrances remain disabled.
- **Done when**: normal entrances finish in 220ms and every stagger group finishes within 300ms.
