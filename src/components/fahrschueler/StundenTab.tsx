/* ------------------------------------------------------------------ */
/* Fahrschüler detail — Stundenübersicht tab. Lists this student's     */
/* calendar appointments (matched via the event subtitle, the same     */
/* linkage the calendar itself uses).                                  */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from "react";

import {
  eventTypeOptions,
  eventTypeShortLabel,
  toMinutes,
  type EventType,
} from "@/lib/calendar-data";
import { useCalendarEvents } from "@/hooks/use-calendar-events";
import type { StudentRecord } from "@/hooks/use-students";
import { Badge } from "@/components/ui/badge";
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

export function StundenTab({ student }: { student: StudentRecord }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("alle");
  const fullName = `${student.firstName} ${student.lastName}`;
  const { events: allEvents } = useCalendarEvents();

  const events = useMemo(
    () =>
      allEvents
        .filter(event => event.subtitle === fullName)
        .filter(event => typeFilter === "alle" || event.type === typeFilter)
        .toSorted((left, right) =>
          `${left.date} ${left.start}`.localeCompare(`${right.date} ${right.start}`)
        ),
    [allEvents, fullName, typeFilter]
  );

  return (
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
                <TableHead className="pr-4">Fahrzeug</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map(event => (
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
                  <TableCell className="pr-4 text-muted-foreground">
                    {event.vehicle ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
