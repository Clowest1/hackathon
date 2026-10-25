import { describe, expect, it } from 'vitest';
import { checkAnalyst } from '../professions/analyst/checker';
import { assertReadOnly } from '../professions/analyst/Environment';
import { detectGroups } from '../professions/analyst/SqlEditor';
import { checkQa } from '../professions/qa/checker';
import { recommend } from '../ai/recommend';
import { shouldNudge, IDLE_MS } from '../ai/useProactiveTeamlead';

const mark = (zone: string, bugIds: string[]) => ({ zone, zoneLabel: zone, bugIds, description: 'описание' });

describe('аналитик', () => {
  it('засчитывает верную причину', () => {
    expect(checkAnalyst({ causeId: 'sbp_failed', conclusion: 'Оплаты через СБП не проходят', groupedBy: ['payment_method'] }).passed).toBe(true);
    expect(checkAnalyst({ causeId: 'region', conclusion: '', groupedBy: [] }).passed).toBe(false);
  });
  it('находит группировку по способу оплаты в SQL пользователя', () => {
    expect(detectGroups('SELECT payment_method, COUNT(*) FROM orders GROUP BY payment_method')).toEqual(['payment_method']);
    expect(detectGroups('select payment_method as pm, sum(amount) from orders group by 1')).toEqual(['payment_method']);
    expect(detectGroups("SELECT * FROM orders WHERE payment_method = 'sbp'")).toEqual([]);
  });
  it('пропускает только один SELECT', () => {
    expect(() => assertReadOnly('-- комментарий\nSELECT * FROM orders;')).not.toThrow();
    expect(() => assertReadOnly('DROP TABLE orders')).toThrow();
    expect(() => assertReadOnly('SELECT 1; DROP TABLE orders;')).toThrow();
  });
});

describe('тестировщик', () => {
  it('3 бага без лишних — решено, 3 лишних — нет', () => {
    const bugs = [mark('qty', ['negative-quantity']), mark('subtotal', ['stale-total']), mark('checkout', ['empty-email'])];
    expect(checkQa(bugs).passed).toBe(true);
    expect(checkQa([...bugs, mark('a', []), mark('b', []), mark('c', [])]).passed).toBe(false);
  });
  it('зачёт не зависит от порядка кликов', () => {
    const a = checkQa([mark('total', ['delivery-total', 'stale-total']), mark('delivery', ['delivery-total'])]);
    const b = checkQa([mark('delivery', ['delivery-total']), mark('total', ['delivery-total', 'stale-total'])]);
    expect(a.score).toBe(40);
    expect(b.score).toBe(40);
  });
});

describe('подбор профессии и тимлид', () => {
  it('рекомендует по интересам', () => {
    expect(recommend({ task: 0, notice: 0, style: 0, result: 0 }).picks[0].card.id).toBe('analyst');
    expect(recommend({ task: 1, notice: 1, style: 1, result: 1 }).picks[0].card.id).toBe('qa');
  });
  it('тимлид пишет первым один раз за паузу и не после сдачи', () => {
    const base = { now: IDLE_MS.analyst + 1, lastActivity: 1, lastNudgeAt: 0, nudges: 0, idleMs: IDLE_MS.analyst, busy: false, finished: false };
    expect(shouldNudge(base)).toBe(true);
    expect(shouldNudge({ ...base, lastNudgeAt: base.now - 1, nudges: 1 })).toBe(false);
    expect(shouldNudge({ ...base, finished: true })).toBe(false);
  });
});
