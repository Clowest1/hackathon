import type { CheckResult } from '../../types';
import { CORRECT_CAUSE } from './causes';

export interface AnalystAnswer {
  causeId: string;
  conclusion: string;
  /** по каким полям группировал при запусках запросов */
  groupedBy: string[];
}

export function checkAnalyst(answer: AnalystAnswer): CheckResult {
  const items = [
    { label: 'Найдена верная причина падения', ok: answer.causeId === CORRECT_CAUSE },
    { label: 'Был запрос с группировкой по способу оплаты', ok: answer.groupedBy.includes('payment_method') },
    { label: 'Написан вывод для тимлида', ok: answer.conclusion.trim().length >= 10 },
  ];
  const [cause, grouped, conclusion] = items.map((i) => i.ok);
  const score = (cause ? 60 : 0) + (grouped ? 20 : 0) + (conclusion ? 20 : 0);
  return { passed: cause, items, score };
}
