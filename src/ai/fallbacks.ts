// Заготовленные ответы. Сейчас — единственный источник текстов (LLM не подключён),
// потом станут фолбэками, если API упал или ответ не распарсился.
import type { CheckResult, Profession, Roadmap, Session } from '../types';

const chatReplies = [
  'Хороший вопрос! Попробуй посмотреть на данные в разных срезах — ответ обычно прячется там, где что-то резко изменилось.',
  'Двигаешься в правильную сторону. Что ты видишь в последнем результате? Есть что-то необычное?',
  'Если застрял(а) — нажми «Подсказка», я подскажу следующий шаг.',
];

export function teamleadReply(session: Session): string {
  const userMessages = session.chat.filter((m) => m.role === 'user').length;
  return chatReplies[(userMessages - 1) % chatReplies.length];
}

export function hintMessage(profession: Profession, session: Session): string {
  const hints = profession.task.hints[session.level ?? 'novice'];
  const hint = hints[Math.min(session.hintsUsed, hints.length - 1)];
  return session.hintsUsed >= hints.length ? `Подсказки закончились, но вот последняя ещё раз: ${hint}` : `Подсказка: ${hint}`;
}

export function nudge(afterError: boolean): string {
  return afterError
    ? 'Вижу, последний шаг не получился. Давай разберёмся вместе: напиши, что пытался(лась) сделать, или нажми «Подсказка».'
    : 'Как продвигается? Если застрял(а) — напиши мне, что видишь, или нажми «Подсказка». Разберёмся вместе.';
}

export function feedback(result: CheckResult, session: Session): string {
  const usedGrouping = result.items[1]?.ok;
  const praise = usedGrouping
    ? 'Ты сгруппировал(а) данные по способу оплаты — именно так аналитики ищут, где сломалось.'
    : 'Ты дошёл(ла) до конца и сформулировал(а) ответ — это уже половина работы аналитика.';
  const growth = result.passed
    ? 'В следующий раз попробуй подкрепить вывод цифрой: «доля неуспешных оплат СБП выросла с X% до Y%».'
    : 'Причина оказалась в другом. Попробуй каждый раз сравнивать «до» и «после» по одному срезу за раз.';
  const hints = session.hintsUsed > 2 ? ' И постепенно опирайся на подсказки поменьше — у тебя получится.' : '';
  return `${praise} ${growth}${hints}`;
}

export function roadmap(session: Session): Roadmap {
  const negative = ['Скорее нет', 'Нет'].includes(session.reflection?.daily ?? '');
  return {
    summary: session.result?.passed
      ? 'Ты нашёл(ла) причину падения продаж — это настоящая задача джуна-аналитика. Видно, что тебе подходит работа с данными.'
      : 'Задача оказалась непростой, но ты прошёл(ла) путь аналитика от вопроса до вывода. Есть что подтянуть — и это нормально.',
    strengths: ['Доводишь задачу до ответа', 'Пробуешь разные срезы данных'],
    gaps: ['Синтаксис SQL', 'Формулировка выводов с цифрами'],
    weeks: [
      { week: 1, focus: 'Основы SQL', tasks: ['SELECT, WHERE, ORDER BY', 'Повтори запрос из задания руками'], resources: ['SQLBolt (sqlbolt.com)'] },
      { week: 2, focus: 'Группировки и агрегаты', tasks: ['GROUP BY, COUNT, SUM', 'Найди долю неуспешных заказов'], resources: ['Mode SQL Tutorial'] },
      { week: 3, focus: 'Таблицы и графики', tasks: ['Сводные таблицы в Google Таблицах', 'Построй график выручки по дням'], resources: ['Справка Google Таблиц'] },
      { week: 4, focus: 'Мини-проект', tasks: ['Возьми открытый датасет и найди в нём одну интересную закономерность'], resources: ['Kaggle Datasets'] },
    ],
    nextProfessionToTry: negative ? 'qa' : undefined,
  };
}
