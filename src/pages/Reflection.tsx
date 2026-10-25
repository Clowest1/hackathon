import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Page } from '../components/ui';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';

export default function Reflection() {
  const navigate = useNavigate();
  const { session, update } = useSession();
  const profession = getProfession(session.professionId)!;
  const [answers, setAnswers] = useState<Record<string, string>>(session.reflection ?? {});
  const done = profession.reflectionQuestions.every((q) => answers[q.id]);

  return (
    <Page title="Как тебе?" subtitle="Три вопроса — по ним соберём персональный план.">
      <div className="space-y-4">
        {profession.reflectionQuestions.map((q) => (
          <Card key={q.id}>
            <p className="font-medium">{q.text}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {q.options.map((o) => (
                <button
                  key={o}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    answers[q.id] === o ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Button
        className="mt-8 w-full"
        disabled={!done}
        onClick={() => {
          update({ reflection: answers, roadmap: undefined });
          navigate('/roadmap');
        }}
      >
        Построить роадмап
      </Button>
    </Page>
  );
}
