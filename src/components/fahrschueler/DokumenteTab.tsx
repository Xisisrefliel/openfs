/* ------------------------------------------------------------------ */
/* Fahrschüler detail — Dokumente tab. The Ausbildungsvertrag (print   */
/* via VertragDialog) plus the document checklist, persisted through   */
/* the students API like every other student edit.                     */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import { FileText, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";

import type { StudentRecord } from "@/hooks/use-students";
import { VertragDialog } from "@/components/VertragDialog.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StudentEdit } from "./fields";

export function DokumenteTab({
  student,
  onSave,
}: {
  student: StudentRecord;
  onSave: (updates: Partial<StudentEdit>) => Promise<void>;
}) {
  const [vertragStudent, setVertragStudent] = useState<StudentRecord | null>(
    null
  );
  const [documentInput, setDocumentInput] = useState("");
  const [saving, setSaving] = useState(false);

  const saveDocuments = async (documents: string[], successMessage: string) => {
    setSaving(true);
    try {
      await onSave({ documents });
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  };

  const addDocument = async () => {
    const nextDocument = documentInput.trim();
    if (!nextDocument) return;
    if (student.documents.includes(nextDocument)) {
      toast.info("Dieses Dokument ist bereits hinterlegt.");
      return;
    }
    await saveDocuments(
      [...student.documents, nextDocument],
      `„${nextDocument}" hinzugefügt.`
    );
    setDocumentInput("");
  };

  const removeDocument = (documentToRemove: string) =>
    saveDocuments(
      student.documents.filter(document => document !== documentToRemove),
      `„${documentToRemove}" entfernt.`
    );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Contract — generated document, printable */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Vertragsdokumente
        </h3>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <FileText className="text-muted-foreground" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">
              Ausbildungsvertrag · {student.contractNumber}
            </span>
            <span className="text-xs text-muted-foreground">
              Anmeldedatum {student.registrationDate} · Klasse {student.classes}
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setVertragStudent(student)}
          >
            <Printer data-icon="inline-start" />
            Drucken
          </Button>
        </div>
      </div>

      {/* Checklist — documents the student handed in */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Eingereichte Dokumente
        </h3>
        {student.documents.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Noch keine Dokumente hinterlegt.
          </p>
        ) : (
          student.documents.map(document => (
            <div
              key={document}
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
            >
              <FileText className="text-muted-foreground" />
              <span className="flex-1 text-sm">{document}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={saving}
                onClick={() => removeDocument(document)}
                aria-label={`${document} entfernen`}
              >
                <X />
              </Button>
            </div>
          ))
        )}

        <div className="flex gap-2 pt-1">
          <Input
            value={documentInput}
            onChange={event => setDocumentInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addDocument();
              }
            }}
            placeholder="z. B. Führungszeugnis"
          />
          <Button
            type="button"
            variant="outline"
            disabled={saving || !documentInput.trim()}
            onClick={addDocument}
          >
            <Plus data-icon="inline-start" />
            Hinzufügen
          </Button>
        </div>
      </div>

      <VertragDialog
        student={vertragStudent}
        onClose={() => setVertragStudent(null)}
      />
    </div>
  );
}
