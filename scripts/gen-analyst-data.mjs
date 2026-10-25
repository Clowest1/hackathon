// Генерирует src/professions/analyst/data.sql — заказы интернет-магазина за 1–28 октября 2025.
// Заложенная причина: с 15.10 оплаты через СБП массово уходят в status = 'failed'.
// Регионы и платформы распределены одинаково до и после — в них аномалии нет, их можно исключить.
// Запуск: node scripts/gen-analyst-data.mjs  (детерминирован; seed 915 подобран так, чтобы срезы по региону
// и платформе не давали ложных аномалий из-за шума — SEED=... в env, чтобы попробовать другой)
import { writeFileSync } from 'node:fs';

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = Number(process.env.SEED ?? 915);
const rand = mulberry32(SEED);

function pick(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (const [key, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return key;
  }
  return Object.keys(weights).at(-1);
}

const PAYMENT = { card: 45, sbp: 40, cash: 15 };
const REGION = { 'Москва': 35, 'Санкт-Петербург': 22, 'Казань': 15, 'Новосибирск': 14, 'Екатеринбург': 14 };
const PLATFORM = { web: 45, android: 30, ios: 25 };
const INCIDENT_DAY = 15;

function failRate(method, day) {
  if (method === 'sbp') return day >= INCIDENT_DAY ? 0.72 : 0.04;
  return method === 'card' ? 0.03 : 0.01;
}

function amount() {
  // скошенное распределение: в основном 1–3 тыс., изредка до ~8 тыс.
  const base = 700 + Math.pow(rand(), 2.2) * 7000 + rand() * 600;
  return Math.round(base / 10) * 10;
}

const pad = (n) => String(n).padStart(2, '0');
const rows = [];
let id = 1;
for (let day = 1; day <= 28; day++) {
  const perDay = 16 + Math.floor(rand() * 5); // 16–20 заказов в день
  const times = Array.from({ length: perDay }, () => 8 * 3600 + Math.floor(rand() * 15 * 3600)).sort((a, b) => a - b);
  for (const t of times) {
    const method = pick(PAYMENT);
    const r = rand();
    const status = r < failRate(method, day) ? 'failed' : r < failRate(method, day) + 0.04 ? 'cancelled' : 'paid';
    const createdAt = `2025-10-${pad(day)} ${pad(Math.floor(t / 3600))}:${pad(Math.floor((t % 3600) / 60))}:${pad(t % 60)}`;
    rows.push(`(${id++}, '${createdAt}', ${amount()}, '${status}', '${method}', '${pick(REGION)}', '${pick(PLATFORM)}')`);
  }
}

const sql = `-- Сгенерировано scripts/gen-analyst-data.mjs, не редактировать руками.
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL,       -- 'YYYY-MM-DD HH:MM:SS'
  amount INTEGER NOT NULL,        -- сумма заказа, ₽
  status TEXT NOT NULL,           -- paid | failed | cancelled
  payment_method TEXT NOT NULL,   -- card | sbp | cash
  region TEXT NOT NULL,
  platform TEXT NOT NULL          -- web | android | ios
);
INSERT INTO orders (id, created_at, amount, status, payment_method, region, platform) VALUES
${rows.join(',\n')};
`;

const out = new URL('../src/professions/analyst/data.sql', import.meta.url);
writeFileSync(out, sql);
console.log(`${rows.length} заказов → ${out.pathname}`);
