# 007 — Make sidebar disclosure retargetable

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: MEDIUM
- **Category**: Interruptibility
- **Estimated scope**: 2 files, about 20 lines removed and 10 changed

## Problem

Sidebar groups use separate opening and closing keyframes. Reversing a disclosure mid-flight restarts from an endpoint instead of retargeting from its current visual state.

```tsx
// src/App.tsx:252-255 — current
<ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-sidebar-sub-close data-[state=open]:animate-sidebar-sub-open">
```

```css
/* src/index.css:171-190 — current */
@keyframes sidebar-sub-open { from { height: 0; opacity: 0; } to { height: var(--radix-collapsible-content-height); opacity: 1; } }
@keyframes sidebar-sub-close { from { height: var(--radix-collapsible-content-height); opacity: 1; } to { height: 0; opacity: 0; } }
```

## Target

Use a retargetable CSS transition with the grid-row intrinsic-height pattern:

```tsx
<CollapsibleContent className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-drawer data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 motion-reduce:transition-none">
  <SidebarMenuSub className="min-h-0 overflow-hidden">...</SidebarMenuSub>
</CollapsibleContent>
```

The chevron uses `transition-transform duration-200 ease-drawer motion-reduce:transition-none`. Rapid reversal must continue from the current computed row fraction and opacity.

## Repo conventions to follow

- Preserve the existing 200ms synchronization documented at `src/index.css:68-71`.
- Use `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`.
- Existing reduced-motion policy makes disclosure state changes immediate.

## Steps

1. In `src/App.tsx`, replace open/close animation utilities on `CollapsibleContent` with the exact grid-row and opacity transition described in Target.
2. Add `min-h-0 overflow-hidden` to the direct `SidebarMenuSub` child so `0fr` can collapse.
3. Add `ease-drawer motion-reduce:transition-none` to the chevron transition.
4. In `src/index.css`, remove `--animate-sidebar-sub-open`, `--animate-sidebar-sub-close`, both sidebar disclosure keyframes, and the now-obsolete reduced-motion selector/comment for `[data-slot="collapsible-content"]` if no other collapsible animation relies on it.
5. Confirm there are no remaining references to `animate-sidebar-sub-open` or `animate-sidebar-sub-close`.

## Boundaries

- Do NOT remove disclosure animation for pointer users.
- Do NOT change default-open state, group content, navigation, or chevron angle.
- Do NOT apply this pattern to the separate Accordion primitive.
- Do NOT add dependencies.
- If `SidebarMenuSub` cannot accept `className`, STOP and report rather than adding wrappers without review.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0. Search for `animate-sidebar-sub-` and expect zero matches.
- **Feel check**: click a sidebar group repeatedly before each 200ms transition completes. Height, opacity, and chevron must reverse from their current positions with no jump or restart flash.
- At 10% playback speed, confirm content clips cleanly and the chevron finishes with the panel.
- Enable reduced motion and confirm disclosure and chevron changes are immediate.
- **Done when**: disclosure reversal is continuous and no sidebar disclosure keyframes remain.
