import { createContext, useContext, useState, type ReactNode } from 'react';

const initialItems = [
  { id: 'mug', name: 'Керамическая кружка', price: 790 },
  { id: 'notebook', name: 'Блокнот в точку', price: 490 },
  { id: 'bag', name: 'Холщовая сумка', price: 1_290 },
];

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

/** Какие зоны сейчас выбрана / уже в отчёте — чтобы подсветить их на странице. */
export const ZoneState = createContext<{ selected: string | null; marked: string[] }>({ selected: null, marked: [] });

/**
 * Зона страницы, которую можно отметить в режиме разметки. Зоны есть у всех смысловых блоков,
 * а не только у багов, — поэтому подсветка при наведении ничего не выдаёт.
 */
function Zone({ id, label, bugs = [], className = '', children }: { id: string; label: string; bugs?: string[]; className?: string; children: ReactNode }) {
  const { selected, marked } = useContext(ZoneState);
  const state = selected === id ? 'outline-2 outline-amber-500 bg-amber-50' : marked.includes(id) ? 'outline-1 outline-dashed outline-amber-400' : '';
  return (
    <div data-zone={id} data-zone-label={label} data-bug-id={bugs.join(' ') || undefined} title={label} className={`rounded-lg ${state} ${className}`}>
      {children}
    </div>
  );
}

export function BuggyShop() {
  const [quantities, setQuantities] = useState<Record<string, number>>({ mug: 1, notebook: 1, bag: 1 });
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [email, setEmail] = useState('');
  const initialSubtotal = initialItems.reduce((sum, item) => sum + item.price, 0);

  const applyPromo = () => {
    if (promo.trim().toUpperCase() === 'ПЕРВЫЙ') setDiscount((value) => value + Math.round(initialSubtotal * 0.1));
  };

  const total = Math.max(0, initialSubtotal - discount) + 300;

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <Zone id="header" label="Заголовок страницы" className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Магазин «Точка»</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Оформление заказа</h2>
      </Zone>

      <div className="divide-y divide-slate-100 px-4 sm:px-6">
        {initialItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <Zone id={`item-${item.id}`} label={`Товар «${item.name}» и его цена`} className="min-w-0 flex-1 p-1">
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-sm text-slate-500">{money(item.price)} за шт.</p>
            </Zone>
            <Zone id={`qty-${item.id}`} label={`Количество: «${item.name}»`} bugs={['negative-quantity']} className="p-1">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Кол-во
                <input
                  aria-label={`Количество: ${item.name}`}
                  type="number"
                  min="1"
                  value={quantities[item.id]}
                  onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-center text-slate-900"
                />
              </label>
            </Zone>
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
        <Zone id="subtotal" label="Строка «Товары в корзине»" bugs={['stale-total']} className="flex items-center justify-between bg-white px-3 py-3 text-sm">
          <span className="text-slate-600">Товары в корзине</span>
          <strong className="tabular-nums text-slate-900">{money(initialSubtotal)}</strong>
        </Zone>

        <div className="flex flex-wrap gap-2">
          <Zone id="promo-input" label="Поле промокода" className="flex min-w-0 flex-1 p-1">
            <input
              aria-label="Промокод"
              value={promo}
              onChange={(event) => setPromo(event.target.value)}
              placeholder="Промокод, например ПЕРВЫЙ"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </Zone>
          <Zone id="promo-apply" label="Кнопка «Применить»" bugs={['double-promo']} className="p-1">
            <button type="button" onClick={applyPromo} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
              Применить
            </button>
          </Zone>
        </div>
        {discount > 0 && (
          <Zone id="discount" label="Строка «Скидка»" bugs={['double-promo']} className="px-1 text-right text-xs text-emerald-700">
            Скидка: −{money(discount)}
          </Zone>
        )}

        <Zone id="email" label="Поле email" bugs={['empty-email']} className="p-1">
          <label className="block text-sm font-medium text-slate-700">
            Email для чека
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
            />
          </label>
        </Zone>

        <div className="space-y-1 rounded-xl bg-white p-2 text-sm">
          <Zone id="delivery" label="Строка «Доставка»" bugs={['delivery-total']} className="flex justify-between px-1 py-1 text-slate-600">
            <span>Доставка</span><span>0 ₽</span>
          </Zone>
          <Zone id="total" label="Строка «Итого»" bugs={['delivery-total', 'stale-total']} className="flex justify-between border-t border-slate-100 px-1 py-1.5 font-semibold text-slate-900">
            <span>Итого</span><span>{money(total)}</span>
          </Zone>
        </div>
        <Zone id="checkout" label="Кнопка «Оформить»" bugs={['empty-email']}>
          <button type="button" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700">
            Оформить
          </button>
        </Zone>
        <Zone id="footer" label="Подпись внизу страницы" className="text-center text-xs text-slate-500">
          Демо-корзина • данные заказа не отправляются
        </Zone>
      </div>
    </div>
  );
}
