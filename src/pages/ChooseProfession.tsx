import { useNavigate } from 'react-router-dom';
import { Page } from '../components/ui';
import { professionCards } from '../professions';
import { useSession } from '../state/SessionContext';

export default function ChooseProfession() {
  const navigate = useNavigate();
  const { update } = useSession();

  return (
    <Page title="Какую профессию попробуешь?" subtitle="Выбери одну — получишь настоящую задачу джуна.">
      <div className="grid gap-4 sm:grid-cols-3">
        {professionCards.map((p) => (
          <button
            key={p.id}
            disabled={!p.available}
            onClick={() => {
              update({ professionId: p.id, baseAnswers: {}, level: undefined });
              navigate('/quiz');
            }}
            className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left transition enabled:hover:-translate-y-0.5 enabled:hover:border-indigo-400 enabled:hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {!p.available && (
              <span className="absolute top-3 right-3 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">скоро</span>
            )}
            <span className="text-lg font-semibold">{p.title}</span>
            <span className="mt-2 text-sm text-slate-600">{p.shortDescription}</span>
            {p.available && <span className="mt-4 text-sm font-medium text-indigo-600">Попробовать →</span>}
          </button>
        ))}
      </div>
      <button
        onClick={() => navigate('/recommend')}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-left transition hover:border-indigo-400 hover:bg-white"
      >
        <span>
          <span className="block font-semibold">Не знаю, что выбрать</span>
          <span className="mt-1 block text-sm text-slate-600">Ответь на 4 вопроса о своих интересах — подскажем, с чего начать.</span>
        </span>
        <span className="text-sm font-medium text-indigo-600">Подобрать →</span>
      </button>
    </Page>
  );
}
