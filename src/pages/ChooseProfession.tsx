import { useNavigate } from 'react-router-dom';
import { EditorialPage } from '../components/ui';
import { professionCards } from '../professions';
import { useSession } from '../state/SessionContext';

export default function ChooseProfession() {
  const navigate = useNavigate();
  const { update } = useSession();

  return (
    <EditorialPage eyebrow="01 / направление" title="Выбери профессию" subtitle="Один выбор — одна настоящая рабочая задача.">
      <div className="choice-list">
        {professionCards.map((p, i) => (
          <button
            key={p.id}
            disabled={!p.available}
            onClick={() => {
              update({ professionId: p.id, baseAnswers: {}, level: undefined });
              navigate('/quiz');
            }}
            className="choice-row"
          >
            <span className="choice-index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="choice-copy">
              <span className="choice-title">{p.title}</span>
              <span className="choice-description">{p.shortDescription}</span>
            </span>
            <span className="choice-action">{p.available ? 'Выбрать' : 'Скоро'} <span aria-hidden="true">→</span></span>
          </button>
        ))}
        <button onClick={() => navigate('/recommend')} className="choice-row choice-row-help">
          <span className="choice-index" aria-hidden="true">?</span>
          <span className="choice-copy">
            <span className="choice-title">Не знаю, что выбрать</span>
            <span className="choice-description">Ответь на 4 вопроса о своих интересах — подскажем, с чего начать.</span>
          </span>
          <span className="choice-action">Подобрать <span aria-hidden="true">→</span></span>
        </button>
      </div>
    </EditorialPage>
  );
}
