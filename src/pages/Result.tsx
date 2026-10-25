import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateFeedback } from '../ai/feedback';
import { Button, Card, Page } from '../components/ui';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';

function formatDuration(ms: number) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min} мин ${sec} с`;
}

export default function Result() {
  const navigate = useNavigate();
  const { session, update } = useSession();
  const result = session.result!;
  const profession = getProfession(session.professionId)!;
  const feedback = session.feedback;
  const requested = useRef(false);

  useEffect(() => {
    if (feedback || requested.current) return;
    requested.current = true;
    generateFeedback(profession, session).then((text) => update({ feedback: text }));
  }, [feedback, profession, session, update]);

  return (
    <Page
      title={result.passed ? 'Задача решена 🎉' : 'Почти получилось'}
      subtitle={result.passed ? `Так выглядит реальная работа: ${profession.title.toLowerCase()} решает такие задачи каждый день.` : 'Не всё сошлось, но рабочую задачу ты прошёл(ла) от начала до конца.'}
    >
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{result.score}</div>
          <div className="text-xs text-slate-500">баллов из 100</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold">{session.hintsUsed}</div>
          <div className="text-xs text-slate-500">подсказок</div>
        </Card>
        <Card className="text-center">
          <div className="text-2xl font-bold">{formatDuration((session.finishedAt ?? 0) - (session.startedAt ?? 0))}</div>
          <div className="text-xs text-slate-500">время</div>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-semibold">Проверка</h2>
        <ul className="space-y-2">
          {result.items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span className={item.ok ? 'text-emerald-600' : 'text-rose-500'}>{item.ok ? '✓' : '✗'}</span>
              {item.label}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">А</div>
          <div>
            <div className="text-sm font-semibold">Фидбек тимлида</div>
            <p className="mt-1 text-sm text-slate-700">{feedback ?? <span className="text-slate-400">Аня пишет фидбек…</span>}</p>
          </div>
        </div>
      </Card>

      <Button className="mt-8 w-full" onClick={() => navigate('/reflection')}>
        Дальше
      </Button>
    </Page>
  );
}
