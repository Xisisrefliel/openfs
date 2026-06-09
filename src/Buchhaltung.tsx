import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Pencil,
  Plus,
  Printer,
  Search,
} from "lucide-react";

import { PageHeader } from "./components/PageHeader.tsx";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type TabKey =
  | "ledger"
  | "journal"
  | "accounts"
  | "cash-bank"
  | "invoices";

type Column<Row> = {
  key: keyof Row | "actions";
  label: string;
  className?: string;
  cellClassName?: string;
  render?: (row: Row) => React.ReactNode;
};

const tabs: { value: TabKey; label: string }[] = [
  { value: "ledger", label: "Bankenbuch / Kassenbuch" },
  { value: "journal", label: "Buchungsjournal" },
  { value: "accounts", label: "Kontenrahmen" },
  { value: "cash-bank", label: "Kasse/Bank" },
  { value: "invoices", label: "Rechnungen" },
];

const ledgerRows = [
  {
    date: "08.06.2026",
    receipt: "T0000129A",
    type: "Transfer",
    description: "",
    vat: "Nicht zutreffend",
    income: "",
    expense: "",
  },
  {
    date: "08.06.2026",
    receipt: "",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Merieme Sabtaoui - B197, Fahrübungsstunde (90)",
    vat: "19%",
    income: "",
    expense: "",
  },
  {
    date: "08.06.2026",
    receipt: "",
    type: "Guthabenübertragung auf Kosten",
    description:
      "FS Merieme Sabtaoui - B197, Durchlaufende Posten Einnahme - TÜV Prüfungsgebühr",
    vat: "Durchlaufende Posten",
    income: "",
    expense: "",
  },
  {
    date: "08.06.2026",
    receipt: "T0000128A",
    type: "Zahlung auf Guthaben",
    description: "FS Merieme Sabtaoui - B197",
    vat: "19%",
    income: "409,83",
    expense: "",
  },
  {
    date: "08.06.2026",
    receipt: "T0000127A",
    type: "Zahlung auf Guthaben",
    description: "FS Mert Bilir - B197",
    vat: "19%",
    income: "450,00",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "T0000126A",
    type: "Transfer",
    description: "",
    vat: "Nicht zutreffend",
    income: "",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Aron Zemenfes Zekaras - B Automatik, Fahrübungsstunde (90)",
    vat: "19%",
    income: "",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    type: "Guthabenübertragung auf Kosten",
    description:
      "FS Aron Zemenfes Zekaras - B Automatik, Durchlaufende Posten Einnahme - TÜV Prüfungsgebühr",
    vat: "Durchlaufende Posten",
    income: "",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Aron Zemenfes Zekaras - B Automatik, Praktische Prüfung (55)",
    vat: "19%",
    income: "",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "T0000125A",
    type: "Zahlung auf Guthaben",
    description: "FS Jaskarandeep Sing - B197",
    vat: "19%",
    income: "409,83",
    expense: "",
  },
  {
    date: "06.06.2026",
    receipt: "T0000124A",
    type: "Zahlung auf Guthaben",
    description: "FS Aron Zemenfes Zekaras - B Automatik",
    vat: "19%",
    income: "409,83",
    expense: "",
  },
];

const journalRows = [
  {
    date: "08.06.2026",
    receipt: "T0000129A",
    booking: "00000228A",
    type: "Transfer",
    description: "",
    accountA: "Kassenbuch",
    amountA: "-800,00",
    accountB: "Bank",
    amountB: "800,00",
    reason: "",
  },
  {
    date: "08.06.2026",
    receipt: "",
    booking: "00000227A",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Merieme Sabtaoui - B197, Fahrübungsstunde (90)",
    accountA: "Steuerfreie Umsätze",
    amountA: "-130,00",
    accountB: "Umsatz 19%",
    amountB: "130,00",
    reason: "",
  },
  {
    date: "08.06.2026",
    receipt: "",
    booking: "00000226A",
    type: "Guthabenübertragung auf Kosten",
    description:
      "FS Merieme Sabtaoui - B197, Durchlaufende Posten Einnahme - TÜV Prüfungsgebühr",
    accountA: "Steuerfreie Umsätze",
    amountA: "-129,83",
    accountB: "Durchlaufende Posten Einnahme",
    amountB: "129,83",
    reason: "",
  },
  {
    date: "08.06.2026",
    receipt: "T0000128A",
    booking: "00000224A",
    type: "Zahlung auf Guthaben",
    description: "FS Merieme Sabtaoui - B197",
    accountA: "Kassenbuch",
    amountA: "409,83",
    accountB: "Geleistete Anzahlungen 19% Vorsteuer",
    amountB: "409,83",
    reason: "",
  },
  {
    date: "08.06.2026",
    receipt: "T0000127A",
    booking: "00000223A",
    type: "Zahlung auf Guthaben",
    description: "FS Mert Bilir - B197",
    accountA: "Kassenbuch",
    amountA: "450,00",
    accountB: "Geleistete Anzahlungen 19% Vorsteuer",
    amountB: "450,00",
    reason: "",
  },
  {
    date: "06.06.2026",
    receipt: "T0000126A",
    booking: "00000222A",
    type: "Transfer",
    description: "",
    accountA: "Kassenbuch",
    amountA: "-1.250,00",
    accountB: "Bank",
    amountB: "1.250,00",
    reason: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    booking: "00000221A",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Aron Zemenfes Zekaras - B Automatik, Fahrübungsstunde (90)",
    accountA: "Steuerfreie Umsätze",
    amountA: "-130,00",
    accountB: "Umsatz 19%",
    amountB: "130,00",
    reason: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    booking: "00000220A",
    type: "Guthabenübertragung auf Kosten",
    description:
      "FS Aron Zemenfes Zekaras - B Automatik, Durchlaufende Posten Einnahme - TÜV Prüfungsgebühr",
    accountA: "Steuerfreie Umsätze",
    amountA: "-129,83",
    accountB: "Durchlaufende Posten Einnahme",
    amountB: "129,83",
    reason: "",
  },
  {
    date: "06.06.2026",
    receipt: "",
    booking: "00000219A",
    type: "Guthabenübertragung auf Kosten",
    description: "FS Aron Zemenfes Zekaras - B Automatik, Praktische Prüfung (55)",
    accountA: "Steuerfreie Umsätze",
    amountA: "-150,00",
    accountB: "Umsatz 19%",
    amountB: "150,00",
    reason: "",
  },
];

const accountRows = [
  { number: "1186", name: "Geleistete Anzahlungen 19% Vorsteuer", type: "Fahrschüler", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "1220", name: "Kontokorrentzinsen", type: "Ausgabe", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "1370", name: "Durchlaufende Posten Ausgabe", type: "Ausgabe", vat: "Durchlaufende Posten", taxKey: "", status: "Aktiv" },
  { number: "1370", name: "Durchlaufende Posten Einnahme", type: "Einnahmen", vat: "Durchlaufende Posten", taxKey: "", status: "Aktiv" },
  { number: "1460", name: "Geldtransfer", type: "Neutrale Anwendung", vat: "Nicht zutreffend", taxKey: "", status: "Aktiv" },
  { number: "2100", name: "Privateinnahmen", type: "Einnahmen", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "2151", name: "Privatsteuern", type: "Ausgabe", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "2181", name: "Privateinlagen", type: "Einnahmen", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "2201", name: "Sonderausgaben beschr. abzugsfähig", type: "Ausgabe", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "2281", name: "Aussergewöhnliche Belastungen", type: "Ausgabe", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "3305", name: "Umsatz 19%", type: "Einnahmen", vat: "19%", taxKey: "", status: "Aktiv" },
  { number: "3306", name: "Umsatz 7%", type: "Einnahmen", vat: "7%", taxKey: "", status: "Aktiv" },
  { number: "3307", name: "Umsatz 0%", type: "Einnahmen", vat: "0%", taxKey: "", status: "Aktiv" },
  { number: "4100", name: "Steuerfreie Umsätze", type: "Einnahmen", vat: "0%", taxKey: "", status: "Aktiv" },
];

const cashBankRows = [
  { name: "Kassenbuch", number: "1000", type: "Kassenbuch", date: "10.02.2026", status: "Aktiv", opening: "0,00" },
  { name: "Bank", number: "1001", type: "Bankenbuch", date: "10.02.2026", status: "Aktiv", opening: "0,00" },
  { name: "Kassenbuch Schulung", number: "9000", type: "Kassenbuch", date: "20.02.2026", status: "Inaktiv", opening: "0,00" },
];

function Money({ value }: { value: string }) {
  if (!value) return <span className="text-muted-foreground">-</span>;

  const isNegative = value.trim().startsWith("-");

  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        isNegative ? "text-destructive" : "text-primary"
      )}
    >
      {value}
    </span>
  );
}

function Actions({ extraPrint = false }: { extraPrint?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Bearbeiten">
        <Pencil data-icon="inline-start" />
      </Button>
      {extraPrint && (
        <Button type="button" variant="ghost" size="icon-xs" aria-label="Drucken">
          <Printer data-icon="inline-start" />
        </Button>
      )}
    </div>
  );
}

function AccountingTable<Row extends Record<string, React.ReactNode>>({
  columns,
  rows,
  minWidth = "min-w-[72rem]",
}: {
  columns: Column<Row>[];
  rows: Row[];
  minWidth?: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table className={cn("text-xs", minWidth)}>
        <TableHeader>
          <TableRow className="bg-background hover:bg-background">
            {columns.map(column => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={index}
              className="border-0 even:bg-muted/30 hover:bg-muted/50"
            >
              {columns.map(column => (
                <TableCell
                  key={String(column.key)}
                  className={cn("h-12 whitespace-normal", column.cellClassName)}
                >
                  {column.render
                    ? column.render(row)
                    : (row[column.key as keyof Row] ?? "-")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const FILTER_YEAR = 2026;
const monthLabels = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dez",
];

function formatDay(date?: Date) {
  return date
    ? date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
}

function monthRange(year: number, month: number): DateRange {
  // Day 0 of the next month = last day of the requested month.
  return { from: new Date(year, month, 1), to: new Date(year, month + 1, 0) };
}

function sameDay(a?: Date, b?: Date) {
  return (
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function DateRangeFilter() {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(() =>
    monthRange(FILTER_YEAR, 4)
  );

  const label = range?.from
    ? range.to && !sameDay(range.from, range.to)
      ? `${formatDay(range.from)} – ${formatDay(range.to)}`
      : formatDay(range.from)
    : "Zeitraum wählen";

  // If the active range matches a whole month, highlight that quick button.
  const activeMonth = (() => {
    if (!range?.from || !range.to) return -1;
    for (let i = 0; i < 12; i++) {
      const m = monthRange(FILTER_YEAR, i);
      if (sameDay(range.from, m.from) && sameDay(range.to, m.to)) return i;
    }
    return -1;
  })();

  const presets: { label: string; get: () => DateRange }[] = [
    { label: "Dieser Monat", get: () => monthRange(FILTER_YEAR, new Date().getMonth()) },
    { label: "Letzter Monat", get: () => monthRange(FILTER_YEAR, new Date().getMonth() - 1) },
    {
      label: "Dieses Quartal",
      get: () => {
        const q = Math.floor(new Date().getMonth() / 3) * 3;
        return { from: new Date(FILTER_YEAR, q, 1), to: new Date(FILTER_YEAR, q + 3, 0) };
      },
    },
    {
      label: "Dieses Jahr",
      get: () => ({ from: new Date(FILTER_YEAR, 0, 1), to: new Date(FILTER_YEAR, 11, 31) }),
    },
  ];

  const apply = (next: DateRange) => {
    setRange(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <CalendarDays data-icon="inline-start" />
          {label}
          <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex max-sm:flex-col">
          <div className="flex flex-col gap-1 border-b p-3 sm:w-48 sm:border-b-0 sm:border-r">
            <span className="px-1 pb-1 text-xs font-medium text-muted-foreground">
              Schnellauswahl
            </span>
            {presets.map(preset => (
              <Button
                key={preset.label}
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => apply(preset.get())}
              >
                {preset.label}
              </Button>
            ))}

            <Separator className="my-2" />

            <span className="px-1 pb-1 text-xs font-medium text-muted-foreground">
              Monat {FILTER_YEAR}
            </span>
            <div className="grid grid-cols-3 gap-1">
              {monthLabels.map((month, index) => (
                <Button
                  key={month}
                  type="button"
                  variant={activeMonth === index ? "default" : "outline"}
                  size="sm"
                  className="px-0"
                  onClick={() => apply(monthRange(FILTER_YEAR, index))}
                >
                  {month}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <Calendar
              mode="range"
              numberOfMonths={1}
              defaultMonth={range?.from ?? new Date(FILTER_YEAR, 4, 1)}
              selected={range}
              onSelect={setRange}
              weekStartsOn={1}
              className="p-0 [--cell-size:--spacing(8)]"
              formatters={{
                formatCaption: date =>
                  date.toLocaleDateString("de-DE", { month: "long", year: "numeric" }),
                formatWeekdayName: date =>
                  date.toLocaleDateString("de-DE", { weekday: "short" }),
              }}
            />
            <div className="flex items-center justify-between gap-2 pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRange(undefined)}
              >
                Zurücksetzen
              </Button>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Anwenden
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({
  tab,
}: {
  tab: TabKey;
}) {
  const action =
    tab === "accounts"
      ? "Kategorie"
      : tab === "cash-bank"
        ? "Konto"
        : tab === "invoices"
          ? "Rechnung Erstellen"
          : "Zahlung";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-44" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="inactive">Inaktiv</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {(tab === "ledger" || tab === "journal" || tab === "invoices") && (
            <DateRangeFilter />
          )}
          <Button type="button" variant="secondary" size="sm">
            <Filter data-icon="inline-start" />
            Filter
            <span className="ml-0.5 size-1.5 rounded-full bg-destructive" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(tab === "ledger" || tab === "journal") && (
            <Button type="button" variant="outline" size="sm">
              <Download data-icon="inline-start" />
              DATEV
            </Button>
          )}
          <InputGroup className="w-48">
            <InputGroupInput placeholder="Suche" />
            <InputGroupAddon align="inline-end">
              <Search />
            </InputGroupAddon>
          </InputGroup>
          <Button type="button" variant="secondary" size="icon-sm" aria-label="Drucken">
            <Printer data-icon="inline-start" />
          </Button>
          <Button type="button" size="sm">
            <Plus data-icon="inline-start" />
            {action}
          </Button>
        </div>
      </div>
      {tab === "ledger" && (
        <p className="text-xs text-muted-foreground">
          Anfangsbestand:{" "}
          <span className="font-medium text-foreground">19.484,57 EUR</span>
          {" · "}
          Endbestand:{" "}
          <span className="font-medium text-foreground">27.078,86 EUR</span>
        </p>
      )}
      {tab === "invoices" && (
        <p className="text-xs text-muted-foreground">
          Offenbetrag: <span className="font-medium text-foreground">0,00 EUR</span>
          {" · "}
          Gesamtsumme: <span className="font-medium text-foreground">0,00 EUR</span>
        </p>
      )}
    </div>
  );
}

const ledgerColumns: Column<(typeof ledgerRows)[number]>[] = [
  { key: "date", label: "Datum", className: "pl-4", cellClassName: "pl-4 text-muted-foreground" },
  { key: "receipt", label: "Belegnummer", cellClassName: "text-muted-foreground" },
  { key: "type", label: "Typ", cellClassName: "text-muted-foreground" },
  { key: "description", label: "Beschreibung", className: "min-w-64", cellClassName: "max-w-80" },
  { key: "vat", label: "Inkl. MwSt", cellClassName: "text-muted-foreground" },
  { key: "income", label: "Einnahmen, EUR", render: row => <Money value={row.income} /> },
  { key: "expense", label: "Ausgabe, EUR", render: row => <Money value={row.expense} /> },
  { key: "actions", label: "Aktionen", className: "pr-4", cellClassName: "pr-4", render: () => <Actions /> },
];

const journalColumns: Column<(typeof journalRows)[number]>[] = [
  { key: "date", label: "Datum", className: "pl-4", cellClassName: "pl-4 text-muted-foreground" },
  { key: "receipt", label: "Belegnummer", cellClassName: "text-muted-foreground" },
  { key: "booking", label: "Buchungsnummer", cellClassName: "text-muted-foreground" },
  { key: "type", label: "Typ", cellClassName: "text-muted-foreground" },
  { key: "description", label: "Beschreibung", className: "min-w-64", cellClassName: "max-w-80" },
  { key: "accountA", label: "Konto A", cellClassName: "text-muted-foreground" },
  { key: "amountA", label: "Betrag A, EUR", render: row => <Money value={row.amountA} /> },
  { key: "accountB", label: "Konto B", cellClassName: "text-muted-foreground" },
  { key: "amountB", label: "Betrag B, EUR", render: row => <Money value={row.amountB} /> },
  { key: "reason", label: "Stornogrund", cellClassName: "text-muted-foreground" },
  { key: "actions", label: "Aktionen", className: "pr-4", cellClassName: "pr-4", render: row => <Actions extraPrint={row.type === "Zahlung auf Guthaben"} /> },
];

const accountColumns: Column<(typeof accountRows)[number]>[] = [
  { key: "number", label: "Nummer", className: "pl-4", cellClassName: "pl-4 text-muted-foreground" },
  { key: "name", label: "Name", className: "min-w-64" },
  { key: "type", label: "Typ", cellClassName: "text-muted-foreground" },
  { key: "vat", label: "MwSt", cellClassName: "text-muted-foreground" },
  { key: "taxKey", label: "Steuerschlüssel", cellClassName: "text-muted-foreground" },
  { key: "status", label: "Status", cellClassName: "text-muted-foreground" },
  { key: "actions", label: "Aktionen", className: "pr-4", cellClassName: "pr-4", render: () => <Actions /> },
];

const cashBankColumns: Column<(typeof cashBankRows)[number]>[] = [
  { key: "name", label: "Name", className: "pl-4", cellClassName: "pl-4" },
  { key: "number", label: "Nummer", cellClassName: "text-muted-foreground" },
  { key: "type", label: "Typ", cellClassName: "text-muted-foreground" },
  { key: "date", label: "Datum", cellClassName: "text-muted-foreground" },
  { key: "status", label: "Status", cellClassName: "text-muted-foreground" },
  { key: "opening", label: "Anfangssaldo, EUR", cellClassName: "text-right tabular-nums text-muted-foreground" },
  { key: "actions", label: "Aktionen", className: "pr-4", cellClassName: "pr-4", render: () => <Actions /> },
];

export function Buchhaltung() {
  const [tab, setTab] = useState<TabKey>("ledger");

  const table = useMemo(() => {
    if (tab === "ledger") {
      return <AccountingTable columns={ledgerColumns} rows={ledgerRows} />;
    }

    if (tab === "journal") {
      return (
        <AccountingTable
          columns={journalColumns}
          rows={journalRows}
          minWidth="min-w-[92rem]"
        />
      );
    }

    if (tab === "accounts") {
      return (
        <AccountingTable
          columns={accountColumns}
          rows={accountRows}
          minWidth="min-w-[88rem]"
        />
      );
    }

    if (tab === "cash-bank") {
      return <AccountingTable columns={cashBankColumns} rows={cashBankRows} />;
    }

    return (
      <Empty className="min-h-80 border-0">
        <EmptyHeader>
          <EmptyTitle>Keine Ergebnisse gefunden</EmptyTitle>
          <EmptyDescription>
            Für den gewählten Zeitraum liegen keine Rechnungen vor.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }, [tab]);

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-background">
      <PageHeader
        center={
          <div className="max-w-[calc(100vw-18rem)] overflow-x-auto">
            <ToggleGroup
              type="single"
              value={tab}
              onValueChange={value => {
                if (value) setTab(value as TabKey);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Buchhaltung Bereich"
            >
              {tabs.map(item => (
                <ToggleGroupItem
                  key={item.value}
                  value={item.value}
                  aria-label={item.label}
                >
                  {item.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        }
      />

      <Tabs
        value={tab}
        onValueChange={value => setTab(value as TabKey)}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="min-h-0 flex-1 overflow-auto p-4 2xl:p-6">
          <Card className="min-h-full">
            <CardContent className="flex flex-col gap-4">
              <Toolbar tab={tab} />

              {tabs.map(item => (
                <TabsContent key={item.value} value={item.value} className="m-0">
                  {item.value === tab && table}
                </TabsContent>
              ))}
            </CardContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}
