import { lazy, Suspense, useEffect, useState } from 'react';
import type { EnvironmentProps } from '../../types';
import { BarChart } from './BarChart';
import { causeOptions } from './causes';
import { checkAnalyst } from './checker';
import { getDb, runQuery, type QueryResult } from './db';
import { QueryBuilder } from './QueryBuilder';

// Редактор (CodeMirror) тяжёлый — грузим только для уровня «есть база»
const SqlEditor = lazy(() => import('./SqlEditor').then((m) => ({ default: m.SqlEditor })));

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

const formatDay = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const fmt = new Intl.NumberFormat('ru-RU');
const MAX_TABLE_ROWS = 200;
const MAX_CHART_ROWS = 60;

/** Только чтение и один запрос за раз: в редакторе можно написать что угодно, а база одна на всю сессию. */
export function assertReadOnly(sql: string) {
  const code = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (!/^(select|with)\b/i.test(code)) throw new Error('В этой задаче можно только читать данные: запрос должен начинаться с SELECT.');
  if (/;\s*\S/.test(code)) throw new Error('Запускай по одному запросу за раз.');
}

/** Краткий результат для тимлида: для длинных — начало и конец, чтобы по датам было видно и «до», и «после». */
function previewOf(data: QueryResult) {
  const cell = (r: QueryResult['rows'][number]) => r.slice(0, 3).join(': ');
  return data.rows.length > 8
    ? [...data.rows.slice(0, 4).map(cell), '…', ...data.rows.slice(-4).map(cell)].join('; ')
    : data.rows.map(cell).join('; ');
}

export function Environment({ level, onEvent, onSubmit }: EnvironmentProps) {
  const [dbState, setDbState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState('');
  const [groupedBy, setGroupedBy] = useState<string[]>([]);
  const [causeId, setCauseId] = useState('');
  const [conclusion, setConclusion] = useState('');

  useEffect(() => {
    getDb().then(() => setDbState('ready'), () => setDbState('error'));
  }, []);

  const run = async (sql: string, groups: string[], meta: Record<string, unknown>) => {
    setQueryError('');
    try {
      assertReadOnly(sql);
      const data = await runQuery(sql);
      setResult(data);
      setGroupedBy((g) => [...new Set([...g, ...groups])]);
      onEvent({ type: 'query_run', at: Date.now(), payload: { ...meta, result: previewOf(data), sql } });
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

  const rows = result?.rows ?? [];
  // График — если вторая колонка числовая и строк не слишком много; по датам — вертикальный
  const chartable = rows.length > 0 && rows.length <= MAX_CHART_ROWS && (result?.columns.length ?? 0) >= 2 && rows.every((r) => typeof r[1] === 'number');
  const isDate = chartable && /^\d{4}-\d{2}-\d{2}/.test(String(rows[0][0]));
  const ready = dbState === 'ready';

  return (
    <div className="space-y-5">
      {level === 'basic' ? (
        <Suspense fallback={<section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Открываем SQL-редактор…</section>}>
          <SqlEditor ready={ready} onRun={run} />
        </Suspense>
      ) : (
        <QueryBuilder ready={ready} onRun={run} />
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-semibold">Результат</h3>
        {dbState === 'error' ? (
          <p className="text-sm text-rose-600">Не удалось загрузить базу данных. Обнови страницу.</p>
        ) : queryError ? (
          <p className="text-sm text-rose-600">Ошибка запроса: {queryError}</p>
        ) : !result ? (
          <p className="text-sm text-slate-500">{level === 'basic' ? 'Напиши запрос и нажми «Запустить».' : 'Собери запрос и нажми «Запустить».'}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Запрос ничего не нашёл — попробуй другой фильтр.</p>
        ) : (
          <div className="space-y-5">
            {chartable && (
              <BarChart
                vertical={isDate}
                labels={rows.map((r) => (isDate ? formatDay(String(r[0])) : String(r[0])))}
                values={rows.map((r) => Number(r[1]) || 0)}
              />
            )}
            <details className="text-sm" open={!chartable}>
              <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                Таблица ({rows.length} {rows.length > MAX_TABLE_ROWS ? `строк, показаны первые ${MAX_TABLE_ROWS}` : 'строк'})
              </summary>
              <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr>{result.columns.map((c) => <th key={c} className="px-3 py-2 font-medium">{columnLabels[c] ?? c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, MAX_TABLE_ROWS).map((r, i) => (
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
