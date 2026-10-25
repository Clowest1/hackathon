import { useNavigate } from 'react-router-dom';
import { useSession } from '../state/SessionContext';

export default function Landing() {
  const navigate = useNavigate();
  const { reset } = useSession();

  const start = () => {
    reset();
    navigate('/choose');
  };

  return (
    <section className="landing-screen">
      <div className="landing-content">
        <h1 className="rmit-wordmark" aria-label="RMIT">RMIT</h1>
        <p className="landing-tagline">Попробуй IT-профессию за 10 минут</p>
        <button className="start-link" onClick={start}>
          <span className="start-rule" aria-hidden="true" />
          <span>Начать</span>
          <span className="start-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}
