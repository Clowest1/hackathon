import { useState } from 'react';

const initialItems = [
  { id: 'mug', name: 'Керамическая кружка', price: 790 },
  { id: 'notebook', name: 'Блокнот в точку', price: 490 },
  { id: 'bag', name: 'Холщовая сумка', price: 1_290 },
];

const money = (value: number) => `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;

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
      <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Магазин «Точка»</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Оформление заказа</h2>
      </div>

      <div className="divide-y divide-slate-100 px-4 sm:px-6">
        {initialItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-800">{item.name}</p>
              <p className="text-sm text-slate-500">{money(item.price)} за шт.</p>
            </div>
            <label data-bug-id="negative-quantity" className="flex items-center gap-2 text-sm text-slate-600">
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
          </div>
        ))}
      </div>

      <div className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6">
        <div data-bug-id="stale-total" className="flex items-center justify-between rounded-lg bg-white px-3 py-3 text-sm">
          <span className="text-slate-600">Товары в корзине</span>
          <strong className="tabular-nums text-slate-900">{money(initialSubtotal)}</strong>
        </div>

        <div className="flex flex-wrap gap-2" data-bug-id="double-promo">
          <input
            aria-label="Промокод"
            value={promo}
            onChange={(event) => setPromo(event.target.value)}
            placeholder="Промокод, например ПЕРВЫЙ"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button type="button" onClick={applyPromo} className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
            Применить
          </button>
        </div>
        {discount > 0 && <p className="text-right text-xs text-emerald-700">Скидка: −{money(discount)}</p>}

        <label data-bug-id="empty-email" className="block text-sm font-medium text-slate-700">
          Email для чека
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
          />
        </label>

        <div data-bug-id="delivery-total" className="space-y-2 rounded-xl bg-white p-3 text-sm">
          <div className="flex justify-between text-slate-600"><span>Доставка</span><span>0 ₽</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900"><span>Итого</span><span>{money(total)}</span></div>
        </div>
        <button type="button" data-bug-id="empty-email" className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700">
          Оформить
        </button>
        <p className="text-center text-xs text-slate-500">Демо-корзина • данные заказа не отправляются</p>
      </div>
    </div>
  );
}
