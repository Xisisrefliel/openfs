import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import {
  Car,
  GraduationCap,
  GripVertical,
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

export type CalendarEventCardTheme = {
  rail: string;
  badge: string;
  icon: string;
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
     the meta clamps to one line and the rest is revealed by hover-expand. */
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
        "group @container absolute touch-none select-none overflow-hidden rounded-lg border bg-card text-left text-card-foreground shadow-[0_1px_2px_rgba(22,23,24,0.05)] outline-hidden transition-[height,box-shadow,border-color] duration-150 ease-out focus-visible:ring-2",
        /* The hover lift is shadow-only on purpose: a translate/scale moves
           the bottom edge out from under the cursor, which flips :hover off
           and makes the card oscillate right where users grab to resize. */
        "h-[var(--card-h)]",
        "cursor-grab active:cursor-grabbing hover:z-30 hover:shadow-lift focus-visible:z-30 data-[state=open]:z-30 data-[state=open]:shadow-lift",
        theme.focus,
        event.tentative && "border-dashed bg-background/80",
        /* While dragging, pin the card to its time-true height and drop the
           height transition so move/resize feedback tracks the pointer 1:1
           instead of fighting the hover expansion. */
        isDragging
          ? "z-30 shadow-lift transition-none"
          : "z-20 hover:h-[var(--card-h-expanded)] focus-visible:h-[var(--card-h-expanded)] data-[state=open]:h-[var(--card-h-expanded)]",
        /* Hover-intent grace: delay only the height change (delays map to
           transition-[height,box-shadow,border-color]) in both directions —
           a moment to click-and-hold an edge before it moves away on enter,
           and a moment to re-enter before the card collapses on exit. Shadow
           feedback stays instant either way. */
        !isDragging &&
          "[transition-delay:250ms,0ms,0ms] hover:[transition-delay:250ms,0ms,0ms]"
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
      <div className={cn("flex h-full min-w-0 gap-2", compact ? "p-1" : "p-1.5")}>
        <span
          className={cn("w-1 shrink-0 rounded-full", theme.rail)}
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="grid min-w-0 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1">
            <span className="min-w-0 truncate text-[11px] font-semibold leading-none text-foreground tabular-nums">
              {event.start}–{event.end}
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {/* The time always wins: badge and grip drop out on narrow
                  cards instead of truncating "09:00–10:00" to "09:0…". */}
              <span
                className={cn(
                  "hidden shrink-0 items-center justify-center truncate rounded-sm text-center font-medium leading-none ring-1 @[10rem]:inline-flex",
                  compact
                    ? "h-3.5 max-w-[3.6rem] px-1 text-[9px]"
                    : "h-4 max-w-[4.75rem] px-1.5 text-[10px]",
                  theme.badge
                )}
              >
                {theme.shortLabel}
              </span>
              {!compact && (
                <GripVertical className="hidden size-3.5 shrink-0 text-muted-foreground/70 opacity-70 transition-opacity group-hover:opacity-100 @[14rem]:block" />
              )}
            </span>
          </div>
          {compact ? (
            <>
              <div className="mt-0.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1 text-[10px] leading-3">
                <span className="min-w-0 truncate font-medium text-foreground">
                  {event.title}
                </span>
                {event.instructor && (
                  <span className="hidden max-w-[6.25rem] shrink-0 items-center gap-1 text-muted-foreground @[12rem]:flex">
                    <GraduationCap className={cn("size-3 shrink-0", theme.icon)} />
                    <span className="truncate">{event.instructor}</span>
                  </span>
                )}
              </div>
              {/* Student + vehicle, revealed by the hover expansion. The fade
                  delay matches the card's height delay in both directions. */}
              {(event.subtitle || event.vehicle) && (
                <div className="mt-1 flex min-w-0 items-center gap-x-2 text-[10px] leading-3 text-muted-foreground opacity-0 transition-opacity duration-150 delay-[250ms] group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100">
                  {event.subtitle && (
                    <span className="flex min-w-0 items-center gap-1">
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
                </div>
              )}
            </>
          ) : (
            <div
              className={cn(
                /* shrink-0 so the meta row below can never squeeze/overlap
                   the title when space runs out — the meta clips instead. */
                "mt-1 min-w-0 shrink-0 text-[12px] font-medium leading-tight text-foreground",
                dense ? "line-clamp-1" : "line-clamp-2"
              )}
            >
              {event.title}
            </div>
          )}
          {!compact && (
          <div
            className={cn(
              "mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 pt-1 text-[11px] leading-none text-muted-foreground",
              /* Dense cards only have room for one meta line — clamp it and
                 let the hover expansion reveal the wrapped remainder, in sync
                 with the card's height delay. */
              dense &&
                "max-h-4 overflow-hidden transition-[max-height] duration-150 delay-[250ms] group-hover:max-h-12 group-focus-visible:max-h-12 group-data-[state=open]:max-h-12"
            )}
          >
            {event.subtitle && (!compact || event.subtitle !== event.instructor) && (
              <span className={cn("flex items-center gap-1", !compact && "min-w-0 truncate")}>
                <UserRound className={cn("size-3 shrink-0", theme.icon)} />
                <span className={cn(!compact && "truncate")}>{event.subtitle}</span>
              </span>
            )}
            {!compact && event.instructor && event.instructor !== event.subtitle && (
              <span className={cn("flex items-center gap-1", !compact && "min-w-0 truncate")}>
                <GraduationCap className={cn("size-3 shrink-0", theme.icon)} />
                <span className={cn(!compact && "truncate")}>{event.instructor}</span>
              </span>
            )}
            {event.vehicle && (
              <span className="flex shrink-0 items-center gap-1">
                <Car className={cn("size-3", theme.icon)} />
                {event.vehicle}
              </span>
            )}
            {event.location && !event.vehicle && (
              <span className={cn("flex items-center gap-1", !compact && "min-w-0 truncate")}>
                <MapPin className={cn("size-3 shrink-0", theme.icon)} />
                <span className={cn(!compact && "truncate")}>{event.location}</span>
              </span>
            )}
          </div>
          )}
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
