import type { Profession, Session } from '../types';
import { chat, withFallback } from './client';
import * as fallbacks from './fallbacks';
import { teamleadMessages } from './prompts';

/** Небольшая пауза перед ответами без LLM — чтобы «Аня печатает…» успело мелькнуть и ответ не выглядел роботом. */
const TYPING_MS = 600;
const typed = (text: string) => new Promise<string>((resolve) => setTimeout(() => resolve(text), TYPING_MS));

/** Реплика тимлида на сообщение пользователя (LLM). session уже содержит это сообщение в chat. */
export function teamleadReply(profession: Profession, session: Session): Promise<string> {
  return withFallback(
    'teamlead',
    (signal) => chat(teamleadMessages(profession, session), { signal }),
    () => fallbacks.teamleadReply(profession, session),
  );
}

/** Следующая подсказка из hints[level] — без LLM: тексты уже написаны, модель их только пересказывала бы. */
export function teamleadHint(profession: Profession, session: Session): Promise<string> {
  return typed(fallbacks.hintMessage(profession, session));
}

/** Тимлид пишет первым, когда пользователь давно ничего не делает — без LLM, по шаблонам. */
export function teamleadNudge(profession: Profession, session: Session, afterError: boolean, index: number): Promise<string> {
  return typed(fallbacks.nudge(profession, session, afterError, index));
}

/** «дай подсказку», «можно подсказку?», «подсказка» в чате — то же, что кнопка «Подсказка». */
export function isHintRequest(text: string): boolean {
  return /^\s*(а\s+)?((дай(те)?|можно|нужна|хочу|давай)\s+)?(ещё\s+|еще\s+)?подсказк[уаи]?\s*[?!.]*\s*$/i.test(text);
}
