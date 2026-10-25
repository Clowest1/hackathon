import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { EnvironmentProps } from '../../types';
import { BuggyShop, ZoneState } from './BuggyShop';
import { checkQa, MAX_FALSE_MARKS, type QaBugReport } from './checker';

const MIN_DESCRIPTION = 5;

// В режиме разметки: зоны подсвечиваются при наведении, а поля и кнопки внутри них не реагируют —
// клик всегда попадает в зону целиком, а не ставит курсор в поле.
const markModeClasses =
  'rounded-2xl ring-2 ring-amber-300 ring-offset-2 ' +
  '[&_[data-zone]]:cursor-crosshair [&_[data-zone]]:transition-colors ' +
  '[&_[data-zone]:hover]:bg-amber-100/70 [&_[data-zone]:hover]:outline-2 [&_[data-zone]:hover]:outline-amber-400 ' +
  '[&_[data-zone]_*]:pointer-events-none';

type Pending = Omit<QaBugReport, 'description'>;

export function Environment({ level, onEvent, onSubmit }: EnvironmentProps) {
  const [markMode, setMarkMode] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<QaBugReport[]>([]);
  const formRef = useRef<HTMLElement>(null);

  const alreadyReported = !!pending && reports.some((r) => r.zone === pending.zone);
  const canAdd = !!pending && !alreadyReported && description.trim().length >= MIN_DESCRIPTION;

  // На телефоне форма ниже страницы — прокручиваем к ней, чтобы было видно, что клик сработал
  useEffect(() => {
    if (pending) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [pending]);

  const handleShopClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!markMode) return;
    event.preventDefault();
    const zone = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-zone]') : null;
    if (!zone) return;
    setPending({
      zone: zone.dataset.zone!,
      zoneLabel: zone.dataset.zoneLabel ?? zone.dataset.zone!,
      bugIds: zone.dataset.bugId?.split(' ').filter(Boolean) ?? [],
    });
    setDescription('');
  };

  const addReport = () => {
    if (!pending || !canAdd) return;
    const report = { ...pending, description: description.trim() };
    setReports((current) => [...current, report]);
    // Тимлиду — только что и где отметил пользователь, без признака «попал / не попал»
    onEvent({ type: 'bug_marked', at: Date.now(), payload: { zone: report.zoneLabel, description: report.description } });
    setPending(null);
    setDescription('');
  };

  const removeReport = (zone: string) => setReports((current) => current.filter((r) => r.zone !== zone));

  const toggleMarkMode = () => {
    setMarkMode((value) => !value);
    setPending(null);
  };

  const submit = () => onSubmit(checkQa(reports), reports);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-900">Как работать</h3>
        <ol className="mt-2 space-y-1 text-sm text-slate-700">
          <li><b>1.</b> Пощёлкай страницу как покупатель: меняй количество, вводи промокод, оставляй поля пустыми, сверяй суммы.</li>
          <li><b>2.</b> Заметил(а) странное — включи <b>«Отметить баг»</b> и нажми на это место. Подсветится блок, который попадёт в отчёт.</li>
          <li><b>3.</b> Опиши, что не так, и добавь в отчёт. Когда наберёшь достаточно — сдавай.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-500">
          Отмечай только то, в чём уверен(а): больше {MAX_FALSE_MARKS} лишних отметок — задача не засчитана. Ложный баг-репорт отнимает время разработчиков.
        </p>
      </section>

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

      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 backdrop-blur sm:px-4">
        <div>
          <h3 className="font-semibold text-slate-900">Страница перед релизом</h3>
          <p className="text-xs text-slate-500">
            {markMode ? 'Наведи и нажми на блок с проблемой. Страница сейчас не реагирует на ввод.' : 'Сейчас можно пользоваться страницей как покупатель.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={markMode}
          onClick={toggleMarkMode}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${markMode ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {markMode ? '✓ Разметка — выключить' : '🐞 Отметить баг'}
        </button>
      </div>

      <ZoneState.Provider value={{ selected: pending?.zone ?? null, marked: reports.map((r) => r.zone) }}>
        <div onClick={handleShopClick} className={markMode ? markModeClasses : ''}>
          <BuggyShop />
        </div>
      </ZoneState.Provider>

      {pending && (
        <section ref={formRef} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-slate-600">Место: <b className="text-slate-900">{pending.zoneLabel}</b></p>
          {alreadyReported ? (
            <p className="mt-2 text-sm text-amber-900">Это место уже есть в отчёте. Выбери другое или удали старую отметку ниже.</p>
          ) : (
            <>
              <label className="mt-3 block text-sm font-semibold text-slate-800" htmlFor="bug-description">Что не так?</label>
              <textarea
                id="bug-description"
                rows={2}
                autoFocus
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Что сделал(а) и что увидел(а). Например: поменял количество на 3, а сумма не изменилась"
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {!alreadyReported && (
              <button type="button" onClick={addReport} disabled={!canAdd} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                Добавить в отчёт
              </button>
            )}
            <button type="button" onClick={() => setPending(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-amber-100">
              Отмена
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-slate-900">Отчёт о багах</h3>
          <span className="text-xs text-slate-500">Отмечено: {reports.length}</span>
        </div>
        {reports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Пока пусто. Включи «Отметить баг» и выбери место на странице.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {/* Только место и описание: какие отметки попали в заложенные баги, видно лишь после сдачи */}
            {reports.map((report, index) => (
              <li key={report.zone} className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-medium text-slate-800">{index + 1}.</span>
                <span className="flex-1"><b className="font-medium text-slate-800">{report.zoneLabel}:</b> {report.description}</span>
                <button type="button" onClick={() => removeReport(report.zone)} aria-label="Удалить отметку" className="rounded px-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700">✕</button>
              </li>
            ))}
          </ol>
        )}
        <button type="button" onClick={submit} disabled={reports.length === 0} className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          Сдать задачу
        </button>
      </section>
    </div>
  );
}
