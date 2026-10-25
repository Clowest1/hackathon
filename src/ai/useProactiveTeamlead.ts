import { useEffect, useRef } from 'react';
import type { Profession, ProfessionId, Session } from '../types';
import { teamleadNudge } from './teamlead';

/** Через сколько бездействия тимлид пишет первым (SPEC 7: 2 мин; SPEC 6.2: тестировщику — 3 мин). */
export const IDLE_MS: Record<ProfessionId, number> = { analyst: 120_000, qa: 180_000, frontend: 120_000 };
export const MAX_NUDGES = 3;   // больше — уже навязчиво
const CHECK_EVERY_MS = 10_000;

export interface NudgeState {
  now: number;
  lastActivity: number;        // последний клик/клавиша/событие среды
  lastNudgeAt: number;         // когда тимлид в последний раз писал первым (0 — ещё не писал)
  nudges: number;
  idleMs: number;
  busy: boolean;               // ждём ответ тимлида
  finished: boolean;           // задача сдана
}

/** Чистое правило «пора ли писать первым»: одно сообщение на одну паузу, не после сдачи, не чаще MAX_NUDGES. */
export function shouldNudge(s: NudgeState): boolean {
  return (
    !s.finished &&
    !s.busy &&
    s.nudges < MAX_NUDGES &&
    s.now - s.lastActivity >= s.idleMs &&
    s.lastActivity > s.lastNudgeAt
  );
}

/**
 * Тимлид сам предлагает помощь, если пользователь долго ничего не делает.
 * ask — тот же обработчик, что и для обычных ответов тимлида (показывает «печатает…» и дописывает в чат).
 */
export function useProactiveTeamlead(profession: Profession, session: Session, ask: (reply: Promise<string>) => void, busy: boolean) {
  const latest = useRef({ profession, session, ask, busy });
  latest.current = { profession, session, ask, busy };

  const lastInteraction = useRef(Date.now());
  const lastNudgeAt = useRef(0);
  const nudges = useRef(0);

  useEffect(() => {
    const touch = () => (lastInteraction.current = Date.now());
    const events = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));

    const timer = setInterval(() => {
      const { profession, session, ask, busy } = latest.current;
      const lastEvent = session.events.at(-1);
      const lastActivity = Math.max(lastInteraction.current, lastEvent?.at ?? 0, session.startedAt ?? 0);
      const state: NudgeState = {
        now: Date.now(),
        lastActivity,
        lastNudgeAt: lastNudgeAt.current,
        nudges: nudges.current,
        idleMs: IDLE_MS[profession.id],
        busy,
        finished: !!session.finishedAt,
      };
      if (!shouldNudge(state)) return;

      lastNudgeAt.current = state.now;
      nudges.current += 1;
      const idleMinutes = Math.max(1, Math.round((state.now - lastActivity) / 60_000));
      ask(teamleadNudge(profession, session, idleMinutes, lastEvent?.type === 'error'));
    }, CHECK_EVERY_MS);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, touch));
    };
  }, []);
}
