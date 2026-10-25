// Тексты без LLM. Часть используется всегда (подсказки, тимлид пишет первым),
// часть — когда LLM недоступен (ответ в чате, фидбек). Всё строится по конфигу профессии
// и результатам проверки, поэтому работает для любой профессии без доработки.
import type { Profession, Session } from '../types';

export function plural(n: number, forms: [string, string, string]) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** Пункты проверки — в кавычках: у разных профессий они звучат по-разному («Найдена причина» / «Сумма не пересчитывается»). */
export const quoted = (labels: string[]) => labels.map((l) => `«${l}»`).join(', ');

export function minutesSpent(session: Session) {
  return session.startedAt !== undefined && session.finishedAt !== undefined ? Math.max(1, Math.round((session.finishedAt - session.startedAt) / 60_000)) : undefined;
}

/** Ответ в чате, если LLM недоступен: термин из словаря, если он есть в вопросе, иначе общий наводящий ответ. */
export function teamleadReply(profession: Profession, session: Session): string {
  const last = session.chat.at(-1)?.text.toLowerCase() ?? '';
  // самый длинный подходящий термин: «баг-репорт» важнее, чем «баг»
  const term = [...profession.task.glossary].sort((a, b) => b.term.length - a.term.length).find((g) => last.includes(g.term.toLowerCase()));
  if (term) return `${term.term.charAt(0).toUpperCase() + term.term.slice(1)} — ${lowerFirst(term.explanation)} Если ещё что-то непонятно — спрашивай.`;

  const replies = [
    'Хороший вопрос! Посмотри на свой последний результат: что в нём выделяется? Обычно ответ прячется там, где что-то резко изменилось.',
    'Двигаешься в правильную сторону. Попробуй проверить свою идею ещё одним способом — и сравни, что получится.',
    'Если застрял(а) — нажми «Подсказка», я подскажу следующий шаг.',
  ];
  const userMessages = session.chat.filter((m) => m.role === 'user').length;
  return replies[Math.max(0, userMessages - 1) % replies.length];
}

const hintIntros = ['Давай так:', 'Следующий шаг:', 'Подскажу конкретнее:', 'Совсем горячо:'];

/** Подсказка по кнопке — всегда без LLM: тексты подсказок уже написаны в конфиге профессии. */
export function hintMessage(profession: Profession, session: Session): string {
  const hints = profession.task.hints[session.level ?? 'novice'];
  if (session.hintsUsed >= hints.length) {
    return `Подсказки закончились, но вот последняя ещё раз: ${lowerFirst(hints.at(-1)!)} Если всё равно непонятно — напиши, что видишь, разберёмся вместе.`;
  }
  return `${hintIntros[Math.min(session.hintsUsed, hintIntros.length - 1)]} ${lowerFirst(hints[session.hintsUsed])}`;
}

/** Тимлид пишет первым — всегда без LLM. index — какое это по счёту сообщение, чтобы не повторяться. */
export function nudge(profession: Profession, session: Session, afterError: boolean, index: number): string {
  if (afterError) {
    return 'Вижу, последний шаг не получился — это нормально. Напиши, что пытался(лась) сделать, или нажми «Подсказка», разберёмся вместе.';
  }
  const didSomething = session.events.some((e) => e.type !== 'chat_message' && e.type !== 'hint_used');
  if (!didSomething) {
    return 'Не знаешь, с чего начать? Это нормально в первый день. Напиши мне, что непонятно, или нажми «Подсказка» — подскажу первый шаг.';
  }
  const hintsLeft = profession.task.hints[session.level ?? 'novice'].length - session.hintsUsed;
  const variants = [
    'Как продвигается? Если застрял(а) — напиши, что видишь в последнем результате, или нажми «Подсказка».',
    hintsLeft > 0
      ? 'Ты уже неплохо продвинулся(лась). Если не хватает одного шага — у меня есть подсказка, жми «Подсказка».'
      : 'Подсказки ты уже все посмотрел(а). Напиши, что видишь и что думаешь, — помогу сформулировать.',
    'Если кажется, что ответ уже есть, — не бойся сдавать: вывод можно сформулировать коротко, одним предложением.',
  ];
  return variants[index % variants.length];
}

/** Фидбек, если LLM недоступен: по пунктам проверки, подсказкам и времени. */
export function feedback(session: Session): string {
  const items = session.result?.items ?? [];
  const ok = items.filter((i) => i.ok);
  const missed = items.filter((i) => !i.ok);
  const minutes = minutesSpent(session);

  const praise = ok.length
    ? `Хорошая работа — засчитано: ${quoted(ok.slice(0, 2).map((i) => i.label))}.`
    : 'Ты прошёл(ла) рабочую задачу от начала до конца — для первого дня это уже немало.';
  const growth = missed.length
    ? ` Не засчитано: ${quoted([missed[0].label])} — разбери этот пункт, в следующий раз получится.`
    : ' В следующий раз попробуй подкрепить вывод конкретной цифрой — так тимлиду проще принять решение.';
  const hints = session.hintsUsed >= 3
    ? ` Ты взял(а) ${session.hintsUsed} ${plural(session.hintsUsed, ['подсказку', 'подсказки', 'подсказок'])} — постепенно опирайся на них поменьше.`
    : session.hintsUsed === 0 && ok.length ? ' И всё без подсказок — отлично.' : '';
  const time = minutes && minutes <= 10 && session.result?.passed ? ` Уложился(лась) в ${minutes} мин — быстро.` : '';
  return `${praise}${growth}${hints}${time}`;
}
