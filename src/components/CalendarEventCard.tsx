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
        "group absolute touch-none select-none overflow-hidden rounded-lg border bg-card text-left text-card-foreground shadow-[0_1px_2px_rgba(22,23,24,0.05)] outline-hidden transition-[height,box-shadow,transform,border-color] duration-150 ease-out focus-visible:ring-2",
        "h-[var(--card-h)] hover:h-[var(--card-h-expanded)] focus-visible:h-[var(--card-h-expanded)] data-[state=open]:h-[var(--card-h-expanded)]",
        "cursor-grab active:cursor-grabbing hover:z-30 hover:-translate-y-px hover:shadow-lift focus-visible:z-30 data-[state=open]:z-30 data-[state=open]:-translate-y-px data-[state=open]:shadow-lift",
        theme.focus,
        event.tentative && "border-dashed bg-background/80",
        isDragging ? "z-30 scale-[1.015] shadow-lift" : "z-20"
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-2 cursor-ns-resize rounded-t-lg"
        onPointerDown={event => onResizeStart("start", event)}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize rounded-b-lg"
        onPointerDown={event => onResizeStart("end", event)}
      />
      <div className="flex h-full min-w-0 gap-2 p-1.5">
        <span
          className={cn("w-1 shrink-0 rounded-full", theme.rail)}
          aria-hidden="true"
        />
        <div className="relative flex min-w-0 flex-1 flex-col">
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
              "min-w-0 font-medium leading-tight text-foreground",
              compact
                ? "mt-0.5 line-clamp-1 text-[11px] group-hover:line-clamp-2 group-focus-visible:line-clamp-2 group-data-[state=open]:line-clamp-2"
                : "mt-1 line-clamp-2 text-[12px]"
            )}
          >
            {event.title}
          </div>
          {/* Compact cards stay collapsed by default, so surface the
              instructor here — the meta row below only shows on hover. */}
          {compact && event.instructor && (
            <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] leading-none text-muted-foreground">
              <GraduationCap className={cn("size-3 shrink-0", theme.icon)} />
              <span className="truncate">{event.instructor}</span>
            </div>
          )}
          <div
            className={cn(
              "flex min-w-0 items-center gap-x-2 gap-y-0.5 text-[11px] leading-none text-muted-foreground",
              compact
                ? "absolute inset-x-0 bottom-0 flex-wrap translate-y-1 opacity-0 transition-[opacity,transform] delay-75 duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-data-[state=open]:translate-y-0 group-data-[state=open]:opacity-100"
                : "mt-auto flex-wrap pt-1"
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
