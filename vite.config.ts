import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { proxyChat } from './api/chat';

/** В `npm run dev` отвечает на /api/chat тем же кодом, что и Vercel-функция. */
function devApi(env: Record<string, string>): Plugin {
  return {
    name: 'dev-api-chat',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });

        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return send(400, { error: 'Некорректный JSON' });
        }
        const result = await proxyChat(body, env);
        send(result.status, result.body);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // '' — читаем все переменные из .env*, а не только VITE_*. В браузер они не попадают.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), devApi(env)],
  };
});
