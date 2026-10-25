import { professionCards } from '../professions';
import type { Profession, ProfessionId, Roadmap, Session } from '../types';
import { chatJson, withFallback } from './client';
import * as fallbacks from './fallbacks';
import { roadmapMessages } from './prompts';

function stringList(value: unknown, field: string, min: number, max: number): string[] {
  if (!Array.isArray(value)) throw new Error(`${field}: ожидался массив`);
  const list = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '').map((v) => v.trim());
  if (list.length < min) throw new Error(`${field}: нужно хотя бы ${min}`);
  return list.slice(0, max);
}

/** Проверяет ответ модели по типу Roadmap и нормализует его. Бросает ошибку, если не подходит. */
export function validateRoadmap(value: unknown, currentId?: ProfessionId): Roadmap {
  if (!value || typeof value !== 'object') throw new Error('ожидался объект');
  const v = value as Record<string, unknown>;

  if (typeof v.summary !== 'string' || !v.summary.trim()) throw new Error('summary: ожидалась строка');
  if (!Array.isArray(v.weeks) || v.weeks.length < 4) throw new Error('weeks: нужно 4 недели');

  const weeks = v.weeks.slice(0, 4).map((w, i) => {
    if (!w || typeof w !== 'object') throw new Error(`weeks[${i}]: ожидался объект`);
    const week = w as Record<string, unknown>;
    if (typeof week.focus !== 'string' || !week.focus.trim()) throw new Error(`weeks[${i}].focus: ожидалась строка`);
    return {
      week: i + 1,
      focus: week.focus.trim(),
      tasks: stringList(week.tasks, `weeks[${i}].tasks`, 1, 5),
      resources: stringList(week.resources, `weeks[${i}].resources`, 1, 3),
    };
  });

  const next = professionCards.find((p) => p.id === v.nextProfessionToTry && p.id !== currentId)?.id;

  return {
    summary: v.summary.trim(),
    strengths: stringList(v.strengths, 'strengths', 1, 4),
    gaps: stringList(v.gaps, 'gaps', 1, 4),
    weeks,
    ...(next ? { nextProfessionToTry: next } : {}),
  };
}

export function generateRoadmap(profession: Profession, session: Session): Promise<Roadmap> {
  const others = professionCards.filter((p) => p.id !== profession.id);
  return withFallback(
    'roadmap',
    (signal) => chatJson(roadmapMessages(profession, session, others), (v) => validateRoadmap(v, profession.id), signal),
    () => fallbacks.roadmap(session),
  );
}
