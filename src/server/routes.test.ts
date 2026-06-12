/* ------------------------------------------------------------------ */
/* Integration tests for the HTTP route layer.                         */
/* Spins up a real Bun.serve() server on a random free port and sends  */
/* actual HTTP requests.                                               */
/* ------------------------------------------------------------------ */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { serve } from "bun";

import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDb } from "./db";
import {
  accountingRoutes,
  calendarEventRoutes,
  exportRoutes,
  instructorRoutes,
  pricePlanRoutes,
  studentRoutes,
  vehicleRoutes,
} from "./routes";
import { openSqlite } from "./sqlite";

/* ------------------------------------------------------------------ */
/* Server setup — one server for the whole file.                       */
/* Unique counter ensures no conflicting contract/customer numbers.    */
/* ------------------------------------------------------------------ */

const db = openDb(":memory:");
let server: ReturnType<typeof serve>;

beforeAll(() => {
  server = serve({
    port: 0,
    routes: {
      ...accountingRoutes(db),
      ...calendarEventRoutes(db),
      ...exportRoutes(db),
      ...instructorRoutes(db),
      ...pricePlanRoutes(db),
      ...studentRoutes(db),
      ...vehicleRoutes(db),
    },
    fetch() {
      return new Response("not found", { status: 404 });
    },
  });
});

afterAll(() => server.stop(true));

let seq = 0;
function uniq(prefix = "") {
  return `${prefix}${++seq}-rt-${Date.now()}`;
}

function url(path: string): string {
  return new URL(path, server.url).href;
}

/* ================================================================== */
/* Students                                                             */
/* ================================================================== */

describe("GET /api/students", () => {
  test("returns 200 with students array", async () => {
    const res = await fetch(url("/api/students"));
    expect(res.status).toBe(200);
    const body = await res.json() as { students: unknown[] };
    expect(Array.isArray(body.students)).toBe(true);
  });
});

describe("POST /api/students", () => {
  test("valid body → 201, returns record with id", async () => {
    const id = uniq();
    const res = await fetch(url("/api/students"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Rudi",
        lastName: "Route",
        contractNumber: `V-${id}`,
        customerNumber: `K-${id}`,
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number };
    expect(typeof body.id).toBe("number");
    expect(body.id).toBeGreaterThan(0);
  });

  test("empty body {} → 400, German error message", async () => {
    const res = await fetch(url("/api/students"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });
});

describe("PATCH /api/students/:id", () => {
  test("non-numeric id 'abc' → 400 with Ungültige message", async () => {
    const res = await fetch(url("/api/students/abc"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Ungültige");
  });

  test("valid numeric id that doesn't exist → 400 with nicht gefunden", async () => {
    const res = await fetch(url("/api/students/999999"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: "123" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("nicht gefunden");
  });
});

describe("DELETE /api/students/:id", () => {
  test("valid id → 200 { ok: true }, then GET list no longer contains it", async () => {
    const id = uniq();
    const postRes = await fetch(url("/api/students"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Delete",
        lastName: "Me",
        contractNumber: `V-DEL-${id}`,
        customerNumber: `K-DEL-${id}`,
      }),
    });
    expect(postRes.status).toBe(201);
    const created = await postRes.json() as { id: number };
    expect(created.id).toBeGreaterThan(0);

    const delRes = await fetch(url(`/api/students/${created.id}`), {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json() as { ok: boolean };
    expect(delBody.ok).toBe(true);

    const listRes = await fetch(url("/api/students"));
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as { students: { id: number }[] };
    const ids = list.students.map(s => s.id);
    expect(ids).not.toContain(created.id);
  });

  test("non-numeric id 'abc' → 400", async () => {
    const res = await fetch(url("/api/students/abc"), {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Ungültige");
  });
});

/* ================================================================== */
/* Instructors                                                          */
/* ================================================================== */

describe("POST /api/instructors + DELETE /api/instructors/:id", () => {
  test("POST valid instructor → 201; DELETE → 200 { ok: true }", async () => {
    const postRes = await fetch(url("/api/instructors"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: "Route",
        lastName: "Lehrer",
        phone: "",
        email: "",
        classes: "B",
        vehicle: "",
        since: "2025-01-01",
        status: "aktiv",
      }),
    });
    expect(postRes.status).toBe(201);
    const created = await postRes.json() as { id: number };
    expect(created.id).toBeGreaterThan(0);

    const delRes = await fetch(url(`/api/instructors/${created.id}`), {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json() as { ok: boolean };
    expect(delBody.ok).toBe(true);
  });
});

/* ================================================================== */
/* Vehicles                                                             */
/* ================================================================== */

describe("POST /api/vehicles", () => {
  test("valid body → 201", async () => {
    const plate = uniq("PLATE-");
    const res = await fetch(url("/api/vehicles"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "RouteAuto",
        plate,
        klass: "B",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number };
    expect(body.id).toBeGreaterThan(0);
  });

  test("missing plate → 400", async () => {
    const res = await fetch(url("/api/vehicles"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "RouteAuto",
        klass: "B",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe("string");
  });
});

describe("GET /api/vehicle-options", () => {
  test("returns 200 with vehicleOptions array ending with 'Nicht zugeteilt'", async () => {
    const res = await fetch(url("/api/vehicle-options"));
    expect(res.status).toBe(200);
    const body = await res.json() as { vehicleOptions: string[] };
    expect(Array.isArray(body.vehicleOptions)).toBe(true);
    const options = body.vehicleOptions;
    expect(options[options.length - 1]).toBe("Nicht zugeteilt");
  });
});

/* ================================================================== */
/* Calendar events                                                      */
/* ================================================================== */

const validEvent = {
  date: "2026-06-10",
  start: "09:00",
  end: "10:00",
  title: "Route-Test Termin",
  instructor: "Köksal Gül",
  type: "Praktisch",
};

describe("GET /api/calendar-events", () => {
  test("returns 200 with events array (9 seeded)", async () => {
    const res = await fetch(url("/api/calendar-events"));
    expect(res.status).toBe(200);
    const body = await res.json() as { events: unknown[] };
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThanOrEqual(9);
  });
});

describe("POST /api/calendar-events", () => {
  test("valid body → 201 with string id", async () => {
    const res = await fetch(url("/api/calendar-events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEvent),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(typeof body.id).toBe("string");
    expect(body.id.length).toBeGreaterThan(0);
  });

  test("end before start → 400", async () => {
    const res = await fetch(url("/api/calendar-events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validEvent, start: "12:00", end: "11:00" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Ende");
  });
});

describe("DELETE /api/calendar-events/:id", () => {
  test("valid id → 200 { ok: true }", async () => {
    const postRes = await fetch(url("/api/calendar-events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEvent),
    });
    const created = await postRes.json() as { id: string };
    const delRes = await fetch(url(`/api/calendar-events/${created.id}`), {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json() as { ok: boolean };
    expect(delBody.ok).toBe(true);
  });

  test("non-numeric id 'abc' → 400 with Ungültige message", async () => {
    const res = await fetch(url("/api/calendar-events/abc"), {
      method: "DELETE",
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("Ungültige");
  });
});

/* ================================================================== */
/* Student balances                                                     */
/* ================================================================== */

describe("GET /api/student-balances", () => {
  test("returns 200 with balances array; deposit shows correct balance", async () => {
    // Post a payment for a fresh student.
    const id = uniq();
    await fetch(url("/api/accounting/transactions"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "zahlung_guthaben",
        date: "2026-06-09",
        amountCents: 50000,
        geldkonto: "1600",
        paymentMethod: "bar",
        student: {
          customerNo: `B-${id}`,
          name: `Balance Tester ${id}`,
          address: "",
          contractNo: "",
          classes: "B",
        },
      }),
    });

    const res = await fetch(url("/api/student-balances"));
    expect(res.status).toBe(200);
    const body = await res.json() as { balances: { customerNo: string; balanceCents: number }[] };
    expect(Array.isArray(body.balances)).toBe(true);
    const entry = body.balances.find(b => b.customerNo === `B-${id}`);
    expect(entry).toBeDefined();
    expect(entry!.balanceCents).toBe(50000);
  });
});

/* ================================================================== */
/* Accounting                                                           */
/* ================================================================== */

describe("PATCH /api/accounting/accounts/:number", () => {
  test("{ active: 'yes' } → 400 with German error message", async () => {
    const res = await fetch(url("/api/accounting/accounts/1600"), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: "yes" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toContain("active");
    expect(body.error).toContain("boolean");
  });
});

/* ================================================================== */
/* Profile                                                              */
/* ================================================================== */

describe("GET /api/profile", () => {
  test("returns 200 with name field", async () => {
    const res = await fetch(url("/api/profile"));
    expect(res.status).toBe(200);
    const body = await res.json() as { name: string };
    expect(typeof body.name).toBe("string");
    expect(body.name.length).toBeGreaterThan(0);
  });
});

describe("PUT /api/profile", () => {
  test("name with whitespace comes back trimmed", async () => {
    const res = await fetch(url("/api/profile"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "  Neue Fahrschule  " }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { name: string };
    expect(body.name).toBe("Neue Fahrschule");
  });
});

/* ================================================================== */
/* Database export                                                       */
/* ================================================================== */

describe("GET /api/export/database", () => {
  test("200, .db in content-disposition, non-empty body with SQLite magic header", async () => {
    const res = await fetch(url("/api/export/database"));
    expect(res.status).toBe(200);

    // content-disposition must mention .db
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain(".db");

    // body must be non-empty
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);

    // first 16 bytes: "SQLite format 3\0"
    const header = new TextDecoder().decode(new Uint8Array(buf, 0, 15));
    expect(header).toBe("SQLite format 3");
  });

  test("bonus: serialized bytes open as a valid SQLite db with a students table", async () => {
    const res = await fetch(url("/api/export/database"));
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // write to a temp file outside of data/
    const tmpPath = join(tmpdir(), `openfs-test-export-${Date.now()}.db`);
    await Bun.write(tmpPath, bytes);

    const tmpDb = openSqlite(tmpPath);
    const row = tmpDb.query<{ n: number }, []>(
      "SELECT count(*) AS n FROM students"
    ).get();
    tmpDb.close();

    expect(row).not.toBeNull();
    expect(typeof row!.n).toBe("number");
  });
});
