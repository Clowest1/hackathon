import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Page } from '../components/ui';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';
import type { Level } from '../types';

const levelTitles: Record<Level, string> = { novice: 'Новичок', basic: 'Есть база' };
const otherLevel: Record<Level, Level> = { novice: 'basic', basic: 'novice' };

export default function BaseQuiz() {
  const navigate = useNavigate();
  const { session, update } = useSession();
  const profession = getProfession(session.professionId)!;
  const answers = session.baseAnswers;
  const done = profession.baseQuestions.every((q) => q.id in answers);
  const [override, setOverride] = useState<Level | null>(null);

  // Уровень считает код по баллам, без LLM; пользователь может выбрать другой вручную
  const total = Object.values(answers).reduce((a, b) => a + b, 0);
  const computed: Level = total >= profession.levelThreshold ? 'basic' : 'novice';
  const level = override ?? computed;

  const finish = () => {
    update({ level });
    navigate('/work');
  };

  return (
    <Page title="Немного о тебе" subtitle="Пара вопросов, чтобы подобрать уровень поддержки. Правильных ответов нет.">
      <div className="space-y-4">
        {profession.baseQuestions.map((q) => (
          <Card key={q.id}>
            <p className="font-medium">{q.text}</p>
            <div className="mt-3 flex flex-col gap-2">
              {q.options.map((o, i) => {
                const selected = answers[q.id] === o.score;
                return (
                  <button
                    key={i}
                    onClick={() => update((s) => ({ baseAnswers: { ...s.baseAnswers, [q.id]: o.score } }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selected ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {done && (
        <Card className="mt-6 border-indigo-200 bg-indigo-50/60">
          <p className="text-sm text-slate-600">
            Твой уровень: <b className="text-indigo-700">{levelTitles[level]}</b>
            {override && <span className="text-slate-500"> (выбран вручную)</span>}
          </p>
          {profession.levelDescriptions && <p className="mt-1 text-sm text-slate-700">{profession.levelDescriptions[level]}</p>}
          <button onClick={() => setOverride(otherLevel[level] === computed ? null : otherLevel[level])} className="mt-2 text-sm font-medium text-indigo-600 hover:underline">
            Хочу уровень «{levelTitles[otherLevel[level]]}»
          </button>
        </Card>
      )}

      <Button className="mt-6 w-full" disabled={!done} onClick={finish}>
        К задаче
      </Button>
    </Page>
  );
}
