'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const initialMessages: ChatMessage[] = [
  {
    role: 'assistant',
    content:
      'Oi! Posso ajudar a consultar presentes, alergias, responsaveis e medicamentos do evento. Ex: "quem esta com dose atrasada?"',
  },
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [isOpen, messages, loading]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = input.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.filter((message) => message.role !== 'assistant' || message.content !== initialMessages[0].content),
        }),
      });

      const data = (await response.json()) as { answer?: string; error?: string };

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: response.ok ? data.answer || 'Nao consegui responder agora.' : data.error || 'Erro ao chamar o assistente.',
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: 'Nao consegui conectar ao assistente. Verifique sua conexao e tente novamente.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[70] sm:right-6 md:bottom-5">
      {isOpen && (
        <div className="fixed inset-x-0 bottom-24 flex h-[58vh] max-h-[520px] min-h-[360px] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:inset-x-auto sm:right-6 sm:w-[420px] sm:rounded-2xl md:bottom-5">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500">
                <Bot size={22} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black">Assistente Face a Face</h2>
                <p className="truncate text-xs font-medium text-slate-300">Consulta rapida do evento</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Fechar chatbot"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    message.role === 'user'
                      ? 'bg-orange-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="ml-4 list-disc space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1">{children}</ol>,
                      strong: ({ children }) => <strong className="font-black">{children}</strong>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                  Pensando...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-slate-100 bg-white p-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60"
              placeholder="Pergunte sobre o evento..."
              maxLength={1200}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white shadow-lg shadow-orange-600/25 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Enviar mensagem"
              title="Enviar"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white shadow-2xl shadow-slate-900/30 transition hover:bg-orange-600 active:scale-95"
          aria-label="Abrir chatbot"
          title="Assistente"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
