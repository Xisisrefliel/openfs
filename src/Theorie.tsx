import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Printer, Trash2 } from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { useStudents, type StudentRecord } from "@/hooks/use-students";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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

// The /theorie view derived from the shared DB-backed student roster — same
// people as /fahrschueler, projected onto the theory-course fields.
const toLearner = (student: StudentRecord) => ({
  id: student.id,
  name: `${student.firstName} ${student.lastName}`,
  phone: student.phone,
  className: student.classes,
  lastLogin: student.theory.lastLogin,
  createdAt: student.registrationDate,
  progress: student.theory.progress,
  preExams: student.theory.preExams,
  exam: student.theory.exam,
  status: student.theory.status,
});

/* Status as a colored dot + plain label — quiet, scannable. */
const statusDot: Record<string, string> = {
  Aktiv: "bg-primary",
  "In Prüfung": "bg-amber-500",
  Bereit: "bg-green-500",
  Pausiert: "bg-muted-foreground/50",
};

type Learner = ReturnType<typeof toLearner>;
type SortKey = Exclude<keyof Learner, "id">;
type SortDirection = "asc" | "desc";

/* Mirrors the row navigation on /fahrschueler — same detail page. */
function openStudent(id: number) {
  window.history.pushState({}, "", `/fahrschueler/${id}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

const sortLabels: Record<SortKey, string> = {
  name: "Name",
  phone: "Telefon",
  className: "Klasse",
  lastLogin: "Letzter Login in der App",
  createdAt: "Erstellt am",
  progress: "Fortschritt",
  preExams: "Letzte Vorprüfungen",
  exam: "Prüfung",
  status: "Status",
};

const parseDate = (value: string) => {
  if (value === "Nicht geplant") return Number.POSITIVE_INFINITY;

  const [day, month, year] = value.split(".").map(Number);
  if (!day || !month || !year) return 0;

  return new Date(year, month - 1, day).getTime();
};

const parseLastLogin = (value: string) => {
  if (value.startsWith("Heute")) return 3;
  if (value.startsWith("Gestern")) return 2;

  return parseDate(value);
};

const preExamRank = (value: string) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 0;
  return number;
};

function getSortValue(student: Learner, sortKey: SortKey) {
  if (sortKey === "createdAt" || sortKey === "exam") {
    return parseDate(student[sortKey]);
  }

  if (sortKey === "lastLogin") {
    return parseLastLogin(student.lastLogin);
  }

  if (sortKey === "preExams") {
    return preExamRank(student.preExams);
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
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => onSort(sortKey)}
      >
        {sortLabels[sortKey]}
        <Icon data-icon="inline-end" />
      </Button>
    </TableHead>
  );
}

export function Theorie() {
  const { students } = useStudents();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const learners = useMemo(() => students.map(toLearner), [students]);

  const filteredLearners = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return learners
      .filter((student) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          [student.name, student.phone, student.className]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesClass = classFilter === "all" || student.className === classFilter;
        const matchesStatus = statusFilter === "all" || student.status === statusFilter;

        return matchesQuery && matchesClass && matchesStatus;
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

        return left.name.localeCompare(right.name, "de");
      });
  }, [classFilter, learners, query, sortDirection, sortKey, statusFilter]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const resetFilters = () => {
    setQuery("");
    setClassFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px] overflow-hidden bg-sidebar">
      <PageHeader
        end={
          <>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Suchen…"
              className="hidden w-44 sm:flex lg:w-60"
            />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="hidden w-32 md:flex">
                <SelectValue placeholder="Klasse" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Alle Klassen</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="B197">B197</SelectItem>
                  <SelectItem value="BE">BE</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="hidden w-36 md:flex">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="Aktiv">Aktiv</SelectItem>
                  <SelectItem value="In Prüfung">In Prüfung</SelectItem>
                  <SelectItem value="Bereit">Bereit</SelectItem>
                  <SelectItem value="Pausiert">Pausiert</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="hidden md:inline-flex"
              onClick={resetFilters}
            >
              Zurücksetzen
            </Button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-auto rounded-t-sm rounded-b-lg border border-border/70 bg-background p-4 2xl:p-6">
        <div className="animate-enter flex flex-col rounded-xl border bg-card p-4 2xl:p-5">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortableHead
                    sortKey="name"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="phone"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="className"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="lastLogin"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="createdAt"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="progress"
                    activeKey={sortKey}
                    direction={sortDirection}
                    className="min-w-36"
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="preExams"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="exam"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHead
                    sortKey="status"
                    activeKey={sortKey}
                    direction={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLearners.map((student) => (
                  <TableRow
                    key={student.id}
                    tabIndex={0}
                    className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
                    onClick={() => openStudent(student.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStudent(student.id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {student.phone}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.className}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.lastLogin}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {student.createdAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-32 items-center gap-2">
                        <Progress value={student.progress} className="h-1.5" />
                        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">
                          {student.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{student.preExams}</TableCell>
                    <TableCell className="tabular-nums">{student.exam}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1.5 font-normal">
                        <span
                          aria-hidden
                          className={cn(
                            "size-1.5 rounded-full",
                            statusDot[student.status],
                          )}
                        />
                        {student.status}
                      </Badge>
                    </TableCell>
                    {/* Row click navigates; keep the action buttons from
                        triggering it. */}
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`${student.name} drucken`}
                        >
                          <Printer data-icon="inline-start" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${student.name} löschen`}
                        >
                          <Trash2 data-icon="inline-start" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
