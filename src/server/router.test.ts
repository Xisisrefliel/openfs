import { describe, expect, test } from "bun:test";

import { createRouter } from "./router";
import { buildApiRoutes } from "./app-routes";
import { openDb } from "./db";

const ORIGIN = "app://bundle";

describe("createRouter", () => {
  const routes = {
    "/api/things": {
      GET: () => Response.json({ list: true }),
      POST: () => Response.json({ created: true }, { status: 201 }),
    },
    "/api/things/special": {
      GET: () => Response.json({ special: true }),
    },
    "/api/things/:id": {
      GET: (req: Request & { params: { id: string } }) =>
        Response.json({ id: req.params.id }),
    },
    "/api/things/:id/sub/:subId": {
      DELETE: (req: Request & { params: { id: string; subId: string } }) =>
        Response.json(req.params),
    },
  };
  const route = createRouter(routes);

  test("matches static routes per method", async () => {
    const res = await route(new Request(`${ORIGIN}/api/things`));
    expect(await res!.json()).toEqual({ list: true });

    const created = await route(
      new Request(`${ORIGIN}/api/things`, { method: "POST" })
    );
    expect(created!.status).toBe(201);
  });

  test("static segment beats :param", async () => {
    const res = await route(new Request(`${ORIGIN}/api/things/special`));
    expect(await res!.json()).toEqual({ special: true });
  });

  test("extracts and decodes params", async () => {
    const res = await route(new Request(`${ORIGIN}/api/things/42`));
    expect(await res!.json()).toEqual({ id: "42" });

    const multi = await route(
      new Request(`${ORIGIN}/api/things/a%20b/sub/7`, { method: "DELETE" })
    );
    expect(await multi!.json()).toEqual({ id: "a b", subId: "7" });
  });

  test("query strings do not break matching", async () => {
    const res = await route(new Request(`${ORIGIN}/api/things?status=offen`));
    expect(res!.status).toBe(200);
  });

  test("known path with wrong method → 405", async () => {
    const res = await route(
      new Request(`${ORIGIN}/api/things/special`, { method: "PUT" })
    );
    expect(res!.status).toBe(405);
  });

  test("unknown path → null (static fallthrough)", async () => {
    expect(await route(new Request(`${ORIGIN}/fahrschueler`))).toBeNull();
    expect(await route(new Request(`${ORIGIN}/`))).toBeNull();
  });
});

describe("router over the real API routes", () => {
  test("dispatches GET/POST/PATCH against a live db", async () => {
    const db = openDb(":memory:");
    const route = createRouter(buildApiRoutes(db));

    const list = await route(new Request(`${ORIGIN}/api/students`));
    expect(list!.status).toBe(200);

    const created = await route(
      new Request(`${ORIGIN}/api/students`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: "Max",
          lastName: "Muster",
          contractNumber: "V-2026-9999",
          customerNumber: "99999",
        }),
      })
    );
    expect(created!.status).toBe(201);
    const student = (await created!.json()) as { id: number };

    const patched = await route(
      new Request(`${ORIGIN}/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "0151 0000000" }),
      })
    );
    expect(patched!.status).toBe(200);
    expect(((await patched!.json()) as { phone: string }).phone).toBe(
      "0151 0000000"
    );
  });
});
