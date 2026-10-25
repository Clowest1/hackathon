import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnswerOption, EditorialPage, QuizQuestion } from '../components/ui';
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
    <EditorialPage eyebrow="02 / уровень" title="С чего начнём?" subtitle="Несколько вопросов помогут настроить уровень поддержки.">
      <div className="question-list">
        {profession.baseQuestions.map((q, i) => (
          <QuizQuestion key={q.id} index={i} total={profession.baseQuestions.length} text={q.text}>
            {q.options.map((o, j) => (
              <AnswerOption key={j} selected={answers[q.id] === o.score} onClick={() => update((s) => ({ baseAnswers: { ...s.baseAnswers, [q.id]: o.score } }))}>
                {o.label}
              </AnswerOption>
            ))}
          </QuizQuestion>
        ))}
      </div>

      {done && (
        <section className="editorial-panel level-note">
          <p className="eyebrow">Поддержка для тебя</p>
          <p className="level-result">
            {levelTitles[level]}
            {override && <span className="level-manual"> · выбран вручную</span>}
          </p>
          {profession.levelDescriptions && <p className="level-description">{profession.levelDescriptions[level]}</p>}
          <button onClick={() => setOverride(otherLevel[level] === computed ? null : otherLevel[level])} className="text-link">
            Хочу уровень «{levelTitles[otherLevel[level]]}»
          </button>
        </section>
      )}

      <div>
        <button className="action-button page-action" disabled={!done} onClick={finish}>
          К задаче <span aria-hidden="true">→</span>
        </button>
      </div>
    </EditorialPage>
  );
}
