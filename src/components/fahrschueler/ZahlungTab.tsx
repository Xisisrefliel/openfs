/* ------------------------------------------------------------------ */
/* Fahrschüler detail — Zahlungserfassung tab. The student-scoped view */
/* of the accounting ledger: payments land in the same booking engine  */
/* as /buchhaltung (PaymentDialog → SKR 03), with Quittung + Storno.   */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import { Plus, Printer, Undo2 } from "lucide-react";
import { toast } from "sonner";

import type { StudentRecord } from "@/hooks/use-students";
import type { LedgerRow } from "@/lib/accounting-types";
import { formatEuro, formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  accountingApi,
  formatIsoDate,
  useApi,
} from "@/components/buchhaltung/api";
import { PaymentDialog } from "@/components/buchhaltung/PaymentDialog";
import { QuittungDialog } from "@/components/buchhaltung/QuittungDialog";
import {
  StornoDialog,
  type StornoTarget,
} from "@/components/buchhaltung/StornoDialog";

function Money({
  cents,
  tone = "positive",
}: {
  cents: number | null;
  tone?: "positive" | "negative";
}) {
  if (cents == null) return <span className="text-muted-foreground">-</span>;
  return (
    <span
      className={cn(
        "font-medium tabular-nums",
        tone === "negative"
          ? "text-destructive"
          : "text-emerald-600 dark:text-emerald-400"
      )}
    >
      {formatCents(cents)}
    </span>
  );
}

export function ZahlungTab({ student }: { student: StudentRecord }) {
  const fullName = `${student.firstName} ${student.lastName}`;
  const [refresh, setRefresh] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [stornoTarget, setStornoTarget] = useState<StornoTarget | null>(null);
  const [quittungIds, setQuittungIds] = useState<number[]>([]);

  // The ledger search matches on the stored student snapshot name, so the
  // full name scopes the rows to this student.
  const query = `?q=${encodeURIComponent(fullName)}`;
  const ledger = useApi(() => accountingApi.ledger(query), [query, refresh]);
  const accounts = useApi(() => accountingApi.accounts(), []);

  const refetch = () => setRefresh(value => value + 1);

  const rows = ledger.data?.rows ?? [];
  const activeRows = rows.filter(row => !row.storniert && !row.isStorno);
  const paidCents = activeRows.reduce(
    (sum, row) => sum + (row.incomeCents ?? 0),
    0
  );
  const chargedCents = activeRows.reduce(
    (sum, row) => sum + (row.expenseCents ?? 0),
    0
  );
  const printableIds = rows.filter(row => row.printable).map(row => row.id);
  const hasDebt = student.balance.startsWith("-");

  const printFiltered = () => {
    if (!printableIds.length) {
      toast.info("Keine druckbaren Einträge vorhanden.");
      return;
    }
    setQuittungIds(printableIds);
  };

  const columns: {
    key: string;
    label: string;
    className?: string;
    cellClassName?: string;
    render: (row: LedgerRow) => React.ReactNode;
  }[] = [
    {
      key: "date",
      label: "Datum",
      className: "pl-4",
      cellClassName: "pl-4 text-muted-foreground",
      render: row => formatIsoDate(row.date),
    },
    {
      key: "receipt",
      label: "Belegnummer",
      cellClassName: "text-muted-foreground",
      render: row => row.belegNr ?? "-",
    },
    {
      key: "type",
      label: "Typ",
      cellClassName: "text-muted-foreground",
      render: row => row.typeLabel,
    },
    {
      key: "description",
      label: "Beschreibung",
      className: "min-w-64",
      cellClassName: "max-w-80",
      render: row => (
        <span className={cn(row.storniert && "line-through")}>
          {row.description || "-"}
        </span>
      ),
    },
    {
      key: "vat",
      label: "Inkl. MwSt",
      cellClassName: "text-muted-foreground",
      render: row => row.vatLabel,
    },
    {
      key: "income",
      label: "Zahlung, EUR",
      render: row => <Money cents={row.incomeCents} />,
    },
    {
      key: "expense",
      label: "Kosten, EUR",
      render: row => <Money cents={row.expenseCents} tone="negative" />,
    },
    {
      key: "actions",
      label: "Aktionen",
      className: "pr-4",
      cellClassName: "pr-4",
      render: row => (
        <div className="flex items-center gap-1">
          {row.printable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Quittung drucken"
              onClick={() => setQuittungIds([row.id])}
            >
              <Printer data-icon="inline-start" />
            </Button>
          )}
          {!row.storniert && !row.isStorno && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Stornieren"
              onClick={() =>
                setStornoTarget({
                  id: row.id,
                  label: row.belegNr
                    ? `Beleg ${row.belegNr}`
                    : row.description || "Buchung",
                })
              }
            >
              <Undo2 data-icon="inline-start" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card size="sm" className="py-3">
            <CardContent className="flex flex-col gap-0.5 px-4">
              <span className="text-xs text-muted-foreground">Bilanz</span>
              <span
                className={cn(
                  "text-base font-semibold tabular-nums",
                  hasDebt
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {student.balance}
              </span>
            </CardContent>
          </Card>
          <Card size="sm" className="py-3">
            <CardContent className="flex flex-col gap-0.5 px-4">
              <span className="text-xs text-muted-foreground">Gezahlt</span>
              <span className="text-base font-semibold tabular-nums">
                {formatEuro(paidCents)}
              </span>
            </CardContent>
          </Card>
          <Card size="sm" className="py-3">
            <CardContent className="flex flex-col gap-0.5 px-4">
              <span className="text-xs text-muted-foreground">Kosten</span>
              <span className="text-base font-semibold tabular-nums">
                {formatEuro(chargedCents)}
              </span>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Quittungen drucken"
            onClick={printFiltered}
            disabled={!printableIds.length}
          >
            <Printer data-icon="inline-start" />
          </Button>
          <Button type="button" size="sm" onClick={() => setPaymentOpen(true)}>
            <Plus data-icon="inline-start" />
            Zahlung
          </Button>
        </div>
      </div>

      {ledger.loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : ledger.error || rows.length === 0 ? (
        <Empty className="min-h-64 border-0">
          <EmptyHeader>
            <EmptyTitle>
              {ledger.error ? "Fehler beim Laden" : "Keine Buchungen"}
            </EmptyTitle>
            <EmptyDescription>
              {ledger.error ??
                `Für ${fullName} wurden noch keine Zahlungen erfasst.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table className="min-w-[64rem] text-xs">
            <TableHeader>
              <TableRow className="bg-background hover:bg-background">
                {columns.map(column => (
                  <TableHead key={column.key} className={column.className}>
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-0 even:bg-muted/30 hover:bg-muted/50",
                    (row.storniert || row.isStorno) && "opacity-60"
                  )}
                >
                  {columns.map(column => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "h-12 whitespace-normal",
                        column.cellClassName
                      )}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaymentDialog
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        accounts={accounts.data?.accounts ?? []}
        defaultCustomerNo={student.customerNumber}
        onCreated={printableId => {
          refetch();
          if (printableId != null) setQuittungIds([printableId]);
        }}
      />
      <StornoDialog
        target={stornoTarget}
        onClose={() => setStornoTarget(null)}
        onDone={refetch}
      />
      <QuittungDialog
        transactionIds={quittungIds}
        onClose={() => setQuittungIds([])}
      />
    </div>
  );
}
