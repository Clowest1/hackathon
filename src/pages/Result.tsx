import { useNavigate } from 'react-router-dom';
import * as fallbacks from '../ai/fallbacks';
import { Button, Card, Page } from '../components/ui';
import { useSession } from '../state/SessionContext';

function formatDuration(ms: number) {
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min} мин ${sec} с`;
}

export default function Result() {
  const navigate = useNavigate();
  const { session } = useSession();
  const result = session.result!;
  // TODO: заменить на ai/feedback.ts
  const feedback = fallbacks.feedback(result, session);

  return (
    <Page
      title={result.passed ? 'Задача решена 🎉' : 'Почти получилось'}
      subtitle={result.passed ? 'Ты нашёл(ла) причину — так выглядит реальная работа аналитика.' : 'Причина оказалась в другом, но путь ты прошёл(ла).'}
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
            <p className="mt-1 text-sm text-slate-700">{feedback}</p>
          </div>
        </div>
      </Card>

      <Button className="mt-8 w-full" onClick={() => navigate('/reflection')}>
        Дальше
      </Button>
    </Page>
  );
}
