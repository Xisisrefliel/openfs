/* ------------------------------------------------------------------ */
/* Storno — GoBD-konform: Buchungen werden nie geändert oder gelöscht, */
/* sondern durch eine Gegenbuchung mit Stornogrund neutralisiert.      */
/* ------------------------------------------------------------------ */

import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { accountingApi } from "./api";

export type StornoTarget = { id: number; label: string };

export function StornoDialog({
  target,
  onClose,
  onDone,
}: {
  target: StornoTarget | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!target) return;
    if (!reason.trim()) {
      toast.error("Bitte einen Stornogrund angeben.");
      return;
    }
    setSubmitting(true);
    try {
      await accountingApi.storno(target.id, reason.trim());
      toast.success("Buchung storniert — Gegenbuchung wurde erstellt.");
      setReason("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Storno fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={target != null}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buchung stornieren</DialogTitle>
          <DialogDescription>
            {target?.label} — die Originalbuchung bleibt erhalten, es wird eine
            Gegenbuchung mit Stornogrund erstellt (GoBD).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="storno-reason">Stornogrund</Label>
          <Textarea
            id="storno-reason"
            rows={3}
            placeholder="z. B. Falscher Betrag erfasst"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={submit}
          >
            Stornieren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
