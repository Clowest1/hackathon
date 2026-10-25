import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnswerOption, EditorialPage, QuizQuestion } from '../components/ui';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';

export default function Reflection() {
  const navigate = useNavigate();
  const { session, update } = useSession();
  const profession = getProfession(session.professionId)!;
  const [answers, setAnswers] = useState<Record<string, string>>(session.reflection ?? {});
  const done = profession.reflectionQuestions.every((q) => answers[q.id]);

  return (
    <EditorialPage eyebrow="04 / рефлексия" title="Что ты заметил(а)?" subtitle="Ответы помогут собрать план с опорой на твой опыт.">
      <div className="question-list">
        {profession.reflectionQuestions.map((q, i) => (
          <QuizQuestion key={q.id} index={i} total={profession.reflectionQuestions.length} text={q.text}>
            {q.options.map((o) => (
              <AnswerOption key={o} selected={answers[q.id] === o} onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}>
                {o}
              </AnswerOption>
            ))}
          </QuizQuestion>
        ))}
      </div>
      <div>
        <button
          className="action-button page-action"
          disabled={!done}
          onClick={() => {
            update({ reflection: answers, roadmap: undefined });
            navigate('/roadmap');
          }}
        >
          Собрать план <span aria-hidden="true">→</span>
        </button>
      </div>
    </EditorialPage>
  );
}
