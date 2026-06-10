/* ------------------------------------------------------------------ */
/* Zahlung erfassen — single dialog for all five booking types.        */
/* The client only collects intent; Soll/Haben, VAT and numbering      */
/* are derived server-side by the booking engine.                      */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
  type Account,
  type CreateTransactionInput,
  type PaymentMethod,
  type StudentRef,
  type TransactionType,
} from "@/lib/accounting-types";
import { formatCents, parseEuroToCents, splitVat } from "@/lib/money";
import { useStudents, type StudentRecord } from "@/hooks/use-students";
import { accountingApi, toIsoDate } from "./api";

const TYPES: TransactionType[] = [
  "zahlung_guthaben",
  "direktzahlung",
  "guthaben_uebertragung",
  "transfer",
  "ausgabe",
];

const NEEDS_STUDENT: TransactionType[] = [
  "zahlung_guthaben",
  "direktzahlung",
  "guthaben_uebertragung",
];

const NEEDS_PAYMENT_METHOD: TransactionType[] = [
  "zahlung_guthaben",
  "direktzahlung",
  "ausgabe",
];

const NEEDS_DESCRIPTION: TransactionType[] = [
  "direktzahlung",
  "guthaben_uebertragung",
  "ausgabe",
];

function studentRef(
  students: StudentRecord[],
  customerNo: string
): StudentRef | null {
  const student = students.find(s => s.customerNumber === customerNo);
  if (!student) return null;
  return {
    customerNo: student.customerNumber,
    name: `${student.firstName} ${student.lastName}`,
    address: student.address,
    contractNo: student.contractNumber,
    classes: student.classes,
  };
}

function AccountSelect({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: Account[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Konto wählen" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map(account => (
            <SelectItem key={account.number} value={account.number}>
              {account.number} · {account.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function PaymentDialog({
  open,
  onClose,
  accounts,
  onCreated,
  defaultCustomerNo,
}: {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  /** printableId is set when the new transaction can yield a Quittung */
  onCreated: (printableId: number | null) => void;
  /** Preselect this student (e.g. on the Fahrschüler detail page). */
  defaultCustomerNo?: string;
}) {
  const { students } = useStudents();
  const [type, setType] = useState<TransactionType>("zahlung_guthaben");
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [amount, setAmount] = useState("");
  const [customerNo, setCustomerNo] = useState("");

  // Students load async — default to the first one once the list arrives.
  useEffect(() => {
    if (!customerNo && students.length > 0) {
      setCustomerNo(defaultCustomerNo ?? students[0]!.customerNumber);
    }
  }, [customerNo, students, defaultCustomerNo]);

  // Re-pin the preselected student whenever the dialog opens.
  useEffect(() => {
    if (open && defaultCustomerNo) {
      setCustomerNo(defaultCustomerNo);
    }
  }, [open, defaultCustomerNo]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bar");
  // SKR 04 defaults: 1600 Kasse, 4400 Erlöse 19 %, 6530 Kfz-Kosten, 1800 Bank
  const [geldkonto, setGeldkonto] = useState("1600");
  const [habenKonto, setHabenKonto] = useState("4400");
  const [aufwandKonto, setAufwandKonto] = useState("6530");
  const [toKonto, setToKonto] = useState("1800");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const active = (kinds: Account["kind"][]) =>
    accounts.filter(a => a.active && kinds.includes(a.kind));
  const geldkonten = active(["geldkonto"]);
  const leistungskonten = active(["erloes", "durchlaufend"]);
  const aufwandkonten = active(["aufwand", "privat"]);

  const amountCents = parseEuroToCents(amount);

  // Account whose VAT setting governs this booking (mirrors the engine).
  const vatAccount = useMemo(() => {
    if (type === "zahlung_guthaben") return accounts.find(a => a.kind === "anzahlung");
    if (type === "direktzahlung" || type === "guthaben_uebertragung") {
      return accounts.find(a => a.number === habenKonto);
    }
    if (type === "ausgabe") return accounts.find(a => a.number === aufwandKonto);
    return undefined;
  }, [type, habenKonto, aufwandKonto, accounts]);

  const vatPreview =
    amountCents != null && vatAccount?.vatRate != null
      ? splitVat(amountCents, vatAccount.vatRate)
      : null;

  const reset = () => {
    setAmount("");
    setDescription("");
    setDate(toIsoDate(new Date()));
  };

  const submit = async () => {
    if (amountCents == null || amountCents <= 0) {
      toast.error("Bitte einen gültigen Betrag eingeben (z. B. 409,83).");
      return;
    }
    const student = NEEDS_STUDENT.includes(type)
      ? studentRef(students, customerNo)
      : null;
    if (NEEDS_STUDENT.includes(type) && !student) {
      toast.error("Bitte einen Fahrschüler auswählen.");
      return;
    }
    if (NEEDS_DESCRIPTION.includes(type) && !description.trim()) {
      toast.error("Bitte eine Beschreibung der Leistung angeben.");
      return;
    }

    let input: CreateTransactionInput;
    switch (type) {
      case "zahlung_guthaben":
        input = { type, date, amountCents, geldkonto, paymentMethod, student: student! };
        break;
      case "direktzahlung":
        input = {
          type, date, amountCents, geldkonto, habenKonto, paymentMethod,
          student: student!,
          description: description.trim(),
        };
        break;
      case "guthaben_uebertragung":
        input = {
          type, date, amountCents, habenKonto,
          student: student!,
          description: `FS ${student!.name} - ${student!.classes}, ${description.trim()}`,
        };
        break;
      case "transfer":
        input = {
          type, date, amountCents,
          fromKonto: geldkonto,
          toKonto,
          description: description.trim() || undefined,
        };
        break;
      case "ausgabe":
        input = {
          type, date, amountCents, geldkonto, aufwandKonto, paymentMethod,
          description: description.trim(),
        };
        break;
    }

    setSubmitting(true);
    try {
      const created = await accountingApi.createTransaction(input);
      const printable = type === "zahlung_guthaben" || type === "direktzahlung";
      toast.success(
        created.belegNr
          ? `Beleg ${created.belegNr} gebucht.`
          : "Buchung erfasst.",
        printable
          ? {
              action: {
                label: "Quittung drucken",
                onClick: () => onCreated(created.id),
              },
            }
          : undefined
      );
      reset();
      onClose();
      onCreated(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Buchung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={value => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Zahlung erfassen</DialogTitle>
          <DialogDescription>
            Die Buchung wird automatisch nach SKR 03 kontiert.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="tx-type">Typ</Label>
            <Select value={type} onValueChange={v => setType(v as TransactionType)}>
              <SelectTrigger id="tx-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {TYPES.map(t => (
                    <SelectItem key={t} value={t}>
                      {TRANSACTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-date">Datum</Label>
            <Input
              id="tx-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-amount">Betrag (brutto), EUR</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="z. B. 409,83"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>

          {NEEDS_STUDENT.includes(type) && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="tx-student">Fahrschüler</Label>
              <Select value={customerNo} onValueChange={setCustomerNo}>
                <SelectTrigger id="tx-student" className="w-full">
                  <SelectValue placeholder="Fahrschüler wählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {students.map(s => (
                      <SelectItem key={s.customerNumber} value={s.customerNumber}>
                        {s.firstName} {s.lastName} · {s.classes} ·{" "}
                        {s.contractNumber}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "guthaben_uebertragung" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-geldkonto">
                {type === "transfer" ? "Von Konto" : "Geldkonto"}
              </Label>
              <AccountSelect
                id="tx-geldkonto"
                value={geldkonto}
                onChange={setGeldkonto}
                options={geldkonten}
              />
            </div>
          )}

          {type === "transfer" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-tokonto">Nach Konto</Label>
              <AccountSelect
                id="tx-tokonto"
                value={toKonto}
                onChange={setToKonto}
                options={geldkonten}
              />
            </div>
          )}

          {(type === "direktzahlung" || type === "guthaben_uebertragung") && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-haben">Leistungskonto</Label>
              <AccountSelect
                id="tx-haben"
                value={habenKonto}
                onChange={setHabenKonto}
                options={leistungskonten}
              />
            </div>
          )}

          {type === "ausgabe" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-aufwand">Aufwandskonto</Label>
              <AccountSelect
                id="tx-aufwand"
                value={aufwandKonto}
                onChange={setAufwandKonto}
                options={aufwandkonten}
              />
            </div>
          )}

          {NEEDS_PAYMENT_METHOD.includes(type) && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Zahlungsart</Label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={paymentMethod}
                onValueChange={v => v && setPaymentMethod(v as PaymentMethod)}
                className="justify-start"
              >
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                  <ToggleGroupItem key={m} value={m} className="px-3">
                    {PAYMENT_METHOD_LABELS[m]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}

          {NEEDS_DESCRIPTION.includes(type) && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="tx-desc">
                {type === "ausgabe" ? "Beschreibung" : "Leistung"}
              </Label>
              <Input
                id="tx-desc"
                placeholder={
                  type === "ausgabe"
                    ? "z. B. Tankrechnung Fahrschulwagen"
                    : "z. B. Fahrübungsstunde (90)"
                }
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          {type === "transfer" && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="tx-desc-transfer">Beschreibung (optional)</Label>
              <Input
                id="tx-desc-transfer"
                placeholder="z. B. Bareinzahlung auf Bankkonto"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          )}

          {vatPreview && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Netto{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(vatPreview.netCents)}
              </span>
              {" · "}USt {vatPreview.rate} %{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(vatPreview.vatCents)}
              </span>
              {" · "}Brutto{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatCents(vatPreview.grossCents)}
              </span>
            </p>
          )}
          {vatAccount?.kind === "durchlaufend" && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Durchlaufender Posten (§ 10 Abs. 1 UStG) — keine Umsatzsteuer.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" disabled={submitting} onClick={submit}>
            Buchen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
