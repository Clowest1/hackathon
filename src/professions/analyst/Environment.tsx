import { useState } from 'react';
import type { EnvironmentProps } from '../../types';
import { causeOptions } from './causes';
import { checkAnalyst } from './checker';

const metrics = [
  { id: 'count', label: 'число заказов', sql: 'COUNT(*)' },
  { id: 'revenue', label: 'выручку', sql: 'SUM(amount)' },
];

const groupings = [
  { id: 'date', label: 'дате', sql: 'date(created_at)' },
  { id: 'payment_method', label: 'способу оплаты', sql: 'payment_method' },
  { id: 'region', label: 'региону', sql: 'region' },
  { id: 'platform', label: 'платформе', sql: 'platform' },
  { id: 'status', label: 'статусу', sql: 'status' },
];

const filters = [
  { id: 'none', label: 'без фильтра', sql: '' },
  { id: 'failed', label: 'только неуспешные', sql: "WHERE status = 'failed'" },
  { id: 'paid', label: 'только успешные', sql: "WHERE status = 'paid'" },
];

function buildSql(metric: string, group: string, filter: string) {
  const m = metrics.find((x) => x.id === metric)!;
  const g = groupings.find((x) => x.id === group)!;
  const f = filters.find((x) => x.id === filter)!;
  return [`SELECT ${g.sql} AS grp, ${m.sql} AS value`, 'FROM orders', f.sql, 'GROUP BY grp', 'ORDER BY grp;']
    .filter(Boolean)
    .join('\n');
}

// TODO: заменить на настоящий запуск в sql.js по data.sql
function fakeRows(group: string) {
  const labels: Record<string, string[]> = {
    date: ['2025-10-13', '2025-10-14', '2025-10-15', '2025-10-16', '2025-10-17'],
    payment_method: ['card', 'sbp', 'cash'],
    region: ['Москва', 'СПб', 'Казань', 'Новосибирск'],
    platform: ['web', 'ios', 'android'],
    status: ['paid', 'failed', 'cancelled'],
  };
  return labels[group].map((grp, i) => ({ grp, value: 40 + ((i * 37) % 60) }));
}

const select = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none';

export function Environment({ onEvent, onSubmit }: EnvironmentProps) {
  const [metric, setMetric] = useState('revenue');
  const [group, setGroup] = useState('date');
  const [filter, setFilter] = useState('none');
  const [rows, setRows] = useState<{ grp: string; value: number }[] | null>(null);
  const [groupedBy, setGroupedBy] = useState<string[]>([]);
  const [causeId, setCauseId] = useState('');
  const [conclusion, setConclusion] = useState('');

  const sql = buildSql(metric, group, filter);
  const max = rows ? Math.max(...rows.map((r) => r.value)) : 1;

  const run = () => {
    setRows(fakeRows(group));
    setGroupedBy((g) => (g.includes(group) ? g : [...g, group]));
    onEvent({ type: 'query_run', at: Date.now(), payload: { metric, group, filter, sql } });
  };

  const submit = () => {
    const answer = { causeId, conclusion, groupedBy };
    onSubmit(checkAnalyst(answer), answer);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Конструктор запроса</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Показать</span>
          <select className={select} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {metrics.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <span>по</span>
          <select className={select} value={group} onChange={(e) => setGroup(e.target.value)}>
            {groupings.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
          <select className={select} value={filter} onChange={(e) => setFilter(e.target.value)}>
            {filters.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <button onClick={run} className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700">
            Запустить
          </button>
        </div>
        <p className="mt-4 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Так выглядит твой запрос на SQL</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{sql}</pre>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Результат</h3>
        {!rows ? (
          <p className="text-sm text-slate-500">Собери запрос и нажми «Запустить».</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-amber-600">Заглушка: данные ненастоящие, sql.js подключим на следующем шаге.</p>
            {rows.map((r) => (
              <div key={r.grp} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-slate-600">{r.grp}</span>
                <div className="h-5 rounded bg-indigo-500" style={{ width: `${(r.value / max) * 70}%` }} />
                <span className="tabular-nums">{r.value}</span>
              </div>
            ))}
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
