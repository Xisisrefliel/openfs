import { cn } from "@/lib/utils";

/* Quiet panel chrome shared by the dashboard-style info cards
   (design guideline §4): hairline border, no shadow, hairline-divided
   header, micro-label readouts. */

export const panelCardClass = "rounded-lg border border-border/80 shadow-none";
export const panelHeaderClass = "border-b border-border/70";

/* The hairline deepens while the card is hovered — instant in, fade out
   (guideline §0.1). */
export const panelInteractiveClass =
  "transition-colors duration-150 hover:duration-0 hover:border-border";

/* Row actions stay hidden until the card is hovered or an action is
   focused — fine pointers only, touch always sees them. Card already
   carries `group/card`. Opacity (not display) so nothing shifts. */
export const panelActionsClass = cn(
  "pointer-fine:opacity-0 pointer-fine:transition-opacity pointer-fine:duration-150",
  "group-hover/card:opacity-100 group-hover/card:duration-0",
  "has-[:focus-visible]:opacity-100"
);

/* Micro-label over value — the readout unit used across the app. */
export function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[11px] font-medium leading-none text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-sm font-medium tabular-nums">{value}</dd>
    </div>
  );
}
