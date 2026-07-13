# 001 — Make keyboard sidebar toggling instant

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 4 files, about 35 lines

## Problem

`Cmd/Ctrl+B` calls the same animated path as the pointer trigger, so a keyboard action waits on 300ms sidebar, layout-gap, backdrop, and header-spacer transitions.

```tsx
// src/components/ui/sidebar.tsx:89-95 — current
if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
  event.preventDefault();
  toggleSidebar();
}
```

```tsx
// src/components/ui/sidebar.tsx:211,223 — current
"... transition-[width] duration-300 ease-drawer"
"... transition-[left,right,width] duration-300 ease-drawer ..."
```

`src/App.tsx:386` and `src/components/PageHeader.tsx:31` contain matching 300ms transitions. Their synchronization is deliberate and must remain for pointer toggles.

## Target

Pointer toggles continue using `300ms var(--ease-drawer)`. A keyboard toggle applies `transition: none` to all four synchronized surfaces for exactly that state change:

- `sidebar-gap`
- `sidebar-container`
- the ShellControls backdrop in `App.tsx`
- the animated PageHeader spacer

Expose a transient `instantToggle` boolean from `SidebarProvider` through `SidebarContext`, set it before the keyboard state update, and clear it after two `requestAnimationFrame` callbacks so the browser paints the new state without transitions before restoring normal motion.

## Repo conventions to follow

- Sidebar state and keyboard handling already live in `src/components/ui/sidebar.tsx`; keep input-origin state there.
- Existing reduced-motion handling uses `transition-none` on the affected element, for example `src/App.tsx:386`.
- Keep `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` unchanged in `src/index.css:66`.

## Steps

1. In `src/components/ui/sidebar.tsx`, add `instantToggle: boolean` to `SidebarContextProps`, state for it in `SidebarProvider`, and include it in the context value.
2. In the keyboard handler, set `instantToggle` to `true`, call `toggleSidebar()`, then clear it after two animation frames. Store frame IDs and cancel them in effect cleanup.
3. In `Sidebar`, read `instantToggle` and conditionally add `transition-none` to `sidebar-gap` and `sidebar-container`. The conditional class must follow the base transition classes so it wins.
4. In `src/App.tsx`, read `instantToggle` in `ShellControls` and conditionally add `transition-none` to the backdrop at current line 386.
5. In `src/components/PageHeader.tsx`, read `instantToggle` and conditionally add `transition-none` to the spacer at current line 31.
6. Add or update a backend-free unit test only if this repository already has a testable sidebar state helper; do not introduce a DOM test framework.

## Boundaries

- Do NOT remove or alter the documented pointer-driven 300ms sidebar synchronization.
- Do NOT change sidebar dimensions, markup, routes, or the `Cmd/Ctrl+B` binding.
- Do NOT add a dependency or DOM test framework.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: use the pointer trigger and confirm the sidebar, backdrop, page gap, and header spacer still travel together for 300ms. Then press `Cmd/Ctrl+B` and confirm all four surfaces snap in one paint with no delayed header movement. Repeat rapidly and verify no surface gets stuck with transitions disabled.
- In DevTools Animations at 10% speed, keyboard toggles must create no sidebar transition; pointer toggles must still show one synchronized transition.
- With reduced motion enabled, both input methods remain instant.
- **Done when**: keyboard toggles are immediate and pointer behavior is visually unchanged.
