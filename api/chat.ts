// Прокси к OpenAI-совместимому API: ключ живёт только на сервере.
// Используется Vercel-функцией (default export) и dev-middleware в vite.config.ts (proxyChat).
//
// Вход:  POST { messages: {role, content}[], temperature?: number }
// Выход: 200 { text: string } | 4xx/5xx { error: string }

export const config = { runtime: 'edge' };

const UPSTREAM_TIMEOUT_MS = 14_000; // чуть меньше клиентских 15 с, чтобы вернуть внятную ошибку

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProxyResult {
  status: number;
  body: { text: string } | { error: string };
}

function isValidBody(body: unknown): body is { messages: ChatMessage[]; temperature?: number } {
  if (!body || typeof body !== 'object') return false;
  const { messages } = body as { messages?: unknown };
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 60 &&
    messages.every(
      (m) => m && ['system', 'user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.length <= 20_000,
    )
  );
}

export async function proxyChat(body: unknown, env: Record<string, string | undefined> = process.env): Promise<ProxyResult> {
  const { BASE_URL, MODEL, API_KEY } = env;
  if (!BASE_URL || !MODEL || !API_KEY) {
    return { status: 500, body: { error: 'LLM не настроен: задайте BASE_URL, MODEL, API_KEY' } };
  }
  if (!isValidBody(body)) return { status: 400, body: { error: 'Некорректный запрос' } };

  try {
    const res = await fetch(`${BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: body.messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.7,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return { status: 502, body: { error: `LLM ответил ${res.status}: ${detail}` } };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) return { status: 502, body: { error: 'Пустой ответ LLM' } };
    return { status: 200, body: { text } };
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { status: timeout ? 504 : 502, body: { error: timeout ? 'LLM не ответил вовремя' : 'Ошибка запроса к LLM' } };
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Некорректный JSON' }, { status: 400 });
  }
  const { status, body: out } = await proxyChat(body);
  return Response.json(out, { status });
}
