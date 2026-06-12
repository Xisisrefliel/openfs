/* ------------------------------------------------------------------ */
/* Unit tests for src/lib/student-documents.ts — pure helper functions */
/* No DB, no side effects. Pattern: src/lib/money.test.ts              */
/* ------------------------------------------------------------------ */

import { describe, expect, test } from "bun:test";
import type { UploadedStudentDocument } from "@/lib/student-data";
import {
  formatStudentDocumentSize,
  formatStudentDocumentUploadedAt,
  getStudentDocumentKey,
  getStudentDocumentName,
  isUploadedStudentDocument,
} from "./student-documents";

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

function makeUpload(overrides: Partial<UploadedStudentDocument> = {}): UploadedStudentDocument {
  return {
    kind: "upload",
    id: "test-id-123",
    name: "Lichtbildausweis.pdf",
    mimeType: "application/pdf",
    size: 204800,
    uploadedAt: "2026-01-15T10:30:00.000Z",
    dataUrl: "data:application/pdf;base64,ABC=",
    ...overrides,
  };
}

/* ================================================================== */
/* isUploadedStudentDocument                                            */
/* ================================================================== */

describe("isUploadedStudentDocument", () => {
  test("valid UploadedStudentDocument → true", () => {
    expect(isUploadedStudentDocument(makeUpload())).toBe(true);
  });

  test("plain string → false", () => {
    expect(isUploadedStudentDocument("Führerscheinantrag")).toBe(false);
  });

  test("object missing kind → false", () => {
    const bad = { id: "x", name: "x", dataUrl: "x" } as unknown;
    expect(isUploadedStudentDocument(bad as string)).toBe(false);
  });

  test("object with kind='checklist' → false", () => {
    const bad = { kind: "checklist", id: "x", name: "x", dataUrl: "x" } as unknown;
    expect(isUploadedStudentDocument(bad as string)).toBe(false);
  });

  test("object with kind='upload' but missing id → false", () => {
    const bad = { kind: "upload", name: "x", dataUrl: "x" } as unknown;
    expect(isUploadedStudentDocument(bad as string)).toBe(false);
  });

  test("object with kind='upload' but missing dataUrl → false", () => {
    const bad = { kind: "upload", id: "x", name: "x" } as unknown;
    expect(isUploadedStudentDocument(bad as string)).toBe(false);
  });

  test("null → false", () => {
    expect(isUploadedStudentDocument(null as unknown as string)).toBe(false);
  });
});

/* ================================================================== */
/* getStudentDocumentName                                               */
/* ================================================================== */

describe("getStudentDocumentName", () => {
  test("UploadedStudentDocument with name → returns name", () => {
    expect(getStudentDocumentName(makeUpload({ name: "Mein Dokument.pdf" }))).toBe("Mein Dokument.pdf");
  });

  test("UploadedStudentDocument with empty name → 'Unbenanntes Dokument'", () => {
    expect(getStudentDocumentName(makeUpload({ name: "" }))).toBe("Unbenanntes Dokument");
  });

  test("plain string → returns the string itself", () => {
    expect(getStudentDocumentName("Führerscheinantrag")).toBe("Führerscheinantrag");
  });
});

/* ================================================================== */
/* getStudentDocumentKey                                                */
/* ================================================================== */

describe("getStudentDocumentKey", () => {
  test("UploadedStudentDocument → 'upload-{id}'", () => {
    expect(getStudentDocumentKey(makeUpload({ id: "abc-123" }), 0)).toBe("upload-abc-123");
  });

  test("plain string at index 0 → 'checklist-{string}-0'", () => {
    expect(getStudentDocumentKey("Sehtest", 0)).toBe("checklist-Sehtest-0");
  });

  test("plain string at index 3 → index is included", () => {
    expect(getStudentDocumentKey("Erstehilfe", 3)).toBe("checklist-Erstehilfe-3");
  });
});

/* ================================================================== */
/* formatStudentDocumentSize                                            */
/* ================================================================== */

describe("formatStudentDocumentSize", () => {
  test("0 bytes → '0 KB'", () => {
    expect(formatStudentDocumentSize(0)).toBe("0 KB");
  });

  test("negative number → '0 KB'", () => {
    expect(formatStudentDocumentSize(-500)).toBe("0 KB");
  });

  test("Infinity → '0 KB'", () => {
    expect(formatStudentDocumentSize(Infinity)).toBe("0 KB");
  });

  test("512 bytes → '1 KB' (ceiled)", () => {
    // Math.ceil(512/1024) = 1
    expect(formatStudentDocumentSize(512)).toBe("1 KB");
  });

  test("1024 bytes (1 KB exact) → '1 KB'", () => {
    expect(formatStudentDocumentSize(1024)).toBe("1 KB");
  });

  test("1048576 bytes (1 MB) → contains 'MB'", () => {
    const result = formatStudentDocumentSize(1048576);
    expect(result).toContain("MB");
    expect(result).toContain("1");
  });

  test("2621440 bytes (2.5 MB) → contains 'MB' and '2'", () => {
    const result = formatStudentDocumentSize(2.5 * 1024 * 1024);
    expect(result).toContain("MB");
    expect(result).toContain("2");
  });

  test("below 1 MB → result ends with 'KB'", () => {
    expect(formatStudentDocumentSize(500000)).toMatch(/KB$/);
  });
});

/* ================================================================== */
/* formatStudentDocumentUploadedAt                                      */
/* ================================================================== */

describe("formatStudentDocumentUploadedAt", () => {
  test("valid ISO string → does not return the fallback message", () => {
    const result = formatStudentDocumentUploadedAt("2026-01-15T10:30:00.000Z");
    expect(result).not.toBe("Uploadzeit unbekannt");
    // Should be a non-empty string with some date-like content
    expect(result.length).toBeGreaterThan(0);
  });

  test("'not a date' → 'Uploadzeit unbekannt'", () => {
    expect(formatStudentDocumentUploadedAt("not a date")).toBe("Uploadzeit unbekannt");
  });

  test("empty string → 'Uploadzeit unbekannt'", () => {
    expect(formatStudentDocumentUploadedAt("")).toBe("Uploadzeit unbekannt");
  });

  test("valid date '2025-06-01T00:00:00Z' → formatted string contains year", () => {
    const result = formatStudentDocumentUploadedAt("2025-06-01T00:00:00Z");
    expect(result).toContain("2025");
  });
});
