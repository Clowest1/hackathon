import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '../types';

const STORAGE_KEY = 'probny-den:session';

const newSessionId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const emptySession = (): Session => ({
  sessionId: newSessionId(),
  baseAnswers: {},
  events: [],
  hintsUsed: 0,
  chat: [],
});

function load(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...emptySession(), ...JSON.parse(raw) } : emptySession();
  } catch {
    return emptySession();
  }
}

interface SessionContextValue {
  session: Session;
  update: (patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void;
  updateForSession: (sessionId: string, patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // приватный режим / нет места — живём без сохранения
    }
  }, [session]);

  const update = useCallback<SessionContextValue['update']>((patch) => {
    setSession((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const updateForSession = useCallback<SessionContextValue['updateForSession']>((sessionId, patch) => {
    setSession((s) => s.sessionId !== sessionId ? s : ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  }, []);

  const reset = useCallback(() => setSession(emptySession()), []);

  const value = useMemo(() => ({ session, update, updateForSession, reset }), [session, update, updateForSession, reset]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
