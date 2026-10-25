import type { Profession, ProfessionCard, ProfessionId } from '../types';
import { analyst } from './analyst/config';
import { qa } from './qa/config';
import { frontend } from './frontend/config';

export const professions: Profession[] = [analyst, qa, frontend];

export const professionCards: ProfessionCard[] = [
  { id: 'analyst', title: analyst.title, shortDescription: analyst.shortDescription, available: true },
  {
    id: 'qa',
    title: 'Тестировщик',
    shortDescription: 'Ищет ошибки до того, как их найдут пользователи. Проверяет, ломает, пишет баг-репорты.',
    available: true,
  },
  { id: 'frontend', title: frontend.title, shortDescription: frontend.shortDescription, available: true },
];

export const getProfession = (id?: ProfessionId) => professions.find((p) => p.id === id);
