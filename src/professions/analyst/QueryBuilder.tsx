import { useState } from 'react';

const metrics = [
  { id: 'count', label: 'число заказов', sql: 'COUNT(*) AS orders_count' },
  { id: 'revenue', label: 'выручку', sql: 'SUM(amount) AS revenue' },
  { id: 'failed_share', label: 'долю неуспешных оплат', sql: "ROUND(100.0 * SUM(status = 'failed') / COUNT(*), 1) AS failed_pct" },
];

const groupings = [
  { id: 'date', label: 'дате', sql: 'date(created_at) AS day', key: 'day' },
  { id: 'payment_method', label: 'способу оплаты', sql: 'payment_method', key: 'payment_method' },
  { id: 'region', label: 'региону', sql: 'region', key: 'region' },
  { id: 'platform', label: 'платформе', sql: 'platform', key: 'platform' },
  { id: 'status', label: 'статусу', sql: 'status', key: 'status' },
];

const statuses = [
  { id: 'all', label: 'все заказы', sql: '' },
  { id: 'paid', label: 'только успешные', sql: "status = 'paid'" },
  { id: 'failed', label: 'только неуспешные', sql: "status = 'failed'" },
  { id: 'cancelled', label: 'только отменённые', sql: "status = 'cancelled'" },
];

const periods = [
  { id: 'all', label: 'за весь октябрь', sql: '' },
  { id: 'before', label: 'до 15 октября', sql: "created_at < '2025-10-15'" },
  { id: 'after', label: 'с 15 октября', sql: "created_at >= '2025-10-15'" },
];

const byId = <T extends { id: string }>(list: T[], id: string) => list.find((x) => x.id === id)!;

/** Выручка — это только успешные заказы, а доля неуспешных считается по всем: фильтр статуса для них фиксирован. */
function effectiveStatus(metric: string, status: string) {
  if (metric === 'revenue') return 'paid';
  if (metric === 'failed_share') return 'all';
  return status;
}

export function buildSql(metric: string, group: string, status: string, period: string) {
  const g = byId(groupings, group);
  const where = [byId(statuses, effectiveStatus(metric, status)).sql, byId(periods, period).sql].filter(Boolean);
  return [
    `SELECT ${g.sql}, ${byId(metrics, metric).sql}`,
    'FROM orders',
    where.length ? `WHERE ${where.join('\n  AND ')}` : '',
    `GROUP BY ${g.key}`,
    `ORDER BY ${group === 'date' ? 'day' : '2 DESC'};`,
  ]
    .filter(Boolean)
    .join('\n');
}

const select = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export interface QueryBuilderProps {
  ready: boolean;
  onRun: (sql: string, groups: string[], meta: Record<string, unknown>) => void;
}

/** Уровень novice: SQL собирается из выпадающих списков и показывается пользователю. */
export function QueryBuilder({ ready, onRun }: QueryBuilderProps) {
  const [metric, setMetric] = useState('revenue');
  const [group, setGroup] = useState('date');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');

  const sql = buildSql(metric, group, status, period);
  const statusLocked = metric !== 'count';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">Конструктор запроса</h3>
      <p className="mt-1 mb-3 text-xs text-slate-500">
        Таблица <code className="rounded bg-slate-100 px-1">orders</code>: 512 заказов за октябрь — дата, сумма, статус (paid / failed / cancelled), способ оплаты, регион, платформа.
      </p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Показать</span>
        <select className={select} value={metric} onChange={(e) => setMetric(e.target.value)}>
          {metrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <span>по</span>
        <select className={select} value={group} onChange={(e) => setGroup(e.target.value)}>
          {groupings.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span>Фильтр:</span>
        <select
          className={select}
          value={effectiveStatus(metric, status)}
          disabled={statusLocked}
          onChange={(e) => setStatus(e.target.value)}
          title={statusLocked ? (metric === 'revenue' ? 'Выручка считается только по успешным заказам' : 'Доля считается по всем заказам') : undefined}
        >
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select className={select} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <button
          onClick={() => onRun(sql, [group], { metric, group, status: effectiveStatus(metric, status), period })}
          disabled={!ready}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-slate-300"
        >
          {ready ? 'Запустить' : 'Загружаем базу…'}
        </button>
      </div>
      {statusLocked && (
        <p className="mt-2 text-xs text-slate-500">
          {metric === 'revenue' ? 'Выручка — это деньги только по успешным заказам, поэтому фильтр статуса зафиксирован.' : 'Доля неуспешных считается от всех заказов.'}
        </p>
      )}
      <p className="mt-4 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Так выглядит твой запрос на SQL</p>
      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{sql}</pre>
    </section>
  );
}
