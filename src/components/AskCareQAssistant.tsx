import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Loader2, MessageSquare, Info } from 'lucide-react';
import { Centre } from '../data/mockData';
import { aiPost, isUserFacingAiError } from '../lib/aiFetch';
import { AiFallbackNote, AiMode } from './ui/CareUI';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  aiMode?: AiMode;
}

interface AskCareQAssistantProps {
  centres: Centre[];
}

const PRESET_QUESTIONS = [
  'How are waitlist positions set?',
  'Who can see my uploaded documents?',
  "What are CareQ Demo Centre's requirements?",
  'What does simulated data mean?',
];

export const AskCareQAssistant: React.FC<AskCareQAssistantProps> = ({ centres }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: "Hello! I am the Ask CareQ assistant. I can answer questions about CareQ's policies, intake processes, and centres' confirmed requirements.\n\nSource: Help FAQ",
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await aiPost<{ answer?: string; aiMode?: AiMode }>('/api/ask-careq', {
        question: q,
        centres: centres.map((c) => ({
          name: c.name,
          neighbourhood: c.neighbourhood,
          ageGroups: c.ageGroups,
          hours: c.hours,
          requirements: c.requirements,
          feeNote: c.feeNote,
        })),
      });
      // Too many questions: say so plainly (the reply is not an AI answer)
      if (!result.ok) throw Object.assign(new Error(result.message), { userFacing: isUserFacingAiError(result.status) });
      const data = result.data;
      const answer =
        data.answer || "I don't have that information; please contact the centre or use Help.";

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        aiMode: data.aiMode,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      // Fallback (or the rate-limit message, which the user can act on)
      const userFacing = (err as { userFacing?: boolean }).userFacing;
      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: userFacing ? (err as Error).message : "I don't have that information; please contact the centre or use Help.",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        aiMode: 'fallback',
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="fixed bottom-5 right-5 z-50 w-96 max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4 duration-200">
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

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F7F8F7]/60 text-xs">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#0B4A52] text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200 shadow-2xs rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {!isUser && <AiFallbackNote aiMode={msg.aiMode} className="mt-1 px-1" />}
                  <span className="text-[10px] text-stone-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-stone-500 text-xs py-1 px-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B4A52]" />
                <span>Checking verified knowledge base...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="p-2 border-t border-stone-200 bg-white">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              {PRESET_QUESTIONS.map((q) => (
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
                placeholder="Ask about policies, documents, or FAQ..."
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
