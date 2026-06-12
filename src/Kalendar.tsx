import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  RefObject,
  SetStateAction,
  WheelEvent as ReactWheelEvent,
} from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Moon,
  Printer,
  Plus,
  Search,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import {
  CalendarEventCard,
  type CalendarEventCardTheme,
} from "./components/CalendarEventCard.tsx";
import { EventEditDialog } from "./components/EventEditDialog.tsx";
import { useInstructors } from "@/hooks/use-instructors";
import { useStudents } from "@/hooks/use-students";
import {
  addDays,
  type CalEvent,
  type EventPreset,
  type EventType,
  eventPresets,
  eventTypeOptions,
  groupEventsByDay,
  isSameDay,
  layoutDay,
  startOfWeek,
  toISODate,
  toMinutes,
  TODAY,
} from "@/lib/calendar-data";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
  useCalendarEvents,
} from "@/hooks/use-calendar-events";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useVehicleOptions } from "@/hooks/use-vehicle-options";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Time grid configuration                                            */
/* ------------------------------------------------------------------ */

const START_HOUR = 0;
const END_HOUR = 24;
const HOUR_HEIGHT = 72; // px per hour
const SNAP_MINUTES = 15;
const DAY_COUNT = 7;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;
const GRID_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
const NIGHT_START_MINUTES = 21 * 60 + 15;
const HOUR_INTERVALS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i
);
const HOUR_MARKS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i
);

/* Demo "now" — anchored to the seeded week so the indicator lands sensibly. */
const NOW_MINUTES = 13 * 60 + 30;
const NEW_EVENT_ID = "__new_calendar_event__";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const snapMinutes = (minutes: number) =>
  Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;

const formatMinutes = (minutes: number) => {
  const clamped = clamp(minutes, 0, DAY_MINUTES);
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const nextEditableStartTime = () => {
  const now = new Date();
  const roundedMinutes = Math.ceil(now.getMinutes() / SNAP_MINUTES) * SNAP_MINUTES;
  const minutes = clamp(
    now.getHours() * 60 + roundedMinutes,
    START_HOUR * 60,
    END_HOUR * 60 - 45
  );

  return formatMinutes(minutes);
};

const topForMinutes = (minutes: number) =>
  ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

/* ------------------------------------------------------------------ */
/* Event type themes                                                  */
/* ------------------------------------------------------------------ */

/* Color-block cards: each event type owns a full tint — surface, rail,
   ink — so the week grid reads as a mosaic of color, not white boxes. */
const calendarEventThemes: Record<EventType, CalendarEventCardTheme> = {
  Praktisch: {
    surface:
      "border-sky-200/80 bg-sky-50 hover:border-sky-300 hover:bg-sky-100/80 dark:border-sky-800/60 dark:bg-sky-950/50 dark:hover:border-sky-700 dark:hover:bg-sky-950/70",
    rail: "bg-sky-500",
    text: "text-sky-950 dark:text-sky-100",
    meta: "text-sky-900/65 dark:text-sky-200/65",
    icon: "text-sky-600/80 dark:text-sky-400/80",
    chip: "text-sky-600 dark:text-sky-400",
    focus: "focus-visible:ring-sky-500/30",
    shortLabel: "Praxis",
  },
  Theorie: {
    surface:
      "border-indigo-200/80 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/80 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/70",
    rail: "bg-indigo-500",
    text: "text-indigo-950 dark:text-indigo-100",
    meta: "text-indigo-900/65 dark:text-indigo-200/65",
    icon: "text-indigo-600/80 dark:text-indigo-400/80",
    chip: "text-indigo-600 dark:text-indigo-400",
    focus: "focus-visible:ring-indigo-500/30",
    shortLabel: "Theorie",
  },
  "Vorstellung zur prakt. Prüfung": {
    surface:
      "border-amber-300/70 bg-amber-50 hover:border-amber-400/80 hover:bg-amber-100/80 dark:border-amber-800/60 dark:bg-amber-950/50 dark:hover:border-amber-700 dark:hover:bg-amber-950/70",
    rail: "bg-amber-500",
    text: "text-amber-950 dark:text-amber-100",
    meta: "text-amber-900/65 dark:text-amber-200/65",
    icon: "text-amber-600/90 dark:text-amber-400/80",
    chip: "text-amber-600 dark:text-amber-400",
    focus: "focus-visible:ring-amber-500/30",
    shortLabel: "Prüfung",
  },
  Theorieprüfung: {
    surface:
      "border-rose-200/80 bg-rose-50 hover:border-rose-300 hover:bg-rose-100/80 dark:border-rose-800/60 dark:bg-rose-950/50 dark:hover:border-rose-700 dark:hover:bg-rose-950/70",
    rail: "bg-rose-500",
    text: "text-rose-950 dark:text-rose-100",
    meta: "text-rose-900/65 dark:text-rose-200/65",
    icon: "text-rose-600/80 dark:text-rose-400/80",
    chip: "text-rose-600 dark:text-rose-400",
    focus: "focus-visible:ring-rose-500/30",
    shortLabel: "TÜV",
  },
  Andere: {
    surface:
      "border-emerald-200/80 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100/80 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/70",
    rail: "bg-emerald-500",
    text: "text-emerald-950 dark:text-emerald-100",
    meta: "text-emerald-900/65 dark:text-emerald-200/65",
    icon: "text-emerald-600/80 dark:text-emerald-400/80",
    chip: "text-emerald-600 dark:text-emerald-400",
    focus: "focus-visible:ring-emerald-500/30",
    shortLabel: "Extra",
  },
};

/* ------------------------------------------------------------------ */
/* Filter configuration                                               */
/* ------------------------------------------------------------------ */

const niederlassungOptions = ["Fahrschule Gül"];
/* ------------------------------------------------------------------ */
/* Date formatters                                                    */
/* ------------------------------------------------------------------ */

const monthLong = (date: Date) =>
  date.toLocaleDateString("de-DE", { month: "long" });
const monthShort = (date: Date) =>
  date.toLocaleDateString("de-DE", { month: "short" });

/* ------------------------------------------------------------------ */
/* Side filter group                                                  */
/* ------------------------------------------------------------------ */

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(option => option.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-b border-border/70 px-3 py-3"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md text-sm font-medium outline-hidden focus-visible:ring-2 focus-visible:ring-ring">
        {title}
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-2 pt-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Suchen…"
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-col">
          {filtered.map(option => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <Checkbox
                checked={selected.has(option)}
                onCheckedChange={() => onToggle(option)}
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <span className="px-1 py-1.5 text-xs text-muted-foreground">
              Keine Treffer
            </span>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/* Event block                                                        */
/* ------------------------------------------------------------------ */

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
  | {
      mode: "resize-start" | "resize-end";
      /* Minutes between the pointer and the grabbed edge at drag start. Compact
         cards expand on hover, so the visible edge can sit well below the true
         end time — without this anchor, grabbing would jump the time to the
         cursor's line before the user even moves. */
      grabOffsetMinutes: number;
    }
);

/* Where the dragged event sits for a given pointer position. Pure: reads
   the original position from DragState, so it can run outside React. */
function computeDragPosition(
  dragging: DragState,
  clientX: number,
  clientY: number,
  rect: DOMRect,
  weekStart: Date
): { date: string; start: string; end: string } {
  const rawPointerMinutes =
    ((clientY - rect.top) / HOUR_HEIGHT) * 60 + START_HOUR * 60;

  if (dragging.mode === "move") {
    const dayWidth = rect.width / DAY_COUNT;
    const day = clamp(
      Math.floor((clientX - rect.left) / dayWidth),
      0,
      DAY_COUNT - 1
    );
    const rawStartMinutes =
      ((clientY - rect.top - dragging.pointerOffsetY) / HOUR_HEIGHT) * 60 +
      START_HOUR * 60;
    const startMinutes = clamp(
      snapMinutes(rawStartMinutes),
      START_HOUR * 60,
      END_HOUR * 60 - dragging.duration
    );
    const endMinutes = startMinutes + dragging.duration;
    return {
      date: toISODate(addDays(weekStart, day)),
      start: formatMinutes(startMinutes),
      end: formatMinutes(endMinutes),
    };
  }

  // Resize by pointer delta from where the edge was grabbed, not by
  // absolute pointer position — see DragState.grabOffsetMinutes.
  const pointerMinutes = snapMinutes(rawPointerMinutes - dragging.grabOffsetMinutes);

  if (dragging.mode === "resize-start") {
    const endMinutes = toMinutes(dragging.end);
    const nextStartMinutes = clamp(
      pointerMinutes,
      START_HOUR * 60,
      endMinutes - SNAP_MINUTES
    );
    return {
      date: dragging.date,
      start: formatMinutes(nextStartMinutes),
      end: dragging.end,
    };
  }

  // mode === "resize-end"
  const startMinutes = toMinutes(dragging.start);
  const nextEndMinutes = clamp(
    pointerMinutes,
    startMinutes + SNAP_MINUTES,
    END_HOUR * 60
  );
  return {
    date: dragging.date,
    start: dragging.start,
    end: formatMinutes(nextEndMinutes),
  };
}

function EventBlock({
  event,
  column,
  columns,
  isDragging,
  onDragStart,
  onResizeStart,
  onEdit,
  onDelete,
}: {
  event: CalEvent;
  column: number;
  columns: number;
  isDragging: boolean;
  onDragStart: (
    event: CalEvent,
    pointerEvent: ReactPointerEvent<HTMLButtonElement>
  ) => void;
  onResizeStart: (
    event: CalEvent,
    edge: "start" | "end",
    pointerEvent: ReactPointerEvent<HTMLElement>
  ) => void;
  onEdit: (event: CalEvent) => void;
  onDelete: (event: CalEvent) => void;
}) {
  const startMin = toMinutes(event.start);
  const endMin = toMinutes(event.end);
  const duration = endMin - startMin;
  const top = topForMinutes(startMin);
  const slotHeight = Math.max((duration / 60) * HOUR_HEIGHT - 1, 44);
  const widthPct = 100 / columns;
  const theme = calendarEventThemes[event.type];
  const compact = slotHeight < 58;
  // Cards up to ~1h are too short for a wrapped meta row — it would squeeze
  // the title. Title and meta stay single-line and truncate instead.
  const dense = !compact && slotHeight < 80;

  return (
    <CalendarEventCard
      event={event}
      compact={compact}
      dense={dense}
      isDragging={isDragging}
      theme={theme}
      onPointerDown={pointerEvent => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.preventDefault();
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
        onDragStart(event, pointerEvent);
      }}
      onResizeStart={(edge, pointerEvent) => onResizeStart(event, edge, pointerEvent)}
      onEdit={() => onEdit(event)}
      onDelete={() => onDelete(event)}
      style={
        {
          top,
          left: `calc(${column * widthPct}% + 2px)`,
          width: `calc(${widthPct}% - 4px)`,
          "--card-h": `${slotHeight}px`,
        } as CSSProperties
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Custom horizontal week scrollbar                                   */
/*                                                                    */
/* Self-contained on purpose: it subscribes to the grid's scroll      */
/* itself, so scrolling rerenders only this tiny component — not the  */
/* whole calendar page (sidebar, filters, every event card).          */
/* ------------------------------------------------------------------ */

function WeekScrollbar({
  scrollerRef,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({
    clientWidth: 1,
    scrollLeft: 0,
    scrollWidth: 1,
  });

  useEffect(() => {
    const grid = scrollerRef.current;
    if (!grid) return;

    const updateHorizontalScroll = () => {
      setScroll(previous =>
        // Bail out when the horizontal metrics are unchanged — vertical
        // scrolling fires the same event but must not rerender anything.
        previous.clientWidth === grid.clientWidth &&
        previous.scrollLeft === grid.scrollLeft &&
        previous.scrollWidth === grid.scrollWidth
          ? previous
          : {
              clientWidth: grid.clientWidth,
              scrollLeft: grid.scrollLeft,
              scrollWidth: grid.scrollWidth,
            }
      );
    };

    updateHorizontalScroll();
    grid.addEventListener("scroll", updateHorizontalScroll, { passive: true });
    window.addEventListener("resize", updateHorizontalScroll);

    const resizeObserver = new ResizeObserver(updateHorizontalScroll);
    resizeObserver.observe(grid);

    return () => {
      grid.removeEventListener("scroll", updateHorizontalScroll);
      window.removeEventListener("resize", updateHorizontalScroll);
      resizeObserver.disconnect();
    };
  }, [scrollerRef]);

  const maxScroll = Math.max(scroll.scrollWidth - scroll.clientWidth, 0);
  const thumbWidth =
    scroll.scrollWidth > scroll.clientWidth
      ? Math.max((scroll.clientWidth / scroll.scrollWidth) * 100, 12)
      : 100;
  const thumbLeft =
    maxScroll > 0 ? (scroll.scrollLeft / maxScroll) * (100 - thumbWidth) : 0;

  const scrollToTrackPosition = (clientX: number) => {
    const grid = scrollerRef.current;
    const track = trackRef.current;
    if (!grid || !track || maxScroll <= 0) return;

    const rect = track.getBoundingClientRect();
    const thumbWidthPx = (thumbWidth / 100) * rect.width;
    const availableWidth = Math.max(rect.width - thumbWidthPx, 1);
    grid.scrollLeft =
      (clamp(clientX - rect.left - thumbWidthPx / 2, 0, availableWidth) /
        availableWidth) *
      maxScroll;
  };

  const handleThumbPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollToTrackPosition(event.clientX);

    const handlePointerMove = (pointerEvent: PointerEvent) => {
      pointerEvent.preventDefault();
      scrollToTrackPosition(pointerEvent.clientX);
    };
    const stopDragging = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });
  };

  return (
    <div className="border-t border-border/70 bg-background px-3 py-2">
      <div
        ref={trackRef}
        className="h-2 rounded-full bg-muted"
        onPointerDown={handleThumbPointerDown}
      >
        <div
          className="h-full rounded-full bg-muted-foreground/45 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] transition-colors hover:bg-muted-foreground/60"
          style={{
            marginLeft: `${thumbLeft}%`,
            width: `${thumbWidth}%`,
          }}
        />
      </div>
    </div>
  );
}

/* Stable empty array so eventsByDay.get(iso) ?? NO_EVENTS never produces
   a new array identity on days that have no events — DayColumn's memo
   compares by reference and would otherwise always rerender empty columns. */
const NO_EVENTS: CalEvent[] = [];

/* ------------------------------------------------------------------ */
/* Day column                                                         */
/*                                                                    */
/* Self-contained on purpose: memo'd so that during a drag only the  */
/* column(s) containing the dragged event rerender — the grouping    */
/* memo rebuilds the per-day arrays every frame, so array identity   */
/* alone would defeat the memo. The element-wise events comparison   */
/* is load-bearing: untouched events keep object identity through    */
/* the drag's current.map(), so 6 of 7 columns bail out every frame. */
/* ------------------------------------------------------------------ */

const DayColumn = memo(
  function DayColumn({
    iso,
    isToday,
    events,
    draggingId,
    onDragStart,
    onResizeStart,
    onEdit,
    onDelete,
  }: {
    iso: string;
    isToday: boolean;
    events: CalEvent[];
    draggingId: string | null;
    onDragStart: (event: CalEvent, pointerEvent: ReactPointerEvent<HTMLButtonElement>) => void;
    onResizeStart: (event: CalEvent, edge: "start" | "end", pointerEvent: ReactPointerEvent<HTMLElement>) => void;
    onEdit: (event: CalEvent) => void;
    onDelete: (event: CalEvent) => void;
  }) {
    const { placed, columns } = useMemo(() => layoutDay(events), [events]);
    return (
      <div
        className={cn(
          "relative h-full border-l border-border/70",
          isToday && "bg-primary/[0.02]"
        )}
      >
        {/* Hour lines */}
        {HOUR_INTERVALS.map(hour => (
          <div
            key={hour}
            className="border-b border-border/60"
            style={{ height: HOUR_HEIGHT }}
          >
            <div className="h-1/2 border-b border-dashed border-border/35" />
          </div>
        ))}

        {/* Events */}
        {placed.map(({ event, column }) => (
          <EventBlock
            key={event.id}
            event={event}
            column={column}
            columns={columns}
            isDragging={draggingId === event.id}
            onDragStart={onDragStart}
            onResizeStart={onResizeStart}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}

        {/* Now indicator */}
        {isToday && (
          <div
            className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
            style={{
              top: topForMinutes(NOW_MINUTES),
            }}
          >
            <span className="-ml-1 size-2 shrink-0 rounded-full bg-red-500" />
            <span className="h-px flex-1 bg-red-500" />
          </div>
        )}
      </div>
    );
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

/* ------------------------------------------------------------------ */
/* Kalendar page                                                      */
/* ------------------------------------------------------------------ */

export function Kalendar({
  initialTypeFilter,
}: {
  initialTypeFilter?: EventType[];
} = {}) {
  const [anchor, setAnchor] = useState<Date>(TODAY);
  const [selected, setSelected] = useState<Date | undefined>(TODAY);
  // The DB is the system of record; local state mirrors it for the
  // synchronous drag/resize updates and is reconciled on failure.
  const { events: storedEvents, refresh: refreshEvents } = useCalendarEvents();
  const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>([]);
  useEffect(() => {
    setCalendarEvents(storedEvents);
  }, [storedEvents]);
  // dragResultRef holds the exact final position computed synchronously on
  // every pointermove. Drag-end reads it instead of calendarEvents state, so
  // the persisted value is never behind by one React commit cycle.
  const dragResultRef = useRef<{ date: string; start: string; end: string } | null>(null);
  // Instructor names come from the DB (/api/instructors) so the filter and
  // the edit dialog always match the roster managed on /fahrlehrer.
  const { names: instructorOptions } = useInstructors();
  const { students } = useStudents();
  const { vehicleOptions } = useVehicleOptions();
  const studentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          students
            .map(student => `${student.firstName} ${student.lastName}`.trim())
            .filter(Boolean)
        )
      ).toSorted((left, right) => left.localeCompare(right, "de")),
    [students]
  );
  // Resolves the display name picked in the edit dialog back to the
  // student's id so saved events carry a reliable FK instead of relying
  // on a later name-match back-fill. Duplicate display names keep the
  // FIRST match — same limitation the billing back-fill has.
  const studentIdByName = useMemo(() => {
    const byName = new Map<string, number>();
    for (const student of students) {
      const name = `${student.firstName} ${student.lastName}`.trim();
      if (name && !byName.has(name)) byName.set(name, student.id);
    }
    return byName;
  }, [students]);
  const [instructors, setInstructors] = useState<Set<string>>(new Set());
  const [niederlassungen, setNiederlassungen] = useState<Set<string>>(new Set());
  const [vehicles, setVehicles] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(
    () => new Set(initialTypeFilter ?? [])
  );
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalEvent | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  // Live placement while a preset from the "Ereignis" menu is dragged over
  // the grid. day/startMinutes are null while the pointer is off the grid.
  const [presetDrag, setPresetDrag] = useState<{
    preset: EventPreset;
    day: number | null;
    startMinutes: number | null;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dayGridRef = useRef<HTMLDivElement>(null);

  // Open the grid scrolled to the morning, like a real calendar — and with
  // today's column in view when the week overflows horizontally.
  useEffect(() => {
    const grid = gridRef.current;
    const dayGrid = dayGridRef.current;
    if (!grid) return;

    grid.scrollTop = (7 - START_HOUR) * HOUR_HEIGHT;

    if (!dayGrid) return;
    // The initial anchor is TODAY, so the mounted week always contains it.
    const dayIndex = (TODAY.getDay() + 6) % 7; // Monday = 0
    // scrollLeft is 0 on mount, so rect offsets are content coordinates.
    const gutterWidth =
      dayGrid.getBoundingClientRect().left - grid.getBoundingClientRect().left;
    const dayWidth = dayGrid.getBoundingClientRect().width / DAY_COUNT;
    const dayRight = gutterWidth + (dayIndex + 1) * dayWidth;

    // Only scroll if today isn't fully visible; align its column right
    // after the time gutter so the rest of the week stays in view.
    if (dayRight > grid.clientWidth) {
      grid.scrollLeft = Math.min(
        dayIndex * dayWidth,
        grid.scrollWidth - grid.clientWidth
      );
    }
  }, []);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);

  useEffect(() => {
    if (!dragging) return;

    // Each drag session starts with no committed result; the ref is
    // populated synchronously on the first pointermove.
    dragResultRef.current = null;

    // The ref always holds the exact latest position; the React state —
    // and with it the whole-page render — updates at most once per frame.
    // pointermove can outpace frames on some browsers/devices.
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

    const updateEventFromPointer = (clientX: number, clientY: number) => {
      const grid = dayGridRef.current;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
      // Compute the new position purely from DragState + pointer — no
      // dependency on live React state (fixes the stale-persist bug).
      const next = computeDragPosition(dragging, clientX, clientY, rect, weekStart);
      dragResultRef.current = next;
      if (rafId === null) rafId = requestAnimationFrame(applyPendingDragResult);
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      updateEventFromPointer(event.clientX, event.clientY);
    };

    const stopDragging = () => {
      // Cancel any pending frame before applying the final result so the
      // UI lands on exactly the position the user released at.
      if (rafId !== null) cancelAnimationFrame(rafId);
      applyPendingDragResult();
      // If dragResultRef is still null the user never moved (plain click) —
      // skip the PATCH so a tap on an event doesn't dirty the DB.
      if (dragResultRef.current !== null) {
        void updateCalendarEvent(Number(dragging.id), dragResultRef.current).catch(
          () => {
            toast.error("Termin konnte nicht gespeichert werden.");
            void refreshEvents();
          }
        );
      }
      setDragging(null);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", stopDragging, { once: true });
    window.addEventListener("pointercancel", stopDragging, { once: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging, weekStart, refreshEvents]);

  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: DAY_COUNT }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const toggle =
    (setter: Dispatch<SetStateAction<Set<string>>>) =>
    (value: string) =>
      setter(current => {
        const next = new Set(current);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });

  const visibleEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      if (instructors.size && !instructors.has(event.instructor)) return false;
      if (niederlassungen.size && !(event.location && niederlassungen.has(event.location)))
        return false;
      if (vehicles.size && !(event.vehicle && vehicles.has(event.vehicle)))
        return false;
      if (types.size && !types.has(event.type)) return false;
      return true;
    });
  }, [calendarEvents, instructors, niederlassungen, vehicles, types]);

  // One pass over visible events instead of one filter per day column +
  // one per day header (14 passes total at 7 columns). During a drag the
  // per-day arrays that don't contain the dragged event keep the same
  // object identity, which lets DayColumn's memo bail out cheaply.
  const eventsByDay = useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents]
  );

  const handleEventDragStart = useCallback(
    (event: CalEvent, pointerEvent: ReactPointerEvent<HTMLButtonElement>) => {
      const rect = pointerEvent.currentTarget.getBoundingClientRect();
      setDragging({
        id: event.id,
        date: event.date,
        start: event.start,
        end: event.end,
        mode: "move",
        duration: toMinutes(event.end) - toMinutes(event.start),
        pointerOffsetY: pointerEvent.clientY - rect.top,
      });
    },
    []
  );

  const handleEventResizeStart = useCallback(
    (event: CalEvent, edge: "start" | "end", pointerEvent: ReactPointerEvent<HTMLElement>) => {
      pointerEvent.preventDefault();
      pointerEvent.stopPropagation();
      pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
      const edgeMinutes = toMinutes(edge === "start" ? event.start : event.end);
      const grid = dayGridRef.current;
      const pointerMinutes = grid
        ? ((pointerEvent.clientY - grid.getBoundingClientRect().top) /
            HOUR_HEIGHT) *
            60 +
          START_HOUR * 60
        : edgeMinutes;
      setDragging({
        id: event.id,
        date: event.date,
        start: event.start,
        end: event.end,
        mode: edge === "start" ? "resize-start" : "resize-end",
        grabOffsetMinutes: pointerMinutes - edgeMinutes,
      });
    },
    []
  );

  const handleEventDelete = useCallback(
    (event: CalEvent) => {
      setCalendarEvents(current => current.filter(item => item.id !== event.id));
      void deleteCalendarEvent(Number(event.id)).catch(() => {
        toast.error("Termin konnte nicht gelöscht werden.");
        void refreshEvents();
      });
    },
    [refreshEvents]
  );

  const handleEventEdit = useCallback((event: CalEvent) => {
    // Defer so the context menu finishes closing (and clears its
    // body `pointer-events: none`) before the dialog mounts — otherwise
    // the dialog can open non-interactive.
    setTimeout(() => setEditingEvent(event), 0);
  }, []);

  // Opens the edit dialog for a not-yet-persisted event. Deferred so the
  // dropdown finishes closing (and clears its body `pointer-events: none`)
  // before the dialog mounts — same trick as handleEventEdit.
  const openNewEventDialog = (draft: Omit<CalEvent, "id">) => {
    setTimeout(() => setEditingEvent({ id: NEW_EVENT_ID, ...draft }), 0);
  };

  const openPresetEditor = (preset: EventPreset, date: string, start: string) => {
    openNewEventDialog({
      date,
      start,
      end: formatMinutes(toMinutes(start) + preset.duration),
      title: preset.title,
      instructor: instructorOptions[0] ?? "Nicht zugeteilt",
      vehicle: vehicleOptions.find(option => option !== "Nicht zugeteilt"),
      type: preset.type,
    });
  };

  const handleEventCreate = () => {
    const start = nextEditableStartTime();
    openNewEventDialog({
      date: toISODate(selected ?? TODAY),
      start,
      end: formatMinutes(toMinutes(start) + 45),
      title: "Fahrstunde",
      instructor: instructorOptions[0] ?? "Nicht zugeteilt",
      vehicle: vehicleOptions.find(option => option !== "Nicht zugeteilt"),
      type: "Praktisch",
    });
  };

  // A preset item supports both gestures: a plain click opens the dialog at
  // the next quarter-hour, while dragging carries the preset onto the grid
  // as a ghost block — on drop, the dialog opens with date/start/end already
  // set from the drop position.
  const handlePresetPointerDown = (
    preset: EventPreset,
    pointerEvent: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (pointerEvent.button !== 0) return;
    pointerEvent.preventDefault();
    const origin = { x: pointerEvent.clientX, y: pointerEvent.clientY };
    let moved = false;
    let placement: { day: number; startMinutes: number } | null = null;

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      if (
        !moved &&
        Math.hypot(event.clientX - origin.x, event.clientY - origin.y) < 6
      ) {
        return;
      }
      if (!moved) {
        moved = true;
        // Close the menu as soon as a real drag starts; from here the
        // ghost block is the drag feedback.
        setCreateMenuOpen(false);
      }

      const grid = dayGridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const insideGrid =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (!insideGrid) {
        placement = null;
        setPresetDrag({ preset, day: null, startMinutes: null });
        return;
      }

      const dayWidth = rect.width / DAY_COUNT;
      const day = clamp(
        Math.floor((event.clientX - rect.left) / dayWidth),
        0,
        DAY_COUNT - 1
      );
      const rawStartMinutes =
        ((event.clientY - rect.top) / HOUR_HEIGHT) * 60 + START_HOUR * 60;
      const startMinutes = clamp(
        snapMinutes(rawStartMinutes),
        START_HOUR * 60,
        END_HOUR * 60 - preset.duration
      );
      placement = { day, startMinutes };
      setPresetDrag({ preset, day, startMinutes });
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", cancelDrag);
      setPresetDrag(null);
    };
    const finishDrag = () => {
      cleanup();
      if (!moved) {
        setCreateMenuOpen(false);
        openPresetEditor(
          preset,
          toISODate(selected ?? TODAY),
          nextEditableStartTime()
        );
        return;
      }
      if (placement) {
        openPresetEditor(
          preset,
          toISODate(addDays(weekStart, placement.day)),
          formatMinutes(placement.startMinutes)
        );
      }
    };
    const cancelDrag = () => cleanup();

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", cancelDrag, { once: true });
  };

  const handleEventSave = (id: string, updates: CalEvent) => {
    // The dialog resolves the student name to an id (or undefined). Send
    // an explicit null when unresolved: JSON drops undefined keys and the
    // server keeps the stored value when the key is absent — which would
    // silently keep a stale link after the name was cleared or changed.
    const { id: _id, ...rest } = updates;
    const payload = { ...rest, studentId: updates.studentId ?? null };

    if (id === NEW_EVENT_ID) {
      void createCalendarEvent(payload)
        .then(created => {
          setCalendarEvents(current => [...current, created]);
          void refreshEvents();
        })
        .catch(() => {
          toast.error("Termin konnte nicht erstellt werden.");
        });
      return;
    }

    setCalendarEvents(current =>
      current.map(event => (event.id === id ? updates : event))
    );
    void updateCalendarEvent(Number(id), payload).catch(() => {
      toast.error("Termin konnte nicht gespeichert werden.");
      void refreshEvents();
    });
  };

  const isCurrentWeek = isSameDay(weekStart, startOfWeek(TODAY));

  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}.–${weekEnd.getDate()}. ${monthLong(weekEnd)}`
      : `${weekStart.getDate()}. ${monthShort(weekStart)} – ${weekEnd.getDate()}. ${monthShort(weekEnd)}`;

  const goToToday = () => {
    setAnchor(TODAY);
    setSelected(TODAY);
  };

  const handleCalendarWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    const horizontalDelta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.shiftKey
          ? event.deltaY
          : 0;

    if (!horizontalDelta) return;

    const grid = event.currentTarget;
    const nextScrollLeft = clamp(
      grid.scrollLeft + horizontalDelta,
      0,
      Math.max(grid.scrollWidth - grid.clientWidth, 0)
    );

    if (nextScrollLeft === grid.scrollLeft) return;

    grid.scrollLeft = nextScrollLeft;
    event.preventDefault();
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader>
        {/* No extra padding: PageHeader's animated spacer already makes
            room for the fixed shell controls when the sidebar collapses,
            so the view controls hug the left edge while it's expanded. */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Vorherige Woche"
              onClick={() => setAnchor(current => addDays(startOfWeek(current), -7))}
            >
              <ChevronLeft />
            </Button>
            <span className="min-w-[7.5rem] text-center text-sm font-medium tabular-nums">
              {rangeLabel}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Nächste Woche"
              onClick={() => setAnchor(current => addDays(startOfWeek(current), 7))}
            >
              <ChevronRight />
            </Button>
          </div>
          {!isCurrentWeek && (
            <Button type="button" variant="outline" size="sm" onClick={goToToday}>
              Heute
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Fahrschüler" className="h-8 w-48 pl-8" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Drucken"
          >
            <Printer />
          </Button>
          <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm">
                <Plus data-icon="inline-start" />
                Ereignis
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Klicken oder in den Kalender ziehen
              </DropdownMenuLabel>
              {eventPresets.map(preset => {
                const theme = calendarEventThemes[preset.type];
                return (
                  <DropdownMenuItem
                    key={preset.label}
                    className="cursor-grab gap-2.5 active:cursor-grabbing"
                    onPointerDown={pointerEvent =>
                      handlePresetPointerDown(preset, pointerEvent)
                    }
                  >
                    <span
                      className={cn("size-2 shrink-0 rounded-full", theme.rail)}
                    />
                    <span className="flex-1 truncate">{preset.title}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {preset.duration} Min.
                    </span>
                    <GripVertical className="size-3.5 text-muted-foreground/60" />
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleEventCreate}>
                <Plus className="size-3.5 text-muted-foreground" />
                Eigenes Ereignis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-t-sm rounded-b-lg border border-border/70 bg-background">
        {/* Sidebar: date picker + filters */}
        <aside className="subtle-scrollbar hidden w-72 shrink-0 flex-col overflow-y-auto border-r border-border/70 bg-card lg:flex">
          <div className="border-b border-border/70 p-3">
            <Calendar
              mode="single"
              required
              selected={selected}
              month={weekStart}
              onMonthChange={date => setAnchor(date)}
              onSelect={date => {
                setSelected(date);
                setAnchor(date);
              }}
              weekStartsOn={1}
              showOutsideDays
              className="mx-auto w-full p-0 [--cell-size:--spacing(8)]"
              formatters={{
                formatCaption: date =>
                  date.toLocaleDateString("de-DE", {
                    month: "long",
                    year: "numeric",
                  }),
                formatWeekdayName: date =>
                  date.toLocaleDateString("de-DE", { weekday: "short" }).slice(0, 2),
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={goToToday}
            >
              Heute, {TODAY.getDate()}. {monthLong(TODAY)}
            </Button>
          </div>

          <FilterGroup
            title="Fahrlehrer"
            options={instructorOptions}
            selected={instructors}
            onToggle={toggle(setInstructors)}
          />
          <FilterGroup
            title="Niederlassung"
            options={niederlassungOptions}
            selected={niederlassungen}
            onToggle={toggle(setNiederlassungen)}
          />
          <FilterGroup
            title="Fahrzeug"
            options={vehicleOptions}
            selected={vehicles}
            onToggle={toggle(setVehicles)}
          />
          <FilterGroup
            title="Ereignistyp"
            options={eventTypeOptions}
            selected={types}
            onToggle={toggle(setTypes)}
          />
        </aside>

        {/* Main: week grid */}
        <main className="flex min-w-0 flex-1 flex-col bg-background">
          <div
            ref={gridRef}
            className="calendar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
            onWheel={handleCalendarWheel}
            style={{ scrollbarGutter: "stable" }}
          >
            {/* Sticky day headers — inside the scroller so they share its
                scrollbar inset and stay aligned with the columns below. */}
            {/* Day columns keep a consistent comfortable width (~180px each,
                + 64px time gutter) instead of squishing: the week overflows
                to the right and the horizontal scrollbar signals more days.
                min-w must match the time grid below to stay aligned. */}
            <div className="sticky top-0 z-30 flex min-w-[1324px] border-b border-border/70 bg-background">
              <div className="w-16 shrink-0" />
              <div className="grid flex-1 grid-cols-7">
                {days.map(day => {
                  const today = isSameDay(day, TODAY);
                  const count = (eventsByDay.get(toISODate(day)) ?? NO_EVENTS).length;
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "flex items-center justify-center gap-1.5 border-l border-border/70 py-2 text-xs font-medium",
                        today ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span className="capitalize">
                        {day
                          .toLocaleDateString("de-DE", { weekday: "short" })
                          .replace(".", "")}{" "}
                        {String(day.getDate()).padStart(2, "0")}.
                        {String(day.getMonth() + 1).padStart(2, "0")}.
                      </span>
                      {count > 0 && (
                        <Badge
                          variant={today ? "default" : "secondary"}
                          className="h-4 min-w-4 justify-center rounded-full px-1 text-[10px] tabular-nums"
                        >
                          {count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time grid */}
            <div className="flex min-w-[1324px]">
              {/* Time gutter */}
              <div
                className="relative w-16 shrink-0"
                style={{ height: GRID_HEIGHT }}
              >
                {HOUR_MARKS.map(hour => (
                  <span
                    key={hour}
                    className="absolute right-3 -translate-y-1/2 text-xs font-medium text-muted-foreground tabular-nums"
                    style={{
                      top:
                        hour === START_HOUR
                          ? 14
                          : hour === END_HOUR
                            ? GRID_HEIGHT - 1
                            : topForMinutes(hour * 60),
                    }}
                  >
                    {String(hour).padStart(2, "0")}
                  </span>
                ))}
                <div
                  className="absolute right-1 flex -translate-y-1/2 items-center gap-1 rounded-full bg-background px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-500/20"
                  style={{ top: topForMinutes(NIGHT_START_MINUTES) }}
                >
                  <Moon className="size-3" />
                  <span className="tabular-nums">21:15</span>
                </div>
              </div>

              {/* Day columns */}
              <div
                ref={dayGridRef}
                className="relative grid flex-1 grid-cols-7"
                style={{ height: GRID_HEIGHT }}
              >
                <div
                  className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  style={{ top: topForMinutes(NIGHT_START_MINUTES) }}
                >
                  <span className="h-px flex-1 bg-indigo-500/55" />
                </div>

                {/* Ghost block while a preset is dragged from the menu */}
                {presetDrag &&
                  presetDrag.day !== null &&
                  presetDrag.startMinutes !== null && (
                    <div
                      className="pointer-events-none absolute z-20 overflow-hidden rounded-md border border-dashed border-foreground/30 bg-background/95 shadow-md"
                      style={{
                        top: topForMinutes(presetDrag.startMinutes),
                        left: `calc(${(presetDrag.day * 100) / DAY_COUNT}% + 2px)`,
                        width: `calc(${100 / DAY_COUNT}% - 4px)`,
                        height: Math.max(
                          (presetDrag.preset.duration / 60) * HOUR_HEIGHT - 1,
                          44
                        ),
                      }}
                    >
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 w-1",
                          calendarEventThemes[presetDrag.preset.type].rail
                        )}
                      />
                      <div className="flex h-full flex-col justify-center gap-0.5 py-1 pr-2 pl-3">
                        <span className="truncate text-xs font-medium">
                          {presetDrag.preset.title}
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatMinutes(presetDrag.startMinutes)}–
                          {formatMinutes(
                            presetDrag.startMinutes + presetDrag.preset.duration
                          )}
                        </span>
                      </div>
                    </div>
                  )}

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
              </div>
            </div>
          </div>
          <WeekScrollbar scrollerRef={gridRef} />
        </main>
      </div>

      <EventEditDialog
        event={editingEvent}
        open={editingEvent !== null}
        onOpenChange={open => {
          if (!open) setEditingEvent(null);
        }}
        onSave={handleEventSave}
        instructorOptions={instructorOptions}
        studentOptions={studentOptions}
        studentIdByName={studentIdByName}
        vehicleOptions={vehicleOptions}
      />
    </div>
  );
}

export default Kalendar;
