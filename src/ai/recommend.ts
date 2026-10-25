// «Не знаю, что выбрать»: 4 вопроса об интересах → 1–2 профессии с объяснением «почему».
// Без LLM — правило по баллам: мгновенно и предсказуемо, а «почему» собирается из ответов пользователя.
import { professionCards } from '../professions';
import type { ProfessionCard, ProfessionId } from '../types';

export interface InterestQuestion {
  id: string;
  text: string;
  options: { label: string; scores: Partial<Record<ProfessionId, number>> }[];
}

export const interestQuestions: InterestQuestion[] = [
  {
    id: 'task',
    text: 'Какая задача звучит интереснее?',
    options: [
      { label: 'Понять, почему упали продажи', scores: { analyst: 2 } },
      { label: 'Проверить сайт перед запуском и найти ошибки', scores: { qa: 2 } },
      { label: 'Сверстать страницу по макету дизайнера', scores: { frontend: 2 } },
    ],
  },
  {
    id: 'notice',
    text: 'Что ты замечаешь первым?',
    options: [
      { label: 'Цифры и то, как они меняются', scores: { analyst: 2 } },
      { label: 'Опечатки, несостыковки, то, что работает не так', scores: { qa: 2 } },
      { label: 'Шрифты, цвета и отступы', scores: { frontend: 2 } },
      { label: 'Ничего из этого особенно', scores: {} },
    ],
  },
  {
    id: 'style',
    text: 'Как тебе комфортнее работать?',
    options: [
      { label: 'Долго копать одну загадку, пока не найду ответ', scores: { analyst: 2, qa: 1 } },
      { label: 'Перебирать разные сценарии и пробовать сломать', scores: { qa: 2 } },
      { label: 'Делать руками и сразу видеть результат', scores: { frontend: 2 } },
    ],
  },
  {
    id: 'result',
    text: 'Что приятнее всего в конце рабочего дня?',
    options: [
      { label: 'Объяснить команде, что происходит, — с цифрами', scores: { analyst: 2 } },
      { label: 'Знать, что из-за меня пользователи не наткнутся на ошибку', scores: { qa: 2 } },
      { label: 'Показать красивую работающую страницу', scores: { frontend: 2 } },
    ],
  },
];

/** Если ближе всего профессия «скоро», а у доступных ноль баллов — предлагаем родственную. */
const NEAREST: Partial<Record<ProfessionId, ProfessionId>> = { frontend: 'qa' };

export interface Recommendation {
  card: ProfessionCard;
  score: number;
  reasons: string[];   // ответы пользователя, которые дали этой профессии баллы
}

/**
 * answers: id вопроса → индекс выбранного варианта.
 * Возвращает доступные профессии по убыванию баллов (1, или 2, если вторая почти не отстаёт),
 * и отдельно — склонность к профессии, которой ещё нет («скоро»), если она набрала больше всех.
 */
export function recommend(answers: Record<string, number>): { picks: Recommendation[]; comingSoon?: Recommendation } {
  const ranked: Recommendation[] = professionCards
    .map((card) => {
      const reasons: string[] = [];
      let score = 0;
      for (const q of interestQuestions) {
        const option = q.options[answers[q.id]];
        const points = option?.scores[card.id] ?? 0;
        if (points > 0) {
          score += points;
          reasons.push(option.label);
        }
      }
      return { card, score, reasons };
    })
    // при равенстве — в порядке карточек на экране выбора
    .sort((a, b) => b.score - a.score);

  const top = ranked[0];
  const available = ranked.filter((r) => r.card.available);
  const nearest = !top.card.available && available[0].score === 0 ? available.find((r) => r.card.id === NEAREST[top.card.id]) : undefined;
  if (nearest) available.unshift(...available.splice(available.indexOf(nearest), 1));
  const [first, second] = available;
  const picks = second && second.score > 0 && first.score - second.score <= 1 ? [first, second] : [first];
  return { picks, comingSoon: !top.card.available && top.score > first.score ? top : undefined };
}
