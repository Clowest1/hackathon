import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${className}`}
      {...props}
    />
  );
}

export function Page({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-2 text-slate-600">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>{children}</div>;
}

/** Редакционная страница (выбор профессии, анкеты, рефлексия) — как в макете команды. */
export function EditorialPage({ eyebrow, title, subtitle, children }: { eyebrow?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="page-shell">
      <header className="page-heading">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </header>
      <div className="page-content">{children}</div>
    </div>
  );
}

/** Вопрос с вариантами ответа в редакционном стиле. */
export function QuizQuestion({ index, total, text, children }: { index: number; total: number; text: string; children: ReactNode }) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <section className="editorial-panel quiz-question">
      <p className="question-index">Вопрос {pad(index + 1)} <span>из {pad(total)}</span></p>
      <h2 className="question-title">{text}</h2>
      <div className="answer-list" role="radiogroup" aria-label={text}>{children}</div>
    </section>
  );
}

export function AnswerOption({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={`answer-option ${selected ? 'is-selected' : ''}`}>
      <span className="answer-marker" aria-hidden="true" />
      {children}
    </button>
  );
}
