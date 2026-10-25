import { Link, Outlet, useLocation } from 'react-router-dom';

export const steps = [
  { path: '/choose', label: 'Профессия' },
  { path: '/quiz', label: 'База' },
  { path: '/work', label: 'Задача' },
  { path: '/result', label: 'Результат' },
  { path: '/reflection', label: 'Рефлексия' },
  { path: '/roadmap', label: 'Роадмап' },
];

export function Layout() {
  const { pathname } = useLocation();
  const current = steps.findIndex((s) => s.path === pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
          <Link to="/" className="shrink-0 text-lg font-bold tracking-tight">
            Пробный <span className="text-indigo-600">день</span>
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
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
