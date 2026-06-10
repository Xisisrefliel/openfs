/* ------------------------------------------------------------------ */
/* Fahrschüler detail — Dokumente tab. The Ausbildungsvertrag (print   */
/* via VertragDialog) plus the document checklist, persisted through   */
/* the students API like every other student edit.                     */
/* ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Download, FileText, Plus, Printer, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type { StudentRecord } from "@/hooks/use-students";
import { VertragDialog } from "@/components/VertragDialog.tsx";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import type {
  StudentDocument,
  UploadedStudentDocument,
} from "@/lib/student-data";
import {
  fileToStudentDocument,
  getStudentDocumentKey,
  getStudentDocumentMeta,
  getStudentDocumentName,
  hasStudentDocumentNamed,
  isUploadedStudentDocument,
  MAX_STUDENT_DOCUMENT_BYTES,
} from "@/lib/student-documents";
import type { StudentEdit } from "./fields";

/* Uniform thumbnail tile; falls back to an icon or extension badge. */
function DocumentTile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
      {children}
    </div>
  );
}

/* Scaled-down first page of a PDF. Chrome's viewer needs a blob URL for
   the #toolbar fragment params, so the data URL is converted once. */
function PdfThumbnail({ dataUrl }: { dataUrl: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void fetch(dataUrl)
      .then(response => response.blob())
      .then(blob => {
        if (cancelled) return;
        url = URL.createObjectURL(
          blob.slice(0, blob.size, "application/pdf")
        );
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [dataUrl]);

  if (!blobUrl) {
    return (
      <DocumentTile>
        <FileText className="size-5 text-muted-foreground" />
      </DocumentTile>
    );
  }
  return (
    <DocumentTile>
      <iframe
        src={`${blobUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        title="PDF-Vorschau"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none origin-top-left border-0 bg-white"
        style={{ width: 192, height: 192, transform: "scale(0.25)" }}
      />
    </DocumentTile>
  );
}

function UploadedDocumentPreview({
  document,
}: {
  document: UploadedStudentDocument;
}) {
  if (document.mimeType.startsWith("image/")) {
    return (
      <img
        src={document.dataUrl}
        alt=""
        className="size-12 shrink-0 rounded-md border object-cover"
      />
    );
  }
  if (document.mimeType === "application/pdf") {
    return <PdfThumbnail dataUrl={document.dataUrl} />;
  }
  const extension = document.name.includes(".")
    ? document.name.split(".").pop()!.slice(0, 4)
    : null;
  return (
    <DocumentTile>
      {extension ? (
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          {extension}
        </span>
      ) : (
        <FileText className="size-5 text-muted-foreground" />
      )}
    </DocumentTile>
  );
}

function DocumentPreview({ document }: { document: StudentDocument }) {
  if (isUploadedStudentDocument(document)) {
    return <UploadedDocumentPreview document={document} />;
  }
  // Checklist entry — no file data to preview.
  return (
    <DocumentTile>
      <FileText className="size-5 text-muted-foreground" />
    </DocumentTile>
  );
}

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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [documentInput, setDocumentInput] = useState("");
  const [saving, setSaving] = useState(false);

  const saveDocuments = async (
    documents: StudentDocument[],
    successMessage: string
  ) => {
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
    if (hasStudentDocumentNamed(student.documents, nextDocument)) {
      toast.info("Dieses Dokument ist bereits hinterlegt.");
      return;
    }
    await saveDocuments(
      [...student.documents, nextDocument],
      `„${nextDocument}" hinzugefügt.`
    );
    setDocumentInput("");
  };

  const uploadDocuments = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (files.length === 0) return;

    const tooLarge = files.find(file => file.size > MAX_STUDENT_DOCUMENT_BYTES);
    if (tooLarge) {
      toast.error(
        `„${tooLarge.name}" ist größer als 12 MB und wurde nicht hochgeladen.`
      );
      return;
    }

    const duplicates = files.filter(file =>
      hasStudentDocumentNamed(student.documents, file.name)
    );
    if (duplicates.length > 0) {
      toast.info(
        duplicates.length === 1
          ? `„${duplicates[0]!.name}" ist bereits hinterlegt.`
          : `${duplicates.length} Dateien sind bereits hinterlegt.`
      );
    }

    const newFiles = files.filter(
      file => !hasStudentDocumentNamed(student.documents, file.name)
    );
    if (newFiles.length === 0) return;

    setSaving(true);
    try {
      const uploadedDocuments = await Promise.all(
        newFiles.map(fileToStudentDocument)
      );
      await onSave({ documents: [...student.documents, ...uploadedDocuments] });
      toast.success(
        uploadedDocuments.length === 1
          ? `„${uploadedDocuments[0]!.name}" hochgeladen.`
          : `${uploadedDocuments.length} Dokumente hochgeladen.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload fehlgeschlagen."
      );
    } finally {
      setSaving(false);
    }
  };

  const removeDocument = (documentToRemove: StudentDocument, index: number) =>
    saveDocuments(
      student.documents.filter(
        (document, documentIndex) =>
          getStudentDocumentKey(document, documentIndex) !==
          getStudentDocumentKey(documentToRemove, index)
      ),
      `„${getStudentDocumentName(documentToRemove)}" entfernt.`
    );

  const downloadDocument = (documentToDownload: StudentDocument) => {
    if (!isUploadedStudentDocument(documentToDownload)) return;

    const link = document.createElement("a");
    link.href = documentToDownload.dataUrl;
    link.download = documentToDownload.name;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Contract — generated document, printable */}
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Vertragsdokumente
        </h3>
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <DocumentTile>
            <FileText className="size-5 text-muted-foreground" />
          </DocumentTile>
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
        <div className="flex flex-col gap-2 rounded-lg border border-dashed bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Upload className="text-muted-foreground" />
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-medium">Datei hochladen</span>
              <span className="text-xs text-muted-foreground">
                PDF, Bild oder Office-Datei bis 12 MB
              </span>
            </div>
          </div>
          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            disabled={saving}
            onChange={uploadDocuments}
            tabIndex={-1}
            aria-hidden="true"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload data-icon="inline-start" />
            Hochladen
          </Button>
        </div>

        {student.documents.length === 0 ? (
          <Empty className="min-h-40 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileText />
              </EmptyMedia>
              <EmptyTitle>Noch keine Dokumente hinterlegt</EmptyTitle>
              <EmptyDescription>
                Lade Dateien hoch oder füge einen Checklisteneintrag hinzu.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          student.documents.map((document, index) => (
            <div
              key={getStudentDocumentKey(document, index)}
              className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <DocumentPreview document={document} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {getStudentDocumentName(document)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getStudentDocumentMeta(document)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-end gap-1">
                {isUploadedStudentDocument(document) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => downloadDocument(document)}
                  >
                    <Download data-icon="inline-start" />
                    Download
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={saving}
                  onClick={() => removeDocument(document, index)}
                  aria-label={`${getStudentDocumentName(document)} entfernen`}
                >
                  <X />
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
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
            className="sm:w-auto"
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
