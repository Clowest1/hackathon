import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { SessionProvider, useSession } from './state/SessionContext';
import type { Session } from './types';
import Landing from './pages/Landing';
import ChooseProfession from './pages/ChooseProfession';
import BaseQuiz from './pages/BaseQuiz';
import Workspace from './pages/Workspace';
import Result from './pages/Result';
import Reflection from './pages/Reflection';
import Roadmap from './pages/Roadmap';

/** Не пускает на шаг, если предыдущий не пройден (например, после перезагрузки на середине). */
function Guard({ need, to, children }: { need: (s: Session) => boolean; to: string; children: ReactNode }) {
  const { session } = useSession();
  return need(session) ? children : <Navigate to={to} replace />;
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/choose" element={<ChooseProfession />} />
            <Route path="/quiz" element={<Guard need={(s) => !!s.professionId} to="/choose"><BaseQuiz /></Guard>} />
            <Route path="/work" element={<Guard need={(s) => !!s.level} to="/quiz"><Workspace /></Guard>} />
            <Route path="/result" element={<Guard need={(s) => !!s.result} to="/work"><Result /></Guard>} />
            <Route path="/reflection" element={<Guard need={(s) => !!s.result} to="/work"><Reflection /></Guard>} />
            <Route path="/roadmap" element={<Guard need={(s) => !!s.reflection} to="/reflection"><Roadmap /></Guard>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
