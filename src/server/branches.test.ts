/* ------------------------------------------------------------------ */
/* Unit tests for the branches (Standorte) DB module: ensure + seed,   */
/* CRUD, validation, main-branch exclusivity and the last-branch       */
/* delete guard. In-memory DB per test. Includes a small HTTP round    */
/* trip through branchRoutes() via Bun.serve().                        */
/* ------------------------------------------------------------------ */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { openSqlite, type Database } from "./sqlite";
import { serve } from "bun";

import {
  branchRoutes,
  createBranch,
  deleteBranch,
  ensureBranchTables,
  getBranch,
  listBranches,
  updateBranch,
  type Branch,
} from "./branches";
import { ValidationError } from "./engine";

let db: Database;

beforeEach(() => {
  db = openSqlite(":memory:");
  ensureBranchTables(db);
});

const VALID = {
  name: "Filiale Spandau",
  address: "Altstädter Ring 3, 13597 Berlin",
  phone: "030 5550101",
  email: "spandau@fahrschule.de",
  openingHours: "Mo–Fr 14–18 Uhr",
};

const mainBranch = (branches: Branch[]) => branches.filter((branch) => branch.isMain);

/* ================================================================== */
/* ensure + seed                                                       */
/* ================================================================== */

describe("ensureBranchTables", () => {
  test("a fresh DB seeds exactly 2 branches, one of them main", () => {
    const branches = listBranches(db);
    expect(branches).toHaveLength(2);
    expect(mainBranch(branches)).toHaveLength(1);
  });

  test("is idempotent — running again does not re-seed", () => {
    ensureBranchTables(db);
    ensureBranchTables(db);
    expect(listBranches(db)).toHaveLength(2);
  });

  test("does not re-seed once rows exist (even after deletes)", () => {
    const extra = createBranch(db, VALID);
    const seeded = listBranches(db).filter((branch) => branch.id !== extra.id);
    for (const branch of seeded) deleteBranch(db, branch.id);
    ensureBranchTables(db);
    expect(listBranches(db)).toHaveLength(1);
  });

  test("seeded list is ordered main first", () => {
    expect(listBranches(db)[0]!.isMain).toBe(true);
  });
});

/* ================================================================== */
/* createBranch                                                        */
/* ================================================================== */

describe("createBranch", () => {
  test("happy path returns persisted branch with defaults", () => {
    const branch = createBranch(db, VALID);
    expect(branch.id).toBeGreaterThan(0);
    expect(branch.name).toBe(VALID.name);
    expect(branch.address).toBe(VALID.address);
    expect(branch.phone).toBe(VALID.phone);
    expect(branch.email).toBe(VALID.email);
    expect(branch.openingHours).toBe(VALID.openingHours);
    expect(branch.isMain).toBe(false);
    expect(branch.status).toBe("offen");
    expect(branch.createdAt).not.toBe("");
    expect(listBranches(db)).toHaveLength(3);
  });

  test("trims string fields", () => {
    const branch = createBranch(db, {
      ...VALID,
      name: "  Filiale Nord  ",
      address: "  Nordweg 1  ",
    });
    expect(branch.name).toBe("Filiale Nord");
    expect(branch.address).toBe("Nordweg 1");
  });

  test("missing name → ValidationError 'Name ist ein Pflichtfeld.'", () => {
    expect(() => createBranch(db, { ...VALID, name: "   " })).toThrow(
      "Name ist ein Pflichtfeld.",
    );
  });

  test("missing address → ValidationError 'Adresse ist ein Pflichtfeld.'", () => {
    expect(() => createBranch(db, { ...VALID, address: "" })).toThrow(
      "Adresse ist ein Pflichtfeld.",
    );
  });

  test("invalid status → ValidationError", () => {
    expect(() => createBranch(db, { ...VALID, status: "zu" as never })).toThrow(
      "Status muss 'offen' oder 'geschlossen' sein.",
    );
  });

  test("non-string text field → ValidationError", () => {
    expect(() => createBranch(db, { ...VALID, phone: 42 as never })).toThrow(
      ValidationError,
    );
  });

  test("non-boolean isMain → ValidationError", () => {
    expect(() => createBranch(db, { ...VALID, isMain: "ja" as never })).toThrow(
      "Feld 'isMain' muss true oder false sein.",
    );
  });

  test("status 'geschlossen' is accepted", () => {
    const branch = createBranch(db, { ...VALID, status: "geschlossen" });
    expect(branch.status).toBe("geschlossen");
  });
});

/* ================================================================== */
/* updateBranch                                                        */
/* ================================================================== */

describe("updateBranch", () => {
  test("partial update merges over current values", () => {
    const created = createBranch(db, VALID);
    const updated = updateBranch(db, created.id, { phone: "030 999" });
    expect(updated.phone).toBe("030 999");
    expect(updated.name).toBe(VALID.name); // unchanged field preserved
    expect(updated.openingHours).toBe(VALID.openingHours);
  });

  test("invalid update is rejected and leaves the row untouched", () => {
    const created = createBranch(db, VALID);
    expect(() => updateBranch(db, created.id, { name: "  " })).toThrow(
      "Name ist ein Pflichtfeld.",
    );
    expect(getBranch(db, created.id).name).toBe(VALID.name);
  });

  test("update on missing id → ValidationError 'Standort nicht gefunden.'", () => {
    expect(() => updateBranch(db, 999999, { name: "x" })).toThrow(
      "Standort nicht gefunden.",
    );
  });
});

/* ================================================================== */
/* Main-branch exclusivity                                             */
/* ================================================================== */

describe("main branch exclusivity", () => {
  test("PATCH isMain=true unsets the previous main branch", () => {
    const created = createBranch(db, VALID);
    const previousMain = mainBranch(listBranches(db))[0]!;
    expect(previousMain.id).not.toBe(created.id);

    updateBranch(db, created.id, { isMain: true });

    const branches = listBranches(db);
    expect(mainBranch(branches)).toHaveLength(1);
    expect(mainBranch(branches)[0]!.id).toBe(created.id);
    expect(getBranch(db, previousMain.id).isMain).toBe(false);
  });

  test("creating a branch with isMain=true unsets all others", () => {
    const branch = createBranch(db, { ...VALID, isMain: true });
    const branches = listBranches(db);
    expect(mainBranch(branches)).toHaveLength(1);
    expect(mainBranch(branches)[0]!.id).toBe(branch.id);
  });

  test("re-confirming the current main keeps exactly one main", () => {
    const current = mainBranch(listBranches(db))[0]!;
    updateBranch(db, current.id, { isMain: true });
    expect(mainBranch(listBranches(db))).toHaveLength(1);
  });

  test("deleting the main branch promotes another one", () => {
    const main = mainBranch(listBranches(db))[0]!;
    deleteBranch(db, main.id);
    const branches = listBranches(db);
    expect(branches).toHaveLength(1);
    expect(mainBranch(branches)).toHaveLength(1);
  });
});

/* ================================================================== */
/* deleteBranch                                                        */
/* ================================================================== */

describe("deleteBranch", () => {
  test("removes the branch", () => {
    const created = createBranch(db, VALID);
    deleteBranch(db, created.id);
    expect(listBranches(db)).toHaveLength(2);
    expect(() => getBranch(db, created.id)).toThrow("Standort nicht gefunden.");
  });

  test("delete on missing id → ValidationError", () => {
    expect(() => deleteBranch(db, 999999)).toThrow("Standort nicht gefunden.");
  });

  test("the last remaining branch cannot be deleted", () => {
    const [first, second] = listBranches(db);
    deleteBranch(db, first!.id);
    expect(() => deleteBranch(db, second!.id)).toThrow(
      "Der letzte Standort kann nicht gelöscht werden.",
    );
    expect(listBranches(db)).toHaveLength(1);
  });
});

/* ================================================================== */
/* HTTP round trip through branchRoutes()                              */
/* ================================================================== */

describe("branchRoutes HTTP layer", () => {
  const routesDb = openSqlite(":memory:");
  let server: ReturnType<typeof serve>;

  beforeAll(() => {
    server = serve({
      port: 0,
      routes: branchRoutes(routesDb), // factory also ensures the table
      fetch() {
        return new Response("not found", { status: 404 });
      },
    });
  });

  afterAll(() => server.stop(true));

  const url = (path: string) => new URL(path, server.url).href;

  test("GET /api/branches returns the seeded list", async () => {
    const res = await fetch(url("/api/branches"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { branches: Branch[] };
    expect(data.branches.length).toBeGreaterThanOrEqual(2);
  });

  test("POST /api/branches creates and returns 201", async () => {
    const res = await fetch(url("/api/branches"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(VALID),
    });
    expect(res.status).toBe(201);
    const branch = (await res.json()) as Branch;
    expect(branch.name).toBe(VALID.name);
  });

  test("POST with missing name returns 400 with German error", async () => {
    const res = await fetch(url("/api/branches"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID, name: "" }),
    });
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("Name ist ein Pflichtfeld.");
  });

  test("PATCH /api/branches/:id updates, invalid id returns 400", async () => {
    const created = createBranch(routesDb, { ...VALID, name: "Patch-Ziel" });
    const res = await fetch(url(`/api/branches/${created.id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "geschlossen" }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as Branch).status).toBe("geschlossen");

    const bad = await fetch(url("/api/branches/abc"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(bad.status).toBe(400);
  });

  test("DELETE /api/branches/:id returns ok", async () => {
    const created = createBranch(routesDb, { ...VALID, name: "Lösch-Ziel" });
    const res = await fetch(url(`/api/branches/${created.id}`), {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as { ok: boolean }).toEqual({ ok: true });
  });
});
