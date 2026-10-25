import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

const steps = [
  { path: '/choose', label: 'Профессия' },
  { path: '/quiz', label: 'База' },
  { path: '/work', label: 'Задача' },
  { path: '/result', label: 'Результат' },
  { path: '/reflection', label: 'Рефлексия' },
  { path: '/roadmap', label: 'Роадмап' },
];

export function Layout() {
  const { pathname } = useLocation();
  const current = steps.findIndex((s) => s.path === (pathname === '/recommend' ? '/choose' : pathname));

  // Роутер не сбрасывает прокрутку: без этого новый экран открывается там, где был скролл на прошлом
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh flex-col">
      {pathname !== '/' && (
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link to="/" className="shrink-0 text-[28px]" aria-label="RMIT — на главную">
            <span className="rmit-mark">RMIT</span>
          </Link>
          {current >= 0 && (
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${((current + 1) / steps.length) * 100}%` }}
                />
              </div>
              <div className="mt-1 hidden justify-between text-xs text-slate-500 sm:flex">
                {steps.map((s, i) => (
                  <span key={s.path} className={i <= current ? 'font-medium text-indigo-600' : ''}>{s.label}</span>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500 sm:hidden">
                Шаг {current + 1} из {steps.length}: {steps[current].label}
              </div>
            </div>
          )}
        </div>
      </header>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
