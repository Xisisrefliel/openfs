/* ------------------------------------------------------------------ */
/* SQLite layer (bun:sqlite).                                          */
/*                                                                     */
/* Server code and tests import the Database/Statement types from      */
/* here and never touch the driver directly — this module is the       */
/* single seam for opening databases, which the multi-tenant SaaS      */
/* will extend to "open the database for tenant X".                    */
/* ------------------------------------------------------------------ */

import { Database as BunDatabase } from "bun:sqlite";

export type SQLQueryBindings =
  | string
  | number
  | bigint
  | boolean
  | null
  | Uint8Array;

export interface Statement<
  Row = unknown,
  Params extends SQLQueryBindings[] = SQLQueryBindings[],
> {
  all(...params: Params): Row[];
  get(...params: Params): Row | null;
  run(...params: Params): {
    changes: number;
    lastInsertRowid: number | bigint;
  };
}

export interface Database {
  /** Like prepare(); kept as a separate method because bun:sqlite
   *  caches query() statements per Database instance. */
  query<
    Row = unknown,
    Params extends SQLQueryBindings[] = SQLQueryBindings[],
  >(sql: string): Statement<Row, Params>;
  prepare<
    Row = unknown,
    Params extends SQLQueryBindings[] = SQLQueryBindings[],
  >(sql: string): Statement<Row, Params>;
  exec(sql: string): void;
  run(
    sql: string,
    ...params: SQLQueryBindings[]
  ): { changes: number; lastInsertRowid: number | bigint };
  transaction<Result>(fn: () => Result): () => Result;
  /** Snapshot the database as a Uint8Array (calls sqlite3_serialize). */
  serialize(): Uint8Array;
  close(): void;
}

export function openSqlite(path: string): Database {
  return new BunDatabase(path, { create: true }) as unknown as Database;
}
