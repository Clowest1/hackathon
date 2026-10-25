import type { CheckResult } from '../../types';

export const qaBugChecks = [
  { id: 'stale-total', label: 'Сумма корзины не пересчитывается при изменении количества' },
  { id: 'negative-quantity', label: 'Можно указать отрицательное количество товара' },
  { id: 'empty-email', label: 'Кнопка «Оформить» активна при пустом email' },
  { id: 'double-promo', label: 'Промокод применяется повторно при каждом нажатии' },
  { id: 'delivery-total', label: 'Доставка показана как 0 ₽, но в итог добавлено 300 ₽' },
] as const;

export interface QaBugReport {
  bugId: string | null;
  description: string;
}

export function checkQa(answer: unknown): CheckResult {
  const reports = Array.isArray(answer) ? (answer as QaBugReport[]) : [];
  const found = new Set(reports.map((report) => report?.bugId).filter((id): id is string => typeof id === 'string'));
  const items = qaBugChecks.map(({ id, label }) => ({ label, ok: found.has(id) }));
  const count = items.filter((item) => item.ok).length;

  return { passed: count >= 3, items, score: Math.round((count / qaBugChecks.length) * 100) };
}
