import { useRef, useState } from 'react';
import type { EnvironmentProps } from '../../types';
import { BROKEN, BUTTON_COLORS, cardCss, cardDocument, DESIGN, type CardStyle } from './card';
import { checkFrontend } from './checker';

const designSpec = [
  ['Кнопка', 'цвет #4F46E5'],
  ['Картинка', 'по ширине карточки, без искажений'],
  ['Цена', 'жирная'],
  ['Отступ внутри карточки', '16px'],
];

const imageOptions: { id: CardStyle['image']; label: string }[] = [
  { id: 'overflow', label: 'как сейчас' },
  { id: 'cover', label: 'заполнить (object-fit: cover)' },
  { id: 'contain', label: 'вписать целиком (object-fit: contain)' },
];

const frame = 'h-[340px] w-full rounded-xl border border-slate-200 bg-slate-50';
const designDoc = cardDocument(cardCss(DESIGN));

export function Environment({ level, onEvent, onSubmit }: EnvironmentProps) {
  const [style, setStyle] = useState<CardStyle>(BROKEN);
  const [css, setCss] = useState(cardCss(BROKEN)); // уровень basic: пользователь правит CSS руками
  const previewRef = useRef<HTMLIFrameElement>(null);
  const userCss = level === 'basic' ? css : cardCss(style);

  const change = <K extends keyof CardStyle>(key: K, value: CardStyle[K], log = true) => {
    setStyle((s) => ({ ...s, [key]: value }));
    if (log) onEvent({ type: 'css_changed', at: Date.now(), payload: { property: key, value } });
  };

  const submit = () => onSubmit(checkFrontend(previewRef.current?.contentDocument), { css: userCss });

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Макет от дизайнера</h3>
          <iframe title="Макет" srcDoc={designDoc} className={frame} />
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            {designSpec.map(([what, how]) => (
              <li key={what}><b className="text-slate-800">{what}:</b> {how}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-amber-200 bg-white p-3">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Твоя вёрстка — живое превью</h3>
          <iframe ref={previewRef} title="Превью" srcDoc={cardDocument(userCss)} className={frame} />
        </section>
      </div>

      {level === 'basic' ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">CSS карточки</h3>
          <p className="mt-1 mb-3 text-xs text-slate-500">Правь стили — превью обновляется сразу. Классы: .card, .card img, .card .title, .card .price, .card button.</p>
          <textarea
            value={css}
            onChange={(e) => setCss(e.target.value)}
            onBlur={() => onEvent({ type: 'css_changed', at: Date.now(), payload: { css } })}
            spellCheck={false}
            rows={14}
            className="w-full rounded-lg border border-slate-300 bg-slate-900 p-3 font-mono text-xs text-emerald-300 focus:border-indigo-500 focus:outline-none"
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-semibold">Панель свойств</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm text-slate-600">Цвет кнопки</p>
              <div className="flex gap-2">
                {BUTTON_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => change('buttonColor', c)}
                    aria-label={`Цвет ${c}`}
                    title={c}
                    className={`h-8 w-8 rounded-full border-2 ${style.buttonColor === c ? 'border-slate-900' : 'border-white ring-1 ring-slate-200'}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <label className="block text-sm text-slate-600">
              Картинка
              <select
                value={style.image}
                onChange={(e) => change('image', e.target.value as CardStyle['image'])}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                {imageOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <div>
              <p className="mb-1.5 text-sm text-slate-600">Жирность цены</p>
              <div className="inline-flex rounded-lg border border-slate-300 p-0.5 text-sm">
                {[false, true].map((bold) => (
                  <button
                    key={String(bold)}
                    onClick={() => change('priceBold', bold)}
                    className={`rounded-md px-3 py-1 ${style.priceBold === bold ? 'bg-indigo-600 text-white' : 'text-slate-700'} ${bold ? 'font-bold' : ''}`}
                  >
                    {bold ? 'жирная' : 'обычная'}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm text-slate-600">
              Отступ внутри карточки: <b className="text-slate-900">{style.padding}px</b>
              <input
                type="range"
                min={0}
                max={32}
                step={2}
                value={style.padding}
                onChange={(e) => change('padding', Number(e.target.value), false)}
                onPointerUp={() => onEvent({ type: 'css_changed', at: Date.now(), payload: { property: 'padding', value: style.padding } })}
                className="mt-2 block w-full accent-indigo-600"
              />
            </label>
          </div>
          <p className="mt-4 mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Так выглядит твой CSS</p>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-emerald-300">{userCss}</pre>
        </section>
      )}

      <button onClick={submit} className="w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
        Сдать вёрстку
      </button>
    </div>
  );
}
