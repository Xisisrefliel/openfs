# 002 — Make shared hover feedback instant

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 2 files, under 10 lines

## Problem

The most frequently used shared controls fade into hover state, contrary to the product rule that hover-in is instant and only hover-out fades.

```ts
// src/components/ui/button-variants.ts:4 — current
"... transition duration-150 ease-snappy ... active:not-aria-[haspopup]:scale-[0.97] ..."
```

```tsx
// src/components/ui/table.tsx:55 — current
"border-b transition-colors hover:bg-muted/50 ..."
```

The button's generic `transition` also includes more properties than the control intentionally animates.

## Target

- Buttons transition only `color`, `background-color`, `border-color`, `box-shadow`, and `transform` for `150ms` with `var(--ease-snappy)`.
- Button and table-row hover-in color changes use `0ms`; hover-out uses `150ms`.
- Button press scaling remains `scale(0.97)` and receives the normal `150ms` transition even while hovered.

Target utility pattern for rows:

```tsx
"transition-colors duration-150 hover:duration-0 hover:bg-muted/50"
```

For buttons, use explicit transition properties plus `hover:duration-0 active:duration-150`. Verify generated precedence rather than assuming it.

## Repo conventions to follow

- `src/Dashboard.tsx:421` already uses `transition-colors duration-150 hover:duration-0` correctly.
- `--ease-snappy` is `cubic-bezier(0.23, 1, 0.32, 1)` in `src/index.css:63`.
- Keep the shared active scale from `src/components/ui/button-variants.ts:4`.

## Steps

1. In `src/components/ui/button-variants.ts`, replace generic `transition` with `transition-[color,background-color,border-color,box-shadow,transform]`.
2. Add instant hover-in and restore `duration-150` for active press feedback. If Tailwind variant order makes `hover:duration-0` override active duration, use an explicit arbitrary transition declaration that assigns `150ms` to transform and `0ms` to paint properties on hover.
3. In `src/components/ui/table.tsx`, add `duration-150 hover:duration-0` to `TableRow`.
4. Do not alter variant colors or selected/expanded states.

## Boundaries

- Do NOT remove button press feedback.
- Do NOT change focus rings, disabled states, colors, or component APIs.
- Do NOT modify one-off page controls in this plan.
- Do NOT add dependencies.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: sweep the pointer rapidly across a toolbar and a dense table. Hover fills must appear immediately and recede over 150ms. Press a hovered button and confirm `scale(0.97)` still eases rather than snapping.
- At 10% playback speed, verify no hover-in tween is visible and hover-out is visible.
- With keyboard focus, rings must behave exactly as before.
- **Done when**: shared hover-in is instant, hover-out remains soft, and button press motion is preserved.
