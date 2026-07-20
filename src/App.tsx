import "./index.css";
import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Agentation } from "agentation";
import {
  Archive,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FileText,
  GraduationCap,
  Heart,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageCircle,
  Receipt,
  Tag,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

type IconCmp = React.ComponentType<{ className?: string }>;

const navItems: { label: string; Icon: IconCmp; route?: string }[] = [
  { label: "Home", Icon: LayoutGrid, route: "/" },
  { label: "Profil", Icon: User, route: "/profil" },
  { label: "Theorie", Icon: BookOpen, route: "/theorie" },
  // { label: "Unterricht", Icon: Users },
  { label: "Schüler Anmeldung", Icon: UserPlus, route: "/neue-schueler" },
];

const navGroups: {
  label: string;
  Icon: IconCmp;
  items: { label: string; Icon: IconCmp; route: string }[];
}[] = [
  {
    label: "Marketing",
    Icon: Megaphone,
    items: [
      { label: "Marketing", Icon: Megaphone, route: "/marketing" },
      { label: "Schulprofil", Icon: Building2, route: "/schulprofil" },
      { label: "Preisangebot", Icon: Tag, route: "/preisangebot" },
      { label: "Bewertungen", Icon: Heart, route: "/bewertungen" },
    ],
  },
  {
    label: "Verwaltung",
    Icon: CalendarClock,
    items: [
      { label: "Terminanfragen", Icon: CalendarClock, route: "/terminanfragen" },
      { label: "Fahrschule", Icon: Building2, route: "/fahrschule" },
      { label: "Kalender", Icon: CalendarDays, route: "/kalendar" },
      { label: "Fahrlehrer/in", Icon: Users, route: "/fahrlehrer" },
      { label: "Fahrzeuge", Icon: Car, route: "/fahrzeuge" },
      { label: "Fahrschüler", Icon: GraduationCap, route: "/fahrschueler" },
      { label: "Theorie Gruppen", Icon: BookOpen, route: "/theorie-gruppen" },
      { label: "Buchhaltung", Icon: Receipt, route: "/buchhaltung" },
      { label: "Statistik", Icon: BarChart3, route: "/statistik" },
      { label: "Plaudern", Icon: MessageCircle, route: "/plaudern" },
      { label: "Verträge", Icon: FileText, route: "/vertraege" },
      { label: "Prüfungsplaner", Icon: CalendarCheck, route: "/pruefungsplaner" },
    ],
  },
];

type NavGroup = (typeof navGroups)[number];

const activeSidebarItemClass =
  "hover:bg-transparent active:bg-transparent data-active:bg-sidebar-accent transition-[background-color] duration-100 ease-out data-active:duration-0 motion-reduce:transition-none";

function SidebarNavGroup({ group, path }: { group: NavGroup; path: string }) {
  const { label, Icon, items } = group;
  const activeItem = items.find((item) => item.route === path);

  return (
    <SidebarGroup className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2">
      <SidebarMenu>
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                tooltip={label}
                className="hover:bg-transparent active:bg-transparent data-open:hover:bg-transparent"
              >
                <Icon />
                <span>{label}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 ease-drawer motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-200 ease-drawer data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100 motion-reduce:transition-none">
              <SidebarMenuSub className="min-h-0 overflow-hidden">
                {items.map(({ label: subLabel, Icon: SubIcon, route }) => (
                  <SidebarMenuSubItem key={subLabel}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={path === route}
                      className={activeSidebarItemClass}
                    >
                      <Link
                        to={route}
                        draggable={false}
                        aria-current={path === route ? "page" : undefined}
                      >
                        <SubIcon />
                        <span>{subLabel}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
            {activeItem && (
              <SidebarMenuSub className="group-data-[state=open]/collapsible:hidden">
                <SidebarMenuSubItem>
                  <SidebarMenuSubButton
                    asChild
                    isActive
                    className={activeSidebarItemClass}
                  >
                    <Link to={activeItem.route} draggable={false} aria-current="page">
                      <activeItem.Icon />
                      <span>{activeItem.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            )}
          </SidebarMenuItem>
        </Collapsible>
      </SidebarMenu>
    </SidebarGroup>
  );
}

function DevAgentation() {
  useEffect(() => {
    const ignoreCrossOriginScriptError = (event: ErrorEvent) => {
      if (event.message === "Script error.") {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener("error", ignoreCrossOriginScriptError, true);
    return () => {
      window.removeEventListener("error", ignoreCrossOriginScriptError, true);
    };
  }, []);

  return <Agentation />;
}

type SidebarHighlightMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
};

type SidebarHoverHighlight = SidebarHighlightMetrics & {
  path: string;
};

function getSidebarHighlightMetrics(
  content: HTMLElement,
  target: HTMLElement,
): SidebarHighlightMetrics {
  const contentRect = content.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return {
    left: targetRect.left - contentRect.left + content.scrollLeft,
    top: targetRect.top - contentRect.top + content.scrollTop,
    width: targetRect.width,
    height: targetRect.height,
  };
}

function sameSidebarHighlightMetrics(
  current: SidebarHighlightMetrics | null,
  next: SidebarHighlightMetrics,
) {
  return (
    current !== null &&
    Math.abs(current.left - next.left) < 0.5 &&
    Math.abs(current.top - next.top) < 0.5 &&
    Math.abs(current.width - next.width) < 0.5 &&
    Math.abs(current.height - next.height) < 0.5
  );
}

function isEnabledSidebarTarget(target: HTMLElement) {
  return !(
    target.getAttribute("aria-disabled") === "true" ||
    (target instanceof HTMLButtonElement && target.disabled)
  );
}

function getSidebarPointerTarget(
  content: HTMLElement,
  eventTarget: EventTarget | null,
  clientX: number,
  clientY: number,
) {
  const directTarget =
    eventTarget instanceof Element
      ? eventTarget.closest<HTMLElement>(
          '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]',
        )
      : null;
  if (directTarget && isEnabledSidebarTarget(directTarget)) return directTarget;

  let nearest: HTMLElement | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const target of content.querySelectorAll<HTMLElement>(
    '[data-sidebar="menu-button"], [data-sidebar="menu-sub-button"]',
  )) {
    if (!isEnabledSidebarTarget(target)) continue;
    const rect = target.getBoundingClientRect();
    const distanceX =
      clientX < rect.left
        ? rect.left - clientX
        : clientX > rect.right
          ? clientX - rect.right
          : 0;
    const distanceY =
      clientY < rect.top
        ? rect.top - clientY
        : clientY > rect.bottom
          ? clientY - rect.bottom
          : 0;
    if (distanceX <= 8 && distanceY <= 12 && distanceY < nearestDistance) {
      nearest = target;
      nearestDistance = distanceY;
    }
  }
  return nearest;
}

// The footer cue is a real affordance: clicking it pages the nav down so the
// items hidden under the fold scroll into view (smooth, reduced-motion aware).
function scrollSidebarNavigationDown() {
  const content = document.querySelector('[data-slot="sidebar-content"]');
  if (!(content instanceof HTMLElement)) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  content.scrollBy({
    top: Math.round(content.clientHeight * 0.7),
    behavior: reduce ? "auto" : "smooth",
  });
}

function AppSidebar({ path }: { path: string }) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [sidebarCanScrollDown, setSidebarCanScrollDown] = useState(false);
  const [hoverHighlight, setHoverHighlight] = useState<SidebarHoverHighlight | null>(
    null,
  );

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateFooterFade = () => {
      setSidebarCanScrollDown(
        content.scrollTop + content.clientHeight < content.scrollHeight - 1,
      );
    };

    updateFooterFade();
    content.addEventListener("scroll", updateFooterFade, { passive: true });
    window.addEventListener("resize", updateFooterFade);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateFooterFade);
    observer?.observe(content);

    return () => {
      content.removeEventListener("scroll", updateFooterFade);
      window.removeEventListener("resize", updateFooterFade);
      observer?.disconnect();
    };
  }, []);

  return (
    <Sidebar variant="inset">
      <SidebarContent
        ref={contentRef}
        className="relative isolate"
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;

          const target = getSidebarPointerTarget(
            event.currentTarget,
            event.target,
            event.clientX,
            event.clientY,
          );

          if (!target || target.dataset.active === "true") {
            setHoverHighlight(null);
            return;
          }

          const next = getSidebarHighlightMetrics(event.currentTarget, target);
          setHoverHighlight((current) =>
            current?.path === path && sameSidebarHighlightMetrics(current, next)
              ? current
              : { ...next, path },
          );
        }}
        onPointerLeave={() => {
          setHoverHighlight(null);
        }}
      >
        {hoverHighlight?.path === path && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-0 transition-[transform,width,height] duration-150 ease motion-reduce:transition-none"
            style={{
              width: hoverHighlight.width,
              height: hoverHighlight.height,
              transform: `translate3d(${hoverHighlight.left}px, ${hoverHighlight.top}px, 0)`,
            }}
          >
            <div className="size-full rounded-md bg-sidebar-accent" />
          </div>
        )}
        <SidebarGroup className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            {navItems.map(({ label, Icon, route }) => (
              <SidebarMenuItem key={label}>
                {route ? (
                  <SidebarMenuButton
                    asChild
                    tooltip={label}
                    isActive={path === route}
                    className={activeSidebarItemClass}
                  >
                    <Link
                      to={route}
                      draggable={false}
                      aria-current={path === route ? "page" : undefined}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip={label} disabled aria-disabled>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {navGroups.map((group) => (
          <SidebarNavGroup key={group.label} group={group} path={path} />
        ))}

        {/* Archiv — Papierkorb für versehentlich gelöschte Einträge */}
        <SidebarGroup className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Archiv"
                isActive={path === "/archiv"}
                className={activeSidebarItemClass}
              >
                <Link
                  to="/archiv"
                  draggable={false}
                  aria-current={path === "/archiv" ? "page" : undefined}
                >
                  <Archive />
                  <span>Archiv</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className={cn(
          "relative z-20 bg-sidebar before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-14 before:bg-gradient-to-t before:from-sidebar before:via-sidebar/90 before:to-transparent before:transition-opacity before:duration-300",
          sidebarCanScrollDown ? "before:opacity-100" : "before:opacity-0",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 -top-7 z-10 flex justify-center transition-[opacity,transform] duration-300 ease-snappy group-data-[collapsible=icon]:hidden motion-reduce:transition-none",
            sidebarCanScrollDown
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-1.5 scale-90 opacity-0",
          )}
        >
          <button
            type="button"
            aria-label="Weitere Menüpunkte anzeigen"
            tabIndex={sidebarCanScrollDown ? 0 : -1}
            onClick={scrollSidebarNavigationDown}
            className={cn(
              "group/cue flex size-6 items-center justify-center rounded-full border border-sidebar-border/70 bg-sidebar text-muted-foreground shadow-[var(--shadow-lift)] transition-[color,background-color] duration-150 hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
              sidebarCanScrollDown ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <ChevronDown className="size-3.5 transition-transform duration-150 group-hover/cue:translate-y-0.5" />
          </button>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <span className="flex-1 font-heading text-base font-medium tracking-tight">
                    Fahrschule
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-(--radix-popper-anchor-width) min-w-56"
              >
                <DropdownMenuItem variant="destructive">
                  <LogOut />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export function App() {
  const path = useRouterState({ select: (state) => state.location.pathname });

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider className="bg-sidebar">
        <AppSidebar path={path} />
        <SidebarInset className="h-[calc(100svh-1rem)] min-h-0 !bg-transparent !shadow-none md:!m-2 md:!rounded-lg">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
      {process.env.NODE_ENV === "development" && <DevAgentation />}
    </TooltipProvider>
  );
}

export default App;
