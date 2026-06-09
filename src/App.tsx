import "./index.css";
import { useEffect, useState } from "react";
import { Agentation } from "agentation";
import {
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

import { Dashboard } from "./Dashboard";
import { Fahrschueler } from "./Fahrschueler";
import { Profil } from "./Profil";
import { Theorie } from "./Theorie";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/sidebar";

type IconCmp = React.ComponentType<{ className?: string }>;

const navItems: { label: string; Icon: IconCmp; route?: string }[] = [
  { label: "Home", Icon: LayoutGrid, route: "/" },
  { label: "Profil", Icon: User, route: "/profil" },
  { label: "Theorie", Icon: BookOpen, route: "/theorie" },
  { label: "Unterricht", Icon: Users },
  { label: "Schüler Anmeldung", Icon: UserPlus },
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
      { label: "Marketing", Icon: Megaphone },
      { label: "Schulprofil", Icon: Building2 },
      { label: "Preisangebot", Icon: Tag },
      { label: "Bewertungen", Icon: Heart },
    ],
  },
  {
    label: "Verwaltung",
    Icon: CalendarClock,
    iconColor: "text-green-700!",
    items: [
      { label: "Terminanfragen", Icon: CalendarClock },
      { label: "Fahrschule", Icon: Building2 },
      { label: "Kalender", Icon: CalendarDays },
      { label: "Fahrlehrer/in", Icon: Users },
      { label: "Fahrzeuge", Icon: Car },
      { label: "Fahrschüler", Icon: GraduationCap, route: "/fahrschueler" },
      { label: "Theorie Gruppen", Icon: BookOpen },
      { label: "Buchhaltung", Icon: Receipt },
      { label: "Statistik", Icon: BarChart3 },
      { label: "Plaudern", Icon: MessageCircle },
      { label: "Bewertungen", Icon: Star },
      { label: "Verträge", Icon: FileText },
      { label: "Prüfungsplaner", Icon: CalendarCheck },
    ],
  },
];

function usePath() {
  const [path, setPath] = useState(
    typeof window !== "undefined" ? window.location.pathname : "/"
  );
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (to: string) => {
    if (to === window.location.pathname) return;
    window.history.pushState({}, "", to);
    setPath(to);
  };
  return { path, navigate };
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
                      {items.map(({ label: subLabel, Icon: SubIcon, route }) => (
                        <SidebarMenuSubItem key={subLabel}>
                          <SidebarMenuSubButton asChild>
                            <a
                              href={route ?? "#"}
                              onClick={event => {
                                event.preventDefault();
                                if (route) navigate(route);
                              }}
                            >
                              <SubIcon className={iconColor} />
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
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <LayoutGrid className="size-4" />
                  </div>
                  <div className="flex flex-1 items-center gap-1.5">
                    <span className="font-heading text-base font-medium tracking-tight">
                      Fahrschule
                    </span>
                    <Badge variant="secondary" className="px-1.5 text-[10px]">
                      ADMIN
                    </Badge>
                  </div>
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
  return (
    <div className="fixed left-5 top-5 z-[60] flex items-center gap-1">
      <SidebarTrigger className="size-7" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 text-muted-foreground"
        onClick={() => window.history.back()}
      >
        <ArrowLeft />
        <span className="sr-only">Zurück</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 text-muted-foreground"
        onClick={() => window.history.forward()}
      >
        <ArrowRight />
        <span className="sr-only">Vorwärts</span>
      </Button>
    </div>
  );
}

export function App() {
  const { path, navigate } = usePath();
  const page =
    path === "/profil" ? (
      <Profil />
    ) : path === "/theorie" ? (
      <Theorie />
    ) : path === "/fahrschueler" ? (
      <Fahrschueler />
    ) : (
      <Dashboard />
    );

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider className="bg-sidebar">
        <ShellControls />
        <AppSidebar path={path} navigate={navigate} />
        <SidebarInset className="h-[calc(100svh-1rem)] min-h-0 overflow-hidden border-l border-border/70 shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_16px_48px_-28px_rgba(0,0,0,0.35)] md:!m-2 md:!rounded-2xl">
          {page}
        </SidebarInset>
      </SidebarProvider>
      {process.env.NODE_ENV === "development" && <DevAgentation />}
    </TooltipProvider>
  );
}

export default App;
