import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRoadmap } from '../ai/roadmap';
import { buildSkills, planExtras, resourceLink } from '../ai/roadmapPlan';
import { Button, Card, Page } from '../components/ui';
import { getProfession, professionCards } from '../professions';
import { useSession } from '../state/SessionContext';
import type { ProfessionId } from '../types';

const DONE_KEY = 'rmit:roadmap-done';

/** Отмеченные задания плана — только удобство в этом браузере, поэтому localStorage с try/catch. */
function useDoneTasks(scope: string) {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${DONE_KEY}:${scope}`) ?? '{}');
    } catch {
      return {};
    }
  });
  const toggle = (task: string) =>
    setDone((d) => {
      const next = { ...d, [task]: !d[task] };
      try {
        localStorage.setItem(`${DONE_KEY}:${scope}`, JSON.stringify(next));
      } catch {
        // приватный режим — живём без сохранения
      }
      return next;
    });
  return { done, toggle };
}

function SkillBar({ level }: { level: number }) {
  return (
    <div className="flex gap-1" aria-label={`Уровень ${level} из 3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-8 rounded-full ${i <= level ? 'bg-indigo-600' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

/** Узел блок-схемы: кружок на вертикальной линии + карточка справа. */
function FlowNode({ marker, tone = 'default', children }: { marker: string; tone?: 'done' | 'default' | 'finish'; children: React.ReactNode }) {
  const circle = {
    done: 'bg-indigo-700 text-white',
    default: 'border-2 border-indigo-600 bg-white text-indigo-700',
    finish: 'bg-lavender text-indigo-800',
  }[tone];
  return (
    <li className="relative grid grid-cols-[40px_1fr] gap-4">
      <span className={`z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${circle}`}>{marker}</span>
      <div className="min-w-0 pb-6">{children}</div>
    </li>
  );
}

export default function Roadmap() {
  const navigate = useNavigate();
  const { session, sessionId, update, updateForSession, reset } = useSession();
  const profession = getProfession(session.professionId)!;
  const { done, toggle } = useDoneTasks(session.professionId ?? 'unknown');

  const requested = useRef(false);

  useEffect(() => {
    if (session.roadmap || requested.current) return;
    requested.current = true;
    const requestSessionId = sessionId;
    generateRoadmap(profession, session).then((roadmap) => updateForSession(requestSessionId, { roadmap }));
  }, [profession, session, sessionId, updateForSession]);

  const roadmap = session.roadmap;
  if (!roadmap) return <Page title="Собираем твой план…"><p className="text-slate-500">Смотрим, что ты делал(а) в задаче, — это займёт несколько секунд.</p></Page>;

  // Роадмап, сохранённый до появления этих полей, достраиваем на лету
  const skills = roadmap.skills ?? buildSkills(profession, session);
  const { milestone, afterPlan } = roadmap.milestone ? { milestone: roadmap.milestone, afterPlan: roadmap.afterPlan ?? [] } : planExtras(profession);
  const allTasks = roadmap.weeks.flatMap((w) => w.tasks);
  const doneCount = allTasks.filter((t) => done[t]).length;
  const totalHours = roadmap.weeks.reduce((sum, w) => sum + (w.hours ?? 0), 0);

  // Предлагаем только то, что уже можно пройти (старый сохранённый роадмап мог советовать «скоро»)
  const next = professionCards.find((p) => p.id === roadmap.nextProfessionToTry && p.available);

  const startOver = (professionId?: ProfessionId) => {
    reset();
    if (professionId) {
      update({ professionId });
      navigate('/quiz');
    } else {
      navigate('/choose');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">{profession.title} · персональный план</p>
      <h1 className="mt-1.5 text-3xl font-bold tracking-tight">Твой путь на 4 недели</h1>
      <p className="mt-3 text-slate-600">{roadmap.summary}</p>

      {/* Где ты сейчас */}
      <Card className="mt-8">
        <h2 className="font-semibold">Где ты сейчас</h2>
        <p className="mt-1 text-sm text-slate-500">Навыки профессии — по тому, что ты сделал(а) в задаче.</p>
        <ul className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {skills.map((s) => (
            <li key={s.name}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-800">{s.name}</span>
                <SkillBar level={s.level} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{s.note}</p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold text-emerald-700">Получается</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">{roadmap.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-amber-700">Стоит подтянуть</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">{roadmap.gaps.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
      </div>

      {/* Блок-схема пути */}
      <div className="mt-10 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">План по неделям</h2>
        <p className="text-sm text-slate-500">
          {totalHours > 0 && <>≈ {totalHours} ч за месяц · </>}выполнено {doneCount} из {allTasks.length}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${allTasks.length ? (doneCount / allTasks.length) * 100 : 0}%` }} />
      </div>

      <ol className="relative mt-6 before:absolute before:top-5 before:bottom-10 before:left-[19px] before:w-0.5 before:bg-indigo-200">
        <FlowNode marker="✓" tone="done">
          <div className="rounded-2xl bg-indigo-700 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-lavender">Старт · пробный день</p>
            <p className="mt-1 font-semibold">«{profession.task.title}»</p>
            <p className="mt-1 text-sm text-white/80">
              {session.result?.passed ? 'Задача решена' : 'Задача пройдена'} · {session.result?.score ?? 0} баллов · подсказок: {session.hintsUsed}
            </p>
          </div>
        </FlowNode>

        {roadmap.weeks.map((w) => (
          <FlowNode key={w.week} marker={String(w.week)}>
            <Card>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Неделя {w.week}</p>
                {w.hours && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">≈ {w.hours} ч</span>}
              </div>
              <h3 className="mt-1 text-lg font-semibold">{w.focus}</h3>
              {w.goal && <p className="mt-1 text-sm text-slate-600"><b className="font-medium text-slate-800">Цель:</b> {w.goal}</p>}

              <ul className="mt-3 space-y-1.5">
                {w.tasks.map((t) => (
                  <li key={t}>
                    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
                      <input type="checkbox" checked={!!done[t]} onChange={() => toggle(t)} className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600" />
                      <span className={done[t] ? 'text-slate-400 line-through' : 'text-slate-700'}>{t}</span>
                    </label>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {w.resources.map((r) => {
                  const href = resourceLink(r);
                  return href ? (
                    <a
                      key={r}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-indigo-200 bg-white px-2.5 py-0.5 text-xs font-medium text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
                    >
                      📘 {r} ↗
                    </a>
                  ) : (
                    <span key={r} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">📘 {r}</span>
                  );
                })}
              </div>

              {w.why && w.why.length > 0 && (
                <div className="mt-3 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
                  <b className="font-semibold">Почему это в плане:</b> {w.why.join(' · ')}
                </div>
              )}
            </Card>
          </FlowNode>
        ))}

        <FlowNode marker="🏁" tone="finish">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Через 4 недели</p>
            <p className="mt-1 font-semibold text-indigo-900">{milestone}</p>
            {afterPlan.length > 0 && (
              <>
                <p className="mt-3 text-sm font-medium text-slate-700">А дальше:</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-600">{afterPlan.map((a) => <li key={a}>{a}</li>)}</ul>
              </>
            )}
          </div>
        </FlowNode>
      </ol>

      {next && (
        <Card className="mt-2 border-indigo-200 bg-indigo-50">
          <p className="text-sm">
            Похоже, эта профессия — не совсем твоё, и это ценный вывод. Попробуй профессию «{next.title}»: {next.shortDescription.charAt(0).toLowerCase() + next.shortDescription.slice(1)}
          </p>
        </Card>
      )}

      {next ? (
        <>
          <Button className="mt-8 w-full" onClick={() => startOver(next.id)}>
            Попробовать «{next.title}»
          </Button>
          <button onClick={() => startOver()} className="mt-3 w-full text-sm font-medium text-indigo-600 hover:underline">
            Выбрать другую профессию
          </button>
        </>
      ) : (
        <Button className="mt-8 w-full" onClick={() => startOver()}>
          Попробовать другую профессию
        </Button>
      )}
    </div>
  );
}
