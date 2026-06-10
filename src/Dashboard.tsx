import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  ChevronRight,
  Euro,
  FileWarning,
  MapPin,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { PageHeader } from "./components/PageHeader.tsx";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  addDays,
  type CalEvent,
  eventTypeShortLabel,
  getCalendarEvents,
  isFahrstunde,
  isSameDay,
  parseISODate,
  startOfWeek,
  toMinutes,
  TODAY,
} from "@/lib/calendar-data";
import { useStudents } from "@/hooks/use-students";

type IconCmp = React.ComponentType<{ className?: string }>;

/* Navigate without threading the router down — mirrors the "Schüler
   anmelden" button and the usePath() popstate listener in App.tsx. */
function goTo(url: string) {
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/* ------------------------------------------------------------------ */
/* Shared calendar data — every widget below is derived from this so   */
/* the dashboard always agrees with /kalendar.                         */
/* ------------------------------------------------------------------ */

const weekStart = startOfWeek(TODAY);
const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
const allEvents = getCalendarEvents();

const byDateTime = (a: CalEvent, b: CalEvent) =>
  a.date === b.date
    ? toMinutes(a.start) - toMinutes(b.start)
    : a.date < b.date
      ? -1
      : 1;

const eventsOn = (day: Date) =>
  allEvents.filter(event => isSameDay(parseISODate(event.date), day));

const dashboardCardClass =
  "rounded-lg border border-border/80 ring-0 shadow-none";
const dashboardCardHeaderClass = "border-b border-border/70";

/* ------------------------------------------------------------------ */
/* Navigation — top bar                                                */
/* ------------------------------------------------------------------ */

function Navigation() {
  return (
    <PageHeader
      center={
        <div className="hidden md:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Suchen…" className="w-[240px] pl-8 2xl:w-[320px]" />
          </div>
        </div>
      }
      end={
        <Button
          onClick={() => {
            window.history.pushState({}, "", "/neue-schueler");
            window.dispatchEvent(new PopStateEvent("popstate"));
          }}
        >
          <Plus data-icon="inline-start" />
          Schüler anmelden
        </Button>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Grid — stat cards                                                   */
/* ------------------------------------------------------------------ */

// Counts derived from the shared sources — students come from the DB.
const fahrstundenThisWeek = allEvents.filter(isFahrstunde).length;
const fahrstundenToday = eventsOn(TODAY).filter(isFahrstunde).length;

type Stat = {
  label: string;
  value: string;
  Icon: IconCmp;
  iconClass: string;
  href: string;
  trend?: { delta: string; up: boolean };
  hint?: string;
};

const staticStats: Stat[] = [
  {
    label: "Fahrstunden (Woche)",
    value: String(fahrstundenThisWeek),
    Icon: CalendarDays,
    iconClass: "bg-amber-500/10 text-amber-600",
    href: "/kalendar",
    hint: `${fahrstundenToday} heute`,
  },
  {
    label: "Umsatz (Monat)",
    value: "€ 42.350",
    Icon: Euro,
    iconClass: "bg-emerald-500/10 text-emerald-600",
    href: "/buchhaltung",
    trend: { delta: "+5,2%", up: true },
  },
  {
    label: "Offene Rechnungen",
    value: "14",
    Icon: FileWarning,
    iconClass: "bg-rose-500/10 text-rose-600",
    href: "/buchhaltung",
    trend: { delta: "-3", up: false },
  },
];

function Grid() {
  const { students } = useStudents();
  const activeStudents = students.filter(
    student => student.status === "aktiv"
  ).length;
  const stats: Stat[] = [
    {
      label: "Aktive Fahrschüler",
      value: String(activeStudents),
      Icon: Users,
      iconClass: "bg-indigo-500/10 text-indigo-600",
      href: "/fahrschueler",
      hint: `von ${students.length}`,
    },
    ...staticStats,
  ];

  return (
    <section className="stagger-in grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, Icon, iconClass, href, trend, hint }) => (
        <button
          key={label}
          type="button"
          onClick={() => goTo(href)}
          className="h-full rounded-lg text-left outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Card
            size="sm"
            className={cn(
              dashboardCardClass,
              "h-full transition-colors hover:border-border hover:bg-muted/40"
            )}
          >
            <CardHeader>
              <div className={cn("flex size-9 items-center justify-center rounded-lg", iconClass)}>
                <Icon className="size-[18px]" />
              </div>
              <CardAction>
                {trend ? (
                  <Badge variant={trend.up ? "secondary" : "destructive"}>
                    {trend.up ? <TrendingUp /> : <TrendingDown />}
                    {trend.delta}
                  </Badge>
                ) : hint ? (
                  <Badge variant="secondary">{hint}</Badge>
                ) : null}
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="font-heading text-2xl font-medium tracking-tight">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        </button>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chart — weekly lessons bar chart                                    */
/* ------------------------------------------------------------------ */

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Fahrstunden (practical driving lessons) per weekday, straight from the
// calendar events — same items the /kalendar grid renders.
const chartData = weekDays.map((day, i) => ({
  day: WEEKDAY_LABELS[i],
  value: eventsOn(day).filter(isFahrstunde).length,
}));

const chartConfig = {
  value: { label: "Fahrstunden", color: "var(--chart-1)" },
} satisfies ChartConfig;

function Chart() {
  const total = chartData.reduce((s, d) => s + d.value, 0);
  const max = Math.max(...chartData.map(d => d.value));
  return (
    <Card className={dashboardCardClass}>
      <CardHeader className={dashboardCardHeaderClass}>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
            <BarChart3 className="size-3.5" />
          </span>
          Fahrstunden diese Woche
        </CardTitle>
        <CardDescription>{total} Fahrstunden insgesamt</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => goTo("/kalendar")}>
            Alle ansehen
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full 2xl:h-[320px]">
          <BarChart data={chartData} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="value" radius={6}>
              {chartData.map(entry => (
                <Cell
                  key={entry.day}
                  fill={entry.value > 0 && entry.value === max ? "var(--color-sky-500)" : "var(--color-sky-200)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* List — upcoming appointments                                        */
/* ------------------------------------------------------------------ */

// Everything that isn't a routine driving lesson — theory, exams, exam prep,
// courses. Clicking through opens the calendar filtered to exactly these.
const nonFahrstundeEvents = allEvents
  .filter(event => !isFahrstunde(event))
  .sort(byDateTime);

const weekdayShort = (date: Date) =>
  date.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");

function List() {
  const openCalendar = () => goTo("/kalendar?filter=non-fahrstunde");
  return (
    <Card className={dashboardCardClass}>
      <CardHeader className={dashboardCardHeaderClass}>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
            <CalendarClock className="size-3.5" />
          </span>
          Anstehende Termine
        </CardTitle>
        <CardDescription>
          {nonFahrstundeEvents.length} ohne Fahrstunden
        </CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={openCalendar}>
            Kalender
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] 2xl:h-[380px]">
          <div className="flex flex-col gap-1 pr-3">
            {nonFahrstundeEvents.map(event => {
              const place = event.location ?? event.vehicle;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={openCalendar}
                  className="group/row flex items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex w-12 shrink-0 flex-col items-center">
                    <span className="text-[11px] uppercase text-muted-foreground">
                      {weekdayShort(parseISODate(event.date))}
                    </span>
                    <span className="text-sm font-medium tabular-nums">
                      {event.start}
                    </span>
                  </span>
                  <Separator orientation="vertical" className="h-9" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {event.title}
                    </span>
                    <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      {event.subtitle}
                      {place && (
                        <>
                          <span className="text-border">·</span>
                          <MapPin className="size-3 shrink-0" />
                          {place}
                        </>
                      )}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {eventTypeShortLabel[event.type]}
                  </Badge>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar — month view with agenda                                   */
/* ------------------------------------------------------------------ */

// Days that have at least one event, for the calendar's dot markers.
const eventDates = [...new Set(allEvents.map(event => event.date))].map(
  parseISODate
);

function MonthCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(TODAY);
  const dayEvents = selected
    ? eventsOn(selected).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    : [];
  const isToday = selected ? isSameDay(selected, TODAY) : false;
  const dayLabel = selected
    ? selected.toLocaleDateString("de-DE", { day: "numeric", month: "long" })
    : "";

  return (
    <Card className={dashboardCardClass}>
      <CardHeader className={dashboardCardHeaderClass}>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
            <CalendarDays className="size-3.5" />
          </span>
          Kalender
        </CardTitle>
        <CardDescription>Monatsübersicht</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Calendar
          mode="single"
          required
          selected={selected}
          onSelect={setSelected}
          defaultMonth={new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)}
          weekStartsOn={1}
          showOutsideDays={false}
          className="mx-auto p-0 [--cell-size:--spacing(8)]"
          modifiers={{ event: eventDates }}
          modifiersClassNames={{
            event:
              "relative after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-amber-500 data-[selected-single=true]:after:bg-primary-foreground",
          }}
          formatters={{
            formatCaption: d =>
              d.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
            formatWeekdayName: d => d.toLocaleDateString("de-DE", { weekday: "short" }),
          }}
        />

        <Separator />

        <div className="flex flex-col">
          <div className="flex items-baseline justify-between pb-2">
            <span className="text-sm font-medium">
              {dayLabel}
              {isToday && <span className="ml-1.5 text-xs text-muted-foreground">Heute</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              {dayEvents.length} {dayEvents.length === 1 ? "Termin" : "Termine"}
            </span>
          </div>

          {dayEvents.length > 0 ? (
            <div key={dayLabel} className="flex flex-col gap-1">
              {dayEvents.map((event, idx) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => goTo("/kalendar")}
                  className="animate-agenda-row group/row flex items-center gap-2.5 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="h-8 w-1 shrink-0 rounded-full bg-amber-500" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{event.title}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{event.start} Uhr</span>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/row:translate-x-0.5" />
                </button>
              ))}
            </div>
          ) : (
            <div
              key={dayLabel}
              className="animate-agenda-fade flex flex-col items-center justify-center gap-1 py-6 text-center"
            >
              <CalendarDays className="size-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Keine Termine an diesem Tag</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export function Dashboard() {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <Navigation />
      <div className={cn("flex flex-1 flex-col gap-4 overflow-y-auto p-4 2xl:gap-5 2xl:p-6")}>
        <Grid />
        <div className="stagger-in grid grid-cols-1 items-start gap-4 2xl:gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Chart />
          </div>
          <div className="lg:col-span-4">
            <List />
          </div>
          <div className="lg:col-span-3">
            <MonthCalendar />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
