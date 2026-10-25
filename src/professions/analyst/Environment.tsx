import { useEffect, useState } from 'react';
import type { EnvironmentProps } from '../../types';
import { BarChart } from './BarChart';
import { causeOptions } from './causes';
import { checkAnalyst } from './checker';
import { getDb, runQuery, type QueryResult } from './db';

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

const columnLabels: Record<string, string> = {
  day: 'дата',
  payment_method: 'способ оплаты',
  region: 'регион',
  platform: 'платформа',
  status: 'статус',
  orders_count: 'заказов',
  revenue: 'выручка, ₽',
  failed_pct: 'неуспешных, %',
};

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

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const fmt = new Intl.NumberFormat('ru-RU');

const select = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500';

export function Environment({ onEvent, onSubmit }: EnvironmentProps) {
  const [metric, setMetric] = useState('revenue');
  const [group, setGroup] = useState('date');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState('all');
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<{ data: QueryResult; group: string } | null>(null);
  const [queryError, setQueryError] = useState('');
  const [groupedBy, setGroupedBy] = useState<string[]>([]);
  const [causeId, setCauseId] = useState('');
  const [conclusion, setConclusion] = useState('');

  useEffect(() => {
    getDb().then(() => setDbState('ready'), () => setDbState('error'));
  }, []);

  const sql = buildSql(metric, group, status, period);
  const statusLocked = metric !== 'count';

  const run = async () => {
    setQueryError('');
    try {
      const data = await runQuery(sql);
      setResult({ data, group });
      setGroupedBy((g) => (g.includes(group) ? g : [...g, group]));
      // Краткий результат — чтобы тимлид видел, что именно увидел пользователь
      // (для длинных результатов — начало и конец, чтобы по датам было видно и «до», и «после»)
      const cell = (r: QueryResult['rows'][number]) => `${r[0]}: ${r[1]}`;
      const preview = data.rows.length > 8
        ? [...data.rows.slice(0, 4).map(cell), '…', ...data.rows.slice(-4).map(cell)].join('; ')
        : data.rows.map(cell).join('; ');
      onEvent({ type: 'query_run', at: Date.now(), payload: { metric, group, status: effectiveStatus(metric, status), period, result: preview, sql } });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setQueryError(message);
      onEvent({ type: 'error', at: Date.now(), payload: { sql, message } });
    }
  };

  const submit = () => {
    const answer = { causeId, conclusion, groupedBy };
    onSubmit(checkAnalyst(answer), answer);
  };

  const rows = result?.data.rows ?? [];
  const isDate = result?.group === 'date';

  return (
    <div className="space-y-5">
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
            onClick={run}
            disabled={dbState !== 'ready'}
            className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-slate-300"
          >
            {dbState === 'loading' ? 'Загружаем базу…' : 'Запустить'}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Результат</h3>
        {dbState === 'error' ? (
          <p className="text-sm text-rose-600">Не удалось загрузить базу данных. Обнови страницу.</p>
        ) : queryError ? (
          <p className="text-sm text-rose-600">Ошибка запроса: {queryError}</p>
        ) : !result ? (
          <p className="text-sm text-slate-500">Собери запрос и нажми «Запустить».</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Запрос ничего не нашёл — попробуй другой фильтр.</p>
        ) : (
          <div className="space-y-5">
            <BarChart
              vertical={isDate}
              labels={rows.map((r) => (isDate ? formatDay(String(r[0])) : String(r[0])))}
              values={rows.map((r) => Number(r[1]) || 0)}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">Таблица ({rows.length} строк)</summary>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr>{result.data.columns.map((c) => <th key={c} className="px-3 py-2 font-medium">{columnLabels[c] ?? c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {r.map((v, j) => <td key={j} className="px-3 py-1.5 tabular-nums">{typeof v === 'number' ? fmt.format(v) : v}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Твой ответ тимлиду</h3>
        <div className="space-y-2">
          {causeOptions.map((c) => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="cause" checked={causeId === c.id} onChange={() => setCauseId(c.id)} className="accent-indigo-600" />
              {c.label}
            </label>
          ))}
        </div>
        <textarea
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          placeholder="Одно предложение-вывод: что случилось и почему ты так думаешь"
          rows={2}
          className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!causeId}
          className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Сдать задачу
        </button>
      </section>
    </div>
  );
}
