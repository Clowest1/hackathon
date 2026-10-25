import { useState } from 'react';
import type { EnvironmentProps } from '../../types';
import { causeOptions } from './causes';
import { checkAnalyst } from './checker';
import { queryOptions, runQuery, type FilterId, type GroupId, type MetricId } from './database';

const select = 'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none';

export function Environment({ onEvent, onSubmit }: EnvironmentProps) {
  const [metric, setMetric] = useState<MetricId>('revenue');
  const [group, setGroup] = useState<GroupId>('date');
  const [filter, setFilter] = useState<FilterId>('none');
  const [rows, setRows] = useState<{ grp: string; value: number }[] | null>(null);
  const [running, setRunning] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [groupedBy, setGroupedBy] = useState<string[]>([]);
  const [causeId, setCauseId] = useState('');
  const [conclusion, setConclusion] = useState('');

  const { query: sql, metricLabel, groupLabel, filterLabel } = queryOptions(metric, group, filter);
  const max = rows ? Math.max(...rows.map((r) => r.value)) : 1;

  const run = async () => {
    setRunning(true);
    setQueryError('');
    try {
      const result = await runQuery(sql);
      setRows(result);
      setGroupedBy((g) => (g.includes(group) ? g : [...g, group]));
      onEvent({ type: 'query_run', at: Date.now(), payload: { metric, group, filter, sql } });
    } catch {
      setQueryError('Не удалось выполнить запрос. Попробуй изменить условия.');
    } finally {
      setRunning(false);
    }
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
          <select aria-label="Показатель" className={select} value={metric} onChange={(e) => setMetric(e.target.value as MetricId)}>
            <option value="revenue">выручку</option><option value="count">число заказов</option><option value="failed_share">долю неуспешных, %</option>
          </select>
          <span>по</span>
          <select aria-label="Группировка" className={select} value={group} onChange={(e) => setGroup(e.target.value as GroupId)}>
            {(['date', 'payment_method', 'region', 'platform', 'status'] as GroupId[]).map((g) => <option key={g} value={g}>{queryOptions(metric, g, filter).groupLabel}</option>)}
          </select>
          <select aria-label="Фильтр" className={select} value={filter} onChange={(e) => setFilter(e.target.value as FilterId)}>
            <option value="none">без фильтра</option><option value="failed">только неуспешные</option><option value="paid">только успешные</option><option value="after_oct15">с 15 октября</option>
          </select>
          <button onClick={run} disabled={running} className="ml-auto rounded-lg bg-indigo-600 px-4 py-1.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {running ? 'Считаю…' : 'Запустить'}
          </button>
        </div>
        <p className="mt-4 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Так выглядит твой запрос на SQL</p>
        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{sql}</pre>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Результат</h3>
        {queryError && <p role="alert" className="text-sm text-rose-600">{queryError}</p>}
        {!rows ? (
          !queryError && <p className="text-sm text-slate-500">Собери запрос и нажми «Запустить».</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">{metricLabel} по {groupLabel} · {filterLabel}</p>
            {rows.map((r) => (
              <div key={r.grp} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate text-slate-600">{r.grp}</span>
                <div className="h-5 min-w-0 flex-1 rounded bg-slate-100">
                  <div className="h-full min-w-1 rounded bg-indigo-500" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
                </div>
                <span className="shrink-0 tabular-nums">{r.value}{metric === 'failed_share' ? '%' : ''}</span>
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
