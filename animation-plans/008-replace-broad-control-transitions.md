# 008 — Replace broad control transitions

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Performance & cohesion
- **Estimated scope**: 4 files, under 15 lines

## Problem

Production controls use `transition-all`, exposing layout, rings, shadows, and future properties to accidental animation.

```ts
// src/components/ui/toggle-variants.ts:4 — current
"... transition-all ..."
```

```tsx
// src/components/ui/switch.tsx:20 — current
"... transition-all ..."
```

```tsx
// src/Profil.tsx:698 — current
"... transition-all active:scale-[0.99]"
```

```tsx
// src/components/ui/progress.tsx:24-25 — current
className="size-full flex-1 bg-primary transition-all"
style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
```

## Target

- Toggle: `transition-[color,background-color,border-color,box-shadow] duration-150 ease-snappy`.
- Switch root: `transition-[background-color,border-color,box-shadow] duration-150 ease-snappy`.
- Switch thumb: `transition-transform duration-150 ease-fluid motion-reduce:transition-none`.
- Profil payment method: `transition-[background-color,border-color,transform] duration-150 ease-snappy hover:duration-0 active:duration-150 motion-reduce:active:scale-100`.
- Progress indicator: `transition-transform duration-250 ease-fluid motion-reduce:transition-none`.

`--ease-snappy` is `cubic-bezier(0.23, 1, 0.32, 1)` and `--ease-fluid` is `cubic-bezier(0.77, 0, 0.175, 1)`.

## Repo conventions to follow

- `design-guideline.md:86-88` requires specific transition properties and the existing easing tokens.
- `src/Dashboard.tsx:421` demonstrates instant hover-in with `hover:duration-0`.
- Use movement easing for on-screen thumb/progress motion and snappy easing for paint/state response.

## Steps

1. Replace `transition-all` in `src/components/ui/toggle-variants.ts` with the exact target property list, duration, and easing.
2. Replace `transition-all` on the switch root and add exact duration/easing/reduced-motion behavior to its thumb.
3. Replace `transition-all` on payment method buttons in `src/Profil.tsx`, preserving `scale(0.99)` for normal motion and making hover-in instant.
4. Replace `transition-all` on `ProgressPrimitive.Indicator` with the target transform-only transition.
5. Search these four files for `transition-all`; expect zero remaining matches.

## Boundaries

- Do NOT modify colors, dimensions, state logic, values, or component APIs.
- Do NOT include unused primitives or unrelated `transition-all` occurrences in this plan.
- Do NOT change the progress transform calculation.
- Do NOT add dependencies.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: operate filter toggles, switches, profile payment methods, and live progress displays. Paint changes should be crisp; thumb and progress movement should remain smooth; no control should animate size or spacing.
- At 10% playback speed, inspect computed transition-property and confirm each matches Target exactly.
- Enable reduced motion: switch/progress movement and payment scale must stop, while color/state feedback remains.
- **Done when**: the four production paths contain no `transition-all` and only intended properties animate.
