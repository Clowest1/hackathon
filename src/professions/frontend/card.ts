// Карточка товара: разметка, «сломанный» CSS, CSS по макету и генерация CSS из панели свойств.

// Картинка товара — встроенный SVG, чтобы не зависеть от сети
const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#c7d2fe"/><stop offset="1" stop-color="#fbcfe8"/></linearGradient></defs>
    <rect width="600" height="360" fill="url(#g)"/>
    <rect x="215" y="95" width="150" height="175" rx="22" fill="#fff"/>
    <path d="M365 140 h28 a34 34 0 0 1 0 68 h-28" fill="none" stroke="#fff" stroke-width="18"/>
    <rect x="240" y="135" width="100" height="10" rx="5" fill="#a5b4fc"/>
  </svg>`,
)}`;

const CARD_HTML = `<div class="card">
  <img src="${IMAGE}" alt="Керамическая кружка">
  <div class="title">Керамическая кружка</div>
  <div class="price">790 ₽</div>
  <button>В корзину</button>
</div>`;

const BASE_CSS = `body { margin: 0; display: flex; justify-content: center; padding: 24px 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; }
.card { width: 240px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-sizing: border-box; }
.card img { display: block; height: 150px; border-radius: 10px; }
.card .title { font-size: 16px; color: #0f172a; margin: 10px 0 4px; }
.card .price { font-size: 20px; color: #0f172a; margin: 0 0 12px; }
.card button { width: 100%; border: 0; border-radius: 10px; padding: 10px 16px; color: #fff; font-size: 14px; cursor: pointer; }`;

export interface CardStyle {
  buttonColor: string;
  image: 'overflow' | 'cover' | 'contain';
  priceBold: boolean;
  padding: number;
}

export const BROKEN: CardStyle = { buttonColor: '#94a3b8', image: 'overflow', priceBold: false, padding: 0 };
export const DESIGN: CardStyle = { buttonColor: '#4f46e5', image: 'cover', priceBold: true, padding: 16 };

export const BUTTON_COLORS = ['#94a3b8', '#4f46e5', '#16a34a', '#e11d48'];

const imageCss: Record<CardStyle['image'], string> = {
  overflow: 'width: 130%; object-fit: fill;',
  cover: 'width: 100%; object-fit: cover;',
  contain: 'width: 100%; object-fit: contain;',
};

/** CSS, который правит пользователь: только 4 свойства из задания (остальное — в BASE_CSS). */
export function cardCss(s: CardStyle): string {
  return `.card {
  padding: ${s.padding}px;
}
.card img {
  ${imageCss[s.image]}
}
.card .price {
  font-weight: ${s.priceBold ? 700 : 400};
}
.card button {
  background: ${s.buttonColor};
}`;
}

export function cardDocument(userCss: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style><style>${userCss}</style></head><body>${CARD_HTML}</body></html>`;
}
