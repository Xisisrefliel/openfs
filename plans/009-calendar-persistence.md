# Plan 009: Persist calendar events — DB table, API, and wiring Kalendar/Dashboard/StundenTab to it

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3d7e8c0..HEAD -- src/lib/calendar-data.ts src/Kalendar.tsx src/Dashboard.tsx src/components/fahrschueler/StundenTab.tsx src/server/`
> The working tree at planning time already contained uncommitted changes to
> `src/Kalendar.tsx` (DB-backed vehicle options — treat those as part of the
> baseline). For anything else, compare the "Current state" excerpts against
> the live code before proceeding; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1 (highest product value in the audit)
- **Effort**: L
- **Risk**: HIGH (touches the app's most complex page; drag/resize logic must keep working)
- **Depends on**: plans/004-api-integration-tests.md (test harness patterns). plans/005-dedupe-hook-fetch-layer.md recommended first (gives `useFetchList`), but this plan works without it.
- **Category**: tech-debt / direction
- **Planned at**: commit `3d7e8c0`, 2026-06-10

## Why this matters

The calendar is the app's centerpiece — and it is a mockup. All events come
from a hardcoded seed array anchored to a fixed demo week
(`TODAY = 2026-06-09`); the Kalendar page copies them into component state,
so every drag, resize, edit, create, or delete evaporates on reload. The
Dashboard's counts/charts and the student detail's Stunden tab render the
same fiction. Meanwhile students, instructors, vehicles, and price plans are
all DB-backed. This plan gives events the same treatment: a
`calendar_events` table, CRUD API following the repo's exact existing
patterns, a hook, and persistence wired into the three consumers — without
rewriting the calendar's interaction code.

## Current state

- `src/lib/calendar-data.ts` — the whole seam. Key parts:

```ts
// :17-29  the shared event type (KEEP this type as the API shape)
export type CalEvent = {
  id: string;
  date: string; // ISO calendar date, e.g. "2026-06-09"
  start: string;
  end: string;
  title: string;
  subtitle?: string;
  location?: string;
  instructor: string;
  vehicle?: string;
  type: EventType;
  tentative?: boolean;
};

// :32  the demo anchor
export const TODAY = new Date(2026, 5, 9); // Di, 09.06.2026

// :106-207  seedEvents: SeedEvent[] — 9 events authored by weekday (0–6)

// :211-217  the function all three consumers call
export function getCalendarEvents(): CalEvent[] {
  const weekStart = startOfWeek(TODAY);
  return seedEvents.map(({ day, ...rest }) => ({
    ...rest,
    date: toISODate(addDays(weekStart, day)),
  }));
}
```

  `EventType` (lines 10–15) is the union `"Praktisch" | "Theorie" |
  "Vorstellung zur prakt. Prüfung" | "Theorieprüfung" | "Andere"`. The file
  also exports date helpers (`startOfWeek`, `addDays`, `isSameDay`,
  `toISODate`, `parseISODate`, `toMinutes`) and `eventTypeOptions`,
  `eventTypeShortLabel`, `isFahrstunde` — all of these stay.

- Consumers of `getCalendarEvents()` (verified):
  - `src/Kalendar.tsx:474-475`:
    `const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>(getCalendarEvents);`
  - `src/Dashboard.tsx:71`: `const allEvents = getCalendarEvents();` —
    **module level**, outside any component.
  - `src/components/fahrschueler/StundenTab.tsx:65`: calls
    `getCalendarEvents()` (inside the component; read the surrounding lines
    before editing).

- Kalendar mutation sites (only four `setCalendarEvents` calls — verified):
  - `src/Kalendar.tsx:532` — inside the drag/resize pointermove handler
    (continuous updates while dragging; do NOT persist here).
  - Drag end: `src/Kalendar.tsx:600-610` — `const stopDragging = () =>
    setDragging(null);` registered on `pointerup`. Persist the dragged
    event's final position here.
  - `src/Kalendar.tsx:679-681` — `handleEventDelete`.
  - `src/Kalendar.tsx:690-694` — `handleEventSave` (from `EventEditDialog`).
- `TODAY` is imported by `src/Kalendar.tsx:38` and `src/Dashboard.tsx:51`
  and used for "today" highlighting/anchoring (Kalendar lines 472–473, 502,
  696, 704–705, 830, 878, 956; Dashboard lines 69, 123, 372, 376, 398).

- Server patterns to copy (do not invent new ones):
  - Module: `src/server/vehicles.ts` — row type, `toX()` mapper, `SELECT`
    constant, `normalize()` with `ValidationError`, `createX/updateX/deleteX`
    returning via `getX`.
  - Routes: `src/server/routes.ts` — `vehicleRoutes(db)` shape; `handle()`
    wrapper maps `ValidationError` → 400.
  - Schema + seed: `src/server/db.ts` — `DDL` string (line 17), seeding
    functions like `initVehicles` (line 353) called from `openDb`
    (lines 256–271).
  - Mounting: `src/index.ts:20-30` — spread `...calendarEventRoutes(db)`
    into `serve({ routes })`.
  - Hook: `src/hooks/use-vehicles.ts` — or `useFetchList` from `@/lib/api`
    if plan 005 landed.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Tests     | `bun test`                       | all pass            |
| Typecheck | `bunx tsc --noEmit`              | no new errors       |
| Dev       | `bun dev`                        | calendar loads from API |
| DB peek   | `sqlite3 data/fahrschule.db "SELECT count(*) FROM calendar_events"` | a number (after Step 2) |

## Scope

**In scope**:
- `src/server/db.ts` — add `calendar_events` to `DDL` + `initCalendarEvents`
- `src/server/calendar-events.ts` (create)
- `src/server/calendar-events.test.ts` (create)
- `src/server/routes.ts` — add `calendarEventRoutes`
- `src/server/routes.test.ts` — extend (if it exists from plan 004)
- `src/index.ts` — mount the routes
- `src/hooks/use-calendar-events.ts` (create)
- `src/lib/calendar-data.ts` — remove seed + `getCalendarEvents`, repoint `TODAY`
- `src/Kalendar.tsx` — hydrate from hook, persist mutations
- `src/Dashboard.tsx` — fetch via hook instead of module-level call
- `src/components/fahrschueler/StundenTab.tsx` — same

**Out of scope** (do NOT touch):
- `src/components/EventEditDialog.tsx`, `src/components/CalendarEventCard.tsx`
  — they operate on `CalEvent` and need no changes (the type is unchanged).
- Recurrence, instructor-availability checks, student linking by ID —
  explicitly deferred (see Maintenance notes / plan 010).
- The drag/resize geometry code in `Kalendar.tsx` (lines ~400–670) beyond
  adding the persist call at drag end.
- `data/fahrschule.db` — never edit or delete the user's live database file.

## Git workflow

- Branch: `advisor/009-calendar-persistence` strongly recommended (this is
  the riskiest plan in the set).
- Commit per step (server / hook / consumers), messages like
  `add calendar_events table and api`, `wire kalendar to persisted events`.
- Do NOT push unless instructed.

## Steps

### Step 1: Schema + seed in `src/server/db.ts`

Append to the `DDL` string:

```sql
CREATE TABLE IF NOT EXISTS calendar_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,            -- ISO "YYYY-MM-DD"
  start TEXT NOT NULL,           -- "HH:MM"
  end TEXT NOT NULL,             -- "HH:MM"
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  instructor TEXT NOT NULL DEFAULT 'Nicht zugeteilt',
  vehicle TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL CHECK (type IN ('Praktisch','Theorie','Vorstellung zur prakt. Prüfung','Theorieprüfung','Andere')),
  tentative INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(date);
```

Design notes (already decided — follow them):
- **Numeric `id`** in the DB; the API serializes it as a string
  (`String(row.id)`) because `CalEvent.id` is `string` and the frontend
  treats ids opaquely. Do not change `CalEvent`.
- **Instructor/vehicle by display name**, not FK — matches how students
  store `instructor`/`vehicle` (see `students` table) and how
  `deleteInstructor` re-assigns by name. Consistency beats normalization
  here.
- **`end` is a keyword-ish name** — quote it as `"end"` in SQL statements
  if SQLite complains (plain `end` works in column lists but be careful in
  expressions).

Add `initCalendarEvents(db)` next to `initVehicles`, called from `openDb()`:
seed only when the table is empty (`SELECT count(*)`), inserting the 9 demo
events currently in `src/lib/calendar-data.ts:106-207` — but anchored to
**the week of the real current date** (`new Date()` is fine in server code):
compute Monday of the current week with the same logic as
`startOfWeek` (`(day + 6) % 7` — copy the small helper locally or inline
it), then `date = toISODate(monday + seedEvent.day)`. Copy the 9 seed
objects verbatim (titles, times, instructors).

**Verify**: `bun test` → existing tests still pass (they call
`openDb(":memory:")`, which now also creates/seeds calendar_events — they
must be unaffected). Then `rm -f /tmp/cal-test.db && bun -e 'import { openDb } from "./src/server/db"; const db = openDb("/tmp/cal-test.db"); console.log(db.query("SELECT count(*) AS n FROM calendar_events").get())'` → `{ n: 9 }`.

### Step 2: Server module `src/server/calendar-events.ts`

Mirror `src/server/vehicles.ts` structurally: `CalendarEventRow` type,
`toEvent()` mapper (numeric id → `String(id)`, `tentative` 0/1 → boolean —
omit `subtitle`/`location`/`vehicle`/`tentative` from the returned object
when empty/false, so the wire shape matches the optional fields of
`CalEvent`), `SELECT` constant, and:

- `listCalendarEvents(db, filter?: { from?: string; to?: string })` —
  ordered by `date, start`; optional inclusive date-range filter
  (`WHERE date >= ? AND date <= ?` — build the clause conditionally like
  `listLedger` does in `engine.ts`; read it first).
- `getCalendarEvent(db, id)` — `ValidationError("Termin nicht gefunden.")`.
- `createCalendarEvent(db, input)` / `updateCalendarEvent(db, id, input)` —
  shared `normalize(input, current)` validation:
  - `date` must match `/^\d{4}-\d{2}-\d{2}$/` → else
    `ValidationError("Feld 'date' muss ein ISO-Datum sein.")`
  - `start`/`end` must match `/^\d{2}:\d{2}$/`; `end` must be after `start`
    (compare with `toMinutes` logic: `h*60+m`) →
    `ValidationError("Ende muss nach Beginn liegen.")`
  - `title` required non-empty → `ValidationError("Titel ist ein Pflichtfeld.")`
  - `type` must be one of the five literals →
    `ValidationError("Ungültiger Termin-Typ.")`
  - strings trimmed; `tentative` must be boolean if present.
- `deleteCalendarEvent(db, id)` — like `deleteVehicle`.

The route ids are strings on the wire; the server functions take `number`
ids (routes parse with `Number(...)` + `Number.isInteger` like every other
route).

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 3: Routes + mount + server tests

In `src/server/routes.ts` add `calendarEventRoutes(db)` with:
- `GET /api/calendar-events` (+ optional `?from=&to=` parsed like
  `filterFromUrl` does, but only from/to) → `{ events: [...] }`
- `POST /api/calendar-events` → 201 created event
- `PATCH /api/calendar-events/:id` → updated event
- `DELETE /api/calendar-events/:id` → `{ ok: true }`
All wrapped in `handle()`, German invalid-id message
(`"Ungültige Termin-ID."`).

Mount in `src/index.ts`: `...calendarEventRoutes(db),`.

Write `src/server/calendar-events.test.ts` (in-memory DB, model after
`migration.test.ts`): seed presence (9 events), create happy path, each
validation error above, update merge semantics, delete, range filter
(create events on three dates, filter the middle).
If `src/server/routes.test.ts` exists (plan 004), add: GET list 200, POST
valid 201, POST `end < start` → 400, DELETE → `{ ok: true }`.

**Verify**: `bun test` → all pass including the new file (≥ 10 new tests).

### Step 4: Hook `src/hooks/use-calendar-events.ts`

Follow `use-vehicles.ts` (or `useFetchList` from `@/lib/api` if plan 005
landed): export `fetchCalendarEvents()`, `createCalendarEvent(input)`,
`updateCalendarEvent(id, input)`, `deleteCalendarEvent(id)` (all via
`parseOrThrow`, payload shapes = `CalEvent` minus `id` for create, partial
for update), and `useCalendarEvents()` returning
`{ events, loading, refresh }`.

**Verify**: `bunx tsc --noEmit` → no new errors.

### Step 5: Repoint `src/lib/calendar-data.ts`

- Delete `seedEvents`, the `SeedEvent` type, and `getCalendarEvents()`
  (the seed now lives in `db.ts`).
- Change the anchor to the real clock:
  `export const TODAY = new Date();` — keep the export name so the ~15
  usages in Kalendar/Dashboard keep compiling. Update the comment ("demo
  'now'" → "the app's notion of 'today'").
- Keep everything else (types, helpers, labels) unchanged.

**Verify**: `bunx tsc --noEmit` — expect errors ONLY at the three consumer
call sites of `getCalendarEvents` (fixed in Steps 6–8). List them; if other
files error, STOP.

### Step 6: Wire `src/Kalendar.tsx`

Strategy: keep `calendarEvents` as local state (the drag code depends on
synchronous local updates) and treat the server as the system of record —
hydrate on load, persist at the four mutation points, refresh on failure.

1. Replace line 474–475 with hydration:

```ts
const { events: storedEvents, refresh: refreshEvents } = useCalendarEvents();
const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>([]);
useEffect(() => {
  setCalendarEvents(storedEvents);
}, [storedEvents]);
```

2. Persist on **drag end** (`stopDragging`, lines ~600–610): when a drag was
   active, look up the dragged event in `calendarEvents` by `dragging.id`
   and fire `updateCalendarEvent(Number(event.id), { date, start, end })`
   with `.catch(...)` → `toast.error("Termin konnte nicht gespeichert
   werden."); void refreshEvents();`. Use a ref to read the latest
   `calendarEvents` inside the listener if the closure is stale (check the
   existing code's closure structure first — the listener is re-registered
   per drag, so it may already close over fresh state).
3. Persist in `handleEventDelete` (line 679): call
   `deleteCalendarEvent(Number(event.id))` with the same catch+refresh.
   Keep the optimistic local filter.
4. Persist in `handleEventSave` (line 690): call
   `updateCalendarEvent(Number(id), updates)` with catch+refresh. Keep the
   optimistic local map.
5. If the page has a "create event" path (search for where a new `CalEvent`
   with a generated id is added — `grep -n "crypto.randomUUID\|evt-" src/Kalendar.tsx src/components/EventEditDialog.tsx`):
   route it through `createCalendarEvent(...)` and use the returned
   server id in local state. If there is NO create path (the audit only
   confirmed move/resize/edit/delete), note that in your report — creating
   events stays out of scope.

Import `toast` from `"sonner"` if not already imported.

**Verify**: `bunx tsc --noEmit` → no new errors. Manual (`bun dev`):
events render; drag one to another day → reload → it stayed; delete one →
reload → still gone; edit title via dialog → reload → persisted.

### Step 7: Wire `src/Dashboard.tsx`

`const allEvents = getCalendarEvents();` at line 71 is module-level, and
lines below it (counts, `eventsOn`, chart data — read lines 60–130) derive
from it at module scope. Move the derivation inside the component that uses
it, fed by `useCalendarEvents()`. Keep the computations identical — wrap
them in `useMemo(() => ..., [events])` where they were plain consts. The
empty-events initial render must not crash (all derivations are array
operations; verify none index blindly).

**Verify**: `bunx tsc --noEmit` → no new errors. Manual: dashboard shows the
same counts as the calendar week.

### Step 8: Wire `src/components/fahrschueler/StundenTab.tsx`

Replace the `getCalendarEvents()` call (line 65, read its context first)
with the hook's `events`. Preserve the existing filtering/derivation logic.

**Verify**: `bunx tsc --noEmit` → exit clean repo-wide. `bun test` → all
pass. `grep -rn "getCalendarEvents" src/` → 0 matches.

## Test plan

- Server: `src/server/calendar-events.test.ts` per Step 3 (validation,
  CRUD, range filter, seed) — pattern: `src/server/migration.test.ts`.
- Routes: extend `src/server/routes.test.ts` if present.
- Frontend: no DOM test infra in this repo (deliberate); the manual smoke
  checklist in Steps 6–8 is the gate. Run all of it.

## Done criteria

- [ ] `grep -rn "getCalendarEvents" src/` → 0 matches
- [ ] `grep -rn "seedEvents" src/lib/calendar-data.ts` → 0 matches
- [ ] Calendar mutations (move, resize, edit, delete) survive a reload (manual)
- [ ] Fresh DB seeds 9 events into the CURRENT week, not 2026-06-09's week
- [ ] `bun test` exits 0 with ≥ 10 new server tests
- [ ] `bunx tsc --noEmit` → no new errors
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The `setCalendarEvents` call sites in `Kalendar.tsx` are not at/near lines
  474, 532, 680, 691 (the page was refactored after planning).
- The drag-end listener cannot reach fresh event state without restructuring
  the drag system (report the structure you found; do not refactor the drag
  code).
- Existing tests fail after the DDL change (the schema addition was not as
  isolated as assessed).
- Dashboard's module-level derivations turn out to feed OTHER modules via
  exports (grep its exports before moving them).
- Changing `TODAY` to `new Date()` visibly breaks week navigation or
  highlighting in manual testing — revert that single line, keep the rest,
  and report.

## Maintenance notes

- **Deferred deliberately**: linking events to students by id (events store
  display names like the rest of the app), recurrence, conflict detection,
  instructor availability. Plan 010 designs the student/billing link — do
  not pre-build it here.
- `deleteInstructor` re-assigns students on delete; once events are
  persisted, the same courtesy ("re-assign or keep name?") becomes a
  question for instructors with future events — flag it in review, don't
  solve it here.
- Reviewer should scrutinize: the optimistic-update + catch-refresh pattern
  at the three mutation sites (failure must visibly reconcile), and that the
  seed runs only on empty tables (existing user DBs must not get 9 demo
  events injected — they will, if their table is empty and that's intended;
  note it in the changelog).
