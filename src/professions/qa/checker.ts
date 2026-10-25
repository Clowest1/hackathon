import type { CheckResult } from '../../types';

export const qaBugChecks = [
  { id: 'stale-total', label: 'Сумма корзины не пересчитывается при изменении количества' },
  { id: 'negative-quantity', label: 'Количество товара уходит в ноль и ниже' },
  { id: 'empty-email', label: 'Кнопка «Оформить» активна при пустом email' },
  { id: 'double-promo', label: 'Промокод применяется повторно при каждом нажатии' },
  { id: 'delivery-total', label: 'Доставка показана как 0 ₽, но в итог добавлено 300 ₽' },
] as const;

/** Больше лишних отметок — задача не засчитана: ложный баг-репорт отнимает время разработчиков. */
export const MAX_FALSE_MARKS = 2;

export interface QaBugReport {
  zone: string;          // id зоны страницы, куда кликнули
  zoneLabel: string;     // как зона называется для человека («Строка «Итого»»)
  bugIds: string[];      // какие заложенные баги видны в этой зоне (пусто — бага нет)
  description: string;
}

export function checkQa(answer: unknown): CheckResult {
  const reports = Array.isArray(answer) ? (answer as QaBugReport[]) : [];
  const seenZones = new Set<string>();
  const marks: string[][] = [];   // для каждой отметки с багом — какие баги она может засчитать
  let falseMarks = 0;

  for (const report of reports) {
    if (!report || seenZones.has(report.zone)) continue;
    seenZones.add(report.zone);
    const bugIds = Array.isArray(report.bugIds) ? report.bugIds : [];
    if (bugIds.length) marks.push(bugIds);
    else falseMarks += 1;
  }

  // Одна отметка засчитывает один баг (зона «Итого» показывает и баг доставки, и непересчитанную сумму).
  // Сопоставляем отметки с багами так, чтобы засчитать максимум, — результат не зависит от порядка кликов.
  const owner = new Map<string, number>();   // баг → индекс отметки, которая его засчитала
  const assign = (mark: number, visited: Set<string>): boolean =>
    marks[mark].some((bug) => {
      if (visited.has(bug)) return false;
      visited.add(bug);
      const current = owner.get(bug);
      if (current === undefined || assign(current, visited)) {
        owner.set(bug, mark);
        return true;
      }
      return false;
    });
  marks.forEach((_, mark) => assign(mark, new Set()));
  const found = new Set(owner.keys());

  const items: CheckResult['items'] = qaBugChecks.map(({ id, label }) => ({ label, ok: found.has(id) }));
  const count = items.filter((item) => item.ok).length;
  const falseItem = { label: `Лишних отметок: ${falseMarks} (допустимо до ${MAX_FALSE_MARKS})`, ok: falseMarks <= MAX_FALSE_MARKS };
  // Если задача не засчитана из-за лишних отметок — это главная причина, показываем её первой
  if (falseItem.ok) items.push(falseItem);
  else items.unshift(falseItem);

  return {
    passed: count >= 3 && falseMarks <= MAX_FALSE_MARKS,
    items,
    score: Math.max(0, count * 20 - falseMarks * 10),
  };
}
