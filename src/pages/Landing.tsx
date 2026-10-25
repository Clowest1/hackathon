import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { useSession } from '../state/SessionContext';

export default function Landing() {
  const navigate = useNavigate();
  const { reset } = useSession();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">30 минут · без регистрации</span>
      <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
        Попробуй IT-профессию <span className="text-indigo-600">по-настоящему</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-600">
        Роадмапы говорят, что учить. Мы даём попробовать: ИИ-тимлид выдаст рабочую задачу, поможет её решить —
        и только потом построим твой путь.
      </p>
      <Button
        className="mt-10 px-10 py-4 text-lg"
        onClick={() => {
          reset();
          navigate('/choose');
        }}
      >
        Попробовать
      </Button>
    </div>
  );
}
