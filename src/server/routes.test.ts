/* ------------------------------------------------------------------ */
/* Integration tests for the HTTP route layer.                         */
/* Spins up a real Bun.serve() server on a random free port and sends  */
/* actual HTTP requests.                                               */
/* ------------------------------------------------------------------ */

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { serve } from "bun";

import { openDb } from "./db";
import {
  accountingRoutes,
  instructorRoutes,
  pricePlanRoutes,
  studentRoutes,
  vehicleRoutes,
} from "./routes";

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
