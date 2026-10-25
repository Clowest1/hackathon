import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import dataSql from './data.sql?raw';

export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
}

let dbPromise: Promise<Database> | null = null;

/** SQLite в браузере: база создаётся один раз из data.sql и живёт до перезагрузки страницы. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
      const db = new SQL.Database();
      db.run(dataSql);
      return db;
    });
    dbPromise.catch(() => (dbPromise = null)); // дать шанс повторить при сетевой ошибке
  }
  return dbPromise;
}

export async function runQuery(sql: string): Promise<QueryResult> {
  const db = await getDb();
  const [result] = db.exec(sql);
  if (!result) return { columns: [], rows: [] };
  return { columns: result.columns, rows: result.values as QueryResult['rows'] };
}
