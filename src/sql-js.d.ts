declare module 'sql.js' {
  interface SqlResult {
    values: unknown[][];
  }
  interface SqlDatabase {
    run(sql: string): void;
    prepare(sql: string): { run(values: unknown[]): void; free(): void };
    exec(sql: string): SqlResult[];
  }
  interface SqlJsStatic {
    Database: new () => SqlDatabase;
  }
  function initSqlJs(config?: { locateFile?: (file: string) => string }): Promise<SqlJsStatic>;
  export default initSqlJs;
}
