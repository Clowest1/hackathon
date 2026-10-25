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

/** Если профессия «не зашла» — что предложить попробовать дальше. */
const NEXT_PROFESSION: Record<ProfessionId, ProfessionId> = { analyst: 'qa', qa: 'frontend', frontend: 'analyst' };
const NEGATIVE_DAILY = ['Скорее нет', 'Нет'];

const MAX_TASKS = 4;

function addTask(week: WeekDraft, task: string, first = false) {
  if (week.tasks.length >= MAX_TASKS) return;
  if (first) week.tasks.unshift(task);
  else week.tasks.push(task);
}

export function nextProfession(profession: Profession, session: Session): ProfessionId | undefined {
  return NEGATIVE_DAILY.includes(session.reflection?.daily ?? '') ? NEXT_PROFESSION[profession.id] : undefined;
}

/** Недели плана: шаблон профессии + задания, привязанные к тому, что было в пробном дне. */
export function buildWeeks(profession: Profession, session: Session): Roadmap['weeks'] {
  const weeks: WeekDraft[] = TEMPLATES[profession.id].map((w) => ({ ...w, tasks: [...w.tasks], resources: [...w.resources] }));
  const missed = session.result?.items.filter((i) => !i.ok) ?? [];
  const hardest = (session.reflection?.hardest ?? '').toLowerCase();

  // Что не засчитала проверка — разобрать в первую же неделю
  missed.slice(0, 2).reverse().forEach((i) => addTask(weeks[0], `Разбери пункт задания, который не засчитан: ${quoted([i.label])}`, true));

  // Аналитик: конструктор показывал SQL — пусть повторит свой запрос руками
  const queries = session.events.filter((e) => e.type === 'query_run').length;
  if (profession.id === 'analyst' && queries > 0) {
    addTask(weeks[0], `Набери руками SQL одного из своих запросов (ты собрал(а) их ${queries}) — конструктор показывал его под кнопкой «Запустить»`);
  }

  // То, что было сложнее всего по рефлексии
  if (hardest.includes('термин')) addTask(weeks[0], 'Заведи словарик терминов из задания и дополняй его каждый день');
  if (hardest.includes('начать')) addTask(weeks[2], 'Составь себе чек-лист «с чего начинать задачу» и пользуйся им');
  if (hardest.includes('срез')) addTask(weeks[2], 'Перед каждым срезом записывай гипотезу: что ожидаешь увидеть и почему');
  if (hardest.includes('вывод')) addTask(weeks[3], 'Тренируй выводы: одно предложение + одна цифра, которая его доказывает');

  if (session.hintsUsed >= 3) addTask(weeks[3], 'Пройди задание пробного дня ещё раз — теперь без подсказок');
  else if (session.result?.passed && session.hintsUsed <= 1) addTask(weeks[3], 'Возьми задачу посложнее: у тебя хорошо получилось почти без подсказок');

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
