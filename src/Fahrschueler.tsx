import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  Printer,
  User,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const students = [
  {
    firstName: "Lena",
    lastName: "Braun",
    classes: "B",
    balance: "320,00 EUR",
    phone: "+49 151 23456780",
    lastLesson: "08.06.2026, 16:00",
    nextLesson: "10.06.2026, 15:30",
    drivingSchool: "Fahrschule Guel",
    registrationDate: "12.05.2026",
    contractNumber: "V-2026-1042",
    status: "aktiv",
    email: "lena.braun@example.com",
    birthday: "11.08.1999",
    address: "Weidingweg 31, 64297 Darmstadt",
    customerNumber: "10057",
    instructor: "Nadine Aksoy",
    vehicle: "VW Golf",
    documents: ["Personalausweis", "Passbild", "Sehtest"],
    progress: 78,
    lessons: [
      { label: "Nachtfahrt", done: "0/135min" },
      { label: "Autobahnfahrt", done: "0/180min" },
      { label: "Überlandfahrt", done: "0/225min" },
      { label: "Theorieunterricht", done: "6 Einheiten" },
    ],
  },
  {
    firstName: "Tom",
    lastName: "Richter",
    classes: "A",
    balance: "-85,00 EUR",
    phone: "+49 160 8876543",
    lastLesson: "07.06.2026, 11:00",
    nextLesson: "12.06.2026, 10:00",
    drivingSchool: "Fahrschule Guel",
    registrationDate: "03.05.2026",
    contractNumber: "V-2026-1018",
    status: "aktiv",
    email: "tom.richter@example.com",
    birthday: "04.02.2001",
    address: "Rheinstraße 18, 64283 Darmstadt",
    customerNumber: "10058",
    instructor: "Emre Guel",
    vehicle: "Audi A3",
    documents: ["Personalausweis", "Anmeldung"],
    progress: 42,
    lessons: [
      { label: "Nachtfahrt", done: "45/135min" },
      { label: "Autobahnfahrt", done: "0/180min" },
      { label: "Überlandfahrt", done: "90/225min" },
      { label: "Theorieunterricht", done: "4 Einheiten" },
    ],
  },
  {
    firstName: "Aylin",
    lastName: "Demir",
    classes: "B197",
    balance: "0,00 EUR",
    phone: "+49 176 4455123",
    lastLesson: "06.06.2026, 14:00",
    nextLesson: "11.06.2026, 17:00",
    drivingSchool: "Fahrschule Guel",
    registrationDate: "21.04.2026",
    contractNumber: "V-2026-0987",
    status: "aktiv",
    email: "aylin.demir@example.com",
    birthday: "27.10.1998",
    address: "Bleichstraße 9, 64283 Darmstadt",
    customerNumber: "10051",
    instructor: "Sven Kappel",
    vehicle: "Cupra Born",
    documents: ["Personalausweis", "Passbild", "Sehtest", "Erste Hilfe"],
    progress: 91,
    lessons: [
      { label: "Nachtfahrt", done: "135/135min" },
      { label: "Autobahnfahrt", done: "180/180min" },
      { label: "Überlandfahrt", done: "180/225min" },
      { label: "Theorieunterricht", done: "12 Einheiten" },
    ],
  },
  {
    firstName: "Jonas",
    lastName: "Meyer",
    classes: "BE",
    balance: "145,00 EUR",
    phone: "+49 152 3099881",
    lastLesson: "05.06.2026, 09:30",
    nextLesson: "Nicht geplant",
    drivingSchool: "Fahrschule Guel",
    registrationDate: "09.04.2026",
    contractNumber: "V-2026-0941",
    status: "inaktiv",
    email: "jonas.meyer@example.com",
    birthday: "19.06.1997",
    address: "Pallaswiesenstraße 44, 64293 Darmstadt",
    customerNumber: "10043",
    instructor: "Nicht zugeteilt",
    vehicle: "Nicht zugeteilt",
    documents: ["Personalausweis"],
    progress: 24,
    lessons: [
      { label: "Nachtfahrt", done: "0/135min" },
      { label: "Autobahnfahrt", done: "0/180min" },
      { label: "Überlandfahrt", done: "45/225min" },
      { label: "Theorieunterricht", done: "2 Einheiten" },
    ],
  },
  {
    firstName: "Mara",
    lastName: "Koehler",
    classes: "B",
    balance: "-210,00 EUR",
    phone: "+49 171 7788990",
    lastLesson: "01.06.2026, 13:00",
    nextLesson: "13.06.2026, 12:30",
    drivingSchool: "Fahrschule Guel",
    registrationDate: "18.03.2026",
    contractNumber: "V-2026-0886",
    status: "inaktiv",
    email: "mara.koehler@example.com",
    birthday: "02.12.2000",
    address: "Heidelberger Straße 71, 64285 Darmstadt",
    customerNumber: "10037",
    instructor: "Nadine Aksoy",
    vehicle: "VW Golf",
    documents: ["Personalausweis", "Passbild"],
    progress: 58,
    lessons: [
      { label: "Nachtfahrt", done: "90/135min" },
      { label: "Autobahnfahrt", done: "45/180min" },
      { label: "Überlandfahrt", done: "90/225min" },
      { label: "Theorieunterricht", done: "8 Einheiten" },
    ],
  },
];

type Student = (typeof students)[number];
type SortKey = Extract<
  keyof Student,
  | "firstName"
  | "lastName"
  | "classes"
  | "balance"
  | "phone"
  | "lastLesson"
  | "nextLesson"
  | "drivingSchool"
  | "registrationDate"
  | "contractNumber"
>;
type SortDirection = "asc" | "desc";
type StatusFilter = "aktiv" | "inaktiv";

const sortLabels: Record<SortKey, string> = {
  firstName: "Vorname",
  lastName: "Nachname",
  classes: "Klassen",
  balance: "Bilanz",
  phone: "Telefon",
  lastLesson: "Letzte Stunde",
  nextLesson: "Nächste Stunde",
  drivingSchool: "Fahrschule",
  registrationDate: "Anmeldedatum",
  contractNumber: "Vertragsnummer",
};

const parseDate = (value: string) => {
  if (value === "Nicht geplant") return Number.POSITIVE_INFINITY;

  const [datePart, timePart = "00:00"] = value.split(", ");
  const [day, month, year] = datePart.split(".").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (!day || !month || !year) return 0;

  return new Date(year, month - 1, day, hour || 0, minute || 0).getTime();
};

const parseBalance = (value: string) =>
  Number(value.replace(" EUR", "").replace(".", "").replace(",", "."));

function getSortValue(student: Student, sortKey: SortKey) {
  if (
    sortKey === "registrationDate" ||
    sortKey === "lastLesson" ||
    sortKey === "nextLesson"
  ) {
    return parseDate(student[sortKey]);
  }

  if (sortKey === "balance") {
    return parseBalance(student.balance);
  }

  return student[sortKey];
}

function SortableHead({
  sortKey,
  activeKey,
  direction,
  className,
  onSort,
}: {
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  className?: string;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  const Icon = isActive ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className={className}
      aria-sort={
        isActive ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-1 h-7 px-1 text-xs"
        onClick={() => onSort(sortKey)}
      >
        {sortLabels[sortKey]}
        <Icon data-icon="inline-end" />
      </Button>
    </TableHead>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function StudentDetailsDialog({
  student,
  open,
  onOpenChange,
}: {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!student) return null;

  const hasDebt = student.balance.startsWith("-");
  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-auto sm:max-w-5xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <User />
              </div>
              <div className="flex flex-col gap-1">
                <DialogTitle className="text-xl">{fullName}</DialogTitle>
                <DialogDescription>
                  {student.contractNumber} · Klasse {student.classes}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {student.status === "aktiv" ? "Aktiv" : "Inaktiv"}
              </Badge>
              <Badge
                variant="outline"
                className={
                  hasDebt
                    ? "bg-red-50 text-red-700 ring-red-600/20"
                    : "bg-green-50 text-green-700 ring-green-600/20"
                }
              >
                Bilanz {student.balance}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_16rem]">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ausbildung</CardTitle>
                <CardDescription>
                  Fortschritt, Fahrstunden und nächste Planung
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">{student.classes}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Progress value={student.progress} className="h-2" />
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                    {student.progress}%
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableHead>Bereich</TableHead>
                        <TableHead className="text-right">Stand</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {student.lessons.map(lesson => (
                        <TableRow key={lesson.label}>
                          <TableCell>{lesson.label}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {lesson.done}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Fahrlehrer/in</CardTitle>
                  <CardDescription>{student.classes}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <GraduationCap />
                  <span>{student.instructor}</span>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Fahrzeug</CardTitle>
                  <CardDescription>{student.classes}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <CalendarClock />
                  <span>{student.vehicle}</span>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle>Kontakt</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  <DetailItem label="Telefon" value={student.phone} />
                  <DetailItem label="E-Mail" value={student.email} />
                  <DetailItem label="Adresse" value={student.address} />
                  <DetailItem label="Geburtsdatum" value={student.birthday} />
                </dl>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Dokumente</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {student.documents.map(document => (
                  <div key={document} className="flex items-center gap-2 text-sm">
                    <FileText />
                    <span>{document}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card size="sm">
              <CardHeader>
                <CardTitle>Vertrag</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-3">
                  <DetailItem label="Kundennummer" value={student.customerNumber} />
                  <DetailItem label="Anmeldedatum" value={student.registrationDate} />
                  <DetailItem label="Fahrschule" value={student.drivingSchool} />
                </dl>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Fahrschueler() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("aktiv");
  const [sortKey, setSortKey] = useState<SortKey>("lastName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students
      .filter(student => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [
            student.firstName,
            student.lastName,
            student.classes,
            student.phone,
            student.contractNumber,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesStatus = student.status === statusFilter;

        return matchesQuery && matchesStatus;
      })
      .toSorted((left, right) => {
        const leftValue = getSortValue(left, sortKey);
        const rightValue = getSortValue(right, sortKey);
        const result =
          typeof leftValue === "number" && typeof rightValue === "number"
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue), "de");

        if (result !== 0) {
          return sortDirection === "asc" ? result : -result;
        }

        return left.lastName.localeCompare(right.lastName, "de");
      });
  }, [query, sortDirection, sortKey, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection(current => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const resetFilters = () => {
    setQuery("");
    setStatusFilter("aktiv");
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
      <PageHeader />

      <div className="min-h-0 flex-1 overflow-auto p-4 2xl:p-6">
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 2xl:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Name, Telefon, Klasse oder Vertrag suchen"
              className="max-w-96"
            />
            <ToggleGroup
              type="single"
              value={statusFilter}
              onValueChange={value => {
                if (value === "aktiv" || value === "inaktiv") {
                  setStatusFilter(value);
                }
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Fahrschueler Status"
            >
              <ToggleGroupItem value="aktiv" aria-label="Aktive Fahrschueler">
                Aktiv
              </ToggleGroupItem>
              <ToggleGroupItem value="inaktiv" aria-label="Inaktive Fahrschueler">
                Inaktiv
              </ToggleGroupItem>
            </ToggleGroup>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Zurücksetzen
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHead
                    sortKey="firstName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="pl-4 pr-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="lastName"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="classes"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="balance"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="phone"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="lastLesson"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="nextLesson"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="drivingSchool"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="registrationDate"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="contractNumber"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="px-1"
                    onSort={handleSort}
                  />
                  <TableHead className="pl-1 pr-4 text-right">Vertrag drucken</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => {
                  const hasDebt = student.balance.startsWith("-");

                  return (
                    <TableRow
                      key={student.contractNumber}
                      tabIndex={0}
                      className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                      onClick={() => setSelectedStudent(student)}
                      onKeyDown={event => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedStudent(student);
                        }
                      }}
                    >
                      <TableCell className="pl-4 pr-1 font-medium">{student.firstName}</TableCell>
                      <TableCell className="px-1 font-medium">{student.lastName}</TableCell>
                      <TableCell className="px-1">{student.classes}</TableCell>
                      <TableCell className="pl-1 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            hasDebt
                              ? "bg-red-50 text-red-700 ring-red-600/20"
                              : "bg-green-50 text-green-700 ring-green-600/20"
                          }
                        >
                          {student.balance}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 text-muted-foreground">
                        {student.phone}
                      </TableCell>
                      <TableCell className="px-1">{student.lastLesson}</TableCell>
                      <TableCell className="px-1">{student.nextLesson}</TableCell>
                      <TableCell className="px-1">{student.drivingSchool}</TableCell>
                      <TableCell className="px-1">{student.registrationDate}</TableCell>
                      <TableCell className="px-1">{student.contractNumber}</TableCell>
                      <TableCell className="px-1">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`${student.contractNumber} drucken`}
                            onClick={event => event.stopPropagation()}
                          >
                            <Printer data-icon="inline-start" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <StudentDetailsDialog
        student={selectedStudent}
        open={selectedStudent !== null}
        onOpenChange={open => {
          if (!open) setSelectedStudent(null);
        }}
      />
    </div>
  );
}
