import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onHint: () => void;
  typing?: boolean;
}

export function TeamleadChat({ messages, onSend, onHint, typing }: Props) {
  const [text, setText] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typing]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700">А</div>
        <div>
          <div className="font-semibold leading-tight">Аня</div>
          <div className="text-xs text-slate-500">тимлид · онлайн</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === 'user' ? 'rounded-br-sm bg-indigo-600 text-white' : 'rounded-bl-sm bg-slate-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && <div className="text-xs text-slate-400">Аня печатает…</div>}
        <div ref={bottom} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <button
          onClick={onHint}
          disabled={typing}
          className="mb-2 w-full rounded-lg border border-indigo-200 bg-indigo-50 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50"
        >
          💡 Подсказка
        </button>
        <form onSubmit={send} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Спросить тимлида…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <button className="rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white hover:bg-indigo-700">→</button>
        </form>
      </div>
    </div>
  );
}
