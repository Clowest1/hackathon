import type { Profession, Session } from '../types';
import { chat, withFallback } from './client';
import * as fallbacks from './fallbacks';
import { feedbackMessages } from './prompts';

/** Фидбек тимлида после сдачи: похвала за конкретное действие + 1–2 точки роста. */
export function generateFeedback(profession: Profession, session: Session): Promise<string> {
  return withFallback(
    'feedback',
    (signal) => chat(feedbackMessages(profession, session), { signal, temperature: 0.6 }),
    () => fallbacks.feedback(session.result!, session),
  );
}
