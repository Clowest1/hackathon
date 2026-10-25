import type { FC } from 'react';

export type Level = 'novice' | 'basic';
export type ProfessionId = 'analyst' | 'qa' | 'frontend';

export interface BaseQuestion {
  id: string;
  text: string;
  options: { label: string; score: number }[];
}

export interface CheckResult {
  passed: boolean;                 // задача решена
  items: { label: string; ok: boolean }[]; // что именно получилось/не получилось
  score: number;                   // 0..100
}

export interface EnvironmentProps {
  level: Level;
  onEvent: (e: SessionEvent) => void;          // логируем действия для фидбека и роадмапа
  onSubmit: (result: CheckResult, answer: unknown) => void;
}

export interface Profession {
  id: ProfessionId;
  title: string;
  shortDescription: string;
  baseQuestions: BaseQuestion[];
  levelThreshold: number;          // сумма баллов >= порога → 'basic'
  task: {
    title: string;
    summary: string;               // 1–2 предложения над рабочей средой: что случилось и что сделать
    briefing: string;              // первое сообщение тимлида: контекст и задача
    goal: string;                  // что считается успехом (для промпта тимлида)
    glossary: { term: string; explanation: string }[]; // термины, которые тимлид объясняет по ходу
    hints: Record<Level, string[]>; // подсказки по порядку, от общей к конкретной
    solutionForTeamlead: string;   // правильный ответ — только для промпта, НЕ показывать пользователю
  };
  reflectionQuestions: { id: string; text: string; options: string[] }[];
  Environment: FC<EnvironmentProps>;
}

/** Карточка на экране выбора. Для MVP готов только аналитик, остальные — «скоро». */
export interface ProfessionCard {
  id: ProfessionId;
  title: string;
  shortDescription: string;
  available: boolean;
}

export type SessionEvent =
  | { type: 'query_run' | 'css_changed' | 'bug_marked' | 'hint_used' | 'chat_message' | 'error'; at: number; payload?: unknown };

export interface ChatMessage {
  role: 'user' | 'teamlead';
  text: string;
}

export interface Session {
  professionId?: ProfessionId;
  level?: Level;
  baseAnswers: Record<string, number>;
  startedAt?: number;
  finishedAt?: number;
  events: SessionEvent[];
  hintsUsed: number;
  chat: ChatMessage[];
  result?: CheckResult;
  answer?: unknown;                // ответ пользователя при сдаче (для фидбека)
  feedback?: string;               // фидбек тимлида после сдачи (кешируем, чтобы не звать LLM повторно)
  reflection?: Record<string, string>;
  roadmap?: Roadmap;
}

export interface Roadmap {
  summary: string;                 // 2–3 предложения: как прошло, к чему склонность
  strengths: string[];
  gaps: string[];
  weeks: { week: number; focus: string; tasks: string[]; resources: string[] }[]; // 4 недели
  nextProfessionToTry?: ProfessionId;
}
