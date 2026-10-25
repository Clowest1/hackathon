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
  if (session.professionId === 'qa') return qaFeedback(result, session);

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

function qaFeedback(result: CheckResult, session: Session): string {
  const found = result.items.filter((item) => item.ok);
  const missed = result.items.filter((item) => !item.ok);
  const count = found.length;
  const firstFound = found[0]?.label;
  const praise = firstFound
    ? `Ты заметил(а), что ${firstFound.charAt(0).toLowerCase()}${firstFound.slice(1)} — такие несоответствия важно находить до релиза.`
    : 'Ты прошёл(ла) сценарии оформления и собрал(а) наблюдения в отчёт — это хорошая основа для проверки.';
  const growth = missed.length
    ? `Ты отметил(а) ${count} из 5 багов. В следующий раз отдельно проверь: ${missed.slice(0, 2).map((item) => item.label.toLowerCase()).join('; ')}.`
    : 'Ты нашёл(ла) все пять заложенных багов. В следующий раз потренируйся описывать шаги воспроизведения и ожидаемый результат.';
  const hints = session.hintsUsed > 2 ? ' Попробуй постепенно проходить похожую проверку с меньшим числом подсказок.' : '';
  return `${praise} ${growth}${hints}`;
}

export function roadmap(session: Session): Roadmap {
  if (session.professionId === 'qa') return qaRoadmap(session);

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

function qaRoadmap(session: Session): Roadmap {
  const result = session.result;
  const found = result?.items.filter((item) => item.ok) ?? [];
  const missed = result?.items.filter((item) => !item.ok) ?? [];
  const count = found.length;
  const negative = ['Скорее нет', 'Нет'].includes(session.reflection?.daily ?? '');
  const reports = Array.isArray(session.answer) ? session.answer : [];
  const strengths = [
    count > 0 ? `Ты нашёл(ла) ${count} из 5 заложенных ошибок${found[0] ? `, в том числе: ${found[0].label.toLowerCase()}` : ''}.` : 'Ты прошёл(ла) сценарий оформления и попробовал(а) составить отчёт.',
    reports.length > 0 ? `Ты добавил(а) в отчёт ${reports.length} наблюдений.` : 'Ты дошёл(ла) до сдачи задачи.',
  ];
  const gaps = missed.length
    ? missed.slice(0, 3).map((item) => `Проверять сценарий: ${item.label.toLowerCase()}.`)
    : ['Описывать шаги воспроизведения, ожидаемый и фактический результат.'];

  return {
    summary: result?.passed
      ? `Ты нашёл(ла) ${count} из 5 ошибок и прошёл(ла) порог задачи тестировщика. По твоему отчёту видно, что ты проверял(а) поведение страницы, а не только её внешний вид.`
      : `Ты проверил(а) страницу оформления и нашёл(ла) ${count} из 5 заложенных ошибок. Следующий шаг — потренироваться системно проверять поля, граничные значения и повторные действия.`,
    strengths,
    gaps,
    weeks: [
      { week: 1, focus: 'Тестовые сценарии и чек-листы', tasks: ['Составь чек-лист для оформления заказа: поля, кнопки и итог', 'Для каждого пункта опиши ожидаемый результат'], resources: ['Официальный глоссарий ISTQB'] },
      { week: 2, focus: 'Формы и граничные значения', tasks: ['Проверь пустое, неверное и корректное значение email', 'Для количества проверь минимум, ноль и отрицательное число'], resources: ['MDN: проверка HTML-форм'] },
      { week: 3, focus: 'Баг-репорты', tasks: ['Опиши найденную ошибку шагами воспроизведения', 'Добавь ожидаемый и фактический результат'], resources: ['Официальный глоссарий ISTQB', 'Программа ISTQB CTFL'] },
      { week: 4, focus: 'Повторная проверка перед релизом', tasks: ['Возьми знакомую форму и пройди чек-лист заново после изменений', 'Собери отчёт и отметь, какие ошибки блокируют выпуск'], resources: ['MDN: проверка HTML-форм'] },
    ],
    ...(negative ? { nextProfessionToTry: 'analyst' as const } : {}),
  };
}
