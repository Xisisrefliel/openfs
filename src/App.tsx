import "./index.css";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

import { Archiv } from "./Archiv";
import { Bewertungen } from "./Bewertungen";
import { Dashboard } from "./Dashboard";
import { Buchhaltung } from "./Buchhaltung";
import { Kalendar } from "./Kalendar";
import { Marketing } from "./Marketing";
import { Pruefungsplaner } from "./Pruefungsplaner";
import { TheorieGruppen } from "./TheorieGruppen";
import { nonFahrstundeTypes } from "@/lib/calendar-data";
import { cn } from "@/lib/utils";
import { Fahrlehrer } from "./Fahrlehrer";
import { Fahrschule } from "./Fahrschule";
import { Fahrschueler } from "./Fahrschueler";
import { FahrschuelerDetail } from "./FahrschuelerDetail";
import { Fahrzeuge } from "./Fahrzeuge";
import { NeueSchueler } from "./NeueSchueler";
import { Plaudern } from "./Plaudern";
import { Preisangebot } from "./Preisangebot";
import { Profil } from "./Profil";
import { Schulprofil } from "./Schulprofil";
import { Statistik } from "./Statistik";
import { Anfrage } from "./Anfrage";
import { Terminanfragen } from "./Terminanfragen";
import { Theorie } from "./Theorie";
import { Vertraege } from "./Vertraege";
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
  { label: "Unterricht", Icon: Users },
  { label: "Schüler Anmeldung", Icon: UserPlus, route: "/neue-schueler" },
];

const navGroups: {
  label: string;
  Icon: IconCmp;
  items: { label: string; Icon: IconCmp; route?: string }[];
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

function readLocation() {
  if (typeof window === "undefined") return { path: "/", search: "" };
  return { path: window.location.pathname, search: window.location.search };
}

function usePath() {
  const [loc, setLoc] = useState(readLocation);
  useEffect(() => {
    const onPop = () => setLoc(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to: string) => {
    const url = new URL(to, window.location.origin);
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    ) {
      return;
    }
    window.history.pushState({}, "", to);
    setLoc({ path: url.pathname, search: url.search });
  };
  return { path: loc.path, search: loc.search, navigate };
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

function stretchSidebarHighlightTowardPointer(
  element: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  targetRect?: DOMRect,
) {
  if (!element) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.style.transform = "scaleX(1) scaleY(1)";
    return;
  }

  const rect = targetRect ?? element.getBoundingClientRect();
  const signedX = Math.max(
    -1,
    Math.min(1, (clientX - (rect.left + rect.width / 2)) / Math.max(rect.width / 2, 1)),
  );
  const signedY = Math.max(
    -1,
    Math.min(1, (clientY - (rect.top + rect.height / 2)) / Math.max(rect.height / 2, 1)),
  );
  const strengthX = Math.abs(signedX);
  const strengthY = Math.abs(signedY);
  const originX = signedX < -0.08 ? "right" : signedX > 0.08 ? "left" : "center";
  const originY = signedY < -0.08 ? "bottom" : signedY > 0.08 ? "top" : "center";

  element.style.transformOrigin = `${originX} ${originY}`;
  element.style.transform = `scaleX(${1 + strengthX * 0.014 - strengthY * 0.004}) scaleY(${1 + strengthY * 0.022 - strengthX * 0.003})`;
}

function resetSidebarHighlightStretch(element: HTMLDivElement | null) {
  if (!element) return;
  element.style.transformOrigin = "center";
  element.style.transform = "scaleX(1) scaleY(1)";
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

function AppSidebar({
  path,
  navigate,
}: {
  path: string;
  navigate: (to: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const highlightSurfaceRef = useRef<HTMLDivElement | null>(null);
  const hoverSurfaceRef = useRef<HTMLDivElement | null>(null);
  const hoverAnimationFrameRef = useRef<number | null>(null);
  const hoverHideTimeoutRef = useRef<number | null>(null);
  const hoverVisibleRef = useRef(false);
  const [sidebarCanScrollDown, setSidebarCanScrollDown] = useState(false);
  const [highlight, setHighlight] = useState<SidebarHighlightMetrics | null>(null);
  const [hoverHighlight, setHoverHighlight] = useState<SidebarHighlightMetrics | null>(
    null,
  );
  const [isHoverHighlightVisible, setIsHoverHighlightVisible] = useState(false);
  const updateHighlight = useCallback(() => {
    const content = contentRef.current;
    if (!content) {
      setHighlight(null);
      return;
    }

    const activeButton = content.querySelector<HTMLElement>('[data-active="true"]');
    if (!activeButton) {
      setHighlight(null);
      return;
    }

    const next = getSidebarHighlightMetrics(content, activeButton);
    setHighlight((current) =>
      sameSidebarHighlightMetrics(current, next) ? current : next,
    );
  }, []);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    updateHighlight();
    window.addEventListener("resize", updateHighlight);
    content.addEventListener("transitionend", updateHighlight);
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateHighlight);
    observer?.observe(content);
    const activeButton = content.querySelector<HTMLElement>('[data-active="true"]');
    if (activeButton) observer?.observe(activeButton);

    return () => {
      window.removeEventListener("resize", updateHighlight);
      content.removeEventListener("transitionend", updateHighlight);
      observer?.disconnect();
      if (hoverAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(hoverAnimationFrameRef.current);
        hoverAnimationFrameRef.current = null;
      }
      if (hoverHideTimeoutRef.current !== null) {
        window.clearTimeout(hoverHideTimeoutRef.current);
        hoverHideTimeoutRef.current = null;
      }
    };
  }, [path, updateHighlight]);

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

          if (target?.dataset.active === "true") {
            if (hoverAnimationFrameRef.current !== null) {
              window.cancelAnimationFrame(hoverAnimationFrameRef.current);
              hoverAnimationFrameRef.current = null;
            }
            if (hoverHideTimeoutRef.current !== null) {
              window.clearTimeout(hoverHideTimeoutRef.current);
              hoverHideTimeoutRef.current = null;
            }
            hoverVisibleRef.current = false;
            stretchSidebarHighlightTowardPointer(
              highlightSurfaceRef.current,
              event.clientX,
              event.clientY,
            );
            setIsHoverHighlightVisible(false);
            resetSidebarHighlightStretch(hoverSurfaceRef.current);
            return;
          }

          resetSidebarHighlightStretch(highlightSurfaceRef.current);
          if (!target) {
            if (hoverHideTimeoutRef.current === null) {
              hoverHideTimeoutRef.current = window.setTimeout(() => {
                hoverVisibleRef.current = false;
                setIsHoverHighlightVisible(false);
                resetSidebarHighlightStretch(hoverSurfaceRef.current);
                hoverHideTimeoutRef.current = null;
              }, 60);
            }
            return;
          }

          if (hoverHideTimeoutRef.current !== null) {
            window.clearTimeout(hoverHideTimeoutRef.current);
            hoverHideTimeoutRef.current = null;
          }
          const next = getSidebarHighlightMetrics(event.currentTarget, target);
          setHoverHighlight((current) =>
            sameSidebarHighlightMetrics(current, next) ? current : next,
          );
          if (!hoverVisibleRef.current) {
            stretchSidebarHighlightTowardPointer(
              hoverSurfaceRef.current,
              event.clientX,
              event.clientY,
              target.getBoundingClientRect(),
            );
            if (hoverAnimationFrameRef.current === null) {
              hoverAnimationFrameRef.current = window.requestAnimationFrame(() => {
                hoverVisibleRef.current = true;
                setIsHoverHighlightVisible(true);
                hoverAnimationFrameRef.current = null;
              });
            }
          } else {
            setIsHoverHighlightVisible(true);
            stretchSidebarHighlightTowardPointer(
              hoverSurfaceRef.current,
              event.clientX,
              event.clientY,
            );
          }
        }}
        onPointerLeave={() => {
          if (hoverAnimationFrameRef.current !== null) {
            window.cancelAnimationFrame(hoverAnimationFrameRef.current);
            hoverAnimationFrameRef.current = null;
          }
          if (hoverHideTimeoutRef.current !== null) {
            window.clearTimeout(hoverHideTimeoutRef.current);
            hoverHideTimeoutRef.current = null;
          }
          hoverVisibleRef.current = false;
          setIsHoverHighlightVisible(false);
          resetSidebarHighlightStretch(highlightSurfaceRef.current);
          resetSidebarHighlightStretch(hoverSurfaceRef.current);
        }}
      >
        {highlight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-0 transition-[transform,width,height] duration-200 ease-out motion-reduce:transition-none"
            style={{
              width: highlight.width,
              height: highlight.height,
              transform: `translate3d(${highlight.left}px, ${highlight.top}px, 0)`,
            }}
          >
            <div
              ref={highlightSurfaceRef}
              className="size-full rounded-md bg-sidebar-accent transition-transform duration-75 ease-out motion-reduce:transition-none"
            />
          </div>
        )}
        {hoverHighlight && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-0 left-0 z-1",
              isHoverHighlightVisible
                ? "transition-[transform,width,height] duration-180 ease-snappy motion-reduce:transition-none"
                : "transition-none",
            )}
            style={{
              width: hoverHighlight.width,
              height: hoverHighlight.height,
              transform: `translate3d(${hoverHighlight.left}px, ${hoverHighlight.top}px, 0)`,
            }}
          >
            <div
              className={cn(
                "size-full origin-center transition-[opacity,transform] ease-out motion-reduce:transition-none motion-reduce:transform-none",
                isHoverHighlightVisible
                  ? "scale-100 opacity-100 duration-120"
                  : "scale-[0.985] opacity-0 duration-100",
              )}
            >
              <div
                ref={hoverSurfaceRef}
                className="size-full rounded-md bg-sidebar-accent transition-transform duration-75 ease-out motion-reduce:transition-none"
              />
            </div>
          </div>
        )}
        <SidebarGroup className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            {navItems.map(({ label, Icon, route }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  tooltip={label}
                  isActive={route ? path === route : false}
                  className="hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                  disabled={!route}
                  aria-current={route && path === route ? "page" : undefined}
                  aria-disabled={!route}
                  onClick={() => route && navigate(route)}
                >
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {navGroups.map(({ label, Icon, items }) => (
          <SidebarGroup
            key={label}
            className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2"
          >
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={label}
                      className="hover:bg-transparent active:bg-transparent"
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
                            isActive={route ? path === route : false}
                            className="hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                          >
                            <a
                              href={route ?? "#"}
                              aria-current={route && path === route ? "page" : undefined}
                              aria-disabled={!route}
                              tabIndex={route ? undefined : -1}
                              onClick={(event) => {
                                event.preventDefault();
                                if (route) navigate(route);
                              }}
                            >
                              <SubIcon />
                              <span>{subLabel}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Archiv — Papierkorb für versehentlich gelöschte Einträge */}
        <SidebarGroup className="z-10 px-1 py-2 group-data-[collapsible=icon]:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Archiv"
                isActive={path === "/archiv"}
                className="hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                aria-current={path === "/archiv" ? "page" : undefined}
                onClick={() => navigate("/archiv")}
              >
                <Archive />
                <span>Archiv</span>
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
  const { path, search, navigate } = usePath();
  const calendarTypeFilter =
    new URLSearchParams(search).get("filter") === "non-fahrstunde"
      ? nonFahrstundeTypes
      : undefined;
  const studentDetailMatch = path.match(/^\/fahrschueler\/(\d+)$/);
  const page =
    path === "/profil" ? (
      <Profil />
    ) : path === "/theorie" ? (
      <Theorie />
    ) : studentDetailMatch ? (
      <FahrschuelerDetail
        key={studentDetailMatch[1]}
        studentId={Number(studentDetailMatch[1])}
        navigate={navigate}
      />
    ) : path === "/fahrschueler" ? (
      <Fahrschueler navigate={navigate} />
    ) : path === "/buchhaltung" ? (
      <Buchhaltung />
    ) : path === "/kalendar" ? (
      <Kalendar
        key={calendarTypeFilter ? "kalendar-non-fahrstunde" : "kalendar"}
        initialTypeFilter={calendarTypeFilter}
      />
    ) : path === "/fahrzeuge" ? (
      <Fahrzeuge />
    ) : path === "/fahrlehrer" ? (
      <Fahrlehrer />
    ) : path === "/neue-schueler" ? (
      <NeueSchueler />
    ) : path === "/preisangebot" ? (
      <Preisangebot />
    ) : path === "/plaudern" ? (
      <Plaudern />
    ) : path === "/marketing" ? (
      <Marketing />
    ) : path === "/theorie-gruppen" ? (
      <TheorieGruppen />
    ) : path === "/pruefungsplaner" ? (
      <Pruefungsplaner />
    ) : path === "/schulprofil" ? (
      <Schulprofil />
    ) : path === "/terminanfragen" ? (
      <Terminanfragen />
    ) : path === "/fahrschule" ? (
      <Fahrschule />
    ) : path === "/statistik" ? (
      <Statistik />
    ) : path === "/bewertungen" ? (
      <Bewertungen />
    ) : path === "/vertraege" ? (
      <Vertraege navigate={navigate} />
    ) : path === "/archiv" ? (
      <Archiv />
    ) : (
      <Dashboard />
    );

  if (path === "/anfrage") return <Anfrage />;

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider className="bg-sidebar">
        <AppSidebar path={path} navigate={navigate} />
        <SidebarInset className="h-[calc(100svh-1rem)] min-h-0 !bg-transparent !shadow-none md:!m-2 md:!rounded-lg">
          {page}
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
      {process.env.NODE_ENV === "development" && <DevAgentation />}
    </TooltipProvider>
  );
}

export default App;
