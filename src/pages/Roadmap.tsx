import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRoadmap } from '../ai/roadmap';
import { Button, Card, Page } from '../components/ui';
import { getProfession, professionCards } from '../professions';
import { useSession } from '../state/SessionContext';
import type { ProfessionId } from '../types';

export default function Roadmap() {
  const navigate = useNavigate();
  const { session, sessionId, update, updateForSession, reset } = useSession();

  const requested = useRef(false);

  useEffect(() => {
    if (session.roadmap || requested.current) return;
    requested.current = true;
    const requestSessionId = sessionId;
    generateRoadmap(getProfession(session.professionId)!, session).then((roadmap) => updateForSession(requestSessionId, { roadmap }));
  }, [session, sessionId, updateForSession]);

  const roadmap = session.roadmap;
  if (!roadmap) return <Page title="Собираем твой план…"><p className="text-slate-500">Смотрим, что ты делал(а) в задаче, — это займёт несколько секунд.</p></Page>;

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
    <Page title="Твой план на 4 недели" subtitle={roadmap.summary}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold text-emerald-700">Получается</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">{roadmap.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-amber-700">Стоит подтянуть</h2>
          <ul className="list-inside list-disc space-y-1 text-sm">{roadmap.gaps.map((s) => <li key={s}>{s}</li>)}</ul>
        </Card>
      </div>

      <ol className="mt-6 space-y-4">
        {roadmap.weeks.map((w) => (
          <li key={w.week}>
            <Card>
              <div className="text-xs font-medium uppercase tracking-wide text-indigo-600">Неделя {w.week}</div>
              <div className="mt-1 font-semibold">{w.focus}</div>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">{w.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="mt-3 text-xs text-slate-500">Ресурсы: {w.resources.join(', ')}</div>
            </Card>
          </li>
        ))}
      </ol>

      {next && (
        <Card className="mt-6 border-indigo-200 bg-indigo-50">
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
    </Page>
  );
}
