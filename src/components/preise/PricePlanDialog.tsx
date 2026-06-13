/* ------------------------------------------------------------------ */
/* Preisplan anlegen/bearbeiten — one dialog for both. Prices are      */
/* entered as German euro strings and stored as integer cents; an      */
/* empty price means "inklusive" (no separate charge).                 */
/* ------------------------------------------------------------------ */

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { PricePlanInput, PricePlanRecord } from "@/lib/price-plan";
import { createPricePlan, updatePricePlan } from "@/hooks/use-price-plans";
import { formatCents, parseEuroToCents } from "@/lib/money";
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

type ComponentDraft = {
  label: string;
  duration: string; // minutes as text, "" = none
  price: string; // euro string, "" = inklusive
};

const emptyRow: ComponentDraft = { label: "", duration: "", price: "" };

function toDrafts(plan: PricePlanRecord | null): ComponentDraft[] {
  if (!plan) return [{ ...emptyRow }];
  return plan.components.map((component) => ({
    label: component.label,
    duration: component.durationMin == null ? "" : String(component.durationMin),
    price: component.priceCents == null ? "" : formatCents(component.priceCents),
  }));
}

export function PricePlanDialog({
  open,
  plan,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create a new plan */
  plan: PricePlanRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [months, setMonths] = useState("");
  const [rows, setRows] = useState<ComponentDraft[]>([{ ...emptyRow }]);
  const [submitting, setSubmitting] = useState(false);

  // Re-seed the form whenever the dialog opens for a (different) plan.
  useEffect(() => {
    if (!open) return;
    setName(plan?.name ?? "");
    setMonths(plan ? String(plan.guaranteedMonths) : "240");
    setRows(toDrafts(plan));
  }, [open, plan]);

  const updateRow = (index: number, patch: Partial<ComponentDraft>) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, i) => i !== index));
  };

  const addRow = () => setRows((current) => [...current, { ...emptyRow }]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Bitte einen Namen für den Preisplan angeben.");
      return;
    }
    const guaranteedMonths = Number(months);
    if (!Number.isInteger(guaranteedMonths) || guaranteedMonths < 0) {
      toast.error("Garantierter Zeitraum muss eine Monatszahl sein.");
      return;
    }

    const components: PricePlanInput["components"] = [];
    for (const row of rows) {
      if (!row.label.trim()) {
        // Skip fully empty rows; complain about half-filled ones.
        if (!row.duration.trim() && !row.price.trim()) continue;
        toast.error("Jede Preiskomponente braucht eine Bezeichnung.");
        return;
      }
      let durationMin: number | null = null;
      if (row.duration.trim()) {
        const minutes = Number(row.duration);
        if (!Number.isInteger(minutes) || minutes <= 0) {
          toast.error(
            `Dauer von „${row.label.trim()}" muss eine positive Minutenzahl sein.`,
          );
          return;
        }
        durationMin = minutes;
      }
      let priceCents: number | null = null;
      if (row.price.trim()) {
        priceCents = parseEuroToCents(row.price);
        if (priceCents == null) {
          toast.error(`Preis von „${row.label.trim()}" ist ungültig (z. B. 75,00).`);
          return;
        }
      }
      components.push({ label: row.label.trim(), durationMin, priceCents });
    }
    if (components.length === 0) {
      toast.error("Ein Preisplan braucht mindestens eine Preiskomponente.");
      return;
    }

    const input: PricePlanInput = {
      name: name.trim(),
      guaranteedMonths,
      components,
    };

    setSubmitting(true);
    try {
      if (plan) {
        await updatePricePlan(plan.id, input);
        toast.success(`Preisplan „${input.name}" gespeichert.`);
      } else {
        await createPricePlan(input);
        toast.success(`Preisplan „${input.name}" angelegt.`);
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Speichern fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? "Preisplan bearbeiten" : "Preisplan anlegen"}</DialogTitle>
          <DialogDescription>
            Preise gelten brutto; ein leerer Preis bedeutet „inklusive".
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-name">Name des Preisplans</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="z. B. Standard Tarif"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plan-months">Garantierter Zeitraum (Monate)</Label>
              <Input
                id="plan-months"
                inputMode="numeric"
                value={months}
                onChange={(event) => setMonths(event.target.value)}
                placeholder="z. B. 240"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_6rem_8rem_2rem] gap-2 text-xs font-medium text-muted-foreground">
              <span>Preiskomponente</span>
              <span>Dauer (Min)</span>
              <span>Preis, EUR</span>
              <span />
            </div>
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_6rem_8rem_2rem] items-center gap-2"
              >
                <Input
                  value={row.label}
                  onChange={(event) => updateRow(index, { label: event.target.value })}
                  placeholder="z. B. Nachtfahrt"
                  aria-label={`Bezeichnung Komponente ${index + 1}`}
                />
                <Input
                  inputMode="numeric"
                  value={row.duration}
                  onChange={(event) => updateRow(index, { duration: event.target.value })}
                  placeholder="45"
                  aria-label={`Dauer Komponente ${index + 1}`}
                />
                <Input
                  inputMode="decimal"
                  value={row.price}
                  onChange={(event) => updateRow(index, { price: event.target.value })}
                  placeholder="inklusive"
                  aria-label={`Preis Komponente ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  aria-label={`Komponente ${index + 1} entfernen`}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={addRow}
            >
              <Plus data-icon="inline-start" />
              Komponente hinzufügen
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" disabled={submitting} onClick={submit}>
            {plan ? "Speichern" : "Anlegen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
