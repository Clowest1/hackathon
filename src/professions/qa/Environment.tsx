import { useEffect, useState, type MouseEvent } from 'react';
import type { EnvironmentProps } from '../../types';
import { BuggyShop } from './BuggyShop';
import { checkQa, qaBugChecks, type QaBugReport } from './checker';

export function Environment({ level, onEvent, onSubmit }: EnvironmentProps) {
  const [markMode, setMarkMode] = useState(false);
  const [hintOfferVisible, setHintOfferVisible] = useState(false);
  const [hasPendingReport, setHasPendingReport] = useState(false);
  const [pendingBugId, setPendingBugId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<QaBugReport[]>([]);

  useEffect(() => {
    if (level !== 'novice') return;
    const timer = window.setTimeout(() => setHintOfferVisible(true), 3 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [level]);

  const handleShopClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!markMode) return;
    event.preventDefault();
    const target = event.target;
    const marked = target instanceof Element ? target.closest('[data-bug-id]') : null;
    setPendingBugId(marked?.getAttribute('data-bug-id') ?? null);
    setHasPendingReport(true);
    setDescription('');
  };

  const addReport = () => {
    const report = { bugId: pendingBugId, description: description.trim() || 'Пользователь отметил этот участок страницы.' };
    setReports((current) => [...current, report]);
    onEvent({ type: 'bug_marked', at: Date.now(), payload: { bugId: report.bugId ?? 'unmapped', description: report.description } });
    setPendingBugId(null);
    setHasPendingReport(false);
    setDescription('');
  };

  const submit = () => onSubmit(checkQa(reports), reports);

  return (
    <div className="space-y-4">
      {level === 'novice' && (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <h3 className="font-semibold text-indigo-950">Чек-лист тестировщика</h3>
          <p className="mt-1 text-sm text-indigo-900/75">Проверь сценарии, которые часто находят ошибки:</p>
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            {['Граничные значения: минимум, ноль и отрицательное число', 'Пустые поля и неверный формат email', 'Пересчёт итоговой суммы при изменении корзины', 'Повторное нажатие на кнопку или применение промокода'].map((item) => (
              <li key={item} className="flex gap-2"><span className="text-indigo-600">✓</span><span>{item}</span></li>
            ))}
          </ul>
        </section>
      )}

      {hintOfferVisible && (
        <section role="status" className="flex items-start justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
          <div>
            <p className="text-sm font-semibold text-indigo-950">Аня, тимлид</p>
            <p className="mt-1 text-sm text-indigo-900">Уже несколько минут проверяешь корзину. Хочешь подсказку? Открой чат и нажми «Подсказка» — я подскажу следующий шаг.</p>
          </div>
          <button type="button" aria-label="Скрыть предложение подсказки" onClick={() => setHintOfferVisible(false)} className="rounded px-2 text-indigo-600 hover:bg-indigo-100">×</button>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:px-4">
        <div>
          <h3 className="font-semibold text-slate-900">Страница перед релизом</h3>
          <p className="text-xs text-slate-500">Включи разметку, чтобы отмечать подозрительные места.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={markMode}
          onClick={() => { setMarkMode((value) => !value); setPendingBugId(null); setHasPendingReport(false); }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${markMode ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {markMode ? 'Разметка включена' : 'Отметить баг'}
        </button>
      </div>

      {markMode && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Нажми на место, где заметил(а) проблему. Можно отметить и область без заложенного бага.</p>}

      <div onClick={handleShopClick} className={markMode ? 'cursor-crosshair rounded-2xl ring-2 ring-amber-300 ring-offset-2' : ''}>
        <BuggyShop />
      </div>

      {hasPendingReport ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="bug-description">Что не так?</label>
          <textarea
            id="bug-description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Опиши, что заметил(а)…"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button type="button" onClick={addReport} className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Добавить в отчёт</button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Отчёт о багах</h3>
          <span className="text-xs text-slate-500">Отмечено пунктов: {reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Пока пусто. Включи разметку и выбери место на странице.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {reports.map((report, index) => {
              const known = qaBugChecks.find((bug) => bug.id === report.bugId);
              return <li key={`${report.bugId ?? 'other'}-${index}`} className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-800">{index + 1}. {known?.label ?? 'Отмечено место без заложенного бага'}</p>
                <p className="mt-1 text-slate-600">{report.description}</p>
              </li>;
            })}
          </ol>
        )}
        <button type="button" onClick={submit} className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">Сдать задачу</button>
      </section>
    </div>
  );
}
