import { beforeEach, describe, expect, test } from "bun:test";
import type { Database } from "./sqlite";

import { DEFAULT_COMPANY, openDb, setCompany } from "./db";
import {
  DATEV_COLUMNS,
  DATEV_COLUMN_COUNT,
  datevAmount,
  encodeCp1252,
  generateDatevExport,
} from "./datev";
import { createTransaction, stornoTransaction, ValidationError } from "./engine";
import { seedTransactions } from "./seed";

let db: Database;

const STUDENT = {
  customerNo: "10051",
  name: "Aylin Demir",
  address: "Bleichstraße 9, 64283 Darmstadt",
  contractNo: "V-2026-0987",
  classes: "B197",
};

const CREATED_AT = new Date(2026, 5, 9, 12, 30, 45);

function decodeCp1252(bytes: Uint8Array): string {
  return new TextDecoder("windows-1252").decode(bytes);
}

function exportLines(from = "2026-01-01", to = "2026-12-31"): string[] {
  const { bytes } = generateDatevExport(db, { from, to, createdAt: CREATED_AT });
  const content = decodeCp1252(bytes);
  expect(content.endsWith("\r\n")).toBe(true);
  return content.slice(0, -2).split("\r\n");
}

beforeEach(() => {
  db = openDb(":memory:");
  setCompany(db, { ...DEFAULT_COMPANY, beraterNr: "29098", mandantNr: "55003" });
});

describe("file structure", () => {
  test("column row has exactly 125 fields, header 31, data rows 125", () => {
    expect(DATEV_COLUMNS.split(";")).toHaveLength(DATEV_COLUMN_COUNT);

    seedTransactions(db);
    const lines = exportLines();
    expect(lines[0]!.split(";")).toHaveLength(31);
    expect(lines[1]).toBe(DATEV_COLUMNS);
    // 13 bookings seeded
    expect(lines.length).toBe(2 + 13);
    for (const line of lines.slice(2)) {
      expect(line.split(";")).toHaveLength(DATEV_COLUMN_COUNT);
    }
  });

  test("EXTF metadata header", () => {
    seedTransactions(db);
    const fields = exportLines("2026-06-01", "2026-06-30")[0]!.split(";");
    expect(fields[0]).toBe('"EXTF"'); //  extern erzeugt
    expect(fields[1]).toBe("700"); //     Schnittstellenversion
    expect(fields[2]).toBe("21"); //      Formatkategorie Buchungsstapel
    expect(fields[3]).toBe('"Buchungsstapel"');
    expect(fields[4]).toBe("13"); //      Formatversion
    expect(fields[5]).toBe("20260609123045000"); // erzeugt am
    expect(fields[6]).toBe(""); //        Importiert bleibt leer
    expect(fields[10]).toBe("29098"); //  Beraternummer
    expect(fields[11]).toBe("55003"); //  Mandantennummer
    expect(fields[12]).toBe("20260101"); // WJ-Beginn
    expect(fields[13]).toBe("4"); //      Sachkontenlänge
    expect(fields[14]).toBe("20260601");
    expect(fields[15]).toBe("20260630");
    expect(fields[18]).toBe("1"); //      Buchungstyp Finanzbuchhaltung
    expect(fields[20]).toBe("1"); //      Festschreibung (GoBD)
    expect(fields[21]).toBe('"EUR"');
    expect(fields[26]).toBe('"04"'); //   SKR
  });

  test("filename follows the EXTF_ convention", () => {
    seedTransactions(db);
    const { filename } = generateDatevExport(db, {
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(filename).toBe("EXTF_Buchungsstapel_20260601_20260630.csv");
  });

  test("encodes Windows-1252: umlauts and U+2013 dash", () => {
    seedTransactions(db);
    const { bytes } = generateDatevExport(db, {
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(bytes).toContain(0xfc); // ü  (TÜV, Gül)
    expect(bytes).toContain(0x96); // –  (Beleginfo – Art 1)
    expect(bytes[0]).toBe(0x22); // starts with '"' — no BOM
  });
});

describe("booking rows", () => {
  test("Zahlung auf Guthaben: Konto 1600 S an 3272, kein BU (Automatik)", () => {
    createTransaction(db, {
      type: "zahlung_guthaben",
      date: "2026-06-08",
      amountCents: 40983,
      geldkonto: "1600",
      paymentMethod: "bar",
      student: STUDENT,
    });
    const fields = exportLines()[2]!.split(";");
    expect(fields[0]).toBe("409,83");
    expect(fields[1]).toBe('"S"');
    expect(fields[6]).toBe("1600");
    expect(fields[7]).toBe("3272");
    expect(fields[8]).toBe(""); // 3272 ist Automatikkonto
    expect(fields[9]).toBe("0806"); // TTMM
    expect(fields[10]).toBe('"T0000124A"');
    expect(fields[13]).toBe('"Zahlung auf Ausbildungskonto"');
  });

  test("Guthabenübertragung auf Erlöse und TÜV-Gebühr ohne BU", () => {
    createTransaction(db, {
      type: "guthaben_uebertragung",
      date: "2026-06-08",
      amountCents: 13000,
      habenKonto: "4400",
      student: STUDENT,
      description: "Fahrübungsstunde (90)",
    });
    createTransaction(db, {
      type: "guthaben_uebertragung",
      date: "2026-06-08",
      amountCents: 12983,
      habenKonto: "1370",
      student: STUDENT,
      description: "TÜV Prüfungsgebühr",
    });
    const lines = exportLines();
    const fahrstunde = lines[2]!.split(";");
    expect(fahrstunde[1]).toBe('"S"');
    expect(fahrstunde[6]).toBe("3272");
    expect(fahrstunde[7]).toBe("4400");
    expect(fahrstunde[8]).toBe(""); // 4400 Automatikkonto
    const tuev = lines[3]!.split(";");
    expect(tuev[7]).toBe("1370");
    expect(tuev[8]).toBe(""); // durchlaufender Posten — keine USt
  });

  test("Ausgabe 19 % wird gedreht: Konto 1800 H an 6530 mit BU 9", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 11900,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "Tankrechnung Fahrschulwagen",
    });
    const fields = exportLines()[2]!.split(";");
    expect(fields[0]).toBe("119,00");
    expect(fields[1]).toBe('"H"'); // Geldkonto im Haben
    expect(fields[6]).toBe("1800");
    expect(fields[7]).toBe("6530"); // BU-Schlüssel gehört zum Gegenkonto
    expect(fields[8]).toBe('"9"'); // Vorsteuer 19 %
  });

  test("Storno einer Ausgabe: 1800 S an 6530 mit BU 9, kein Drehen nötig", () => {
    const created = createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 11900,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "Tankrechnung",
    });
    stornoTransaction(db, created.id, "Doppelt erfasst", "2026-06-09");
    const lines = exportLines();
    const storno = lines[3]!.split(";");
    expect(storno[1]).toBe('"S"');
    expect(storno[6]).toBe("1800");
    expect(storno[7]).toBe("6530");
    expect(storno[8]).toBe('"9"');
    expect(storno[9]).toBe("0906");
  });

  test("Transfer läuft über 1460 Geldtransit (zwei Zeilen)", () => {
    createTransaction(db, {
      type: "transfer",
      date: "2026-06-08",
      amountCents: 80000,
      fromKonto: "1600",
      toKonto: "1800",
    });
    const lines = exportLines();
    expect(lines.length).toBe(4);
    const first = lines[2]!.split(";");
    expect([first[6], first[7]]).toEqual(["1460", "1600"]);
    const second = lines[3]!.split(";");
    expect([second[6], second[7]]).toEqual(["1800", "1460"]);
  });

  test("rows are chronological and fields contain no raw separators", () => {
    seedTransactions(db);
    const lines = exportLines();
    const dates = lines.slice(2).map((line) => line.split(";")[9]);
    expect(dates).toEqual([...dates].sort((a, b) => a!.localeCompare(b!)));
    for (const line of lines.slice(2)) {
      // naive split must equal the column count — i.e. no field value
      // smuggles an unquoted semicolon in
      expect(line.split(";")).toHaveLength(DATEV_COLUMN_COUNT);
    }
  });
});

describe("validation", () => {
  test("rejects year-spanning ranges (Belegdatum is TTMM)", () => {
    seedTransactions(db);
    expect(() =>
      generateDatevExport(db, { from: "2025-12-01", to: "2026-01-31" }),
    ).toThrow(ValidationError);
  });

  test("rejects missing range or reversed range", () => {
    seedTransactions(db);
    expect(() => generateDatevExport(db, {})).toThrow(ValidationError);
    expect(() =>
      generateDatevExport(db, { from: "2026-07-01", to: "2026-06-01" }),
    ).toThrow(ValidationError);
  });

  test("rejects missing Berater-/Mandantennummer with a helpful message", () => {
    seedTransactions(db);
    setCompany(db, { ...DEFAULT_COMPANY, beraterNr: "", mandantNr: "" });
    expect(() =>
      generateDatevExport(db, { from: "2026-06-01", to: "2026-06-30" }),
    ).toThrow(/Beraternummer/);
    setCompany(db, { ...DEFAULT_COMPANY, beraterNr: "29098", mandantNr: "" });
    expect(() =>
      generateDatevExport(db, { from: "2026-06-01", to: "2026-06-30" }),
    ).toThrow(/Mandantennummer/);
    // Beraternummer below 1001 is invalid
    setCompany(db, { ...DEFAULT_COMPANY, beraterNr: "999", mandantNr: "1" });
    expect(() =>
      generateDatevExport(db, { from: "2026-06-01", to: "2026-06-30" }),
    ).toThrow(/Beraternummer/);
  });

  test("rejects empty period", () => {
    seedTransactions(db);
    expect(() =>
      generateDatevExport(db, { from: "2026-01-01", to: "2026-01-31" }),
    ).toThrow(/keine Buchungen/);
  });
});

describe("datevAmount", () => {
  test("decimal comma without thousand separators", () => {
    expect(datevAmount(40983)).toBe("409,83");
    expect(datevAmount(125000)).toBe("1250,00");
    expect(datevAmount(5)).toBe("0,05");
    expect(datevAmount(123456789)).toBe("1234567,89");
    expect(() => datevAmount(0)).toThrow();
    expect(() => datevAmount(-100)).toThrow();
  });
});

describe("formula injection", () => {
  test("= prefix is neutralized with apostrophe", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 10000,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "=cmd|' /c calc'!A1",
    });
    const field = exportLines()[2]!.split(";")[13]!;
    expect(field).toBe(`"'=cmd|' /c calc'!A1"`);
  });

  test("+ prefix is neutralized with apostrophe", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 10000,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "+49 Telefonpauschale",
    });
    const field = exportLines()[2]!.split(";")[13]!;
    expect(field).toBe(`"'+49 Telefonpauschale"`);
  });

  test("@ prefix is neutralized with apostrophe", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 10000,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "@sum important",
    });
    const field = exportLines()[2]!.split(";")[13]!;
    expect(field).toBe(`"'@sum important"`);
  });

  test("trigger char NOT in first position: no apostrophe added", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 10000,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "Rabatt -10% Aktion",
    });
    const field = exportLines()[2]!.split(";")[13]!;
    expect(field).toBe(`"Rabatt -10% Aktion"`);
  });

  test("- prefix is neutralized with apostrophe", () => {
    createTransaction(db, {
      type: "ausgabe",
      date: "2026-06-08",
      amountCents: 10000,
      geldkonto: "1800",
      aufwandKonto: "6530",
      description: "-Anzahlung Storno",
    });
    const field = exportLines()[2]!.split(";")[13]!;
    expect(field).toBe(`"'-Anzahlung Storno"`);
  });
});

describe("encodeCp1252", () => {
  test("maps Latin-1 1:1 and CP1252 extras", () => {
    const bytes = encodeCp1252("Gül – 10€ ßä");
    expect([...bytes]).toEqual([
      0x47, 0xfc, 0x6c, 0x20, 0x96, 0x20, 0x31, 0x30, 0x80, 0x20, 0xdf, 0xe4,
    ]);
    // unmappable characters degrade to '?'
    expect([...encodeCp1252("漢")]).toEqual([0x3f]);
  });
});
