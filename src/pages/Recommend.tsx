import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interestQuestions, recommend } from '../ai/recommend';
import { Button, Card, Page } from '../components/ui';
import { useSession } from '../state/SessionContext';
import type { ProfessionId } from '../types';

export default function Recommend() {
  const navigate = useNavigate();
  const { update } = useSession();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const done = interestQuestions.every((q) => q.id in answers);
  const result = done ? recommend(answers) : null;

  const start = (professionId: ProfessionId) => {
    update({ professionId, baseAnswers: {}, level: undefined });
    navigate('/quiz');
  };

  return (
    <Page title="Подберём профессию" subtitle="Четыре вопроса о том, что тебе нравится. Правильных ответов нет.">
      <div className="space-y-4">
        {interestQuestions.map((q) => (
          <Card key={q.id}>
            <p className="font-medium">{q.text}</p>
            <div className="mt-3 flex flex-col gap-2">
              {q.options.map((o, i) => (
                <button
                  key={o.label}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    answers[q.id] === i ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {result && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Тебе стоит попробовать</h2>
          {result.picks.map((pick, i) => (
            <Card key={pick.card.id} className={i === 0 ? 'border-indigo-300 bg-indigo-50/60' : ''}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold">{pick.card.title}</h3>
                {result.picks.length > 1 && <span className="text-xs text-slate-500">{i === 0 ? 'подходит больше всего' : 'тоже подходит'}</span>}
              </div>
              <p className="mt-1 text-sm text-slate-600">{pick.card.shortDescription}</p>
              {pick.reasons.length > 0 ? (
                <p className="mt-3 text-sm text-slate-700">
                  <b>Почему:</b> ты выбрал(а) {pick.reasons.map((r) => `«${r.charAt(0).toLowerCase() + r.slice(1)}»`).join(', ')}.
                </p>
              ) : result.comingSoon ? (
                <p className="mt-3 text-sm text-slate-700">
                  <b>Почему:</b> из того, что уже можно попробовать, это ближе всего к профессии «{result.comingSoon.card.title}» — тоже работа со страницами сайта и вниманием к деталям.
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-700">Явной склонности по ответам не видно — начни с этой, пробная задача покажет лучше любых вопросов.</p>
              )}
              <Button className="mt-4 w-full sm:w-auto" onClick={() => start(pick.card.id)}>
                Попробовать «{pick.card.title}»
              </Button>
            </Card>
          ))}
          {result.comingSoon && (
            <p className="text-sm text-slate-500">
              По ответам тебе ещё ближе «{result.comingSoon.card.title}» — эта профессия скоро появится. А пока попробуй ту, что выше: навыки пересекаются.
            </p>
          )}
          <button onClick={() => navigate('/choose')} className="text-sm font-medium text-indigo-600 hover:underline">
            ← Вернуться к выбору профессии
          </button>
        </div>
      )}
    </Page>
  );
}
