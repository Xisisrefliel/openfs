/* ------------------------------------------------------------------ */
/* Fahrschüler detail — Stundenübersicht tab. Lists this student's     */
/* calendar appointments (matched via studentId FK, with subtitle      */
/* fallback for events created before the billing migration).          */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import { toast } from "sonner";

import {
  eventTypeOptions,
  eventTypeShortLabel,
  isFahrstunde,
  toMinutes,
  type CalEvent,
  type EventType,
} from "@/lib/calendar-data";
import { resolveLessonPrice } from "@/lib/price-plan";
import { billCalendarEvent, useCalendarEvents } from "@/hooks/use-calendar-events";
import { usePricePlans } from "@/hooks/use-price-plans";
import { useStudents } from "@/hooks/use-students";
import type { StudentRecord } from "@/hooks/use-students";
import { accountingApi, useApi } from "@/components/buchhaltung/api";
import { PaymentDialog } from "@/components/buchhaltung/PaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CreateTransactionInput, StudentRef } from "@/lib/accounting-types";
import { formatCents } from "@/lib/money";

/** "2026-06-09" → "09.06.2026" */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function formatDuration(start: string, end: string): string {
  const minutes = toMinutes(end) - toMinutes(start);
  if (minutes <= 0) return "-";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} Min`;
  if (rest === 0) return `${hours} Std`;
  return `${hours} Std, ${rest} Min`;
}

type TypeFilter = "alle" | EventType;

/** Derive billing state for a practical event:
    - "billed"  — billedActive is true (transaction exists and is not storniert)
    - "open"    — no billing or the linked transaction was storniert
*/
function billingState(event: CalEvent): "billed" | "open" {
  if (event.billedTransactionId != null && event.billedActive) return "billed";
  return "open";
}

export function StundenTab({ student }: { student: StudentRecord }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("alle");
  const [billTarget, setBillTarget] = useState<CalEvent | null>(null);
  const fullName = `${student.firstName} ${student.lastName}`;
  const { events: allEvents, refresh: refreshEvents } = useCalendarEvents();
  const { plans } = usePricePlans();
  const { students } = useStudents();
  const accounts = useApi(accountingApi.accounts, []);

  // Find the student's price plan (if any) for prefilling the dialog amount.
  const studentPlan = useMemo(
    () => plans.find(p => p.id === student.pricePlanId),
    [plans, student.pricePlanId]
  );

  // Build the list of this student's events.
  // Prefer matching by studentId (stable FK); fall back to subtitle for
  // events that predate the billing migration (no studentId set).
  const events = useMemo(
    () =>
      allEvents
        .filter(event =>
          event.studentId != null
            ? event.studentId === student.id
            : event.subtitle === fullName
        )
        .filter(event => typeFilter === "alle" || event.type === typeFilter)
        .toSorted((left, right) =>
          `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`)
        ),
    [allEvents, fullName, student.id, typeFilter]
  );

  // Build StudentRef for the currently-open billing event.
  const studentRef = useMemo((): StudentRef | null => {
    const found = students.find(s => s.id === student.id);
    if (!found) return null;
    return {
      customerNo: found.customerNumber,
      name: `${found.firstName} ${found.lastName}`,
      address: found.address,
      contractNo: found.contractNumber,
      classes: found.classes,
    };
  }, [students, student.id]);

  // Prefill values for the PaymentDialog when billing a lesson.
  const billPrefill = useMemo(() => {
    if (!billTarget) return {};
    const durationMin = toMinutes(billTarget.end) - toMinutes(billTarget.start);
    const resolved = resolveLessonPrice(studentPlan);
    return {
      defaultType: "guthaben_uebertragung" as const,
      defaultDate: billTarget.date,
      defaultAmountCents: resolved?.priceCents ?? undefined,
      defaultDescription: `Fahrübungsstunde (${durationMin})`,
      defaultHabenKonto: "4400",
    };
  }, [billTarget, studentPlan]);

  const handleBillSubmit = async (input: CreateTransactionInput) => {
    if (!billTarget) return;
    await billCalendarEvent(billTarget.id, input);
    await refreshEvents();
    setBillTarget(null);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={value => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger className="w-48" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="alle">Alle Stunden</SelectItem>
                {eventTypeOptions.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {events.length === 0 ? (
          <Empty className="min-h-64 border-0">
            <EmptyHeader>
              <EmptyTitle>Keine Stunden gefunden</EmptyTitle>
              <EmptyDescription>
                Für {fullName} sind keine Termine im gewählten Filter geplant.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Datum/Zeit</TableHead>
                  <TableHead>Dauer</TableHead>
                  <TableHead>Klasse</TableHead>
                  <TableHead className="min-w-64">Kursname</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Fahrschule</TableHead>
                  <TableHead>Fahrlehrer</TableHead>
                  <TableHead>Fahrzeug</TableHead>
                  <TableHead className="pr-4">Abrechnung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(event => {
                  const isPraktisch = isFahrstunde(event);
                  const state = isPraktisch ? billingState(event) : null;
                  const hasStudent = event.studentId != null;
                  const canBill = isPraktisch && state === "open" && hasStudent;
                  const billDisabledReason = isPraktisch && !hasStudent
                    ? "Kein Fahrschüler verknüpft"
                    : null;

                  return (
                    <TableRow key={event.id}>
                      <TableCell className="pl-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{formatDate(event.date)}</span>
                          <span className="text-muted-foreground">
                            {event.start} - {event.end}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDuration(event.start, event.end)}
                      </TableCell>
                      <TableCell>{student.classes}</TableCell>
                      <TableCell className="whitespace-normal">{event.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {eventTypeShortLabel[event.type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.location ?? student.drivingSchool}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.instructor}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {event.vehicle ?? "-"}
                      </TableCell>
                      <TableCell className="pr-4">
                        {!isPraktisch ? null : state === "billed" ? (
                          <span className="text-muted-foreground text-xs">
                            Abgerechnet
                          </span>
                        ) : billDisabledReason ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1.5 text-muted-foreground/50 text-xs cursor-not-allowed select-none">
                                <span className="size-1.5 rounded-full border border-current" />
                                Offen
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{billDisabledReason}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
                              <span className="size-1.5 rounded-full border border-current" />
                              Offen
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => setBillTarget(event)}
                            >
                              <Receipt className="mr-1 size-3" />
                              Abrechnen
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {billTarget && (
          <PaymentDialog
            open={true}
            onClose={() => setBillTarget(null)}
            accounts={accounts.data?.accounts ?? []}
            defaultCustomerNo={student.customerNumber}
            {...billPrefill}
            onSubmitOverride={handleBillSubmit}
            onCreated={() => {}}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
