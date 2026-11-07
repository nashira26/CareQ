import React, { useState } from 'react';
import { Centre, Application, ChatMessage } from '../data/mockData';
import { StatusBadge } from './StatusBadge';
import { AiFallbackNote, AiMode, AiNotice, SimTag } from './ui/CareUI';
import { aiPost, isUserFacingAiError } from '../lib/aiFetch';
import {
  X,
  Send,
  Sparkles,
  Bot,
  Loader2,
  Check,
  Building2,
  User,
  Baby,
  RefreshCw,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';

interface ConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'parent' | 'centre';
  centre: Centre;
  application: Application;
  messages: ChatMessage[];
  onSendMessage: (text: string, aiAssisted: boolean) => void;
}

export const ConversationModal: React.FC<ConversationModalProps> = ({
  isOpen,
  onClose,
  role,
  centre,
  application,
  messages,
  onSendMessage,
}) => {
  const [manualText, setManualText] = useState<string>('');
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState<boolean>(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<string>('');
  const [draftAiMode, setDraftAiMode] = useState<AiMode | null>(null);
  const [toneAiMode, setToneAiMode] = useState<AiMode | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Tone check states
  const [isCheckingTone, setIsCheckingTone] = useState<boolean>(false);
  const [toneWarning, setToneWarning] = useState<{
    originalText: string;
    suggestedVersion: string;
    isAiAssisted: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const isParent = role === 'parent';

  // Smart suggestions tailored to role and application status
  const parentSuggestions = [
    'Inquire about waitlist timeline & current queue movement',
    'Follow up on submitted immunization & residency documents',
    'Request a brief morning tour of the toddler classroom',
    'Confirm March start date availability and CWELCC fee details',
  ];

  const centreSuggestions = (() => {
    switch (application.status) {
      case 'Submitted':
        return [
          'Acknowledge receipt and confirm documents are being verified',
          'Request re-upload of updated ISPA yellow card or proof of address',
          'Notify parent about upcoming intake review schedule',
        ];
      case 'Under review':
        return [
          'Update family that intake committee is currently reviewing file',
          'Request medical or dietary allergy details for toddler room',
          'Confirm intended March start date with parent',
        ];
      case 'Waitlisted':
        return [
          `Inform parent of current waitlist position (#${application.waitlistPosition || 5})`,
          'Provide estimated timeline for next toddler room intake cycle',
          'Ask if parent wishes to remain active on the queue for spring',
        ];
      case 'Offer':
        return [
          'Send formal toddler placement offer with 48h confirmation deadline',
          'Provide enrolment contract and fee schedule information',
          'Schedule an in-person intake orientation visit',
        ];
      case 'Accepted':
        return [
          'Send welcome packet and first-day transition checklist',
          'Schedule morning transition orientation visit for child',
        ];
      default:
        return [
          'General application follow-up and status check',
          'Confirm contact details and preferred start date',
        ];
    }
  })();

  const suggestions = isParent ? parentSuggestions : centreSuggestions;

  // Call backend to generate AI draft
  const handleGenerateDraft = async (intentText: string) => {
    setSelectedIntent(intentText);
    setIsGeneratingAiDraft(true);
    setAiDraft(null);

    setAiNotice(null);
    const result = await aiPost<{ success?: boolean; draftMessage?: string; aiMode?: AiMode }>('/api/generate-message', {
      role,
      childName: application.childName,
      childAgeMonths: application.childAgeMonths,
      centreName: centre.name,
      applicationStatus: application.status,
      waitlistPosition: application.waitlistPosition,
      intent: intentText,
    });
    if (result.ok && result.data.success && result.data.draftMessage) {
      setAiDraft(result.data.draftMessage);
      setDraftAiMode(result.data.aiMode ?? null);
    } else if (!result.ok && isUserFacingAiError(result.status)) {
      setAiNotice(`${result.message} You can still type your message yourself.`);
    }
    setIsGeneratingAiDraft(false);
  };

  // Check tone using Gemini before sending any message
  const executeSendMessage = async (textToSend: string, aiAssisted: boolean) => {
    if (!textToSend.trim()) return;

    setIsCheckingTone(true);
    setToneWarning(null);

    try {
      const result = await aiPost<{ success?: boolean; isHarsh?: boolean; suggestedCalmerVersion?: string; aiMode?: AiMode }>(
        '/api/check-tone',
        { text: textToSend.trim(), role }
      );
      if (!result.ok) {
        // Tone check unavailable: the message is still sent (the sender decides), and we say so
        if (isUserFacingAiError(result.status)) setAiNotice(`Tone check skipped: ${result.message}`);
        throw new Error(result.message);
      }
      const data = result.data;
      setToneAiMode(data.aiMode ?? null);
      if (data.success && data.isHarsh && data.suggestedCalmerVersion) {
        // Rude, threatening or aggressive tone detected! Show warning panel
        setToneWarning({
          originalText: textToSend.trim(),
          suggestedVersion: data.suggestedCalmerVersion,
          isAiAssisted: aiAssisted,
        });
        setIsCheckingTone(false);
        return;
      }
    } catch (err) {
      console.warn('Tone check error; proceeding to send:', err);
    } finally {
      setIsCheckingTone(false);
    }

    // Normal/polite message: send immediately
    onSendMessage(textToSend.trim(), aiAssisted);
    setManualText('');
    setAiDraft(null);
    setSelectedIntent('');
  };

  // Send approved AI draft
  const handleApproveAndSendAiDraft = () => {
    if (!aiDraft?.trim() || isCheckingTone) return;
    executeSendMessage(aiDraft.trim(), true);
  };

  // Send manual message
  const handleSendManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualText.trim() || isCheckingTone) return;
    executeSendMessage(manualText.trim(), false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full h-[90vh] max-h-[720px] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-gradient-to-r from-stone-50 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              {isParent ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-base sm:text-lg leading-tight">
                  {isParent ? centre.name : `Parent: ${application.parentName}`}
                </h3>
                <StatusBadge
                  status={application.status}
                  waitlistPosition={application.waitlistPosition}
                  size="sm"
                />
              </div>
              <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5">
                <Baby className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  Child: <strong>{application.childName}</strong> ({application.childAgeMonths} mos, Toddler) • Desired Start: {application.preferredStartDate}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            title="Close conversation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-stone-50/50">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-stone-500 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-stone-400" />
              <p className="text-sm font-medium">No messages yet in this conversation.</p>
              <p className="text-xs text-stone-400">
                Use the AI suggestions below or type a message to start communicating.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine =
                (isParent && msg.sender === 'parent') ||
                (!isParent && msg.sender === 'centre');

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="text-[11px] font-semibold text-stone-500 mb-1 px-1 flex items-center gap-1">
                    <span>{msg.senderName}</span>
                    {/* Every centre message in the demo is simulated */}
                    {msg.sender === 'centre' && <SimTag />}
                    {msg.aiAssisted && (
                      <span className="text-[10px] text-teal-800 bg-teal-100 font-bold px-1.5 py-0.2 rounded">
                        AI Drafted
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      isMine
                        ? 'bg-teal-700 text-white rounded-br-xs'
                        : 'bg-white text-stone-800 border border-stone-200 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 px-1">
                    {msg.timestamp}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* AI Smart Draft Assistant Section */}
        <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0 space-y-3">
          {/* AI Suggestions Chips */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-stone-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {isParent
                  ? 'AI Draft Assistant (Click to prepare message for review):'
                  : 'AI Draft Assistant (Suggested by Application Status):'}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isGeneratingAiDraft}
                  onClick={() => handleGenerateDraft(suggestion)}
                  className={`text-xs px-2.5 py-1 rounded-lg border text-left transition-all flex items-center gap-1.5 ${
                    selectedIntent === suggestion
                      ? 'bg-teal-50 border-teal-400 text-teal-900 font-semibold shadow-2xs'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                  } disabled:opacity-50`}
                >
                  <Bot className="w-3 h-3 text-teal-700 shrink-0" />
                  <span className="truncate max-w-[260px] sm:max-w-none">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Loading state */}
          {isGeneratingAiDraft && (
            <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs text-teal-900">
              <Loader2 className="w-4 h-4 animate-spin text-teal-700" />
              <span>Drafting message for your review and approval...</span>
            </div>
          )}

          {/* Tone Checking in progress state */}
          {isCheckingTone && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
              <span>Checking message tone with Gemini...</span>
            </div>
          )}

          {/* Tone Warning Panel: If message is rude, threatening or aggressive */}
          {toneWarning && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 shadow-sm space-y-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-950">
                    This message may come across as harsh
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    CareQ checked the tone of your message. You can edit your message or use the calmer suggestion below. The sender always makes the final choice.
                  </p>
                </div>
              </div>

              {/* Calmer Suggested Version */}
              <div className="bg-white border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-stone-800 space-y-1">
                <span className="text-[10px] font-bold text-[#0B4A52] uppercase tracking-wider block">
                  Calmer suggested version:
                </span>
                <p className="text-stone-700 italic">"{toneWarning.suggestedVersion}"</p>
              </div>

              {/* Actions: Use suggestion, edit, or send original */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Use suggestion: load into input for sender to review/edit
                      setManualText(toneWarning.suggestedVersion);
                      setAiDraft(null);
                      setToneWarning(null);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-lg transition-colors shadow-2xs"
                  >
                    Use Suggestion
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Send suggestion directly
                      onSendMessage(toneWarning.suggestedVersion, true);
                      setToneWarning(null);
                      setManualText('');
                      setAiDraft(null);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-100/80 hover:bg-teal-200/80 rounded-lg transition-colors"
                  >
                    Send Suggestion
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Edit original message
                      setManualText(toneWarning.originalText);
                      setToneWarning(null);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-amber-100 rounded transition-colors"
                  >
                    Edit Message
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // The sender always makes the final choice: send as is
                      onSendMessage(toneWarning.originalText, toneWarning.isAiAssisted);
                      setToneWarning(null);
                      setManualText('');
                      setAiDraft(null);
                    }}
                    className="px-2.5 py-1 text-xs font-medium text-stone-500 hover:text-stone-900 underline transition-colors"
                  >
                    Send Anyway
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Prompt requirement:
              "ideally AI would make necesary messages and ask your approval to send it"
              Show AI Draft with Edit / Approve & Send controls */}
          {aiDraft && !toneWarning && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-300 shadow-xs space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-amber-950">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  AI Draft Generated — Review & Approve to Send:
                </span>
                <span className="text-[11px] text-amber-700 font-normal">
                  You can edit the text below before sending
                </span>
              </div>

              <textarea
                rows={3}
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-amber-200 rounded-lg p-2.5 text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 leading-relaxed resize-y"
              />
              <AiFallbackNote aiMode={draftAiMode} />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAiDraft(null);
                    setSelectedIntent('');
                  }}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
                >
                  Discard Draft
                </button>

                <button
                  type="button"
                  disabled={isCheckingTone}
                  onClick={handleApproveAndSendAiDraft}
                  className="px-4 py-1.5 text-xs sm:text-sm font-semibold bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCheckingTone ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking tone...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Approve & Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleSendManual} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={
                isParent
                  ? `Type a message to ${centre.name}...`
                  : `Type a message to ${application.parentName}...`
              }
              className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0B4A52] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!manualText.trim() || isCheckingTone}
              className="px-4 py-2 bg-[#0B4A52] hover:bg-[#08383e] text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {isCheckingTone ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
          {!isCheckingTone && <AiFallbackNote aiMode={toneAiMode} />}
          <AiNotice message={aiNotice} />
        </div>
      </div>
    </div>
  );
};
