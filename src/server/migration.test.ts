import { beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

import { migrateSkr03ToSkr04, openDb } from "./db";
import { listAccounts, listJournal, listLedger } from "./engine";
import { seedTransactions } from "./seed";

/* Simulates a database created before the SKR-04 switch: same chart,
   SKR-03 numbers. The migration must remap accounts AND bookings in
   place without losing data — including the collision where the old
   1800 (Privatentnahmen) overlaps the new 1800 (Bank). */

const SKR04_TO_SKR03: [string, string][] = [
  ["1600", "1000"], // Kasse
  ["1800", "1200"], // Bank
  ["1460", "1360"], // Geldtransit
  ["1406", "1576"], // Vorsteuer 19 %
  ["1370", "1590"], // Durchlaufende Posten
  ["3272", "1718"], // Erhaltene Anzahlungen 19 %
  ["3806", "1776"], // Umsatzsteuer 19 %
  ["2100", "1800"], // Privatentnahmen  ← collides with new Bank number
  ["2180", "1890"], // Privateinlagen
  ["7310", "2110"],
  ["6310", "4210"],
  ["7685", "4510"],
  ["6520", "4520"],
  ["6530", "4530"],
  ["6540", "4540"],
  ["6815", "4930"],
  ["4100", "8100"],
  ["4300", "8300"],
  ["4400", "8400"],
];

let db: Database;

/** Build a legacy SKR-03 database: seed normally, then rename back. */
function downgradeToSkr03(db: Database) {
  db.exec("PRAGMA foreign_keys = OFF;");
  const tmp = db.prepare("UPDATE accounts SET number = ? WHERE number = ?");
  for (const [neu] of SKR04_TO_SKR03) tmp.run(`tmp:${neu}`, neu);
  for (const [neu, alt] of SKR04_TO_SKR03) {
    db.prepare("UPDATE accounts SET number = ? WHERE number = ?").run(
      alt,
      `tmp:${neu}`
    );
    db.prepare("UPDATE bookings SET soll_account = ? WHERE soll_account = ?").run(
      alt,
      neu
    );
    db.prepare(
      "UPDATE bookings SET haben_account = ? WHERE haben_account = ?"
    ).run(alt, neu);
  }
  db.exec("PRAGMA foreign_keys = ON;");
}

beforeEach(() => {
  db = openDb(":memory:");
  seedTransactions(db);
  downgradeToSkr03(db);
});

describe("SKR 03 → SKR 04 migration", () => {
  test("legacy fixture really looks like SKR 03", () => {
    const numbers = new Set(listAccounts(db).map(a => a.number));
    expect(numbers.has("8400")).toBe(true);
    expect(numbers.has("4400")).toBe(false);
    // legacy 1800 is Privatentnahmen, not Bank
    expect(listAccounts(db).find(a => a.number === "1800")?.name).toBe(
      "Privatentnahmen allgemein"
    );
  });

  test("remaps accounts and bookings, resolving the 1800 collision", () => {
    const before = listLedger(db, {});
    migrateSkr03ToSkr04(db);

    const accounts = new Map(listAccounts(db).map(a => [a.number, a]));
    expect(accounts.get("1600")?.name).toBe("Kasse");
    expect(accounts.get("1800")?.name).toBe("Bank"); // not Privatentnahmen
    expect(accounts.get("2100")?.name).toBe("Privatentnahmen allgemein");
    expect(accounts.get("3272")?.name).toBe("Erhaltene Anzahlungen 19 % USt");
    expect(accounts.get("4400")?.name).toBe("Erlöse 19 % USt");
    // no SKR-03 numbers left
    for (const alt of ["1000", "1360", "1590", "1718", "8400", "8300", "8100"]) {
      expect(accounts.has(alt)).toBe(false);
    }
    expect(accounts.size).toBe(19);

    // every booking now references SKR-04 accounts — none dangling
    const journal = listJournal(db, {});
    expect(journal).toHaveLength(13);
    for (const row of journal) {
      expect(accounts.has(row.sollKonto)).toBe(true);
      expect(accounts.has(row.habenKonto)).toBe(true);
    }
    const zahlung = journal.find(r => r.belegNr === "T0000124A")!;
    expect(zahlung.sollKonto).toBe("1600");
    expect(zahlung.habenKonto).toBe("3272");

    // balances unchanged by the renumbering
    const after = listLedger(db, {});
    expect(after.openingCents).toBe(before.openingCents);
    expect(after.closingCents).toBe(before.closingCents);
    expect(after.rows).toHaveLength(before.rows.length);
  });

  test("is idempotent and leaves fresh SKR-04 databases alone", () => {
    migrateSkr03ToSkr04(db);
    migrateSkr03ToSkr04(db); // second run must be a no-op
    expect(listAccounts(db)).toHaveLength(19);
    expect(
      listAccounts(db).find(a => a.number === "1800")?.name
    ).toBe("Bank");

    const fresh = openDb(":memory:");
    seedTransactions(fresh);
    migrateSkr03ToSkr04(fresh);
    expect(listAccounts(fresh).find(a => a.number === "1800")?.name).toBe("Bank");
  });
});
