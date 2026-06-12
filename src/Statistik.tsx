import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarDays,
  Car,
  ChartPie,
  Euro,
  GraduationCap,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { Badge } from "@/components/ui/badge";
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
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useStatistics, type ExamTypeStatistics, type Statistics } from "@/hooks/use-statistics";

type IconCmp = React.ComponentType<{ className?: string }>;

/* Same framed-card styling as the Dashboard widgets. */
const statCardClass = "rounded-lg border border-border/80 ring-0 shadow-none";
const statCardHeaderClass = "border-b border-border/70";

/* ------------------------------ formatting ------------------------- */

const formatEuro = (cents: number) =>
  (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

/** "2026-06" → "Jun 26" */
const formatMonth = (month: string) => {
  const [year, monthIndex] = month.split("-").map(Number);
  if (!year || !monthIndex) return month;
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("de-DE", {
    month: "short",
    year: "2-digit",
  });
};

const formatHours = (minutes: number) =>
  `${(minutes / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`;

/* ------------------------------ KPI cards -------------------------- */

type Kpi = {
  label: string;
  value: string;
  hint: string;
  Icon: IconCmp;
  iconClass: string;
};

function KpiGrid({ stats }: { stats: Statistics }) {
  const kpis: Kpi[] = [
    {
      label: "Aktive Fahrschüler",
      value: String(stats.students.aktiv),
      hint: `von ${stats.students.total}`,
      Icon: Users,
      iconClass: "bg-indigo-500/10 text-indigo-600",
    },
    {
      label: "Termine gesamt",
      value: String(stats.lessons.total),
      hint: `${stats.lessons.byType.find(t => t.type === "Praktisch")?.count ?? 0} praktisch`,
      Icon: CalendarDays,
      iconClass: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Umsatz gesamt",
      value: formatEuro(stats.revenue.totalCents),
      hint: `${stats.revenue.perMonth.length} ${stats.revenue.perMonth.length === 1 ? "Monat" : "Monate"}`,
      Icon: Euro,
      iconClass: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Aktive Fahrlehrer",
      value: String(stats.instructors.aktiv),
      hint: `von ${stats.instructors.total}`,
      Icon: UserRound,
      iconClass: "bg-violet-500/10 text-violet-600",
    },
    {
      label: "Fahrzeuge im Einsatz",
      value: String(stats.vehicles.aktiv),
      hint: `${stats.vehicles.wartung} in Wartung`,
      Icon: Car,
      iconClass: "bg-sky-500/10 text-sky-600",
    },
  ];

  return (
    <section className="stagger-in grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {kpis.map(({ label, value, hint, Icon, iconClass }) => (
        <Card key={label} size="sm" className={cn(statCardClass, "h-full")}>
          <CardHeader>
            <div className={cn("flex size-9 items-center justify-center rounded-lg", iconClass)}>
              <Icon className="size-[18px]" />
            </div>
            <CardAction>
              <Badge variant="secondary">{hint}</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="font-heading text-2xl font-medium tracking-tight">
              {value}
            </div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}

/* --------------------------- chart card shell ---------------------- */

function ChartCard({
  title,
  description,
  Icon,
  iconClass,
  children,
}: {
  title: string;
  description: string;
  Icon: IconCmp;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={statCardClass}>
      <CardHeader className={statCardHeaderClass}>
        <CardTitle className="flex items-center gap-2">
          <span className={cn("flex size-6 items-center justify-center rounded-md", iconClass)}>
            <Icon className="size-3.5" />
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ChartEmpty({ Icon, description }: { Icon: IconCmp; description: string }) {
  return (
    <Empty className="h-[240px] border 2xl:h-[300px]">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>Keine Daten</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

const chartHeightClass = "h-[240px] w-full 2xl:h-[300px]";

/* --------------------- Anmeldungen pro Monat (Bar) ----------------- */

const registrationsConfig = {
  count: { label: "Anmeldungen", color: "var(--chart-1)" },
} satisfies ChartConfig;

function RegistrationsChart({ stats }: { stats: Statistics }) {
  const data = useMemo(
    () =>
      stats.students.registrationsPerMonth.map(row => ({
        month: formatMonth(row.month),
        count: row.count,
      })),
    [stats]
  );

  return (
    <ChartCard
      title="Anmeldungen pro Monat"
      description={`${stats.students.total} Fahrschüler insgesamt`}
      Icon={GraduationCap}
      iconClass="bg-indigo-500/10 text-indigo-600"
    >
      {data.length === 0 ? (
        <ChartEmpty Icon={GraduationCap} description="Noch keine Anmeldungen mit Datum erfasst." />
      ) : (
        <ChartContainer config={registrationsConfig} className={chartHeightClass}>
          <BarChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ------------------------ Umsatz pro Monat (Area) ------------------ */

const revenueConfig = {
  euro: { label: "Umsatz", color: "var(--chart-2)" },
} satisfies ChartConfig;

function RevenueChart({ stats }: { stats: Statistics }) {
  const data = useMemo(
    () =>
      stats.revenue.perMonth.map(row => ({
        month: formatMonth(row.month),
        euro: Math.round(row.cents) / 100,
      })),
    [stats]
  );

  return (
    <ChartCard
      title="Umsatz pro Monat"
      description={`${formatEuro(stats.revenue.totalCents)} insgesamt`}
      Icon={TrendingUp}
      iconClass="bg-emerald-500/10 text-emerald-600"
    >
      {data.length === 0 ? (
        <ChartEmpty Icon={Euro} description="Noch keine Erlösbuchungen vorhanden." />
      ) : (
        <ChartContainer config={revenueConfig} className={chartHeightClass}>
          <AreaChart data={data} margin={{ top: 8, left: 0, right: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={value => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">Umsatz</span>
                      <span className="font-mono font-medium tabular-nums">
                        {typeof value === "number"
                          ? value.toLocaleString("de-DE", {
                              style: "currency",
                              currency: "EUR",
                            })
                          : String(value)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Area
              dataKey="euro"
              type="monotone"
              fill="var(--color-euro)"
              fillOpacity={0.15}
              stroke="var(--color-euro)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ---------------------- Fahrstunden nach Typ (Pie) ----------------- */

const TYPE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function LessonTypesChart({ stats }: { stats: Statistics }) {
  const data = useMemo(
    () =>
      stats.lessons.byType.map((row, index) => ({
        type: row.type,
        count: row.count,
        fill: TYPE_COLORS[index % TYPE_COLORS.length],
      })),
    [stats]
  );

  const config = useMemo(() => {
    const entries: ChartConfig = {
      count: { label: "Termine" },
    };
    for (const row of data) {
      entries[row.type] = { label: row.type, color: row.fill };
    }
    return entries;
  }, [data]);

  return (
    <ChartCard
      title="Fahrstunden nach Typ"
      description={`${stats.lessons.total} Termine insgesamt`}
      Icon={ChartPie}
      iconClass="bg-amber-500/10 text-amber-600"
    >
      {data.length === 0 ? (
        <ChartEmpty Icon={CalendarDays} description="Noch keine Termine im Kalender." />
      ) : (
        <ChartContainer config={config} className={cn(chartHeightClass, "aspect-auto")}>
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="type" />} />
            <Pie data={data} dataKey="count" nameKey="type" innerRadius={50} strokeWidth={4}>
              {data.map(entry => (
                <Cell key={entry.type} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="type" />}
              className="flex-wrap gap-x-4 gap-y-1"
            />
          </PieChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* --------------------- Auslastung Fahrlehrer (Bar) ----------------- */

const utilizationConfig = {
  hours: { label: "Stunden", color: "var(--chart-4)" },
} satisfies ChartConfig;

function UtilizationChart({ stats }: { stats: Statistics }) {
  const data = useMemo(
    () =>
      stats.instructors.utilization.map(row => ({
        instructor: row.instructor,
        hours: Math.round((row.minutes / 60) * 10) / 10,
        events: row.events,
      })),
    [stats]
  );

  return (
    <ChartCard
      title="Auslastung Fahrlehrer"
      description={
        data.length === 0
          ? "Termine pro Fahrlehrer/in"
          : `${formatHours(stats.instructors.utilization.reduce((sum, row) => sum + row.minutes, 0))} geplant insgesamt`
      }
      Icon={BarChart3}
      iconClass="bg-violet-500/10 text-violet-600"
    >
      {data.length === 0 ? (
        <ChartEmpty Icon={UserRound} description="Noch keine Termine zugeteilt." />
      ) : (
        <ChartContainer config={utilizationConfig} className={cn(chartHeightClass, "aspect-auto")}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, left: 0, right: 16, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis type="number" dataKey="hours" hide />
            <YAxis
              type="category"
              dataKey="instructor"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={120}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, _name, _item, _index, payload) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {(payload as { events?: number })?.events ?? 0} Termine
                      </span>
                      <span className="font-mono font-medium tabular-nums">
                        {typeof value === "number"
                          ? `${value.toLocaleString("de-DE")} Std.`
                          : String(value)}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="hours" fill="var(--color-hours)" radius={6} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

/* ------------------------------- exams ----------------------------- */

function ExamTypeRow({ row }: { row: ExamTypeStatistics }) {
  const rateLabel =
    row.firstAttemptPassRate === null
      ? "–"
      : `${Math.round(row.firstAttemptPassRate * 100)} %`;

  const label =
    row.type === "Theorieprüfung"
      ? "Theorieprüfung"
      : "Praktische Prüfung";

  return (
    <div className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-x-6 gap-y-0 py-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        <span className="text-foreground tabular-nums">{row.bestanden}</span> Bestanden
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        <span className="text-foreground tabular-nums">{row.nicht_bestanden}</span> Nicht bestanden
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        <span className="text-foreground tabular-nums">{row.offen}</span> Offen
      </span>
      <span className="text-right text-sm tabular-nums text-muted-foreground">
        Erfolgsquote (1. Versuch){" "}
        <span className="font-medium tabular-nums text-foreground">{rateLabel}</span>
      </span>
    </div>
  );
}

function ExamsPanel({ stats }: { stats: Statistics }) {
  const total = stats.exams.byType.reduce((sum, r) => sum + r.total, 0);

  return (
    <Card className={statCardClass}>
      <CardHeader className={statCardHeaderClass}>
        <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
          <GraduationCap className="size-[18px]" />
        </div>
        <div className="flex flex-col gap-0.5">
          <CardTitle>Prüfungsergebnisse</CardTitle>
          <CardDescription>
            {total === 0
              ? "Noch keine Ergebnisse erfasst"
              : `${total} Prüfungen insgesamt`}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {total === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Ergebnisse werden im Prüfungsplaner pro Termin eingetragen.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {stats.exams.byType.map(row => (
              <ExamTypeRow key={row.type} row={row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- skeletons --------------------------- */

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 2xl:gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- page ------------------------------ */

export function Statistik() {
  const { statistics, loading } = useStatistics();

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader>
        <span className="text-sm font-medium">Statistik</span>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        {loading ? (
          <LoadingSkeleton />
        ) : !statistics ? (
          <Empty className="h-full border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3 />
              </EmptyMedia>
              <EmptyTitle>Statistik nicht verfügbar</EmptyTitle>
              <EmptyDescription>
                Die Auswertung konnte nicht geladen werden. Bitte Seite neu laden.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col gap-4 2xl:gap-5">
            <KpiGrid stats={statistics} />
            <div className="stagger-in grid grid-cols-1 items-start gap-4 lg:grid-cols-2 2xl:gap-5">
              <RegistrationsChart stats={statistics} />
              <RevenueChart stats={statistics} />
              <LessonTypesChart stats={statistics} />
              <UtilizationChart stats={statistics} />
            </div>
            <ExamsPanel stats={statistics} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Statistik;
