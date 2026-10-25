import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

export type MetricId = 'count' | 'revenue' | 'failed_share';
export type GroupId = 'date' | 'payment_method' | 'region' | 'platform' | 'status';
export type FilterId = 'none' | 'failed' | 'paid' | 'after_oct15';

const database = initSqlJs({ locateFile: () => wasmUrl }).then((SQL) => {
  const db = new SQL.Database();
  db.run(`CREATE TABLE orders (
    id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, amount REAL NOT NULL,
    status TEXT NOT NULL, payment_method TEXT NOT NULL, region TEXT NOT NULL, platform TEXT NOT NULL
  )`);
  const insert = db.prepare('INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?)');
  const methods = ['card', 'sbp', 'cash'];
  const regions = ['Москва', 'СПб', 'Казань', 'Новосибирск'];
  const platforms = ['web', 'ios', 'android'];
  for (let i = 0; i < 500; i += 1) {
    const day = 1 + (i % 30);
    const date = `2025-10-${String(day).padStart(2, '0')}`;
    const method = methods[i % methods.length];
    const afterDrop = day >= 15;
    const failed = method === 'sbp' && afterDrop ? i % 10 < 7 : i % 10 === 0;
    insert.run([i + 1, `${date} 12:00:00`, 800 + ((i * 137) % 4200), failed ? 'failed' : 'paid', method, regions[i % regions.length], platforms[i % platforms.length]]);
  }
  insert.free();
  return db;
});

const metricSql: Record<MetricId, { label: string; sql: string }> = {
  count: { label: 'число заказов', sql: 'COUNT(*)' },
  revenue: { label: 'выручку', sql: "SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END)" },
  failed_share: { label: 'долю неуспешных, %', sql: "ROUND(100.0 * SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) / COUNT(*), 1)" },
};
const groupSql: Record<GroupId, { label: string; sql: string }> = {
  date: { label: 'дате', sql: "substr(created_at, 1, 10)" },
  payment_method: { label: 'способу оплаты', sql: 'payment_method' },
  region: { label: 'региону', sql: 'region' },
  platform: { label: 'платформе', sql: 'platform' },
  status: { label: 'статусу', sql: 'status' },
};
const filterSql: Record<FilterId, { label: string; sql: string }> = {
  none: { label: 'без фильтра', sql: '' },
  failed: { label: 'только неуспешные', sql: "WHERE status = 'failed'" },
  paid: { label: 'только успешные', sql: "WHERE status = 'paid'" },
  after_oct15: { label: 'с 15 октября', sql: "WHERE created_at >= '2025-10-15'" },
};

export function queryOptions(metric: MetricId, group: GroupId, filter: FilterId) {
  const where = filterSql[filter].sql;
  const query = `SELECT ${groupSql[group].sql} AS grp, ${metricSql[metric].sql} AS value\nFROM orders${where ? `\n${where}` : ''}\nGROUP BY grp\nORDER BY grp;`;
  return { query, metricLabel: metricSql[metric].label, groupLabel: groupSql[group].label, filterLabel: filterSql[filter].label };
}

export async function runQuery(query: string): Promise<{ grp: string; value: number }[]> {
  const db = await database;
  const result = db.exec(query);
  if (!result.length) return [];
  return result[0].values.map(([grp, value]) => ({ grp: String(grp), value: Number(value) || 0 }));
}
