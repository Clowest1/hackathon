import type { CheckResult } from '../../types';

export const frontendChecks = [
  { id: 'button-color', label: 'Кнопка нужного цвета (#4F46E5)' },
  { id: 'image-fit', label: 'Картинка не вылезает за карточку и не искажена' },
  { id: 'price-bold', label: 'Цена жирная' },
  { id: 'card-padding', label: 'Внутри карточки есть отступы (от 12px)' },
] as const;

/**
 * Проверяем реальную вёрстку, а не выбранные в панели значения: берём вычисленные стили элементов
 * в iframe с превью (getComputedStyle) — так проверка одинакова для панели и для CSS-редактора.
 */
export function checkFrontend(doc: Document | null | undefined): CheckResult {
  const card = doc?.querySelector<HTMLElement>('.card');
  const img = doc?.querySelector<HTMLImageElement>('.card img');
  const price = doc?.querySelector<HTMLElement>('.card .price');
  const button = doc?.querySelector<HTMLElement>('.card button');
  const view = doc?.defaultView;

  const ok: Record<(typeof frontendChecks)[number]['id'], boolean> = { 'button-color': false, 'image-fit': false, 'price-bold': false, 'card-padding': false };
  if (card && img && price && button && view) {
    const css = (el: Element) => view.getComputedStyle(el);
    ok['button-color'] = css(button).backgroundColor.replace(/\s/g, '') === 'rgb(79,70,229)';
    const cardBox = card.getBoundingClientRect();
    const imgBox = img.getBoundingClientRect();
    ok['image-fit'] = imgBox.right <= cardBox.right + 0.5 && imgBox.left >= cardBox.left - 0.5 && ['cover', 'contain'].includes(css(img).objectFit);
    ok['price-bold'] = Number(css(price).fontWeight) >= 600;
    const pad = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
    ok['card-padding'] = pad.every((p) => parseFloat(css(card)[p]) >= 12);
  }

  const items = frontendChecks.map(({ id, label }) => ({ label, ok: ok[id] }));
  const count = items.filter((i) => i.ok).length;
  return { passed: count >= 3, items, score: count * 25 };
}
