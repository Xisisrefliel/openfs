import type { StudentDocument, UploadedStudentDocument } from "@/lib/student-data";

export const MAX_STUDENT_DOCUMENT_BYTES = 12 * 1024 * 1024;

const byteFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 1,
});

const uploadedAtFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function isUploadedStudentDocument(
  document: StudentDocument,
): document is UploadedStudentDocument {
  return (
    typeof document === "object" &&
    document !== null &&
    document.kind === "upload" &&
    typeof document.id === "string" &&
    typeof document.name === "string" &&
    typeof document.dataUrl === "string"
  );
}

export function getStudentDocumentName(document: StudentDocument): string {
  if (isUploadedStudentDocument(document)) {
    return document.name || "Unbenanntes Dokument";
  }
  return document;
}

export function getStudentDocumentKey(document: StudentDocument, index: number): string {
  return isUploadedStudentDocument(document)
    ? `upload-${document.id}`
    : `checklist-${document}-${index}`;
}

export function formatStudentDocumentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `${byteFormatter.format(Math.ceil(bytes / 1024))} KB`;
  }
  return `${byteFormatter.format(bytes / (1024 * 1024))} MB`;
}

export function formatStudentDocumentUploadedAt(uploadedAt: string): string {
  const date = new Date(uploadedAt);
  if (Number.isNaN(date.getTime())) return "Uploadzeit unbekannt";
  return uploadedAtFormatter.format(date);
}

export function getStudentDocumentMeta(document: StudentDocument): string {
  if (!isUploadedStudentDocument(document)) return "Checkliste";
  return `${formatStudentDocumentSize(document.size)} · ${formatStudentDocumentUploadedAt(document.uploadedAt)}`;
}

export function hasStudentDocumentNamed(
  documents: StudentDocument[],
  name: string,
): boolean {
  const normalizedName = name.trim().toLocaleLowerCase("de-DE");
  return documents.some(
    (document) =>
      getStudentDocumentName(document).trim().toLocaleLowerCase("de-DE") ===
      normalizedName,
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Datei konnte nicht gelesen werden."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    });
    reader.readAsDataURL(file);
  });
}

export async function fileToStudentDocument(
  file: File,
): Promise<UploadedStudentDocument> {
  return {
    kind: "upload",
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl: await readFileAsDataUrl(file),
  };
}
