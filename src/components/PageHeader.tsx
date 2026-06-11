import { useSidebar } from "@/components/ui/sidebar";
import { isElectron, isElectronMac } from "@/lib/platform";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  children?: React.ReactNode;
  center?: React.ReactNode;
  end?: React.ReactNode;
  className?: string;
};

export function PageHeader({ children, center, end, className }: PageHeaderProps) {
  const { state, isMobile } = useSidebar();
  // With the sidebar collapsed (or on mobile, where it overlays), the fixed
  // ShellControls (toggle + history arrows) float above the inset's top-left
  // corner — leading header content must move out from underneath them.
  const shellControlsOverlap = isMobile || state === "collapsed";

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-11 w-full shrink-0 items-center gap-3 rounded-t-lg rounded-b-sm border border-border/70 bg-background px-3 2xl:h-12 2xl:px-4",
        // Frameless desktop window: the page header doubles as the
        // draggable "title bar". Interactive children stay clickable via
        // the no-drag carve-out in index.css; the floating ShellControls
        // survive because they render after this header in the DOM
        // (see App.tsx) — app-region rects apply in DOM order. Height is
        // pinned to 44px so the row stays centered on the traffic lights.
        isElectron && "app-region-drag 2xl:h-11",
        className
      )}
    >
      {/* Animated spacer — widens in lockstep with the sidebar collapse
          (same duration/easing as sidebar-container) so leading content
          glides clear of the fixed controls instead of jumping. */}
      <div
        aria-hidden
        className={cn(
          "-ml-3 h-px shrink-0 transition-[width] duration-300 ease-drawer motion-reduce:transition-none",
          // The desktop app shifts the controls right of the macOS
          // traffic lights, so leading content must clear both.
          shellControlsOverlap ? (isElectronMac ? "w-44" : "w-28") : "w-0"
        )}
      />
      {children}
      {center && <div className="absolute left-1/2 -translate-x-1/2">{center}</div>}
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </header>
  );
}
