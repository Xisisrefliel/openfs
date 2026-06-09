/* ------------------------------------------------------------------ */
/* SQLite layer (bun:sqlite) — schema, sequences, account seed.        */
/*                                                                     */
/* GoBD principles baked into the schema:                              */
/*  - bookings are immutable (no UPDATE/DELETE code paths exist),      */
/*  - Beleg-/Buchungs-/Quittungsnummern come from gapless DB           */
/*    sequences allocated inside the same write transaction,           */
/*  - corrections only via Storno (reversal transactions).             */
/* ------------------------------------------------------------------ */

import { Database } from "bun:sqlite";

import type { AccountKind, CompanyProfile } from "../lib/accounting-types";

export const DDL = `
CREATE TABLE IF NOT EXISTS accounts (
  number TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  vat_rate INTEGER,
  vat_label TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  opening_cents INTEGER,
  opening_date TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  beleg_nr TEXT UNIQUE,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  type TEXT NOT NULL,
  payment_method TEXT,
  description TEXT NOT NULL DEFAULT '',
  student_customer_no TEXT,
  student_name TEXT,
  student_address TEXT,
  student_contract_no TEXT,
  student_classes TEXT,
  storno_of INTEGER REFERENCES transactions(id),
  storno_reason TEXT,
  storniert_by INTEGER REFERENCES transactions(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id),
  buchung_nr TEXT NOT NULL UNIQUE,
  soll_account TEXT NOT NULL REFERENCES accounts(number),
  haben_account TEXT NOT NULL REFERENCES accounts(number),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  vat_rate INTEGER,
  net_cents INTEGER,
  vat_cents INTEGER,
  line_description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS quittungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quittung_nr TEXT NOT NULL UNIQUE,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id),
  issued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sequences (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_bookings_transaction ON bookings(transaction_id);
`;

/* SKR 03 — verified against the published DATEV chart (Ecovis listing). */
type AccountSeed = {
  number: string;
  name: string;
  kind: AccountKind;
  vatRate: number | null;
  vatLabel: string;
  openingCents?: number;
  openingDate?: string;
};

export const SKR03_ACCOUNTS: AccountSeed[] = [
  { number: "1000", name: "Kasse", kind: "geldkonto", vatRate: null, vatLabel: "Nicht zutreffend", openingCents: 348457, openingDate: "2026-01-01" },
  { number: "1200", name: "Bank", kind: "geldkonto", vatRate: null, vatLabel: "Nicht zutreffend", openingCents: 1600000, openingDate: "2026-01-01" },
  { number: "1360", name: "Geldtransit", kind: "transit", vatRate: null, vatLabel: "Nicht zutreffend" },
  { number: "1576", name: "Abziehbare Vorsteuer 19 %", kind: "steuer", vatRate: null, vatLabel: "Nicht zutreffend" },
  { number: "1590", name: "Durchlaufende Posten", kind: "durchlaufend", vatRate: null, vatLabel: "Durchlaufende Posten" },
  { number: "1718", name: "Erhaltene Anzahlungen 19 % USt", kind: "anzahlung", vatRate: 19, vatLabel: "19%" },
  { number: "1776", name: "Umsatzsteuer 19 %", kind: "steuer", vatRate: null, vatLabel: "Nicht zutreffend" },
  { number: "1800", name: "Privatentnahmen allgemein", kind: "privat", vatRate: null, vatLabel: "Nicht zutreffend" },
  { number: "1890", name: "Privateinlagen", kind: "privat", vatRate: null, vatLabel: "Nicht zutreffend" },
  { number: "2110", name: "Zinsaufwendungen für kurzfristige Verbindlichkeiten", kind: "aufwand", vatRate: 0, vatLabel: "0%" },
  { number: "4210", name: "Miete (unbewegliche Wirtschaftsgüter)", kind: "aufwand", vatRate: 0, vatLabel: "0%" },
  { number: "4510", name: "Kfz-Steuern", kind: "aufwand", vatRate: 0, vatLabel: "0%" },
  { number: "4520", name: "Kfz-Versicherungen", kind: "aufwand", vatRate: 0, vatLabel: "0%" },
  { number: "4530", name: "Laufende Kfz-Betriebskosten", kind: "aufwand", vatRate: 19, vatLabel: "19%" },
  { number: "4540", name: "Kfz-Reparaturen", kind: "aufwand", vatRate: 19, vatLabel: "19%" },
  { number: "4930", name: "Bürobedarf", kind: "aufwand", vatRate: 19, vatLabel: "19%" },
  { number: "8100", name: "Steuerfreie Umsätze § 4 Nr. 8 ff. UStG (Ausbildung § 4 Nr. 21)", kind: "erloes", vatRate: 0, vatLabel: "steuerfrei § 4 UStG" },
  { number: "8300", name: "Erlöse 7 % USt", kind: "erloes", vatRate: 7, vatLabel: "7%" },
  { number: "8400", name: "Erlöse 19 % USt", kind: "erloes", vatRate: 19, vatLabel: "19%" },
];

export const DEFAULT_COMPANY: CompanyProfile = {
  name: "Fahrschule Gül",
  address: "Lorscher Straße 6, 60489 Frankfurt am Main",
  email: "info@fahrschule-guel.de",
  phone: "017620162780",
  website: "http://www.fahrschule-guel.de",
  steuernummer: "",
  ustIdNr: "",
  beraterNr: "",
  mandantNr: "",
};

export function openDb(path = "data/fahrschule.db"): Database {
  const db = new Database(path, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(DDL);
  initAccounts(db);
  initSequences(db);
  initSettings(db);
  return db;
}

function initAccounts(db: Database) {
  const count = db
    .query<{ n: number }, []>("SELECT count(*) AS n FROM accounts")
    .get()!.n;
  if (count > 0) return;
  const insert = db.prepare(
    `INSERT INTO accounts (number, name, kind, vat_rate, vat_label, active, opening_cents, opening_date)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
  );
  for (const a of SKR03_ACCOUNTS) {
    insert.run(
      a.number,
      a.name,
      a.kind,
      a.vatRate,
      a.vatLabel,
      a.openingCents ?? null,
      a.openingDate ?? null
    );
  }
}

function initSequences(db: Database) {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO sequences (name, value) VALUES (?, ?)"
  );
  // Start below the demo numbers so the seed lines up with the old UI
  // (first allocated Beleg becomes T0000124A, first Buchung 00000219A).
  insert.run("beleg", 123);
  insert.run("buchung", 218);
}

function initSettings(db: Database) {
  db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES ('company', ?)"
  ).run(JSON.stringify(DEFAULT_COMPANY));
}

/** Gapless sequence — call inside the surrounding write transaction. */
export function nextSequence(db: Database, name: string): number {
  db.prepare("INSERT OR IGNORE INTO sequences (name, value) VALUES (?, 0)").run(
    name
  );
  const row = db
    .query<{ value: number }, [string]>(
      "UPDATE sequences SET value = value + 1 WHERE name = ? RETURNING value"
    )
    .get(name);
  return row!.value;
}

export function nextBelegNr(db: Database): string {
  return `T${String(nextSequence(db, "beleg")).padStart(7, "0")}A`;
}

export function nextBuchungNr(db: Database): string {
  return `${String(nextSequence(db, "buchung")).padStart(8, "0")}A`;
}

export function nextQuittungNr(db: Database, year: number): string {
  return `Q-${year}-${String(nextSequence(db, `quittung:${year}`)).padStart(5, "0")}`;
}

export function getCompany(db: Database): CompanyProfile {
  const row = db
    .query<{ value: string }, []>(
      "SELECT value FROM settings WHERE key = 'company'"
    )
    .get();
  return { ...DEFAULT_COMPANY, ...(row ? JSON.parse(row.value) : {}) };
}

export function setCompany(db: Database, profile: CompanyProfile) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('company', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(JSON.stringify(profile));
}
