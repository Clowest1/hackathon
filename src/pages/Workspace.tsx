import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamleadChat } from '../components/TeamleadChat';
import * as fallbacks from '../ai/fallbacks';
import { getProfession } from '../professions';
import { useSession } from '../state/SessionContext';
import type { CheckResult, SessionEvent } from '../types';

export default function Workspace() {
  const navigate = useNavigate();
  const { session, update, updateForSession } = useSession();
  const profession = getProfession(session.professionId)!;
  const { Environment, task } = profession;
  const [chatOpen, setChatOpen] = useState(false);
  const [typing, setTyping] = useState(false);

  // Старт задачи: брифинг тимлида и таймер (один раз за сессию)
  useEffect(() => {
    if (!session.startedAt) {
      update({ startedAt: Date.now(), chat: [{ role: 'teamlead', text: task.briefing }] });
    }
  }, [session.startedAt, task.briefing, update]);

  const logEvent = (e: SessionEvent) => update((s) => ({ events: [...s.events, e] }));

  // TODO: заменить на ai/teamlead.ts
  const sendMessage = (text: string) => {
    const requestSessionId = session.sessionId;
    update((s) => ({
      chat: [...s.chat, { role: 'user', text }],
      events: [...s.events, { type: 'chat_message', at: Date.now(), payload: text }],
    }));
    setTyping(true);
    setTimeout(() => {
      updateForSession(requestSessionId, (s) => ({ chat: [...s.chat, { role: 'teamlead', text: fallbacks.teamleadReply(s) }] }));
      setTyping(false);
    }, 700);
  };

  const hint = () => {
    update((s) => ({
      chat: [...s.chat, { role: 'user', text: 'Дай подсказку' }, { role: 'teamlead', text: fallbacks.hintMessage(profession, s) }],
      hintsUsed: s.hintsUsed + 1,
      events: [...s.events, { type: 'hint_used', at: Date.now() }],
    }));
    setChatOpen(true);
  };

  const submit = (result: CheckResult, answer: unknown) => {
    update({ result, answer, finishedAt: Date.now() });
    navigate('/result');
  };

  return (
    <div className="mx-auto grid max-w-6xl min-w-0 gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="mb-5 min-w-0">
          <p className="text-sm font-medium text-indigo-600">{profession.title} · задача</p>
          <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
          <p className="mt-2 text-slate-600">
            С 15 октября выручка интернет-магазина упала на ~30%. В таблице <code className="rounded bg-slate-100 px-1">orders</code> —
            все заказы. Найди причину и объясни её тимлиду.
          </p>
        </div>
        <Environment level={session.level!} onEvent={logEvent} onSubmit={submit} />
      </div>

      {/* Десктоп: чат справа. Мобильный: выезжает снизу. */}
      <aside
        className={`fixed inset-x-0 bottom-0 z-30 h-[min(75dvh,680px)] max-h-[calc(100dvh-1rem)] rounded-t-2xl border border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition-transform duration-300 lg:sticky lg:top-24 lg:z-0 lg:h-[calc(100dvh-8rem)] lg:translate-y-0 lg:rounded-2xl lg:shadow-none ${
          chatOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <button onClick={() => setChatOpen(false)} className="absolute top-3 right-3 text-slate-400 lg:hidden" aria-label="Закрыть чат">
          ✕
        </button>
        <TeamleadChat messages={session.chat} onSend={sendMessage} onHint={hint} typing={typing} />
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
