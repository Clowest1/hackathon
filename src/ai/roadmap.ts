import type { Profession, Roadmap, Session } from '../types';
import { chatJson, withFallback } from './client';
import { roadmapMessages } from './prompts';
import { buildWeeks, describeSession, nextProfession } from './roadmapPlan';

function stringList(value: unknown, field: string, min: number, max: number): string[] {
  if (!Array.isArray(value)) throw new Error(`${field}: ожидался массив`);
  const list = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
  if (list.length < min) throw new Error(`${field}: нужно хотя бы ${min}`);
  return list.slice(0, max);
}

/** Проверяет текстовую часть роадмапа от LLM. Бросает ошибку, если не подходит. */
export function validateInsights(value: unknown): Pick<Roadmap, 'summary' | 'strengths' | 'gaps'> {
  if (!value || typeof value !== 'object') throw new Error('ожидался объект');
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== 'string' || !v.summary.trim()) throw new Error('summary: ожидалась строка');
  return {
    summary: v.summary.trim(),
    strengths: stringList(v.strengths, 'strengths', 1, 4),
    gaps: stringList(v.gaps, 'gaps', 1, 4),
  };
}

/**
 * Недели, ресурсы и «попробуй другую профессию» — детерминированно (roadmapPlan.ts).
 * LLM пишет только summary / strengths / gaps; если не ответил — их тоже собирает код.
 */
export async function generateRoadmap(profession: Profession, session: Session): Promise<Roadmap> {
  const weeks = buildWeeks(profession, session);
  const next = nextProfession(profession, session);
  const insights = await withFallback(
    'roadmap',
    (signal) => chatJson(roadmapMessages(profession, session, weeks, next), validateInsights, signal),
    () => describeSession(profession, session),
  );
  return { ...insights, weeks, ...(next ? { nextProfessionToTry: next } : {}) };
}
