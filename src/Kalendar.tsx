import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";
import {
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MapPin,
  Moon,
  Printer,
  Plus,
  Search,
  UserRound,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
const TODAY = new Date(2026, 5, 9); // Di, 09.06.2026
const NOW_MINUTES = 13 * 60 + 30;

const toMinutes = (value: string) => {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return h * 60 + m;
};

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

const topForMinutes = (minutes: number) =>
  ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;

/* ------------------------------------------------------------------ */
/* Event types + seed data                                            */
/* ------------------------------------------------------------------ */

type EventType =
  | "Praktisch"
  | "Theorie"
  | "Vorstellung zur prakt. Prüfung"
  | "Theorieprüfung"
  | "Andere";

type CalEvent = {
  id: string;
  day: number; // 0 = Monday … 6 = Sunday
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

type CalendarEventCardTheme = {
  rail: string;
  badge: string;
  icon: string;
  focus: string;
  shortLabel: string;
};

const calendarEventThemes: Record<EventType, CalendarEventCardTheme> = {
  Praktisch: {
    rail: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700 ring-sky-500/15",
    icon: "text-sky-600",
    focus: "focus-visible:ring-sky-500/25 hover:border-sky-300",
    shortLabel: "Praxis",
  },
  Theorie: {
    rail: "bg-indigo-500",
    badge: "bg-indigo-500/10 text-indigo-700 ring-indigo-500/15",
    icon: "text-indigo-600",
    focus: "focus-visible:ring-indigo-500/25 hover:border-indigo-300",
    shortLabel: "Theorie",
  },
  "Vorstellung zur prakt. Prüfung": {
    rail: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700 ring-amber-500/15",
    icon: "text-amber-600",
    focus: "focus-visible:ring-amber-500/25 hover:border-amber-300",
    shortLabel: "Prüfung",
  },
  Theorieprüfung: {
    rail: "bg-rose-500",
    badge: "bg-rose-500/10 text-rose-700 ring-rose-500/15",
    icon: "text-rose-600",
    focus: "focus-visible:ring-rose-500/25 hover:border-rose-300",
    shortLabel: "TÜV",
  },
  Andere: {
    rail: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/15",
    icon: "text-emerald-600",
    focus: "focus-visible:ring-emerald-500/25 hover:border-emerald-300",
    shortLabel: "Extra",
  },
};

const seedEvents: CalEvent[] = [
  {
    id: "evt-theory-mo-1800",
    day: 0,
    start: "18:00",
    end: "19:30",
    title: "Thema 9: Verkehrsverhalten bei Fahrmanöver; Verkehrsbeobachtung",
    subtitle: "Köksal G.",
    location: "Fahrschule Gül",
    instructor: "Köksal G.",
    type: "Theorie",
  },
  {
    id: "evt-drive-di-0900",
    day: 1,
    start: "09:00",
    end: "09:45",
    title: "Fahrstunde · Stadt",
    subtitle: "Lena Braun",
    instructor: "Nadine Aksoy",
    vehicle: "Golf",
    type: "Praktisch",
  },
  {
    id: "evt-theory-di-1800",
    day: 1,
    start: "18:00",
    end: "19:30",
    title: "Thema 10: Ruhender Verkehr",
    subtitle: "Köksal G.",
    location: "Fahrschule Gül",
    instructor: "Köksal G.",
    type: "Theorie",
  },
  {
    id: "evt-drive-mi-1100",
    day: 2,
    start: "11:00",
    end: "12:30",
    title: "Überlandfahrt · Klasse B",
    subtitle: "Jonas Meyer",
    instructor: "Emre Guel",
    vehicle: "BMW X1",
    type: "Praktisch",
  },
  {
    id: "evt-drive-do-0830",
    day: 3,
    start: "08:30",
    end: "09:15",
    title: "Fahrübungsstunde · B197",
    subtitle: "Zahra Rezaie",
    instructor: "Köksal G.",
    vehicle: "Golf",
    type: "Praktisch",
    tentative: true,
  },
  {
    id: "evt-testprep-do-1400",
    day: 3,
    start: "14:00",
    end: "15:30",
    title: "Vorstellung · Prüfungsvorbereitung",
    subtitle: "Aylin Demir",
    instructor: "Emre Guel",
    vehicle: "BMW X1",
    type: "Vorstellung zur prakt. Prüfung",
  },
  {
    id: "evt-theory-test-fr-1000",
    day: 4,
    start: "10:00",
    end: "10:45",
    title: "Theorieprüfung · TÜV",
    subtitle: "Tom Richter",
    location: "TÜV Süd",
    instructor: "Nadine Aksoy",
    type: "Theorieprüfung",
  },
  {
    id: "evt-drive-fr-1600",
    day: 4,
    start: "16:00",
    end: "17:00",
    title: "Fahrstunde · Autobahn",
    subtitle: "Mara Köhler",
    instructor: "Nadine Aksoy",
    vehicle: "Golf",
    type: "Praktisch",
  },
  {
    id: "evt-first-aid-sa-0900",
    day: 5,
    start: "09:00",
    end: "11:00",
    title: "Erste-Hilfe Kurs",
    subtitle: "Gruppe A",
    location: "Fahrschule Gül",
    instructor: "Köksal G.",
    type: "Andere",
  },
];

/* ------------------------------------------------------------------ */
/* Filter configuration                                               */
/* ------------------------------------------------------------------ */

const instructorOptions = ["Köksal G.", "Nadine Aksoy", "Emre Guel"];
const niederlassungOptions = ["Fahrschule Gül"];
const vehicleOptions = ["Golf", "BMW X1"];
const eventTypeOptions: EventType[] = [
  "Praktisch",
  "Theorie",
  "Vorstellung zur prakt. Prüfung",
  "Theorieprüfung",
  "Andere",
];

/* ------------------------------------------------------------------ */
/* Date helpers                                                       */
/* ------------------------------------------------------------------ */

const startOfWeek = (date: Date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (result.getDay() + 6) % 7; // Monday = 0
  result.setDate(result.getDate() - day);
  return result;
};

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

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
  duration: number;
  pointerOffsetY: number;
};

function CalendarEventCard({
  event,
  compact,
  isDragging,
  style,
  theme,
  onPointerDown,
}: {
  event: CalEvent;
  compact: boolean;
  isDragging: boolean;
  style: CSSProperties;
  theme: CalendarEventCardTheme;
  onPointerDown: (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-grabbed={isDragging}
      aria-label={`${event.title}, ${event.start} bis ${event.end}`}
      draggable={false}
      onPointerDown={onPointerDown}
      style={style}
      className={cn(
        "group absolute touch-none select-none overflow-hidden rounded-lg border bg-card text-left text-card-foreground shadow-[0_1px_2px_rgba(22,23,24,0.05)] outline-hidden transition-[box-shadow,transform,border-color] duration-150 ease-out focus-visible:ring-2",
        "cursor-grab active:cursor-grabbing hover:-translate-y-px hover:shadow-lift",
        theme.focus,
        event.tentative && "border-dashed bg-background/80",
        isDragging ? "z-30 scale-[1.015] shadow-lift" : "z-20"
      )}
    >
      <div className="flex h-full min-w-0 gap-2 p-1.5">
        <span
          className={cn("w-1 shrink-0 rounded-full", theme.rail)}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1">
            <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-foreground tabular-nums">
              {event.start}–{event.end}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span
                className={cn(
                  "inline-flex shrink-0 items-center justify-center truncate rounded-sm text-center font-medium leading-none ring-1",
                  compact
                    ? "h-3.5 max-w-[3.6rem] px-1 text-[9px]"
                    : "h-4 max-w-[4.75rem] px-1.5 text-[10px]",
                  theme.badge
                )}
              >
                {theme.shortLabel}
              </span>
              {!compact && (
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground/70 opacity-70 transition-opacity group-hover:opacity-100" />
              )}
            </span>
          </div>
          <div
            className={cn(
              "mt-1 min-w-0 font-medium leading-tight text-foreground",
              compact ? "truncate text-[11px]" : "line-clamp-2 text-[12px]"
            )}
          >
            {event.title}
          </div>
          {compact && event.subtitle && (
            <div className="mt-0.5 truncate text-[10px] leading-none text-muted-foreground">
              {event.subtitle}
            </div>
          )}
          {!compact && (
            <div className="mt-auto flex min-w-0 items-center gap-2 pt-1 text-[11px] leading-none text-muted-foreground">
              {event.subtitle && (
                <span className="flex min-w-0 items-center gap-1 truncate">
                  <UserRound className={cn("size-3 shrink-0", theme.icon)} />
                  <span className="truncate">{event.subtitle}</span>
                </span>
              )}
              {event.vehicle && (
                <span className="flex shrink-0 items-center gap-1">
                  <Car className={cn("size-3", theme.icon)} />
                  {event.vehicle}
                </span>
              )}
              {event.location && !event.vehicle && (
                <span className="flex min-w-0 items-center gap-1 truncate">
                  <MapPin className={cn("size-3 shrink-0", theme.icon)} />
                  <span className="truncate">{event.location}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function EventBlock({
  event,
  column,
  columns,
  isDragging,
  onDragStart,
}: {
  event: CalEvent;
  column: number;
  columns: number;
  isDragging: boolean;
  onDragStart: (
    event: CalEvent,
    pointerEvent: ReactPointerEvent<HTMLButtonElement>
  ) => void;
}) {
  const startMin = toMinutes(event.start);
  const endMin = toMinutes(event.end);
  const duration = endMin - startMin;
  const top = topForMinutes(startMin);
  const slotHeight = Math.max((duration / 60) * HOUR_HEIGHT - 1, 44);
  const widthPct = 100 / columns;
  const theme = calendarEventThemes[event.type];
  const compact = slotHeight < 58;

  return (
    <CalendarEventCard
      event={event}
      compact={compact}
      isDragging={isDragging}
      theme={theme}
      onPointerDown={pointerEvent => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.preventDefault();
        pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
        onDragStart(event, pointerEvent);
      }}
      style={{
        top,
        height: slotHeight,
        left: `calc(${column * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
    />
  );
}

/* Simple greedy column layout so overlapping events sit side by side. */
function layoutDay(dayEvents: CalEvent[]) {
  const sorted = [...dayEvents].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start)
  );
  const columnEnds: number[] = [];
  const placed = sorted.map(event => {
    const start = toMinutes(event.start);
    const end = toMinutes(event.end);
    let column = columnEnds.findIndex(columnEnd => columnEnd <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }
    return { event, column };
  });
  const columns = Math.max(1, columnEnds.length);
  return { placed, columns };
}

/* ------------------------------------------------------------------ */
/* Kalendar page                                                      */
/* ------------------------------------------------------------------ */

export function Kalendar() {
  const [anchor, setAnchor] = useState<Date>(TODAY);
  const [selected, setSelected] = useState<Date | undefined>(TODAY);
  const [calendarEvents, setCalendarEvents] = useState<CalEvent[]>(seedEvents);
  const [instructors, setInstructors] = useState<Set<string>>(new Set());
  const [niederlassungen, setNiederlassungen] = useState<Set<string>>(new Set());
  const [vehicles, setVehicles] = useState<Set<string>>(new Set());
  const [types, setTypes] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<DragState | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dayGridRef = useRef<HTMLDivElement>(null);

  // Open the grid scrolled to the morning, like a real calendar.
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTop = (7 - START_HOUR) * HOUR_HEIGHT;
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const moveEventToPointer = (clientX: number, clientY: number) => {
      const grid = dayGridRef.current;
      if (!grid) return;

      const rect = grid.getBoundingClientRect();
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

      setCalendarEvents(current =>
        current.map(event =>
          event.id === dragging.id
            ? {
                ...event,
                day,
                start: formatMinutes(startMinutes),
                end: formatMinutes(endMinutes),
              }
            : event
        )
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      event.preventDefault();
      moveEventToPointer(event.clientX, event.clientY);
    };
    const stopDragging = () => setDragging(null);

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
  }, [dragging]);

  const weekStart = useMemo(() => startOfWeek(anchor), [anchor]);
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

  const handleEventDragStart = (
    event: CalEvent,
    pointerEvent: ReactPointerEvent<HTMLButtonElement>
  ) => {
    const rect = pointerEvent.currentTarget.getBoundingClientRect();
    setDragging({
      id: event.id,
      duration: toMinutes(event.end) - toMinutes(event.start),
      pointerOffsetY: pointerEvent.clientY - rect.top,
    });
  };

  const rangeLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${weekStart.getDate()}.–${weekEnd.getDate()}. ${monthLong(weekEnd)}`
      : `${weekStart.getDate()}. ${monthShort(weekStart)} – ${weekEnd.getDate()}. ${monthShort(weekEnd)}`;

  const goToToday = () => {
    setAnchor(TODAY);
    setSelected(TODAY);
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <PageHeader>
        <div className="flex items-center gap-2 pl-[124px] lg:pl-72">
          <Select defaultValue="woche">
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tag">Tag</SelectItem>
                <SelectItem value="woche">Woche</SelectItem>
                <SelectItem value="monat">Monat</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
          <Button type="button" size="sm">
            <Plus data-icon="inline-start" />
            Ereignis
          </Button>
        </div>
      </PageHeader>

      <div className="flex min-h-0 flex-1">
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
            className="subtle-scrollbar min-h-0 flex-1 overflow-auto"
            style={{ scrollbarGutter: "stable" }}
          >
            {/* Sticky day headers — inside the scroller so they share its
                scrollbar inset and stay aligned with the columns below. */}
            <div className="sticky top-0 z-30 flex min-w-[980px] border-b border-border/70 bg-background">
              <div className="w-16 shrink-0" />
              <div className="grid flex-1 grid-cols-7">
                {days.map(day => {
                  const today = isSameDay(day, TODAY);
                  const count = visibleEvents.filter(
                    event => isSameDay(addDays(weekStart, event.day), day)
                  ).length;
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
            <div className="flex min-w-[980px]">
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
                {days.map(day => {
                  const today = isSameDay(day, TODAY);
                  const dayEvents = visibleEvents.filter(
                    event => isSameDay(addDays(weekStart, event.day), day)
                  );
                  const { placed, columns } = layoutDay(dayEvents);
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "relative h-full border-l border-border/70",
                        today && "bg-primary/[0.02]"
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
                      {placed.map(({ event, column }, index) => (
                        <EventBlock
                          key={event.id}
                          event={event}
                          column={column}
                          columns={columns}
                          isDragging={dragging?.id === event.id}
                          onDragStart={handleEventDragStart}
                        />
                      ))}

                      {/* Now indicator */}
                      {today && (
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
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Kalendar;
