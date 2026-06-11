import "./index.css";
import { useEffect, useState } from "react";
import { Agentation } from "agentation";
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Car,
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
  Star,
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
import { Terminanfragen } from "./Terminanfragen";
import { Theorie } from "./Theorie";
import { Vertraege } from "./Vertraege";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
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
  SidebarTrigger,
  useSidebar,
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
  iconColor: string;
  items: { label: string; Icon: IconCmp; route?: string }[];
}[] = [
  {
    label: "Marketing",
    Icon: Megaphone,
    iconColor: "text-rose-500!",
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
    iconColor: "text-green-700!",
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
      { label: "Bewertungen", Icon: Star, route: "/bewertungen" },
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

function AppSidebar({
  path,
  navigate,
}: {
  path: string;
  navigate: (to: string) => void;
}) {
  return (
    <Sidebar variant="inset">
      <SidebarContent className="pt-[52px]">
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map(({ label, Icon, route }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  tooltip={label}
                  isActive={route ? path === route : false}
                  disabled={!route}
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

        {navGroups.map(({ label, Icon, iconColor, items }) => (
          <SidebarGroup key={label}>
            <SidebarMenu>
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={label}>
                      <Icon className={iconColor} />
                      <span>{label}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {items.map(
                        ({ label: subLabel, Icon: SubIcon, route }) => (
                          <SidebarMenuSubItem key={subLabel}>
                            <SidebarMenuSubButton asChild>
                              <a
                                href={route ?? "#"}
                                aria-disabled={!route}
                                tabIndex={route ? undefined : -1}
                                onClick={(event) => {
                                  event.preventDefault();
                                  if (route) navigate(route);
                                }}
                              >
                                <SubIcon className={iconColor} />
                                <span>{subLabel}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ),
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Archiv — Papierkorb für versehentlich gelöschte Einträge */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Archiv"
                isActive={path === "/archiv"}
                onClick={() => navigate("/archiv")}
              >
                <Archive className="text-amber-600!" />
                <span>Archiv</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
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

function ShellControls() {
  const { state, isMobile } = useSidebar();
  const [sidebarScrolled, setSidebarScrolled] = useState(false);

  // The sidebar nav scrolls underneath this fixed strip (SidebarContent
  // starts below it via pt-[52px]). Track its scroll position so the
  // strip can cast a shadow once items have actually slid under it.
  useEffect(() => {
    const content = document.querySelector('[data-slot="sidebar-content"]');
    if (!(content instanceof HTMLElement)) return;
    const onScroll = () => setSidebarScrolled(content.scrollTop > 0);
    onScroll();
    content.addEventListener("scroll", onScroll, { passive: true });
    return () => content.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-2 top-2 z-40 w-(--sidebar-width) px-3 pb-2 pt-2.5"
    >
      {/* The backdrop slides in lockstep with the sidebar — same distance
          (its own width), duration and easing as sidebar-container — so it
          covers scrolled sidebar items on every animation frame instead of
          popping in after a timeout (which let them flash through). */}
      <div
        className={cn(
          "absolute inset-0 bg-sidebar transition-transform duration-300 ease-drawer motion-reduce:transition-none",
          state === "expanded" ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Scroll fade on the bottom edge — not a shadow (gray on the
            same-colored sidebar reads as a smudge) but a mask in the
            sidebar's own color: items dissolve as they slide under the
            strip, hinting there's content to scroll back up to. Lives
            inside the backdrop so it slides with it. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-full h-10 bg-gradient-to-b from-sidebar via-sidebar/70 to-transparent transition-opacity duration-300",
            !isMobile && state === "expanded" && sidebarScrolled
              ? "opacity-100"
              : "opacity-0"
          )}
        />
      </div>
      <div className="pointer-events-auto relative flex items-center gap-1">
        <SidebarTrigger className="size-7 bg-transparent hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 bg-transparent text-muted-foreground hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
          onClick={() => window.history.back()}
        >
          <ArrowLeft />
          <span className="sr-only">Zurück</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 bg-transparent text-muted-foreground hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent"
          onClick={() => window.history.forward()}
        >
          <ArrowRight />
          <span className="sr-only">Vorwärts</span>
        </Button>
      </div>
    </div>
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

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider className="bg-sidebar">
        <AppSidebar path={path} navigate={navigate} />
        <SidebarInset className="h-[calc(100svh-1rem)] min-h-0 !bg-transparent !shadow-none md:!m-2 md:!rounded-lg">
          {page}
        </SidebarInset>
        <ShellControls />
      </SidebarProvider>
      <Toaster />
      {process.env.NODE_ENV === "development" && <DevAgentation />}
    </TooltipProvider>
  );
}

export default App;
