# 006 — Tokenize overlay easing

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Easing & cohesion
- **Estimated scope**: 3 files, under 15 lines

## Problem

Core overlays omit the app's strong UI curve, while the mobile sheet uses built-in `ease-in-out` instead of the established drawer curve.

```tsx
// src/components/ui/dialog.tsx:58 — current
"... duration-100 ... data-open:animate-in ... data-closed:animate-out ..."
```

```tsx
// src/components/ui/dropdown-menu.tsx:40 — current
"... duration-100 ... data-open:animate-in ... data-closed:animate-out ..."
```

```tsx
// src/components/ui/sheet.tsx:57 — current
"... transition duration-200 ease-in-out ..."
```

Without an explicit animation timing function, CSS animations use the built-in `ease` curve.

## Target

- Dialog overlay and content: `200ms var(--ease-snappy)`.
- Dropdown content and sub-content: `150ms var(--ease-snappy)`.
- Sheet overlay: `200ms var(--ease-snappy)`.
- Sheet content: `200ms var(--ease-drawer)`.
- `--ease-snappy` remains `cubic-bezier(0.23, 1, 0.32, 1)`.
- `--ease-drawer` remains `cubic-bezier(0.32, 0.72, 0, 1)`.

Use Tailwind's existing `ease-snappy` and `ease-drawer` token utilities; do not hard-code cubic-beziers in components.

## Repo conventions to follow

- Tokens are defined in `src/index.css:62-66` and exposed through Tailwind `@theme`.
- `src/App.tsx:386` already uses `duration-300 ease-drawer` for drawer-like movement.
- Reduced-motion movement overrides are owned by plan 005 and must remain intact.

## Steps

1. Execute plan 005 first or preserve its changes if already present.
2. In `src/components/ui/dialog.tsx`, change both overlay and content to `duration-200 ease-snappy`.
3. In `src/components/ui/dropdown-menu.tsx`, change root and sub-content to `duration-150 ease-snappy`.
4. In `src/components/ui/sheet.tsx`, set overlay to `duration-200 ease-snappy` and content to `duration-200 ease-drawer`, replacing built-in `ease-in-out`.
5. Do not alter transform origins, offsets, scale endpoints, or opacity endpoints.

## Boundaries

- Depends on plan 005; do not discard reduced-motion variants.
- Do NOT modify other primitives in this plan.
- Do NOT add or rename motion tokens.
- Do NOT change component APIs or markup.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: dialogs should begin immediately and settle cleanly within 200ms; dropdowns should feel faster at 150ms; the mobile sidebar should use a fast-out drawer settle rather than symmetric easing.
- At 10% playback speed, confirm the mobile sheet moves furthest early and settles gently, while menu and dialog motion never starts sluggishly.
- With reduced motion enabled, confirm plan 005 behavior still removes movement but preserves fades.
- **Done when**: these overlays use only repository motion tokens and the exact target durations.
