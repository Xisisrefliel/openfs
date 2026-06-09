/* ------------------------------------------------------------------ */
/* HTTP layer — thin JSON wrappers around the booking engine.          */
/* Mounted into the Bun.serve() routes object in src/index.ts.         */
/* ------------------------------------------------------------------ */

import type { Database } from "bun:sqlite";
import type { BunRequest } from "bun";

import type { CompanyProfile } from "../lib/accounting-types";
import { getCompany, setCompany } from "./db";
import { generateDatevExport } from "./datev";
import {
  createTransaction,
  getQuittung,
  listAccounts,
  listJournal,
  listLedger,
  setAccountActive,
  stornoTransaction,
  ValidationError,
  type ListFilter,
} from "./engine";

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function handle(fn: () => Response | Promise<Response>) {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ValidationError) {
        return json({ error: error.message }, 400);
      }
      console.error(error);
      return json({ error: "Interner Fehler." }, 500);
    }
  };
}

function filterFromUrl(url: string): ListFilter {
  const params = new URL(url).searchParams;
  const status = params.get("status");
  return {
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    q: params.get("q")?.trim() || undefined,
    status:
      status === "active" || status === "storniert" ? status : "all",
  };
}

export function accountingRoutes(db: Database) {
  return {
    "/api/accounting/accounts": {
      GET: (req: BunRequest) =>
        handle(() => json({ accounts: listAccounts(db) }))(),
    },

    "/api/accounting/accounts/:number": {
      PATCH: (req: BunRequest<"/api/accounting/accounts/:number">) =>
        handle(async () => {
          const body = (await req.json()) as { active?: unknown };
          if (typeof body.active !== "boolean") {
            throw new ValidationError("Feld 'active' (boolean) erwartet.");
          }
          setAccountActive(db, req.params.number, body.active);
          return json({ ok: true });
        })(),
    },

    "/api/accounting/transactions": {
      GET: (req: BunRequest) =>
        handle(() => json(listLedger(db, filterFromUrl(req.url))))(),
      POST: (req: BunRequest) =>
        handle(async () => {
          const created = createTransaction(db, await req.json());
          return json(created, 201);
        })(),
    },

    "/api/accounting/transactions/:id/storno": {
      POST: (req: BunRequest<"/api/accounting/transactions/:id/storno">) =>
        handle(async () => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            throw new ValidationError("Ungültige Buchungs-ID.");
          }
          const body = (await req.json()) as { reason?: unknown };
          const today = new Date().toISOString().slice(0, 10);
          const created = stornoTransaction(
            db,
            id,
            typeof body.reason === "string" ? body.reason : "",
            today
          );
          return json(created, 201);
        })(),
    },

    "/api/accounting/datev": {
      GET: (req: BunRequest) =>
        handle(() => {
          const params = new URL(req.url).searchParams;
          const { filename, bytes } = generateDatevExport(db, {
            from: params.get("from") ?? undefined,
            to: params.get("to") ?? undefined,
          });
          return new Response(bytes, {
            headers: {
              "Content-Type": "text/csv; charset=windows-1252",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
        })(),
    },

    "/api/accounting/journal": {
      GET: (req: BunRequest) =>
        handle(() => json({ rows: listJournal(db, filterFromUrl(req.url)) }))(),
    },

    "/api/accounting/quittung/:id": {
      GET: (req: BunRequest<"/api/accounting/quittung/:id">) =>
        handle(() => {
          const id = Number(req.params.id);
          if (!Number.isInteger(id)) {
            throw new ValidationError("Ungültige Buchungs-ID.");
          }
          return json(getQuittung(db, id));
        })(),
    },

    "/api/profile": {
      GET: (req: BunRequest) => handle(() => json(getCompany(db)))(),
      PUT: (req: BunRequest) =>
        handle(async () => {
          const body = (await req.json()) as Partial<CompanyProfile>;
          const current = getCompany(db);
          const next: CompanyProfile = { ...current };
          for (const key of Object.keys(current) as (keyof CompanyProfile)[]) {
            const value = body[key];
            if (typeof value === "string") next[key] = value.trim();
          }
          setCompany(db, next);
          return json(next);
        })(),
    },
  };
}
