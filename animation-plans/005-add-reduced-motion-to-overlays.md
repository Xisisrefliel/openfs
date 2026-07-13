# 005 — Add reduced motion to overlays

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 10 shared UI files, about 45 lines

## Problem

Shared floating layers use zoom and directional movement without reduced-motion overrides. The global media query only covers custom page and sidebar selectors.

```tsx
// src/components/ui/dialog.tsx:58 — current
"... data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
```

```tsx
// src/components/ui/dropdown-menu.tsx:40 — current
"... data-[side=bottom]:slide-in-from-top-2 ... data-open:zoom-in-95 ..."
```

```tsx
// src/components/ui/sheet.tsx:57 — current
"... data-[side=right]:data-open:slide-in-from-right-10 ... data-[side=right]:data-closed:slide-out-to-right-10"
```

## Target

Under `prefers-reduced-motion: reduce`, overlays retain opacity animation but use no translate or scale delta:

- open scale: `1` (`zoom-in-100`)
- closed scale: `1` (`zoom-out-100`)
- all open directional offsets: `0` (`slide-in-from-*-0`)
- all closed directional offsets: `0` (`slide-out-to-*-0`)
- opacity fade remains, at no more than `200ms`

Apply `motion-reduce:` state variants directly beside existing movement utilities so each component remains self-contained.

## Repo conventions to follow

- Local `motion-reduce:` utilities are used in `src/Dashboard.tsx:431`, `src/App.tsx:311`, and `src/components/PageHeader.tsx:31`.
- Reduced motion retains useful opacity feedback; do not add `animation: none` to overlays.
- Preserve trigger-relative transform origins already present on popovers and menus.

## Steps

1. Add scale-neutral reduced-motion variants to `src/components/ui/dialog.tsx` and `src/components/ui/alert-dialog.tsx` content. Their overlays are already opacity-only.
2. Add scale-neutral and direction-neutral variants to `src/components/ui/dropdown-menu.tsx`, `select.tsx`, `popover.tsx`, `combobox.tsx`, and `context-menu.tsx` for every side represented in each current class string.
3. Add the same treatment to `tooltip.tsx` and `hover-card.tsx`.
4. In `src/components/ui/sheet.tsx`, neutralize each side's open and closed slide under reduced motion while preserving overlay/content fades.
5. Do not touch `navigation-menu.tsx` unless it has a production import outside its own module at execution time; if it is in use, apply the same zero-translation rule to its 52-unit content movement.

## Boundaries

- Do NOT remove opacity feedback.
- Do NOT change normal-motion durations or easings; plan 006 owns those values.
- Do NOT alter component markup, portals, focus handling, collision behavior, or origins.
- Do NOT add dependencies.
- If a required neutral utility is unavailable in the installed Tailwind/tw-animate version, STOP and report rather than substituting an approximate value.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: with normal motion, open dialogs, dropdowns on each available side, selects, tooltips, popovers, and the mobile sidebar; behavior must be unchanged. Enable reduced motion and repeat: layers may fade, but no edge, trigger, or center movement may occur.
- At 10% playback speed with reduced motion, inspect computed transforms and confirm scale remains 1 and translation remains 0 throughout.
- **Done when**: every production overlay drops positional and scale motion under reduced motion while retaining opacity feedback.
