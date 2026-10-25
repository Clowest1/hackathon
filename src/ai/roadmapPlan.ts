// Детерминированная часть роадмапа: недели и ресурсы — курированные (LLM не выдумает несуществующий курс),
// персонализация — правилами по результатам проверки, подсказкам и рефлексии.
// LLM в roadmap.ts дописывает только summary / strengths / gaps; без LLM их даёт describeSession().
import { professionCards } from '../professions';
import type { Profession, ProfessionId, Roadmap, Session } from '../types';
import { minutesSpent, plural, quoted } from './fallbacks';

type WeekDraft = Omit<Roadmap['weeks'][number], 'week'>;

const TEMPLATES: Record<ProfessionId, WeekDraft[]> = {
  analyst: [
    {
      focus: 'Основы SQL: выбрать, отфильтровать, отсортировать',
      tasks: ['SELECT, WHERE, ORDER BY — пройди первые уроки тренажёра'],
      resources: ['SQLBolt (sqlbolt.com)', 'Stepik: «Интерактивный тренажёр по SQL»'],
    },
    {
      focus: 'Группировки и агрегаты',
      tasks: ['GROUP BY, COUNT, SUM, AVG', 'Посчитай долю внутри группы — как «доля неуспешных оплат» в задании'],
      resources: ['Kaggle Learn: Intro to SQL', 'Mode: SQL Tutorial'],
    },
    {
      focus: 'Поиск причин: срезы и сравнение периодов',
      tasks: ['Возьми любой показатель и сравни «до» и «после» по трём разным срезам', 'Построй график по дням в Google Таблицах'],
      resources: ['Справка Google Таблиц: сводные таблицы и диаграммы'],
    },
    {
      focus: 'Мини-исследование и вывод для бизнеса',
      tasks: ['Возьми открытый датасет и найди в нём одну закономерность', 'Оформи вывод: что случилось → какая цифра это показывает → что делать'],
      resources: ['Kaggle Datasets'],
    },
  ],
  qa: [
    {
      focus: 'Основы тестирования: что и как проверять',
      tasks: ['Позитивные и негативные проверки', 'Граничные значения и классы эквивалентности — на примере поля «количество»'],
      resources: ['Силлабус ISTQB Foundation Level (бесплатный)', 'Глоссарий ISTQB (glossary.istqb.org)'],
    },
    {
      focus: 'Баг-репорты и чек-листы',
      tasks: ['Напиши 5 баг-репортов по схеме: шаги → ожидаемый результат → фактический', 'Составь чек-лист для страницы оформления заказа'],
      resources: ['Документация Atlassian Jira: работа с задачами'],
    },
    {
      focus: 'Инструменты: DevTools и API',
      tasks: ['Найди ошибку через вкладки Console и Network в Chrome DevTools', 'Отправь несколько запросов к открытому API в Postman'],
      resources: ['Документация Chrome DevTools', 'Postman Learning Center'],
    },
    {
      focus: 'Практика на настоящем сайте',
      tasks: ['Протестируй форму регистрации любого сайта и оформи отчёт о найденных проблемах'],
      resources: ['MDN Web Docs: веб-формы'],
    },
  ],
  frontend: [
    {
      focus: 'HTML и CSS: основы',
      tasks: ['Структура страницы, блочная модель, отступы'],
      resources: ['MDN Web Docs: «Изучение веб-разработки»'],
    },
    {
      focus: 'Раскладка: Flexbox и Grid',
      tasks: ['Пройди игры по раскладке до конца'],
      resources: ['Flexbox Froggy', 'CSS Grid Garden'],
    },
    {
      focus: 'Вёрстка по макету',
      tasks: ['Сверстай карточку товара по картинке', 'Меняй стили прямо в браузере через DevTools и переноси в код'],
      resources: ['Документация Chrome DevTools: панель Elements'],
    },
    {
      focus: 'Первый JavaScript',
      tasks: ['Добавь на карточку кнопку, которая меняет её состояние'],
      resources: ['learn.javascript.ru'],
    },
  ],
};

/** Цель и примерная нагрузка каждой недели — по профессиям, в порядке недель. */
const WEEK_META: Record<ProfessionId, { goal: string; hours: number }[]> = {
  analyst: [
    { goal: 'Писать простые запросы: выбрать нужные строки и столбцы, отсортировать', hours: 5 },
    { goal: 'Считать итоги и доли по группам — как в задании про оплаты', hours: 6 },
    { goal: 'Самостоятельно искать, в каком срезе спряталась причина изменения', hours: 6 },
    { goal: 'Провести маленькое исследование и объяснить вывод команде', hours: 8 },
  ],
  qa: [
    { goal: 'Понимать, что проверять: позитивные, негативные и граничные случаи', hours: 5 },
    { goal: 'Писать баг-репорты, которые разработчик поймёт без вопросов', hours: 5 },
    { goal: 'Находить причину бага через DevTools и проверять API', hours: 6 },
    { goal: 'Самостоятельно протестировать настоящую форму и сдать отчёт', hours: 7 },
  ],
  frontend: [
    { goal: 'Понимать, из чего состоит страница: блоки, отступы, размеры', hours: 6 },
    { goal: 'Раскладывать элементы с Flexbox и Grid без подглядывания', hours: 6 },
    { goal: 'Верстать блок по макету и сверять его с дизайном', hours: 7 },
    { goal: 'Оживить вёрстку первым JavaScript', hours: 7 },
  ],
};

const EXTRAS: Record<ProfessionId, { milestone: string; afterPlan: string[] }> = {
  analyst: {
    milestone: 'Сможешь сам(а) найти, почему изменилась метрика, в настоящих данных — и объяснить это команде с цифрами.',
    afterPlan: ['Python и pandas для анализа данных', 'Портфолио: 2–3 исследования на Kaggle или GitHub', 'Стажировки и кейс-чемпионаты по аналитике'],
  },
  qa: {
    milestone: 'Сможешь протестировать форму или страницу и сдать отчёт о багах, который примут разработчики.',
    afterPlan: ['Тест-дизайн и тест-кейсы в TMS', 'Основы SQL и API-тестирования', 'Автотесты: Python + pytest или JavaScript + Playwright'],
  },
  frontend: {
    milestone: 'Сможешь сверстать блок по макету с нуля и поправить чужую вёрстку через DevTools.',
    afterPlan: ['JavaScript глубже: события, работа с DOM, fetch', 'React и первый собственный проект', 'Портфолио на GitHub Pages'],
  },
};

export function planExtras(profession: Profession) {
  return EXTRAS[profession.id];
}

/** Если профессия «не зашла» — что предложить дальше, по порядку предпочтения (берём первую доступную). */
const NEXT_PROFESSION: Record<ProfessionId, ProfessionId[]> = { analyst: ['qa', 'frontend'], qa: ['frontend', 'analyst'], frontend: ['analyst', 'qa'] };
const NEGATIVE_DAILY = ['Скорее нет', 'Нет'];

const MAX_TASKS = 4;

/** Персональное задание + причина, по которой оно попало в план (показываем в «Почему это в плане»). */
function addTask(week: WeekDraft, task: string, why: string, first = false) {
  if (week.tasks.length >= MAX_TASKS) return;
  if (first) week.tasks.unshift(task);
  else week.tasks.push(task);
  if (!week.why?.includes(why)) week.why = [...(week.why ?? []), why];
}

export function nextProfession(profession: Profession, session: Session): ProfessionId | undefined {
  if (!NEGATIVE_DAILY.includes(session.reflection?.daily ?? '')) return undefined;
  return NEXT_PROFESSION[profession.id].find((id) => professionCards.some((p) => p.id === id && p.available));
}

/** Недели плана: шаблон профессии + задания, привязанные к тому, что было в пробном дне. */
export function buildWeeks(profession: Profession, session: Session): Roadmap['weeks'] {
  const weeks: WeekDraft[] = TEMPLATES[profession.id].map((w, i) => ({ ...w, ...WEEK_META[profession.id][i], tasks: [...w.tasks], resources: [...w.resources] }));
  const hardestWhy = `В рефлексии сложнее всего было: «${session.reflection?.hardest ?? ''}»`;
  const missed = session.result?.items.filter((i) => !i.ok) ?? [];
  const hardest = (session.reflection?.hardest ?? '').toLowerCase();

  // Что не засчитала проверка — разобрать в первую же неделю
  missed.slice(0, 2).reverse().forEach((i) => addTask(weeks[0], `Разбери пункт задания, который не засчитан: ${quoted([i.label])}`, `В задании не засчитано: ${quoted([i.label])}`, true));

  // Аналитик: новичку конструктор показывал SQL — пусть повторит запрос руками; с базой — пусть усложнит свой
  const queries = session.events.filter((e) => e.type === 'query_run').length;
  if (profession.id === 'analyst' && queries > 0) {
    addTask(weeks[0], session.level === 'basic'
      ? `Перепиши свои запросы из задания (их было ${queries}) так, чтобы «до» и «после» 15 октября считались в одном запросе через CASE WHEN`
      : `Набери руками SQL одного из своих запросов (ты собрал(а) их ${queries}) — конструктор показывал его под кнопкой «Запустить»`,
      session.level === 'basic' ? `Ты написал(а) ${queries} SQL-запросов сам(а)` : `Ты собрал(а) ${queries} запросов в конструкторе — пора писать их руками`);
  }

  // То, что было сложнее всего по рефлексии
  if (hardest.includes('термин')) addTask(weeks[0], 'Заведи словарик терминов из задания и дополняй его каждый день', hardestWhy);
  if (hardest.includes('начать')) addTask(weeks[2], 'Составь себе чек-лист «с чего начинать задачу» и пользуйся им', hardestWhy);
  if (hardest.includes('срез')) addTask(weeks[2], 'Перед каждым срезом записывай гипотезу: что ожидаешь увидеть и почему', hardestWhy);
  if (hardest.includes('вывод')) addTask(weeks[3], 'Тренируй выводы: одно предложение + одна цифра, которая его доказывает', hardestWhy);
  if (hardest.includes('проверять')) addTask(weeks[0], 'Перед проверкой выписывай, что может сломаться: поля, кнопки, суммы, повторные действия', hardestWhy);
  if (hardest.includes('описать')) addTask(weeks[1], 'Опиши каждый найденный в задании баг заново: шаги → ожидаемый результат → фактический', hardestWhy);
  if (hardest.includes('воспроизвести')) addTask(weeks[1], 'Для каждого бага запиши минимальные шаги, после которых он повторяется', hardestWhy);
  if (hardest.includes('ожидаемого')) addTask(weeks[0], 'Прежде чем считать что-то багом, сформулируй ожидаемое поведение одной фразой', hardestWhy);

  if (session.hintsUsed >= 3) addTask(weeks[3], 'Пройди задание пробного дня ещё раз — теперь без подсказок', `В задании ты взял(а) ${session.hintsUsed} подсказки`);
  else if (session.result?.passed && session.hintsUsed <= 1) addTask(weeks[3], 'Возьми задачу посложнее: у тебя хорошо получилось почти без подсказок', 'Ты решил(а) задачу почти без подсказок');

  return weeks.map((w, i) => ({ week: i + 1, ...w }));
}

/** summary / strengths / gaps без LLM — по фактам сессии. */
export function describeSession(profession: Profession, session: Session): Pick<Roadmap, 'summary' | 'strengths' | 'gaps'> {
  const items = session.result?.items ?? [];
  const ok = items.filter((i) => i.ok);
  const missed = items.filter((i) => !i.ok);
  const minutes = minutesSpent(session);
  const hints = session.hintsUsed;
  const hintsText = hints ? `${hints} ${plural(hints, ['подсказку', 'подсказки', 'подсказок'])}` : 'без подсказок';
  const next = professionCards.find((p) => p.id === nextProfession(profession, session));

  const summary = [
    session.result?.passed
      ? `Ты решил(а) задачу «${profession.task.title}»${minutes ? ` за ${minutes} мин` : ''}${hints ? `, взяв ${hintsText}` : `${minutes ? ' и' : ''} без подсказок`}.`
      : `Задача «${profession.task.title}» пока не решена, но ты прошёл(ла) её от начала до конца — это настоящая работа джуна.`,
    next
      ? `Судя по ответам, каждый день такое делать не хочется — и это ценный вывод. Попробуй профессию «${next.title}».`
      : ['Да', 'Скорее да'].includes(session.reflection?.daily ?? '')
        ? 'Тебе понравилось — план ниже поможет продолжить.'
        : 'План ниже поможет закрепить то, что получилось.',
  ].join(' ');

  const strengths = ok.slice(0, 3).map((i) => `Засчитано: ${quoted([i.label])}`);
  if (hints === 0 && ok.length) strengths.push('Справился(лась) без подсказок');
  if (!strengths.length) strengths.push('Довёл(а) рабочую задачу до конца');

  const gaps = missed.slice(0, 3).map((i) => `Не засчитано: ${quoted([i.label])}`);
  if (hints >= 3) gaps.push('Пока много опоры на подсказки');
  if (session.reflection?.hardest) gaps.push(`Сложнее всего было: ${session.reflection.hardest.toLowerCase()}`);
  if (!gaps.length) gaps.push('Скорость: попробуй решить похожую задачу быстрее');

  return { summary, strengths: strengths.slice(0, 4), gaps: gaps.slice(0, 4) };
}

type Skill = NonNullable<Roadmap['skills']>[number];
const clamp = (n: number) => Math.max(0, Math.min(3, n));

/** Пункт проверки по началу названия (у тестировщика первым может стоять «Лишних отметок»). */
const item = (session: Session, startsWith: string) => session.result?.items.find((i) => i.label.startsWith(startsWith));
const okItem = (session: Session, startsWith: string) => !!item(session, startsWith)?.ok;

/** Навыки профессии 0..3 — считаются кодом по тому, что человек реально сделал в задании. */
export function buildSkills(profession: Profession, session: Session): Skill[] {
  const hints = session.hintsUsed;
  const passed = !!session.result?.passed;

  if (profession.id === 'analyst') {
    const runs = session.events.filter((e) => e.type === 'query_run');
    const answer = (session.answer ?? {}) as { conclusion?: string; groupedBy?: string[] };
    const groups = new Set(answer.groupedBy ?? []);
    const basic = session.level === 'basic';
    const conclusion = answer.conclusion?.trim() ?? '';
    // Цифра-аргумент — проценты, суммы, количества; дата «15 октября» не в счёт
    const hasNumber = /\d/.test(conclusion.replace(/\d{1,2}(\s*(октября|окт\.?)|\.10(\.\d{2,4})?)/gi, ''));
    return [
      {
        name: 'SQL-запросы',
        level: clamp(basic ? (runs.length ? 2 : 0) + (runs.length >= 3 ? 1 : 0) : runs.length ? 1 : 0),
        note: basic ? `Писал(а) SQL сам(а): ${runs.length} запросов` : `Собирал(а) запросы в конструкторе (${runs.length}) — читать SQL уже можешь, писать научишься`,
      },
      {
        name: 'Срезы и группировки',
        level: clamp((groups.size >= 3 ? 2 : groups.size ? 1 : 0) + (groups.has('payment_method') ? 1 : 0)),
        note: groups.size ? `Смотрел(а) данные в ${groups.size} ${plural(groups.size, ['срезе', 'срезах', 'срезах'])}${groups.has('payment_method') ? ', включая способ оплаты' : ''}` : 'Срезы пока не пробовал(а)',
      },
      {
        name: 'Поиск причины',
        level: passed ? (hints <= 1 ? 3 : 2) : runs.length ? 1 : 0,
        note: passed ? `Нашёл(ла) причину ${hints ? `с ${hints} ${plural(hints, ['подсказкой', 'подсказками', 'подсказками'])}` : 'без подсказок'}` : 'Причину пока не нашёл(ла)',
      },
      {
        name: 'Вывод для бизнеса',
        level: conclusion.length >= 10 ? (hasNumber ? 3 : 2) : conclusion ? 1 : 0,
        note: hasNumber ? 'Вывод подкреплён цифрой — так и надо' : conclusion.length >= 10 ? 'Вывод есть, но без цифры' : 'Вывода для тимлида не было',
      },
    ];
  }

  if (profession.id === 'qa') {
    const falseMarks = Number(item(session, 'Лишних отметок')?.label.match(/\d+/)?.[0] ?? 0);
    const calc = [okItem(session, 'Сумма корзины'), okItem(session, 'Доставка')].filter(Boolean).length;
    const bug = (startsWith: string, found: string, missed: string): Pick<Skill, 'level' | 'note'> =>
      okItem(session, startsWith) ? { level: 3, note: found } : { level: 0, note: missed };
    return [
      { name: 'Граничные значения', ...bug('Количество', 'Нашёл(ла): количество уходит в ноль и ниже', 'Пропущено: количество уходит в ноль и ниже') },
      { name: 'Проверка расчётов', level: [0, 2, 3][calc], note: `Найдено ${calc} из 2 ошибок в суммах` },
      { name: 'Формы и обязательные поля', ...bug('Кнопка «Оформить»', 'Нашёл(ла): заказ можно оформить без email', 'Пропущено: заказ можно оформить без email') },
      { name: 'Повторные действия', ...bug('Промокод', 'Нашёл(ла): промокод применяется повторно', 'Пропущено: промокод применяется повторно') },
      { name: 'Точность баг-репортов', level: falseMarks === 0 ? 3 : falseMarks <= 2 ? 2 : 0, note: falseMarks ? `Лишних отметок: ${falseMarks}` : 'Ни одной лишней отметки' },
    ];
  }

  const fix = (startsWith: string, done: string, todo: string): Pick<Skill, 'level' | 'note'> =>
    okItem(session, startsWith) ? { level: 3, note: done } : { level: 0, note: todo };
  return [
    { name: 'Сравнение с макетом', level: clamp((session.result?.items.filter((i) => i.ok).length ?? 0) - 1), note: `Исправлено ${session.result?.items.filter((i) => i.ok).length ?? 0} из 4 расхождений` },
    { name: 'Цвета и фон', ...fix('Кнопка', 'Цвет кнопки как в макете', 'Цвет кнопки остался не тем') },
    { name: 'Картинки и object-fit', ...fix('Картинка', 'Картинка не вылезает и не искажена', 'Картинка всё ещё вылезает или искажена') },
    { name: 'Типографика', ...fix('Цена', 'Цена жирная, как в макете', 'Жирность цены не поправлена') },
    { name: 'Отступы и блочная модель', ...fix('Внутри карточки', 'Отступы внутри карточки есть', 'Отступов внутри карточки нет') },
  ];
}
