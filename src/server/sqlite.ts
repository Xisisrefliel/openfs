/* ------------------------------------------------------------------ */
/* Runtime-agnostic SQLite layer.                                      */
/*                                                                     */
/* Under Bun (dev server, `bun test`) the driver is bun:sqlite; under  */
/* Electron's bundled Node it is node:sqlite. Server code and tests    */
/* import the Database/Statement types from here and never touch a     */
/* driver directly — the only casts live in this file.                 */
/* ------------------------------------------------------------------ */

import { createRequire } from "node:module";

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
  close(): void;
}

// createRequire keeps the driver require out of the bundler's static
// graph, so the Electron main bundle never tries to resolve bun:sqlite.
const requireDriver = createRequire(import.meta.url);

export function openSqlite(path: string): Database {
  if (process.versions.bun) {
    const { Database: BunDatabase } = requireDriver(
      "bun:sqlite"
    ) as typeof import("bun:sqlite");
    return new BunDatabase(path, { create: true }) as unknown as Database;
  }
  return openNodeSqlite(path);
}

/* ----------------------- node:sqlite driver ------------------------ */

interface NodeStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  };
}

interface NodeDatabase {
  prepare(sql: string): NodeStatement;
  exec(sql: string): void;
  close(): void;
}

/* node:sqlite rejects booleans/undefined where bun:sqlite coerces. */
function normalize(params: unknown[]): unknown[] {
  return params.map(value =>
    value === undefined ? null : typeof value === "boolean" ? (value ? 1 : 0) : value
  );
}

function openNodeSqlite(path: string): Database {
  const { DatabaseSync } = requireDriver("node:sqlite") as {
    DatabaseSync: new (path: string) => NodeDatabase;
  };
  const db = new DatabaseSync(path);

  const prepare = (sql: string): Statement => {
    const stmt = db.prepare(sql);
    return {
      all: (...params) => stmt.all(...normalize(params)) as unknown[],
      get: (...params) => stmt.get(...normalize(params)) ?? null,
      run: (...params) => {
        const result = stmt.run(...normalize(params));
        // `changes === 0` checks in the engine must not meet a bigint.
        return { ...result, changes: Number(result.changes) };
      },
    };
  };

  // bun:sqlite transaction semantics: the wrapped call commits on
  // return, rolls back on throw, and nests via savepoints.
  let depth = 0;
  const transaction = <Result>(fn: () => Result) => {
    return (): Result => {
      const savepoint = `tx_${depth}`;
      db.exec(depth === 0 ? "BEGIN" : `SAVEPOINT ${savepoint}`);
      depth++;
      try {
        const result = fn();
        depth--;
        db.exec(depth === 0 ? "COMMIT" : `RELEASE ${savepoint}`);
        return result;
      } catch (error) {
        depth--;
        db.exec(
          depth === 0
            ? "ROLLBACK"
            : `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}`
        );
        throw error;
      }
    };
  };

  return {
    query: prepare,
    prepare,
    exec: sql => db.exec(sql),
    run: (sql, ...params) => prepare(sql).run(...params),
    transaction,
    close: () => db.close(),
  } as Database;
}
