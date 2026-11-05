import React, { useState } from 'react';
import {
  SupportRequest,
  RequestType,
  ConcernCategory,
  ConcernStep,
  HELP_FAQS,
} from '../data/helpData';
import {
  PageHeader,
  Card,
  PrimaryButton,
  IconTile,
  Eyebrow,
} from './ui/CareUI';
import {
  Plus,
  Heart,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface HelpTabProps {
  role: 'parent' | 'centre';
  userName: string;
  requests: SupportRequest[];
  onSubmitRequest: (newReq: Omit<SupportRequest, 'id' | 'referenceNumber' | 'submittedAt'>) => void;
  onAdvanceConcernStep: (requestId: string) => void;
}

const CONCERN_STEPS: ConcernStep[] = [
  'Submitted',
  'Under review by CareQ support',
  'Shared with the other party (if needed)',
  'Resolved',
];

export const HelpTab: React.FC<HelpTabProps> = ({
  role,
  userName,
  requests,
  onSubmitRequest,
  onAdvanceConcernStep,
}) => {
  // Form states: Contact / Tech support / Concern
  const [requestType, setRequestType] = useState<RequestType>('contact');
  const [concernCategory, setConcernCategory] = useState<ConcernCategory>('Communication');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [demoConsent, setDemoConsent] = useState<boolean>(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Expanded FAQ items
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Filter requests for current user / role
  const myRequests = requests.filter((r) => r.submittedByRole === role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoConsent || !subject.trim() || !message.trim()) return;

    const ref = 'CQ-' + Math.floor(1000 + Math.random() * 9000);

    if (requestType === 'concern') {
      const todayDate = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      onSubmitRequest({
        type: 'concern',
        submittedByRole: role,
        submittedByName: userName,
        subject: subject.trim(),
        message: message.trim(),
        status: 'In progress',
        category: concernCategory,
        concernStep: 'Submitted',
        concernStepsHistory: [{ step: 'Submitted', date: todayDate }],
      });
    } else {
      onSubmitRequest({
        type: requestType,
        submittedByRole: role,
        submittedByName: userName,
        subject: subject.trim(),
        message: message.trim(),
        status: 'Open',
      });
    }

    setSubmittedRef(ref);
    setSubject('');
    setMessage('');
    setDemoConsent(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Help & support"
        title="A little help, right when you need it."
        subtitle="Answers for parents and centres, and a safe place to raise a question or concern."
      />

      {/* Grid lg:grid-cols-[1.35fr_1fr] gap-6 */}
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6 items-start">
        {/* LEFT COLUMN: FAQ Card + Requests Card */}
        <div className="space-y-6">
          {/* Card 1: Frequently asked little questions */}
          <Card className="p-6 sm:p-7">
            <h2 className="text-xl font-bold text-[#173F42] mb-5">
              Frequently asked little questions
            </h2>

            {/* FAQ Accordion */}
            <div>
              {HELP_FAQS.map((faq, index) => {
                const isExpanded = expandedFaqId === faq.id;

                return (
                  <div
                    key={faq.id}
                    className={`py-5 border-t border-[#E7E4DA] ${
                      index === 0 ? 'first:border-t-0' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                      className="w-full flex items-center justify-between text-left gap-4 group cursor-pointer"
                    >
                      <span className="text-sm font-semibold text-[#3F6E7E] group-hover:text-[#173F42] transition-colors leading-snug">
                        {faq.question}
                      </span>
                      <Plus
                        className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                          isExpanded
                            ? 'rotate-45 text-[#173F42]'
                            : 'text-[#7A8A84] group-hover:text-[#173F42]'
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="mt-3 text-sm text-[#5B6B66] leading-relaxed animate-in fade-in-50 duration-150 space-y-1.5">
                        <p>{faq.answer}</p>
                        {faq.source && (
                          <div className="text-[11px] text-[#7A8A84] font-medium pt-1">
                            Source: {faq.source}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Card 2: Your support requests */}
          <Card className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E4DA]">
              <h2 className="text-xl font-bold text-[#173F42]">
                Your support requests
              </h2>
              <Eyebrow>Local only</Eyebrow>
            </div>

            {myRequests.length === 0 ? (
              <p className="text-sm text-[#5B6B66] text-center py-8">
                Your support requests will appear here.
              </p>
            ) : (
              <div className="space-y-4">
                {myRequests.map((req) => {
                  const isConcern = req.type === 'concern';
                  const currentStepIdx = isConcern
                    ? CONCERN_STEPS.indexOf(req.concernStep || 'Submitted')
                    : -1;

                  return (
                    <div
                      key={req.id}
                      className="rounded-xl border border-[#E7E4DA] bg-[#FBFAF3] p-5 space-y-3"
                    >
                      {/* Request header line */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#0B4A52] bg-[#E4ECE1] px-2 py-0.5 rounded-md border border-[#CBD9C6]">
                            {req.referenceNumber}
                          </span>
                          <span className="text-sm font-bold text-[#173F42]">
                            {req.subject}
                          </span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-white text-[#5B6B66] border border-[#E7E4DA] px-2 py-0.5 rounded-md">
                            {req.type === 'concern'
                              ? 'Concern'
                              : req.type === 'tech_support'
                              ? 'Tech support'
                              : 'Contact'}
                          </span>
                          {req.category && (
                            <span className="text-[10px] font-semibold bg-[#E4ECE1] text-[#4E7A5A] px-2 py-0.5 rounded-md">
                              {req.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#7A8A84]">
                            {req.submittedAt}
                          </span>
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              req.status === 'Resolved'
                                ? 'bg-[#E4ECE1] text-[#4E7A5A] border-[#CBD9C6]'
                                : req.status === 'In progress'
                                ? 'bg-[#FDF3DD] text-[#8A6411] border-[#EADBB8]'
                                : 'bg-[#FAF9F4] text-[#173F42] border-[#E7E4DA]'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>

                      {/* Message body */}
                      <p className="text-xs sm:text-sm text-[#5B6B66] leading-relaxed bg-white p-3 rounded-lg border border-[#E7E4DA]">
                        {req.message}
                      </p>

                      {/* Concern Status Path */}
                      {isConcern && (
                        <div className="pt-2 border-t border-[#E7E4DA] space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-[#173F42] flex items-center gap-1.5 uppercase tracking-wider">
                              <ShieldAlert className="w-3.5 h-3.5 text-[#0B4A52]" />
                              Concern resolution path
                            </span>

                            {/* Demo advance button on centre side */}
                            {role === 'centre' && req.status !== 'Resolved' && (
                              <button
                                type="button"
                                onClick={() => onAdvanceConcernStep(req.id)}
                                className="px-2.5 py-1 text-xs font-bold text-[#0B4A52] bg-[#E4ECE1] hover:bg-[#D9E4D3] rounded-lg border border-[#CBD9C6] transition-colors flex items-center gap-1 cursor-pointer"
                                title="Demonstration button to advance the concern resolution status"
                              >
                                <Sparkles className="w-3 h-3 text-[#0B4A52]" />
                                <span>Demo: advance status</span>
                              </button>
                            )}
                          </div>

                          {/* Step progress track */}
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                            {CONCERN_STEPS.map((step, idx) => {
                              const isCompleted = idx < currentStepIdx;
                              const isCurrent = idx === currentStepIdx;
                              const stepHistory = req.concernStepsHistory?.find(
                                (h) => h.step === step
                              );

                              return (
                                <div
                                  key={step}
                                  className={`p-3 rounded-xl border text-xs transition-all relative ${
                                    isCurrent
                                      ? 'bg-[#0B4A52] text-white border-[#0B4A52] shadow-xs'
                                      : isCompleted
                                      ? 'bg-[#E4ECE1] border-[#CBD9C6] text-[#173F42]'
                                      : 'bg-white border-[#E7E4DA] text-[#7A8A84]'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 font-bold mb-1">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4E7A5A]" />
                                    ) : isCurrent ? (
                                      <span className="w-2 h-2 rounded-full bg-[#E0A31A] animate-pulse" />
                                    ) : (
                                      <span className="w-2 h-2 rounded-full bg-[#CBD9C6]" />
                                    )}
                                    <span>Step {idx + 1}</span>
                                  </div>
                                  <div
                                    className={`text-[11px] leading-tight font-semibold ${
                                      isCurrent
                                        ? 'text-white'
                                        : isCompleted
                                        ? 'text-[#173F42]'
                                        : 'text-[#7A8A84]'
                                    }`}
                                  >
                                    {step}
                                  </div>
                                  {stepHistory && (
                                    <div
                                      className={`text-[10px] mt-1.5 ${
                                        isCurrent ? 'text-white/80' : 'text-[#7A8A84]'
                                      }`}
                                    >
                                      {stepHistory.date}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Target response note */}
                          <div className="text-[11px] text-[#7A8A84] bg-white p-2.5 rounded-lg border border-[#E7E4DA] flex items-center justify-between">
                            <span className="font-medium text-[#173F42]">
                              Prototype: target response within 2 business days.
                            </span>
                            <span className="text-[#7A8A84]">
                              Reviewed by CareQ support team
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* RIGHT COLUMN: Contact the CareQ team form (sticky top-6) */}
        <div className="lg:sticky lg:top-6">
          <Card className="p-6 sm:p-7 space-y-5">
            <div>
              <IconTile icon={Heart} tone="peach" />
              <h2 className="text-2xl font-bold text-[#173F42] mt-4 leading-tight">
                Contact the CareQ team
              </h2>
              <p className="text-xs text-[#5B6B66] mt-1 leading-relaxed">
                Send an inquiry, technical question, or raise a concern for person-led review.
              </p>
            </div>

            {submittedRef && (
              <div className="rounded-xl bg-[#E4ECE1] border border-[#CBD9C6] p-3.5 text-xs text-[#173F42] flex items-center justify-between">
                <span className="font-semibold">
                  Request submitted! Reference: <strong>{submittedRef}</strong>.
                </span>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="text-[#5B6B66] hover:text-[#173F42] text-xs cursor-pointer"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Request Type Selector */}
              <div>
                <label className="text-sm font-medium text-[#3F5250] mb-2 block">
                  Request type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as RequestType)}
                  className="h-12 rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 w-full cursor-pointer text-[#173F42] focus:outline-hidden"
                >
                  <option value="contact">Contact us</option>
                  <option value="tech_support">Technical support</option>
                  <option value="concern">Raise a concern</option>
                </select>
              </div>

              {/* Concern Category (if type is concern) */}
              {requestType === 'concern' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-[#3F5250] mb-2 block">
                      Concern category
                    </label>
                    <select
                      value={concernCategory}
                      onChange={(e) =>
                        setConcernCategory(e.target.value as ConcernCategory)
                      }
                      className="h-12 rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 w-full cursor-pointer text-[#173F42] focus:outline-hidden"
                    >
                      <option value="Communication">Communication</option>
                      <option value="Fairness">Fairness</option>
                      <option value="Privacy">Privacy</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FDF3DD] border border-[#EADBB8] text-[#8A6411] text-xs font-semibold">
                    A person at CareQ reviews every concern.
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="text-sm font-medium text-[#3F5250] mb-2 block">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={
                    requestType === 'concern'
                      ? 'e.g. Unanswered status inquiries'
                      : 'e.g. Question about waitlist estimate update'
                  }
                  className="h-12 rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 w-full text-[#173F42] focus:outline-hidden"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-sm font-medium text-[#3F5250] mb-2 block">
                  Message
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your inquiry, issue, or concern in detail..."
                  className="h-32 rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] p-4 text-sm focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 w-full resize-none text-[#173F42] focus:outline-hidden"
                />
              </div>

              {/* Required demo checkbox row */}
              <div className="rounded-xl bg-[#F4F6F1] border border-[#E7E4DA] p-4 text-[11px]">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={demoConsent}
                    onChange={(e) => setDemoConsent(e.target.checked)}
                    className="rounded border-[#E8E4D6] text-[#0B4A52] focus:ring-[#45B5A5] w-4 h-4 cursor-pointer mt-0.5 shrink-0"
                  />
                  <span className="text-[#5B6B66] leading-relaxed">
                    I understand this is a demo request and will not be sent to a real support team.
                  </span>
                </label>
              </div>

              {/* Full-width PrimaryButton h-12 */}
              <PrimaryButton
                type="submit"
                disabled={!demoConsent || !subject.trim() || !message.trim()}
                className="w-full h-12 justify-center"
              >
                {requestType === 'concern' ? 'Submit concern' : 'Submit request'}
              </PrimaryButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
