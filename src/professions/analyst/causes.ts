export const causeOptions = [
  { id: 'region', label: 'Просели продажи в одном из регионов' },
  { id: 'platform', label: 'Сломалось мобильное приложение' },
  { id: 'sbp_failed', label: 'Перестали проходить оплаты через СБП' },
  { id: 'seasonal', label: 'Обычный сезонный спад' },
  { id: 'avg_check', label: 'Покупатели стали брать более дешёвые товары' },
] as const;

export const CORRECT_CAUSE = 'sbp_failed';
