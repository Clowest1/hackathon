import type { Profession, ProfessionCard, ProfessionId } from '../types';
import { analyst } from './analyst/config';

export const professions: Profession[] = [analyst];

export const professionCards: ProfessionCard[] = [
  { id: 'analyst', title: analyst.title, shortDescription: analyst.shortDescription, available: true },
  {
    id: 'qa',
    title: 'Тестировщик',
    shortDescription: 'Ищет ошибки до того, как их найдут пользователи. Проверяет, ломает, пишет баг-репорты.',
    available: false,
  },
  {
    id: 'frontend',
    title: 'Фронтенд-разработчик',
    shortDescription: 'Делает то, что пользователь видит в браузере: вёрстка, интерфейсы, интерактив.',
    available: false,
  },
];

export const getProfession = (id?: ProfessionId) => professions.find((p) => p.id === id);
