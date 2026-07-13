# 003 — Make form rail scrubbing direct

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: HIGH
- **Category**: Interruptibility & performance
- **Estimated scope**: 1 file, about 20 lines

## Problem

The form section rail scrolls content instantly during a drag, but its visual highlight trails the pointer through a 200ms transition and animates layout-triggering `height`.

```tsx
// src/components/FormSection.tsx:297-300 — current
if (id && id !== drag.lastId) {
  drag.lastId = id;
  scrollToSection(id, "instant");
}
```

```tsx
// src/components/FormSection.tsx:322-329 — current
<div
  className="... transition-[transform,height] duration-200 ease-out motion-reduce:transition-none"
  style={{
    transform: `translateY(${highlight.top}px)`,
    height: highlight.height,
  }}
/>
```

## Target

Represent highlight position and extent with one compositor property:

```tsx
className="... h-px origin-top transition-transform duration-200 ease-fluid motion-reduce:transition-none"
style={{ transform: `translateY(${highlight.top}px) scaleY(${highlight.height})` }}
```

While `isDragging` is true, replace the transition with `transition-none`. Passive scroll tracking uses `200ms var(--ease-fluid)`, where `--ease-fluid` is `cubic-bezier(0.77, 0, 0.175, 1)`.

## Repo conventions to follow

- Dynamic transform styles already live on this highlight in `src/components/FormSection.tsx:326-329`.
- Use `cn(...)` for conditional Tailwind classes as elsewhere in the component.
- On-screen movement uses `--ease-fluid`; entrance motion uses `--ease-snappy`.

## Steps

1. In `src/components/FormSection.tsx`, make the highlight a one-pixel-high element with `origin-top`.
2. Remove the animated inline `height`; combine `translateY` and `scaleY` in the inline transform string.
3. Change easing from `ease-out` to `ease-fluid` for passive movement.
4. Add `isDragging ? "transition-none" : "transition-transform duration-200 ease-fluid"`, preserving `motion-reduce:transition-none`.
5. Confirm a one-pixel base does not leave a visible seam or distorted large radius. Use a one-pixel radius if necessary; do not reintroduce animated height.

## Boundaries

- Do NOT change scroll-spy selection, drag thresholds, pointer capture, section ordering, or scrolling behavior.
- Do NOT add springs or dependencies.
- Do NOT animate top, height, margin, or padding.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: drag slowly and quickly across rail labels. The highlight must stay directly under the pointer without a 200ms tail. Release, then scroll the form normally and confirm passive highlight changes still interpolate smoothly.
- At 10% speed, confirm drag changes snap to pointer updates while passive changes use one uninterrupted transform transition.
- Enable reduced motion and confirm all highlight changes are immediate.
- **Done when**: drag tracking is direct and the highlight animates only `transform`.
