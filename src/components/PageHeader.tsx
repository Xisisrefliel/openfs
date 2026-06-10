import { useSidebar } from "@/components/ui/sidebar";
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
        "sticky top-0 z-30 flex h-11 w-full shrink-0 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur-md 2xl:h-12 2xl:px-4",
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
          shellControlsOverlap ? "w-28" : "w-0"
        )}
      />
      {children}
      {center && <div className="absolute left-1/2 -translate-x-1/2">{center}</div>}
      {end && <div className="ml-auto flex items-center gap-2">{end}</div>}
    </header>
  );
}
