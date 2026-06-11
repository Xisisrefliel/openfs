/* ------------------------------------------------------------------ */
/* Verträge — dashboard over the Ausbildungsverträge.                  */
/*                                                                     */
/* No own server module: contracts are derived 1:1 from the DB-backed  */
/* students list (contractNumber, customerNumber, registrationDate,    */
/* classes, status, pricePlanId) joined with the price plans — same    */
/* sources as /fahrschueler and /preisangebot. Pure derivation lives   */
/* in src/lib/contracts.ts; the "Vertrag anzeigen" action reuses the   */
/* printable VertragDialog from the Fahrschüler pages.                 */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  FileCheck2,
  FileSearch,
  FileText,
  FileX2,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { VertragDialog } from "./components/VertragDialog.tsx";
import { useStudents, type StudentRecord } from "@/hooks/use-students";
import { usePricePlans } from "@/hooks/use-price-plans";
import {
  computeContractKpis,
  deriveContractRows,
  filterContractRows,
  type ContractRow,
  type ContractStatusFilter,
} from "@/lib/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type IconCmp = React.ComponentType<{ className?: string }>;

function KpiCard({
  Icon,
  label,
  value,
  hint,
  accent,
}: {
  Icon: IconCmp;
  label: string;
  value: number;
  hint: string;
  accent: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-36" />
      </CardContent>
    </Card>
  );
}

const TABLE_COLUMNS = 8;

function TableRowSkeleton() {
  return (
    <TableRow>
      {Array.from({ length: TABLE_COLUMNS }, (_, index) => (
        <TableCell
          key={index}
          className={
            index === 0
              ? "pl-4 pr-1"
              : index === TABLE_COLUMNS - 1
                ? "pl-1 pr-4"
                : "px-1"
          }
        >
          <Skeleton className="h-4 w-full max-w-24" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export function Vertraege({
  navigate,
}: {
  navigate: (to: string) => void;
}) {
  // DB-backed: contracts are a view over /api/students + /api/price-plans.
  const { students, loading: studentsLoading } = useStudents();
  const { plans, loading: plansLoading } = usePricePlans();
  const loading = studentsLoading || plansLoading;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>("alle");
  const [vertragStudent, setVertragStudent] = useState<StudentRecord | null>(
    null
  );

  const rows = useMemo(
    () => deriveContractRows(students, plans),
    [students, plans]
  );
  const kpis = useMemo(() => computeContractKpis(rows), [rows]);
  const filteredRows = useMemo(
    () =>
      filterContractRows(rows, query, statusFilter).toSorted(
        (left, right) => {
          // Newest contracts first; unparseable dates sink to the end.
          const leftTime = Number.isNaN(left.registrationTime)
            ? Number.NEGATIVE_INFINITY
            : left.registrationTime;
          const rightTime = Number.isNaN(right.registrationTime)
            ? Number.NEGATIVE_INFINITY
            : right.registrationTime;
          if (leftTime !== rightTime) return rightTime - leftTime;
          return left.name.localeCompare(right.name, "de");
        }
      ),
    [rows, query, statusFilter]
  );

  const studentsById = useMemo(
    () => new Map(students.map(student => [student.id, student])),
    [students]
  );

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("alle");
  };

  const openStudent = (row: ContractRow) =>
    navigate(`/fahrschueler/${row.studentId}`);

  const openVertrag = (row: ContractRow) => {
    const student = studentsById.get(row.studentId);
    if (student) setVertragStudent(student);
  };

  const hasFilter = query.trim().length > 0 || statusFilter !== "alle";

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader className="h-auto min-h-11 flex-wrap py-2 2xl:min-h-12">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Name, Vertrags- oder Kundennummer suchen"
            className="h-8 w-80 max-w-full"
          />
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={value => {
              if (value === "alle" || value === "aktiv" || value === "inaktiv") {
                setStatusFilter(value);
              }
            }}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="Vertragsstatus"
          >
            <ToggleGroupItem value="alle" aria-label="Alle Verträge">
              Alle
            </ToggleGroupItem>
            <ToggleGroupItem value="aktiv" aria-label="Aktive Verträge">
              Aktiv
            </ToggleGroupItem>
            <ToggleGroupItem value="inaktiv" aria-label="Inaktive Verträge">
              Inaktiv
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
          >
            Zurücksetzen
          </Button>
        </div>
      </PageHeader>

      <div className="min-h-0 flex-1 overflow-auto rounded-t-lg rounded-b-2xl border border-border/70 bg-background p-4 2xl:p-6">
        <div className="animate-enter flex flex-col gap-4 2xl:gap-5">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:gap-5">
            {loading ? (
              <>
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton />
                <KpiCardSkeleton />
              </>
            ) : (
              <>
                <KpiCard
                  Icon={FileText}
                  label="Verträge gesamt"
                  value={kpis.total}
                  hint="Alle Ausbildungsverträge"
                  accent="bg-slate-500/10 text-slate-600"
                />
                <KpiCard
                  Icon={FileCheck2}
                  label="Aktive Verträge"
                  value={kpis.active}
                  hint="Fahrschüler in laufender Ausbildung"
                  accent="bg-green-500/10 text-green-600"
                />
                <KpiCard
                  Icon={FileX2}
                  label="Inaktive Verträge"
                  value={kpis.inactive}
                  hint="Beendete oder ruhende Verträge"
                  accent="bg-red-500/10 text-red-600"
                />
                <KpiCard
                  Icon={CalendarPlus}
                  label="Neu in diesem Monat"
                  value={kpis.thisMonth}
                  hint="Anmeldungen im laufenden Monat"
                  accent="bg-blue-500/10 text-blue-600"
                />
              </>
            )}
          </div>

          {/* Contracts table */}
          <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 2xl:p-5">
            <div className="overflow-hidden rounded-lg border">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4 pr-1">Vertragsnummer</TableHead>
                    <TableHead className="px-1">Kundennummer</TableHead>
                    <TableHead className="px-1">Name</TableHead>
                    <TableHead className="px-1">Klassen</TableHead>
                    <TableHead className="px-1">Preisplan</TableHead>
                    <TableHead className="px-1">Anmeldedatum</TableHead>
                    <TableHead className="px-1">Status</TableHead>
                    <TableHead className="pl-1 pr-4 text-right">
                      Aktion
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <>
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                      <TableRowSkeleton />
                    </>
                  ) : filteredRows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={TABLE_COLUMNS} className="p-0">
                        <Empty className="py-12">
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <FileSearch />
                            </EmptyMedia>
                            <EmptyTitle>Keine Verträge gefunden</EmptyTitle>
                            <EmptyDescription>
                              {hasFilter
                                ? "Für die aktuelle Suche bzw. den Statusfilter gibt es keine Treffer."
                                : "Es sind noch keine Ausbildungsverträge vorhanden. Verträge entstehen mit der Anmeldung eines Fahrschülers."}
                            </EmptyDescription>
                          </EmptyHeader>
                          {hasFilter && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={resetFilters}
                            >
                              Filter zurücksetzen
                            </Button>
                          )}
                        </Empty>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map(row => (
                      <TableRow
                        key={row.studentId}
                        tabIndex={0}
                        className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                        onClick={() => openStudent(row)}
                        onKeyDown={event => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openStudent(row);
                          }
                        }}
                      >
                        <TableCell className="pl-4 pr-1 font-medium">
                          {row.contractNumber}
                        </TableCell>
                        <TableCell className="px-1 text-muted-foreground">
                          {row.customerNumber}
                        </TableCell>
                        <TableCell className="px-1 font-medium">
                          {row.name}
                        </TableCell>
                        <TableCell className="px-1">
                          <div className="flex flex-wrap gap-1">
                            {row.classes.length === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              row.classes.map(klass => (
                                <Badge key={klass} variant="outline">
                                  {klass}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-1">{row.planName}</TableCell>
                        <TableCell className="px-1">
                          {row.registrationDate}
                        </TableCell>
                        <TableCell className="px-1">
                          <Badge
                            variant="outline"
                            className={
                              row.status === "aktiv"
                                ? "bg-green-50 text-green-700 ring-green-600/20"
                                : "bg-red-50 text-red-700 ring-red-600/20"
                            }
                          >
                            {row.status === "aktiv" ? "Aktiv" : "Inaktiv"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pl-1 pr-4">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={event => {
                                event.stopPropagation();
                                openVertrag(row);
                              }}
                            >
                              <FileText data-icon="inline-start" />
                              Vertrag anzeigen
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      <VertragDialog
        student={vertragStudent}
        onClose={() => setVertragStudent(null)}
      />
    </div>
  );
}

export default Vertraege;
