# Plan 011: Make calendar drag/resize smooth and persist the exact final position

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: this plan was written against commit
> `65254af` **plus uncommitted working-tree changes** (the working tree is
> the source of truth; `git diff --stat 65254af..HEAD` will not capture it).
> Instead, verify each "Current state" excerpt below against the live code
> before starting. Line numbers may have shifted slightly — match on code
> content. If an excerpt's code no longer exists in `src/Kalendar.tsx`,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf (plus one correctness fix)
- **Planned at**: commit `65254af` + uncommitted working tree, 2026-06-11

## Why this matters

The week calendar (`/kalendar`) is the app's most interactive surface.
Today, every `pointermove` during an event drag/resize maps the **entire
event array into new React state**, which re-renders the whole Kalendar
page 60–120×/second: the `visibleEvents` filter re-runs, the day headers
and the 7 day columns each re-filter all events with per-event `Date`
allocations (14 full passes total), `layoutDay()` re-sorts and re-packs all
7 columns, and every event card re-renders. That is the app's main FPS
hazard, and it gets worse with every event added.

There is also a correctness bug hiding in the same code: when the drag
ends, the final position is read from a ref that is synced in a
`useEffect` *after* React commits. `pointermove` updates are
continuous-priority in React 19, so a `pointerup` that arrives before the
last move commits silently persists the **previous** position to the DB —
the UI and the DB disagree until the next refetch. A side effect of the
current design is that a plain *click* on an event (no movement) also fires
a pointless PATCH with unchanged values.

After this plan: drag updates are computed by a pure function, stored
synchronously in a ref (no commit-timing dependency), applied to state at
most once per animation frame, and only the day column(s) containing the
dragged event re-render. Drag-end persists the exact final position, and a
click without movement no longer PATCHes.

## Current state

All in `src/Kalendar.tsx` unless noted. Line numbers are from the working
tree on 2026-06-11.

- `src/Kalendar.tsx` — the whole week-calendar page (~1320 lines): grid
  constants, `EventBlock`, `layoutDay`, the `Kalendar` component with drag
  logic and the render of headers + 7 day columns.
- `src/lib/calendar-data.ts` — pure shared types/helpers (`CalEvent`,
  `toISODate`, `toMinutes`, …). `CalEvent.date` is an ISO calendar date
  string like `"2026-06-09"`; `start`/`end` are `"HH:MM"`.
- `src/hooks/use-calendar-events.ts` — fetch layer; `updateCalendarEvent(id,
  partial)` PATCHes `/api/calendar-events/:id`. `refresh` returned by the
  hook is referentially stable (it comes from `useFetchList`'s `useCallback`
  in `src/lib/api.ts:32-44`).
- `src/components/CalendarEventCard.tsx` — presentational card used by
  `EventBlock`; **not** memoized; do not modify it.

### Excerpt 1 — local mirror state and the effect-synced ref (`Kalendar.tsx:512-524`)

```tsx
  // The DB is the system of record; local state mirrors it for the
  // synchronous drag/resize updates and is reconciled on failure.
  const { events: storedEvents, refresh: refreshEvents } = useCalendarEvents();
  const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>([]);
  useEffect(() => {
    setCalendarEvents(storedEvents);
  }, [storedEvents]);
  // Lets the drag-end listener read the latest events without re-running
  // the drag effect on every continuous move.
  const calendarEventsRef = useRef<CalEvent[]>([]);
  useEffect(() => {
    calendarEventsRef.current = calendarEvents;
  }, [calendarEvents]);
```

Keep the `calendarEvents` mirror state (it is what makes drag feedback
synchronous). The `calendarEventsRef` + its sync effect are what this plan
**removes** (used only by `stopDragging`, see Excerpt 3).

### Excerpt 2 — `DragState` and the per-move state update (`Kalendar.tsx:279-292, 590-668`)

```tsx
type DragState = {
  id: string;
  mode: "move";
  duration: number;
  pointerOffsetY: number;
} | {
  id: string;
  mode: "resize-start" | "resize-end";
  /* Minutes between the pointer and the grabbed edge at drag start. ... */
  grabOffsetMinutes: number;
};
```

```tsx
  useEffect(() => {
    if (!dragging) return;

    const updateEventFromPointer = (clientX: number, clientY: number) => {
      const grid = dayGridRef.current;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      const rawPointerMinutes = ...;

      setCalendarEvents(current =>
        current.map(event => {
          if (event.id !== dragging.id) return event;
          // ...computes new {date, start, end} for "move",
          // "resize-start", "resize-end" using clamp/snapMinutes/
          // formatMinutes/toMinutes and dragging.duration /
          // dragging.pointerOffsetY / dragging.grabOffsetMinutes...
        })
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateEventFromPointer(event.clientX, event.clientY);
    };
```

Note: the new position is currently computed *inside* the state updater,
reading the live event. The refactor makes this a pure function of
`(DragState, pointer, rect, weekStart)` by capturing the event's original
`date`/`start`/`end` in `DragState` at drag start.

### Excerpt 3 — stale drag-end persistence (`Kalendar.tsx:669-700`)

```tsx
    const stopDragging = () => {
      // Persist the dragged event's final position. Read from the ref so
      // this listener sees the latest local state without re-subscribing
      // on every move.
      const moved = calendarEventsRef.current.find(
        event => event.id === dragging.id
      );
      if (moved) {
        void updateCalendarEvent(Number(moved.id), {
          date: moved.date,
          start: moved.start,
          end: moved.end,
        }).catch(() => {
          toast.error("Termin konnte nicht gespeichert werden.");
          void refreshEvents();
        });
      }
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging, weekStart, refreshEvents]);
```

This is the stale-persist bug: `calendarEventsRef` is synced after commit,
so the last move may not be in it when `pointerup` fires.

### Excerpt 4 — `layoutDay` (`Kalendar.tsx:360-380`)

```tsx
/* Simple greedy column layout so overlapping events sit side by side. */
function layoutDay(dayEvents: CalEvent[]) {
  const sorted = [...dayEvents].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start)
  );
  const columnEnds: number[] = [];
  const placed = sorted.map(event => { ... });
  const columns = Math.max(1, columnEnds.length);
  return { placed, columns };
}
```

Pure function; only used in `Kalendar.tsx`. This plan moves it to
`src/lib/calendar-data.ts` so it can be unit-tested with `bun test`.

### Excerpt 5 — the 14 per-render passes (`Kalendar.tsx:1139-1143` and `:1254-1259`)

Day headers:

```tsx
                {days.map(day => {
                  const today = isSameDay(day, TODAY);
                  const count = visibleEvents.filter(
                    event => isSameDay(parseISODate(event.date), day)
                  ).length;
```

Day columns:

```tsx
                {days.map(day => {
                  const today = isSameDay(day, TODAY);
                  const dayEvents = visibleEvents.filter(
                    event => isSameDay(parseISODate(event.date), day)
                  );
                  const { placed, columns } = layoutDay(dayEvents);
```

`event.date` is already an ISO string, so `parseISODate` + `isSameDay` per
event per day is pure waste — a single-pass `Map<isoDate, CalEvent[]>`
replaces all 14 passes.

### Excerpt 6 — handlers passed to `EventBlock` (`Kalendar.tsx:730-779, 1280-1292`)

`handleEventDragStart`, `handleEventResizeStart`, `handleEventDelete`,
`handleEventEdit` are plain functions recreated each render and passed to
every `EventBlock`. For the memoized `DayColumn` (Step 5) they must become
`useCallback`s. Their bodies only use stable references: `setDragging`,
`setCalendarEvents`, `setEditingEvent` (state setters), `dayGridRef`
(ref), `refreshEvents` (stable, see above), `toast` /
`deleteCalendarEvent` / `updateCalendarEvent` (module-level).

### Conventions

- Comments are full-sentence, explain *why*, and sit above the code they
  describe — match the density already in `Kalendar.tsx`.
- Self-contained child components that subscribe to their own data to avoid
  page-wide rerenders are an established pattern here — see `WeekScrollbar`
  (`Kalendar.tsx:382-499`) and its header comment. `DayColumn` follows it.
- Tests use `bun:test` — model new tests after `src/lib/money.test.ts`
  (plain `test`/`expect`, German-domain fixtures).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `bun install` | exit 0 (deps already installed; only if needed) |
| Typecheck | `bun run typecheck` | exit 0. **Known pre-existing failures**: if errors appear, run it on a clean checkout first and only treat *new* errors as yours (memory: repo has tsc quirks) |
| Tests | `bun run test` | all pass |
| Dev server | `bun run dev` | prints `🚀 Server running at <url>` (default `http://localhost:3000`) |

## Suggested executor toolkit

- If the `vercel-react-best-practices` or `react-doctor` skill is available,
  consult it when writing the memoization in Step 5 — but this plan's
  instructions win on any conflict.

## Scope

**In scope** (the only files you should modify):
- `src/Kalendar.tsx`
- `src/lib/calendar-data.ts` (move `layoutDay` in, add `groupEventsByDay`)
- `src/lib/calendar-data.test.ts` (create)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch, even though they look related):
- `src/components/CalendarEventCard.tsx` — presentational; memoizing it is
  explicitly deferred (see Maintenance notes).
- `src/hooks/use-calendar-events.ts`, `src/lib/api.ts` — the fetch layer is
  correct; do not add caching or change signatures.
- `src/server/**` — no server changes; the PATCH endpoint already does what
  is needed.
- `src/Dashboard.tsx`, `src/components/fahrschueler/**` — they consume the
  same events hook; nothing here changes the hook's contract.
- The preset-drag ghost flow (`handlePresetPointerDown`,
  `presetDrag` state, `Kalendar.tsx:817-905`) — it updates a small
  dedicated state, is not the jank source, and shares no code with the
  event-drag path.

## Git workflow

- Branch: `advisor/011-calendar-drag-performance` (matches prior advisor
  branches, e.g. `advisor/009-calendar-persistence`).
- Commit per step; message style is a short lowercase summary like the
  repo's `git log` (e.g. `quality of life improvements`) — e.g.
  `calendar: pure drag math + per-frame state updates`.
- Do NOT push or open a PR unless the operator instructed it.
- The working tree may contain uncommitted changes that are NOT yours; do
  not commit files outside the in-scope list.

## Steps

### Step 1: Baseline

Run `bun run test` and `bun run typecheck` before changing anything and
record the results (including any pre-existing typecheck errors — they are
your comparison baseline, see Commands table).

**Verify**: `bun run test` → all pass.

### Step 2: Move `layoutDay` to `calendar-data.ts`, add `groupEventsByDay`, test both

1. Move the `layoutDay` function (Excerpt 4) verbatim from
   `src/Kalendar.tsx` into `src/lib/calendar-data.ts`, `export` it, and
   import it in `Kalendar.tsx` from `@/lib/calendar-data`. (`toMinutes`
   already lives in `calendar-data.ts`.)
2. In `calendar-data.ts`, add and export:

```ts
/* One pass over the (already filtered) events instead of one filter per
   day column + one per day header. Keys are the events' own ISO dates. */
export function groupEventsByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const byDay = new Map<string, CalEvent[]>();
  for (const event of events) {
    const list = byDay.get(event.date);
    if (list) list.push(event);
    else byDay.set(event.date, [event]);
  }
  return byDay;
}
```

3. Create `src/lib/calendar-data.test.ts` (model after
   `src/lib/money.test.ts`) covering:
   - `groupEventsByDay`: empty input → empty map; events on two days group
     correctly and preserve input order within a day.
   - `layoutDay`: non-overlapping events → all `column: 0`, `columns: 1`;
     two overlapping events → columns 0 and 1, `columns: 2`; an event
     starting exactly when another ends reuses column 0; empty input →
     `placed: []`, `columns: 1`.

**Verify**: `bun run test` → all pass including the new file;
`grep -n "function layoutDay" src/Kalendar.tsx` → no matches.

### Step 3: Pure drag math + ref-based result (fixes the stale persist)

1. Extend `DragState` (Excerpt 2) so both variants also carry the event's
   position at drag start:

```tsx
type DragState = {
  id: string;
  /* The event's position when the drag started — drag math is a pure
     function of this + the pointer, so drag-end never depends on React
     having committed the last move (see dragResultRef below). */
  date: string;
  start: string;
  end: string;
} & (
  | { mode: "move"; duration: number; pointerOffsetY: number }
  | { mode: "resize-start" | "resize-end"; grabOffsetMinutes: number }
);
```

2. Update the two places that build a `DragState` to fill the new fields
   from the event being grabbed: `handleEventDragStart`
   (`Kalendar.tsx:730-741`) and `handleEventResizeStart` (`:743-764`).
3. Add a module-level pure function next to `DragState` that reproduces
   the position math currently inside the state updater (Excerpt 2),
   reading the original position from `DragState` instead of from the
   live event:

```tsx
/* Where the dragged event sits for a given pointer position. Pure: reads
   the original position from DragState, so it can run outside React. */
function computeDragPosition(
  dragging: DragState,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  weekStart: Date
): { date: string; start: string; end: string } {
  if (dragging.mode === "move") {
    // day from clientX, startMinutes from clientY - pointerOffsetY,
    // clamped + snapped exactly as in the current updater; end =
    // start + dragging.duration; date = toISODate(addDays(weekStart, day)).
  } else if (dragging.mode === "resize-start") {
    // pointerMinutes = snap(rawPointerMinutes - grabOffsetMinutes);
    // start = clamp(pointerMinutes, START_HOUR*60,
    //               toMinutes(dragging.end) - SNAP_MINUTES);
    // end stays dragging.end; date stays dragging.date.
  } else {
    // mirror image for resize-end: start stays dragging.start.
  }
}
```

   Port the existing clamp/snap expressions **unchanged** — same constants,
   same `rawPointerMinutes` formula. The only substitutions: the live
   event's `start`/`end`/`date` become `dragging.start`/`dragging.end`/
   `dragging.date`.
4. In the drag effect, add `const dragResultRef = useRef<{ date: string;
   start: string; end: string } | null>(null);` at component level, and set
   `dragResultRef.current = null;` as the first line of the effect body
   (a new drag starts with no result yet).
5. Rewrite `updateEventFromPointer` to: compute
   `const next = computeDragPosition(dragging, clientX, clientY, rect, weekStart)`,
   store it **synchronously** in `dragResultRef.current`, then
   `setCalendarEvents(current => current.map(event =>
   event.id === dragging.id ? { ...event, ...next } : event))`.
6. Rewrite `stopDragging` (Excerpt 3): read `dragResultRef.current`; if it
   is `null` (pointer never moved — a plain click), persist nothing; else
   PATCH `updateCalendarEvent(Number(dragging.id), dragResultRef.current)`
   with the existing `.catch(...)` error handling. Keep `setDragging(null)`.
7. Delete `calendarEventsRef` and its sync effect (Excerpt 1, lines
   521-524) — `stopDragging` was its only consumer.

**Verify**: `bun run typecheck` → no new errors vs. Step 1 baseline;
`grep -n "calendarEventsRef" src/Kalendar.tsx` → no matches.

### Step 4: Coalesce drag state updates to one per animation frame

Inside the drag effect (after Step 3 the handler computes into the ref
synchronously, so coalescing the *state* update loses nothing):

```tsx
    // The ref always holds the exact latest position (Step 3); the React
    // state — and with it the whole-page render — updates at most once
    // per frame. pointermove can outpace frames on some browsers/devices.
    let rafId: number | null = null;
    const applyPendingDragResult = () => {
      rafId = null;
      const next = dragResultRef.current;
      if (!next) return;
      setCalendarEvents(current =>
        current.map(event =>
          event.id === dragging.id ? { ...event, ...next } : event
        )
      );
    };
```

- `updateEventFromPointer` becomes: compute + write ref, then
  `if (rafId === null) rafId = requestAnimationFrame(applyPendingDragResult);`
- `stopDragging`: first `if (rafId !== null) cancelAnimationFrame(rafId);`
  then call `applyPendingDragResult()` directly (so the UI shows the exact
  final position), then persist as in Step 3.
- Effect cleanup: also `if (rafId !== null) cancelAnimationFrame(rafId);`.

**Verify**: `bun run typecheck` → no new errors. Manual: `bun run dev`,
open the printed URL, go to `/kalendar`, drag an event — it must follow the
pointer with no visible lag and land on 15-minute snaps.

### Step 5: One-pass day grouping + memoized `DayColumn`

1. After the `visibleEvents` memo (`Kalendar.tsx:718-728`), add:

```tsx
  const eventsByDay = useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents]
  );
```

   Add a module-level `const NO_EVENTS: CalEvent[] = [];` so empty days
   keep a stable identity.
2. Day headers (Excerpt 5, first block): replace the `filter(...).length`
   with `const count = (eventsByDay.get(toISODate(day)) ?? NO_EVENTS).length;`.
3. Wrap the four handlers from Excerpt 6 in `useCallback`:
   `handleEventDragStart` → deps `[]`; `handleEventResizeStart` → deps `[]`
   (refs and setters are stable); `handleEventEdit` → deps `[]`;
   `handleEventDelete` → deps `[refreshEvents]`.
4. Extract the body of the day-columns `days.map` (Excerpt 5, second
   block, `Kalendar.tsx:1254-1308`: hour lines, `EventBlock`s, the now
   indicator) into a module-level component, following the `WeekScrollbar`
   precedent of isolating rerenders:

```tsx
/* One week column. memo'd with an element-wise events comparison so that
   during a drag only the column(s) containing the dragged event rerender —
   the grouping memo rebuilds the per-day arrays every frame, so array
   identity alone would defeat the memo. */
const DayColumn = memo(
  function DayColumn({
    iso,            // toISODate(day), also used as the React key
    isToday,
    events,         // events of this day, already filtered
    draggingId,
    onDragStart,
    onResizeStart,
    onEdit,
    onDelete,
  }: { /* types as used */ }) {
    const { placed, columns } = useMemo(() => layoutDay(events), [events]);
    return ( /* the JSX moved verbatim from the days.map body; `today`
                becomes `isToday`; `dragging?.id === event.id` becomes
                `draggingId === event.id` */ );
  },
  (prev, next) =>
    prev.iso === next.iso &&
    prev.isToday === next.isToday &&
    prev.draggingId === next.draggingId &&
    prev.onDragStart === next.onDragStart &&
    prev.onResizeStart === next.onResizeStart &&
    prev.onEdit === next.onEdit &&
    prev.onDelete === next.onDelete &&
    prev.events.length === next.events.length &&
    prev.events.every((event, i) => event === next.events[i])
);
```

   The call site becomes:

```tsx
                {days.map(day => {
                  const iso = toISODate(day);
                  return (
                    <DayColumn
                      key={iso}
                      iso={iso}
                      isToday={isSameDay(day, TODAY)}
                      events={eventsByDay.get(iso) ?? NO_EVENTS}
                      draggingId={dragging?.id ?? null}
                      onDragStart={handleEventDragStart}
                      onResizeStart={handleEventResizeStart}
                      onEdit={handleEventEdit}
                      onDelete={handleEventDelete}
                    />
                  );
                })}
```

   Import `memo` from `react`. The element-wise `events` comparison is
   load-bearing: untouched events keep object identity through the drag's
   `current.map(...)`, so 6 of 7 columns bail out every frame.

**Verify**: `bun run typecheck` → no new errors;
`grep -n "visibleEvents.filter" src/Kalendar.tsx` → no matches;
`grep -cn "parseISODate" src/Kalendar.tsx` → only non-render usages remain
(it must no longer appear in the day-header or day-column render paths).

### Step 6: Manual smoke + persistence check

With `bun run dev` running, on `/kalendar`:

1. Drag an event to another day/time; release. Reload the page → the event
   is at the dropped position (this verifies the Step 3 fix end-to-end).
2. Resize an event from the top edge and from the bottom edge; reload →
   both stick.
3. Click an event **without moving** → open the browser dev tools network
   tab first: no PATCH request fires.
4. Toggle a Fahrlehrer filter while no drag is active → columns update.
5. Open the edit dialog, change the time, save; reload → sticks (guards
   the `handleEventSave` path, which still goes through
   `setCalendarEvents`).

**Verify**: all five behaviors as described. If a browser is unavailable,
state that explicitly in your report — do not claim this step passed.

### Step 7: Update the index

Set plan 011's status row in `plans/README.md` (table under "Execution
order & status") to DONE with your branch name.

**Verify**: `git status` shows only in-scope files modified.

## Test plan

- New file `src/lib/calendar-data.test.ts` (Step 2): `groupEventsByDay`
  (empty, multi-day grouping, order preservation) and `layoutDay`
  (non-overlap, overlap → 2 columns, touching events reuse a column,
  empty input). Model after `src/lib/money.test.ts`.
- No DOM tests: the repo deliberately has no frontend test stack (decision
  recorded in `plans/README.md` rejections). The interaction behavior is
  covered by the Step 6 manual checklist instead.
- Verification: `bun run test` → all pass, including ≥7 new test cases.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `bun run typecheck` → no errors beyond the Step 1 baseline
- [ ] `bun run test` exits 0; `src/lib/calendar-data.test.ts` exists with
      ≥7 passing cases
- [ ] `grep -n "calendarEventsRef" src/Kalendar.tsx` → no matches
- [ ] `grep -n "visibleEvents.filter" src/Kalendar.tsx` → no matches
- [ ] `grep -n "function layoutDay" src/Kalendar.tsx` → no matches
      (it now lives in `src/lib/calendar-data.ts`)
- [ ] `grep -n "requestAnimationFrame" src/Kalendar.tsx` → ≥1 match inside
      the drag effect
- [ ] Step 6 manual checklist done (or explicitly reported as not run)
- [ ] `git status` → no files outside the in-scope list modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any "Current state" excerpt no longer matches `src/Kalendar.tsx` (drift
  since 2026-06-11).
- After Step 5, dragging an event visually moves a *different* event or a
  card flickers between columns — the memo comparator or the grouping is
  wrong; do not paper over it by removing the memo.
- The Step 6 reload check fails (dropped position not persisted) — the
  Step 3 `dragResultRef` wiring is wrong; report rather than re-adding an
  effect-synced ref.
- Fixing anything seems to require touching `CalendarEventCard.tsx`,
  `use-calendar-events.ts`, or any `src/server/**` file.
- You discover `refreshEvents` is not referentially stable (it must be —
  it comes from `useCallback` in `src/lib/api.ts:32-44`); the `useCallback`
  deps in Step 5.3 rely on it.

## Maintenance notes

- **Deferred on purpose**: memoizing `EventBlock`/`CalendarEventCard`
  (unneeded once only one column rerenders per frame — revisit only if a
  single day routinely holds 50+ events), and separating drag-preview
  state from `calendarEvents` entirely (bigger refactor; recorded as
  finding 1's "fix shape" alternative in `plans/README.md`).
- If multi-day events or a month view are ever added, `groupEventsByDay`
  keying on the single `event.date` string is the thing to revisit.
- If anyone adds props to `DayColumn`, the custom `memo` comparator must
  be extended in the same commit — a missed prop there silently freezes UI.
- Reviewer focus: (1) `computeDragPosition` must reproduce the old updater
  math exactly (constants, clamp bounds, snap); (2) the `pointerup`-before-
  last-`pointermove` path — the ref, not state, must be the persistence
  source; (3) no behavior change to `handleEventSave`/`handleEventDelete`.
- The drag effect's deps still include `weekStart`; a week change cannot
  happen mid-drag today (pointer is captured), but if keyboard week-nav is
  ever added, re-running the effect mid-drag resets `dragResultRef` — fine
  (next move repopulates it), just don't "optimize" the reset away.
