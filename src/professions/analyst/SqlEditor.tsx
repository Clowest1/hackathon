import { sql as sqlLanguage } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { useMemo, useRef, useState } from 'react';

const schema = [
  { name: 'id', type: 'INTEGER', note: 'номер заказа' },
  { name: 'created_at', type: 'TEXT', note: "'2025-10-15 14:03:00'" },
  { name: 'amount', type: 'INTEGER', note: 'сумма заказа, ₽' },
  { name: 'status', type: 'TEXT', note: 'paid / failed / cancelled' },
  { name: 'payment_method', type: 'TEXT', note: 'card / sbp / cash' },
  { name: 'region', type: 'TEXT', note: 'Москва, Санкт-Петербург, …' },
  { name: 'platform', type: 'TEXT', note: 'web / android / ios' },
];

const STARTER = `-- Таблица orders: заказы за октябрь 2025.
-- Напиши запрос и нажми «Запустить» (или Ctrl+Enter).
SELECT *
FROM orders
LIMIT 10;
`;

const GROUP_FIELDS: [string, RegExp][] = [
  ['payment_method', /payment_method/i],
  ['region', /region/i],
  ['platform', /platform/i],
  ['status', /status/i],
  ['date', /created_at|date\s*\(/i],
];

/** По каким полям группирует запрос — нужно проверке («был запрос с группировкой по способу оплаты»). */
export function detectGroups(query: string): string[] {
  const groupBy = query.match(/group\s+by\s+([\s\S]*?)(?:\border\s+by\b|\blimit\b|\bhaving\b|;|$)/i)?.[1] ?? '';
  // GROUP BY 1 / GROUP BY алиас — смотрим ещё и на SELECT
  const select = /^\s*\d|^\s*[a-z_]+\s*$/i.test(groupBy) ? query.match(/select\s+([\s\S]*?)\bfrom\b/i)?.[1] ?? '' : '';
  return GROUP_FIELDS.filter(([, re]) => re.test(groupBy) || (select && re.test(select.split(',')[0]))).map(([field]) => field);
}

export interface SqlEditorProps {
  ready: boolean;
  onRun: (sql: string, groups: string[], meta: Record<string, unknown>) => void;
}

/** Уровень basic: пустой SQL-редактор со схемой таблицы. */
export function SqlEditor({ ready, onRun }: SqlEditorProps) {
  const [query, setQuery] = useState(STARTER);
  const latest = useRef({ query, ready, onRun });
  latest.current = { query, ready, onRun };

  const run = () => {
    const { query, ready, onRun } = latest.current;
    if (ready) onRun(query, detectGroups(query), {});
  };

  const extensions = useMemo(
    () => [
      sqlLanguage({ schema: { orders: schema.map((c) => c.name) }, upperCaseKeywords: true }),
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => (run(), true) }])),
    ],
    [],
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold">SQL-редактор</h3>
      <details className="mt-1 mb-3 text-xs text-slate-500" open>
        <summary className="cursor-pointer hover:text-slate-700">Схема таблицы <code className="rounded bg-slate-100 px-1">orders</code> (512 строк)</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <tbody>
              {schema.map((c) => (
                <tr key={c.name} className="border-t border-slate-100">
                  <td className="py-1 pr-3 font-mono text-slate-800">{c.name}</td>
                  <td className="py-1 pr-3 font-mono text-slate-400">{c.type}</td>
                  <td className="py-1">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <div className="overflow-hidden rounded-lg border border-slate-300 text-sm">
        <CodeMirror value={query} onChange={setQuery} height="180px" extensions={extensions} basicSetup={{ foldGutter: false, highlightActiveLine: false }} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={run}
          disabled={!ready}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-wait disabled:bg-slate-300"
        >
          {ready ? 'Запустить' : 'Загружаем базу…'}
        </button>
        <span className="text-xs text-slate-500">Ctrl+Enter · только чтение (SELECT)</span>
      </div>
    </section>
  );
}
