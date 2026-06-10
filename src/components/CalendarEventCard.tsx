import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  Car,
  GraduationCap,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/calendar-data";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/* Color-block theming: the whole card carries the event-type tint —
   tinted surface, saturated left rail, type-colored type. Defined per
   EventType in Kalendar.tsx (calendarEventThemes). */
export type CalendarEventCardTheme = {
  /** Tinted card surface: background + border + hover deepening. */
  surface: string;
  /** Saturated accent — left bar here, preset-dropdown dot in Kalendar. */
  rail: string;
  /** Primary ink (time + title). */
  text: string;
  /** Secondary ink (meta row). */
  meta: string;
  /** Meta icons. */
  icon: string;
  /** Uppercase type micro-label. */
  chip: string;
  focus: string;
  shortLabel: string;
};

const RESIZE_EDGE_SIZE = 10;

export function CalendarEventCard({
  event,
  compact,
  dense,
  isDragging,
  style,
  theme,
  onPointerDown,
  onResizeStart,
  onEdit,
  onDelete,
}: {
  event: CalEvent;
  compact: boolean;
  /* Taller than compact but still too short for a wrapped meta row (~1h):
     title and meta stay on one line each and truncate instead of wrapping. */
  dense: boolean;
  isDragging: boolean;
  style: CSSProperties;
  theme: CalendarEventCardTheme;
  onPointerDown: (pointerEvent: ReactPointerEvent<HTMLButtonElement>) => void;
  onResizeStart: (
    edge: "start" | "end",
    pointerEvent: ReactPointerEvent<HTMLElement>
  ) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          aria-grabbed={isDragging}
          aria-label={`${event.title}, ${event.start} bis ${event.end}`}
          draggable={false}
          onPointerDown={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            const offsetY = event.clientY - rect.top;

            if (offsetY <= RESIZE_EDGE_SIZE) {
              onResizeStart("start", event);
              return;
            }

            if (rect.height - offsetY <= RESIZE_EDGE_SIZE) {
              onResizeStart("end", event);
              return;
            }

            onPointerDown(event);
          }}
          style={style}
          className={cn(
        /* @container lets the content adapt to the card's own width (which
           shrinks with the viewport AND when overlapping events share a
           column) — secondary info hides before the time can truncate. */
        "group @container absolute touch-none select-none overflow-hidden rounded-md border text-left shadow-[0_1px_2px_rgba(22,23,24,0.04)] outline-hidden transition-[box-shadow,border-color,background-color] duration-150 ease-out focus-visible:ring-2",
        theme.surface,
        /* Every size shows its full info inline — no hover expansion. The
           hover lift is shadow-only on purpose: a translate/scale moves the
           bottom edge out from under the cursor, which flips :hover off and
           makes the card oscillate right where users grab to resize. */
        "h-[var(--card-h)]",
        "cursor-grab active:cursor-grabbing hover:z-30 hover:shadow-lift focus-visible:z-30 data-[state=open]:z-30 data-[state=open]:shadow-lift",
        theme.focus,
        /* Tentative: dashed outline + diagonal hatching over the tint —
           readable as "pencilled in" even at a glance from across the grid. */
        event.tentative &&
          "border-dashed [background-image:repeating-linear-gradient(135deg,transparent_0,transparent_5px,rgba(255,255,255,0.5)_5px,rgba(255,255,255,0.5)_10px)] dark:[background-image:repeating-linear-gradient(135deg,transparent_0,transparent_5px,rgba(255,255,255,0.05)_5px,rgba(255,255,255,0.05)_10px)]",
        /* While dragging, drop transitions so move/resize feedback tracks
           the pointer 1:1. */
        isDragging ? "z-30 shadow-lift transition-none" : "z-20"
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-2.5 cursor-ns-resize rounded-t-lg"
        onPointerDown={event => onResizeStart("start", event)}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-10 h-2.5 cursor-ns-resize rounded-b-lg"
        onPointerDown={event => onResizeStart("end", event)}
      />
      {/* Saturated left rail — clipped by the card's rounded corners. */}
      <span
        className={cn("absolute inset-y-0 left-0 w-[3px]", theme.rail)}
        aria-hidden="true"
      />
      <div
        className={cn(
          "flex h-full min-w-0",
          compact ? "py-1 pl-2.5 pr-1.5" : "py-1.5 pl-3 pr-2"
        )}
      >
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-1">
            <span
              className={cn(
                "min-w-0 truncate text-[11px] font-bold leading-none tabular-nums",
                theme.text
              )}
            >
              {event.start}–{event.end}
            </span>
            {/* The time always wins: the type label drops out on narrow
                cards instead of truncating "09:00–10:00" to "09:0…". */}
            <span
              className={cn(
                "hidden shrink-0 truncate text-right font-semibold uppercase leading-none tracking-[0.08em] @[10rem]:inline",
                compact ? "max-w-[3.6rem] text-[8px]" : "max-w-[4.75rem] text-[9px]",
                theme.chip
              )}
            >
              {theme.shortLabel}
            </span>
          </div>
          <div
            className={cn(
              /* shrink-0 so the meta row below can never squeeze/overlap
                 the title when space runs out — the meta clips instead. */
              "min-w-0 shrink-0 font-semibold",
              theme.text,
              compact
                ? "mt-px truncate text-[10px] leading-3"
                : cn(
                    "mt-1 text-[12px] leading-tight",
                    dense ? "line-clamp-1" : "line-clamp-2"
                  )
            )}
          >
            {event.title}
          </div>
          {/* Meta — always fully visible. Compact and dense cards keep it
              to a single truncating line (student truncates first, the
              vehicle never does); only tall cards let it wrap. */}
          <div
            className={cn(
              /* shrink-0: the row keeps its full line height even when font
                 metrics overshoot the card's exact-fit budget — any 1px
                 excess falls into the card's bottom padding instead of the
                 row squeezing and clipping the tops of its icons. */
              "mt-auto flex min-w-0 shrink-0 items-center",
              compact
                ? "gap-x-1.5 text-[10px] leading-3"
                : "gap-x-2 gap-y-0.5 pt-1 text-[11px] leading-none",
              /* Compact/dense stay on one line via per-item truncation
                 (horizontal only — no overflow-hidden, nothing to clip
                 vertically); tall cards may wrap. */
              !compact && !dense && "flex-wrap",
              theme.meta
            )}
          >
            {event.subtitle && (
              <span className="flex min-w-0 items-center gap-1">
                <UserRound className={cn("size-3 shrink-0", theme.icon)} />
                <span className="truncate">{event.subtitle}</span>
              </span>
            )}
            {event.instructor && event.instructor !== event.subtitle && (
              <span
                className={cn(
                  "min-w-0 items-center gap-1",
                  /* On narrow compact cards the instructor yields to the
                     student + vehicle before anything truncates to nothing. */
                  compact ? "hidden @[12rem]:flex" : "flex"
                )}
              >
                <GraduationCap className={cn("size-3 shrink-0", theme.icon)} />
                <span className="truncate">{event.instructor}</span>
              </span>
            )}
            {event.vehicle && (
              <span className="flex shrink-0 items-center gap-1">
                <Car className={cn("size-3", theme.icon)} />
                {event.vehicle}
              </span>
            )}
            {event.location && !event.vehicle && (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className={cn("size-3 shrink-0", theme.icon)} />
                <span className="truncate">{event.location}</span>
              </span>
            )}
          </div>
        </div>
      </div>
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">
        <ContextMenuItem onSelect={() => onEdit?.()}>
          <Pencil />
          Bearbeiten
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => onDelete?.()}>
          <Trash2 />
          Löschen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
