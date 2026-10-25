import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamleadChat } from '../components/TeamleadChat';
import { teamleadHint, teamleadReply } from '../ai/teamlead';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';
import type { CheckResult, SessionEvent } from '../types';

export default function Workspace() {
  const navigate = useNavigate();
  const { session, update } = useSession();
  const profession = getProfession(session.professionId)!;
  const { Environment, task } = profession;
  const [chatOpen, setChatOpen] = useState(false);
  const [pending, setPending] = useState(0); // сколько ответов тимлида ещё ждём

  // Старт задачи: брифинг тимлида и таймер (один раз за сессию)
  useEffect(() => {
    if (!session.startedAt) {
      update({ startedAt: Date.now(), chat: [{ role: 'teamlead', text: task.briefing }] });
    }
  }, [session.startedAt, task.briefing, update]);

  const logEvent = (e: SessionEvent) => update((s) => ({ events: [...s.events, e] }));

  // Ответ тимлида приходит асинхронно (LLM или фолбэк) — дописываем его к актуальному чату.
  const askTeamlead = async (request: Promise<string>) => {
    setPending((n) => n + 1);
    try {
      const text = await request;
      update((s) => ({ chat: [...s.chat, { role: 'teamlead', text }] }));
    } finally {
      setPending((n) => n - 1);
    }
  };

  const sendMessage = (text: string) => {
    const now = Date.now();
    const next = {
      ...session,
      chat: [...session.chat, { role: 'user' as const, text }],
      events: [...session.events, { type: 'chat_message' as const, at: now, payload: text }],
    };
    update({ chat: next.chat, events: next.events });
    void askTeamlead(teamleadReply(profession, next));
  };

  const hint = () => {
    const before = { ...session, chat: [...session.chat, { role: 'user' as const, text: 'Дай подсказку' }] };
    update((s) => ({
      chat: [...s.chat, { role: 'user', text: 'Дай подсказку' }],
      hintsUsed: s.hintsUsed + 1,
      events: [...s.events, { type: 'hint_used', at: Date.now() }],
    }));
    setChatOpen(true);
    void askTeamlead(teamleadHint(profession, before));
  };

  const submit = (result: CheckResult, answer: unknown) => {
    update({ result, answer, finishedAt: Date.now(), feedback: undefined, roadmap: undefined });
    navigate('/result');
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0">
        <div className="mb-5">
          <p className="text-sm font-medium text-indigo-600">{profession.title} · задача</p>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <p className="mt-2 text-slate-600">{task.summary}</p>
        </div>
        <Environment level={session.level!} onEvent={logEvent} onSubmit={submit} />
      </div>

      {/* Десктоп: чат справа. Мобильный: выезжает снизу. */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-30 h-[75dvh] rounded-t-2xl border border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-24 lg:z-0 lg:h-[calc(100dvh-8rem)] lg:translate-y-0 lg:rounded-2xl lg:shadow-none ${
          chatOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button onClick={() => setChatOpen(false)} className="absolute top-3 right-3 text-slate-400 lg:hidden" aria-label="Закрыть чат">
          ✕
        </button>
        <TeamleadChat messages={session.chat} onSend={sendMessage} onHint={hint} typing={pending > 0} />
      </aside>

      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-4 bottom-4 z-20 rounded-full bg-indigo-600 px-5 py-3 font-medium text-white shadow-lg lg:hidden"
        >
          💬 Чат с тимлидом
        </button>
      )}
    </div>
  );
}
