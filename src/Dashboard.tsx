import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, XAxis } from "recharts";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
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

type IconCmp = React.ComponentType<{ className?: string }>;

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

const stats: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  Icon: IconCmp;
  iconClass: string;
}[] = [
  { label: "Aktive Fahrschüler", value: "248", delta: "+12", up: true, Icon: Users, iconClass: "bg-indigo-500/10 text-indigo-600" },
  { label: "Fahrstunden (Woche)", value: "186", delta: "+8%", up: true, Icon: CalendarDays, iconClass: "bg-amber-500/10 text-amber-600" },
  { label: "Umsatz (Monat)", value: "€ 42.350", delta: "+5,2%", up: true, Icon: Euro, iconClass: "bg-emerald-500/10 text-emerald-600" },
  { label: "Offene Rechnungen", value: "14", delta: "-3", up: false, Icon: FileWarning, iconClass: "bg-rose-500/10 text-rose-600" },
];

function Grid() {
  return (
    <section className="stagger-in grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(({ label, value, delta, up, Icon, iconClass }) => (
        <Card key={label} size="sm" className={dashboardCardClass}>
          <CardHeader>
            <div className={cn("flex size-9 items-center justify-center rounded-lg", iconClass)}>
              <Icon className="size-[18px]" />
            </div>
            <CardAction>
              <Badge variant={up ? "secondary" : "destructive"}>
                {up ? <TrendingUp /> : <TrendingDown />}
                {delta}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-medium tracking-tight">{value}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Chart — weekly lessons bar chart                                    */
/* ------------------------------------------------------------------ */

const chartData = [
  { day: "Mo", value: 28 },
  { day: "Di", value: 34 },
  { day: "Mi", value: 22 },
  { day: "Do", value: 41 },
  { day: "Fr", value: 38 },
  { day: "Sa", value: 19 },
  { day: "So", value: 4 },
];

const chartConfig = {
  value: { label: "Stunden", color: "var(--chart-1)" },
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
        <CardDescription>{total} Stunden insgesamt</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
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
                  fill={entry.value === max ? "var(--color-sky-500)" : "var(--color-sky-200)"}
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

const appointments: {
  time: string;
  name: string;
  type: string;
  status: "confirmed" | "pending";
  place: string;
}[] = [
  { time: "08:30", name: "Lena Brandt", type: "Fahrstunde · Überland", status: "confirmed", place: "Treffpunkt Hbf" },
  { time: "10:00", name: "Tom Richter", type: "Theorieprüfung", status: "confirmed", place: "TÜV Süd" },
  { time: "11:45", name: "Aylin Demir", type: "Fahrstunde · Stadt", status: "pending", place: "Schulhof" },
  { time: "14:15", name: "Jonas Weber", type: "Autobahnfahrt", status: "confirmed", place: "Treffpunkt Hbf" },
  { time: "16:00", name: "Mara Köhler", type: "Praktische Prüfung", status: "pending", place: "TÜV Süd" },
];

function List() {
  return (
    <Card className={dashboardCardClass}>
      <CardHeader className={dashboardCardHeaderClass}>
        <CardTitle className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-600">
            <CalendarClock className="size-3.5" />
          </span>
          Heutige Termine
        </CardTitle>
        <CardDescription>{appointments.length} geplant</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm">
            Kalender
            <ChevronRight />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] 2xl:h-[380px]">
          <div className="flex flex-col gap-1 pr-3">
            {appointments.map(({ time, name, type, status, place }) => (
              <div
                key={time}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted"
              >
                <span className="w-12 shrink-0 text-center text-sm font-medium tabular-nums">
                  {time}
                </span>
                <Separator orientation="vertical" className="h-9" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{name}</span>
                  <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                    {type}
                    <span className="text-border">·</span>
                    <MapPin className="size-3 shrink-0" />
                    {place}
                  </span>
                </div>
                <Badge variant={status === "confirmed" ? "secondary" : "outline"}>
                  {status === "confirmed" ? <Check /> : <Clock />}
                  {status === "confirmed" ? "Bestätigt" : "Offen"}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar — month view with agenda                                   */
/* ------------------------------------------------------------------ */

type CalEvent = { time: string; title: string };
const YEAR = 2026;
const MONTH = 5; // June (0-indexed)

const calendarEvents: Record<number, CalEvent[]> = {
  3: [{ time: "09:00", title: "Theorie Gruppe A" }],
  9: [
    { time: "10:00", title: "Theorieprüfung · Tom R." },
    { time: "16:00", title: "Praktische Prüfung · Mara K." },
  ],
  12: [
    { time: "14:00", title: "Theorie Gruppe B" },
    { time: "17:30", title: "Aufbauseminar" },
  ],
  18: [{ time: "11:00", title: "Fahrlehrer-Meeting" }],
  23: [{ time: "09:30", title: "TÜV Sammeltermin" }],
  27: [{ time: "13:00", title: "Erste-Hilfe Kurs" }],
};

const eventDates = Object.keys(calendarEvents).map(d => new Date(YEAR, MONTH, Number(d)));

function MonthCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(new Date(YEAR, MONTH, 9));
  const dayNum = selected?.getDate() ?? 0;
  const dayEvents = calendarEvents[dayNum] ?? [];
  const isToday = dayNum === 9;

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
          defaultMonth={new Date(YEAR, MONTH, 1)}
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
              {dayNum}. Juni
              {isToday && <span className="ml-1.5 text-xs text-muted-foreground">Heute</span>}
            </span>
            <span className="text-xs text-muted-foreground">
              {dayEvents.length} {dayEvents.length === 1 ? "Termin" : "Termine"}
            </span>
          </div>

          {dayEvents.length > 0 ? (
            <div key={dayNum} className="flex flex-col gap-1">
              {dayEvents.map((e, idx) => (
                <div
                  key={idx}
                  className="animate-agenda-row group/row flex items-center gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-muted"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <span className="h-8 w-1 shrink-0 rounded-full bg-amber-500" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{e.title}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{e.time} Uhr</span>
                  </div>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover/row:translate-x-0.5" />
                </div>
              ))}
            </div>
          ) : (
            <div
              key={dayNum}
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
