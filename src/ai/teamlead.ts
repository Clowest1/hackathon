import type { Profession, Session } from '../types';
import { chat, withFallback } from './client';
import * as fallbacks from './fallbacks';
import { hintMessages, teamleadMessages } from './prompts';

/** Реплика тимлида на сообщение пользователя. session уже содержит это сообщение в chat. */
export function teamleadReply(profession: Profession, session: Session): Promise<string> {
  return withFallback(
    'teamlead',
    (signal) => chat(teamleadMessages(profession, session), { signal }),
    () => fallbacks.teamleadReply(session),
  );
}

/** Следующая подсказка из hints[level] своими словами. session — до увеличения hintsUsed. */
export function teamleadHint(profession: Profession, session: Session): Promise<string> {
  return withFallback(
    'hint',
    (signal) => chat(hintMessages(profession, session), { signal, temperature: 0.5 }),
    () => fallbacks.hintMessage(profession, session),
  );
}
