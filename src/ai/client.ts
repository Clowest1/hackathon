// Все вызовы LLM идут через /api/chat. Любая ошибка → исключение; откат на фолбэк — в withFallback.

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const LLM_TIMEOUT_MS = 15_000;

export async function chat(messages: LlmMessage[], opts: { signal?: AbortSignal; temperature?: number } = {}): Promise<string> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature: opts.temperature }),
    signal: opts.signal,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown };
  if (!res.ok || typeof data.text !== 'string') {
    throw new Error(typeof data.error === 'string' ? data.error : `HTTP ${res.status}`);
  }
  return data.text.trim();
}

/**
 * Запускает task с общим бюджетом времени LLM_TIMEOUT_MS (включая повторы внутри task).
 * При любой ошибке, таймауте или невалидном ответе возвращает fallback() — демо не ломается.
 */
export async function withFallback<T>(label: string, task: (signal: AbortSignal) => Promise<T>, fallback: () => T): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    return await task(controller.signal);
  } catch (e) {
    console.warn(`[ai:${label}] фолбэк:`, e instanceof Error ? e.message : e);
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}

/** Достаёт JSON-объект из ответа модели (модели любят оборачивать его в ```json ... ```). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('В ответе нет JSON');
  return JSON.parse(candidate.slice(start, end + 1));
}

/** JSON-запрос: парсим и валидируем, при неудаче — один повтор, затем исключение (→ фолбэк). */
export async function chatJson<T>(messages: LlmMessage[], validate: (v: unknown) => T, signal: AbortSignal): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await chat(messages, { signal, temperature: 0.4 });
    try {
      return validate(extractJson(text));
    } catch (e) {
      lastError = e;
      messages = [
        ...messages,
        { role: 'assistant', content: text },
        { role: 'user', content: `Ответ не прошёл проверку (${e instanceof Error ? e.message : 'ошибка'}). Верни только корректный JSON по схеме, без пояснений.` },
      ];
    }
  }
  throw lastError;
}
