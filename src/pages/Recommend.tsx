import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { interestQuestions, recommend } from '../ai/recommend';
import { AnswerOption, EditorialPage, QuizQuestion } from '../components/ui';
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
    <EditorialPage eyebrow="01 / подбор" title="Подберём профессию" subtitle="Четыре вопроса о том, что тебе нравится. Правильных ответов нет.">
      <div className="question-list">
        {interestQuestions.map((q, i) => (
          <QuizQuestion key={q.id} index={i} total={interestQuestions.length} text={q.text}>
            {q.options.map((o, j) => (
              <AnswerOption key={o.label} selected={answers[q.id] === j} onClick={() => setAnswers((a) => ({ ...a, [q.id]: j }))}>
                {o.label}
              </AnswerOption>
            ))}
          </QuizQuestion>
        ))}
      </div>

      {result && (
        <section className="editorial-panel level-note">
          <p className="eyebrow">Тебе стоит попробовать</p>
          <div className="choice-list mt-4">
            {result.picks.map((pick, i) => (
              <button key={pick.card.id} onClick={() => start(pick.card.id)} className="choice-row">
                <span className="choice-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="choice-copy">
                  <span className="choice-title">{pick.card.title}</span>
                  <span className="choice-description">
                    {pick.reasons.length > 0
                      ? <>Почему: ты выбрал(а) {pick.reasons.map((r) => `«${r.charAt(0).toLowerCase() + r.slice(1)}»`).join(', ')}.</>
                      : result.comingSoon
                        ? <>Почему: из того, что уже можно попробовать, это ближе всего к профессии «{result.comingSoon.card.title}».</>
                        : <>Явной склонности по ответам не видно — начни с этой, пробная задача покажет лучше любых вопросов.</>}
                  </span>
                </span>
                <span className="choice-action">Попробовать <span aria-hidden="true">→</span></span>
              </button>
            ))}
          </div>
          {result.comingSoon && (
            <p className="level-description mt-4">
              По ответам тебе ещё ближе «{result.comingSoon.card.title}» — эта профессия скоро появится. А пока попробуй ту, что выше: навыки пересекаются.
            </p>
          )}
          <button onClick={() => navigate('/choose')} className="text-link mt-4">← Вернуться к выбору профессии</button>
        </section>
      )}
    </EditorialPage>
  );
}
