import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, Info, ExternalLink, Building2 } from 'lucide-react';
import { aiPost, isUserFacingAiError } from '../lib/aiFetch';
import {
  ASK_CENTRE_EVENT,
  AskCentre,
  AskCitation,
  AskResponse,
  CENTRE_QUESTIONS,
  GENERAL_QUESTIONS,
  citationHeading,
  showSourceNote,
} from '../lib/askCareQ';
import { AiFallbackNote, AiMode, SimTag } from './ui/CareUI';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  aiMode?: AiMode;
  citations?: AskCitation[];
  notice?: string;
}

const NO_INFO = "I don't have that information; please contact the centre or use Help.";
const BASIC_SEARCH_NOTICE = 'AI search limited right now: basic search used';
const now = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** One source under an answer: a handbook quote card, or "From your application · Simulated". */
const QuoteCard: React.FC<{ c: AskCitation }> = ({ c }) => (
  <div className="rounded-xl border border-[#E7E4DA] bg-[#FAF9F4] px-2.5 py-2 space-y-1">
    <p className="text-[10px] font-semibold text-[#5B6B66] flex items-center gap-1 flex-wrap">
      <span>{citationHeading(c)}</span>
      {c.kind === 'application' && c.simulated && (
        <>
          <span aria-hidden>·</span>
          <SimTag />
        </>
      )}
    </p>
    {c.kind === 'document' && <p className="text-[11px] text-[#173F42] italic leading-snug">“{c.quote}”</p>}
    {c.label && <p className="text-[10px] font-medium text-[#8A6A3B]">{c.label}</p>}
    {(c.sourceUrl || showSourceNote(c)) && (
      <p className="text-[10px] text-[#7A8A84] flex items-center gap-1 flex-wrap">
        {c.sourceUrl && (
          <a
            href={c.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold text-[#0B4A52] hover:underline"
          >
            Source <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
        {showSourceNote(c) && <span>{c.sourceNote}</span>}
      </p>
    )}
  </div>
);

export const AskCareQAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // The centre the questions are about (null: general questions, answered from provincial + Help sources)
  const [centre, setCentre] = useState<AskCentre | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I'm Ask CareQ. I answer from CareQ's Help pages, Ontario's licensing manual and centres' published handbooks, and I show where each answer comes from.",
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // "Ask about this centre" buttons (Find and Track cards) open the panel scoped to that centre
  useEffect(() => {
    const onAsk = (e: Event) => {
      const detail = (e as CustomEvent<AskCentre>).detail;
      if (!detail?.centreId) return;
      setCentre(detail);
      setIsOpen(true);
      setMessages((prev) => [
        ...prev,
        {
          id: `ctx-${Date.now()}`,
          sender: 'assistant',
          text: `Now answering about ${detail.centreName}, from its operator's published handbook.`,
          timestamp: now(),
        },
      ]);
    };
    window.addEventListener(ASK_CENTRE_EVENT, onAsk);
    return () => window.removeEventListener(ASK_CENTRE_EVENT, onAsk);
  }, []);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: q, timestamp: now() }]);
    setInput('');
    setIsLoading(true);

    try {
      // Only the centre id is sent; the server decides what the search may see
      const result = await aiPost<AskResponse>('/api/ask-careq', { question: q, ...(centre ? { centreId: centre.centreId } : {}) });
      // Too many questions: say so plainly (the reply is not an AI answer)
      if (!result.ok) throw Object.assign(new Error(result.message), { userFacing: isUserFacingAiError(result.status) });
      const data = result.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: data.answer || NO_INFO,
          timestamp: now(),
          aiMode: data.aiMode,
          citations: data.citations ?? [],
          notice: data.retrievalMode === 'keyword' ? data.notice || BASIC_SEARCH_NOTICE : undefined,
        },
      ]);
    } catch (err) {
      // Fallback (or the rate-limit message, which the user can act on)
      const userFacing = (err as { userFacing?: boolean }).userFacing;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          sender: 'assistant',
          text: userFacing ? (err as Error).message : NO_INFO,
          timestamp: now(),
          aiMode: 'fallback',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = centre ? CENTRE_QUESTIONS : GENERAL_QUESTIONS;

  return (
    <>
      {/* Floating Corner Button */}
      <div className="fixed bottom-5 right-5 z-40">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white cursor-pointer group"
            title="Ask CareQ verified help assistant"
          >
            <div className="w-6 h-6 rounded-full bg-[#45B5A5]/30 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-bold tracking-tight">Ask CareQ</span>
            <span className="w-2 h-2 rounded-full bg-[#F9BE2F] animate-pulse"></span>
          </button>
        )}
      </div>

      {/* Small Chat Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Ask CareQ"
          className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4 duration-200"
        >
          {/* Top Panel Header */}
          <div className="bg-[#0B4A52] text-white p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-[#45B5A5]">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-tight leading-tight">Ask CareQ</h3>
                <span className="text-[10px] text-teal-200">Verified Knowledge Assistant</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close Ask CareQ assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mandatory Header Note */}
          <div className="bg-[#F0FDFA] border-b border-[#45B5A5]/30 px-3.5 py-2 text-[11px] text-[#0B4A52] leading-tight flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#45B5A5] shrink-0 mt-0.5" />
            <span className="font-medium">
              AI assistant. Answers come only from CareQ's help pages and centres' published information.
            </span>
          </div>

          {centre && (
            <div className="border-b border-stone-200 bg-white px-3.5 py-2 text-[11px] text-[#173F42] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#0B4A52] shrink-0" />
              <span className="flex-1 min-w-0 truncate">
                Asking about <span className="font-semibold">{centre.centreName}</span>
              </span>
              <button
                type="button"
                onClick={() => setCentre(null)}
                className="shrink-0 p-0.5 rounded text-[#7A8A84] hover:text-[#173F42] hover:bg-stone-100 cursor-pointer"
                aria-label="Stop asking about this centre"
                title="Ask general questions instead"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F7F8F7]/60 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#0B4A52] text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="max-w-[85%] w-full mt-1.5 space-y-1.5">
                      {msg.citations.map((c, i) => (
                        <QuoteCard key={i} c={c} />
                      ))}
                    </div>
                  )}
                  {!isUser && msg.notice && <p className="text-[11px] text-[#7A8A84] mt-1 px-1">{msg.notice}</p>}
                  {!isUser && <AiFallbackNote aiMode={msg.aiMode} className="mt-1 px-1" />}
                  <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-stone-500 text-xs py-1 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B4A52]" />
                <span>Searching the published documents...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="p-2 border-t border-stone-200 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {suggestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-[#0B4A52]/10 text-stone-700 hover:text-[#0B4A52] border border-stone-200/80 transition-colors cursor-pointer text-left font-medium"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5 mt-1.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={centre ? 'Ask about this centre...' : 'Ask about policies, documents, or FAQ...'}
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-2 rounded-xl text-white transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-[#0B4A52] hover:bg-[#08383e] cursor-pointer shadow-2xs'
                    : 'bg-stone-300 cursor-not-allowed'
                }`}
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
