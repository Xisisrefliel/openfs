# 010 — Reduce continuous loading motion

- **Status**: DONE
- **Commit**: f6d3a99
- **Severity**: LOW
- **Category**: Accessibility
- **Estimated scope**: 3 files, under 10 lines

## Problem

Loading indicators pulse or spin indefinitely under reduced motion.

```tsx
// src/components/ui/skeleton.tsx:7 — current
className={cn("animate-pulse rounded-md bg-muted", className)}
```

```tsx
// src/components/ui/spinner.tsx:9 — current
className={cn("size-4 animate-spin", className)}
```

```tsx
// src/components/ui/sonner.tsx:23 — current
loading: <Loader2Icon className="size-4 animate-spin" />,
```

## Target

- Skeletons remain visible but static under reduced motion: `motion-reduce:animate-none`.
- Shared spinner icons remain visible and retain `role="status"`/labels but stop rotating: `motion-reduce:animate-none`.
- Sonner loading icons stop rotating under reduced motion: `motion-reduce:animate-none`.
- Normal motion remains unchanged.

## Repo conventions to follow

- Use Tailwind's local `motion-reduce:` variant, as in `src/Dashboard.tsx:431`.
- Static shape and semantic status preserve loading feedback without continuous movement.
- Keep all user-visible strings unchanged; the UI is German, but existing accessibility labels are outside this motion-only scope.

## Steps

1. Add `motion-reduce:animate-none` to the shared Skeleton class in `src/components/ui/skeleton.tsx`.
2. Add it to the shared Spinner class in `src/components/ui/spinner.tsx`.
3. Add it to Sonner's loading icon in `src/components/ui/sonner.tsx`.
4. Do not alter animation speed, icon choice, opacity, size, or normal-motion behavior.

## Boundaries

- Do NOT remove loading indicators or status semantics.
- Do NOT change data loading, suspense, toast timing, or skeleton layout.
- Do NOT add dependencies.
- If the cited code has drifted since `f6d3a99`, STOP and report instead of improvising.

## Verification

- **Mechanical**: run `bun run typecheck`, `bun run lint`, and `bun run build`; all must exit 0.
- **Feel check**: in normal mode, skeletons pulse and spinners rotate exactly as before. Enable reduced motion: all remain clearly visible but static, and loading completion still replaces or dismisses them normally.
- Inspect a loading toast and a page-level spinner on a real screen; neither may rotate under reduced motion.
- **Done when**: all three shared loading paths stop continuous movement only for reduced-motion users.
