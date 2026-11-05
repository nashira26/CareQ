import React, { useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  AlertTriangle,
  FileQuestion,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Send,
  LifeBuoy,
  ShieldAlert,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  SupportRequest,
  RequestType,
  ConcernCategory,
  ConcernStep,
  HELP_FAQS,
} from '../data/helpData';

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
  // Sub-tabs: 'my_requests' | 'contact' | 'concern' | 'faq'
  const [activeSubTab, setActiveSubTab] = useState<'my_requests' | 'contact' | 'concern' | 'faq'>(
    'my_requests'
  );

  // Form states: Contact / Tech support
  const [contactType, setContactType] = useState<RequestType>('contact');
  const [contactSubject, setContactSubject] = useState<string>('');
  const [contactMessage, setContactMessage] = useState<string>('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  // Form states: Raise a concern
  const [concernCategory, setConcernCategory] = useState<ConcernCategory>('Communication');
  const [concernSubject, setConcernSubject] = useState<string>('');
  const [concernMessage, setConcernMessage] = useState<string>('');
  const [concernSubmittedRef, setConcernSubmittedRef] = useState<string | null>(null);

  // Expanded FAQ items
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Filter requests for current user / role
  const myRequests = requests.filter((r) => r.submittedByRole === role);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactSubject.trim() || !contactMessage.trim()) return;

    onSubmitRequest({
      type: contactType,
      submittedByRole: role,
      submittedByName: userName,
      subject: contactSubject.trim(),
      message: contactMessage.trim(),
      status: 'Open',
    });

    setSubmittedRef('CQ-' + Math.floor(1000 + Math.random() * 9000));
    setContactSubject('');
    setContactMessage('');
    setActiveSubTab('my_requests');
  };

  const handleConcernSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concernSubject.trim() || !concernMessage.trim()) return;

    const todayDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    onSubmitRequest({
      type: 'concern',
      submittedByRole: role,
      submittedByName: userName,
      subject: concernSubject.trim(),
      message: concernMessage.trim(),
      status: 'In progress',
      category: concernCategory,
      concernStep: 'Submitted',
      concernStepsHistory: [{ step: 'Submitted', date: todayDate }],
    });

    setConcernSubmittedRef('CQ-' + Math.floor(1000 + Math.random() * 9000));
    setConcernSubject('');
    setConcernMessage('');
    setActiveSubTab('my_requests');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0B4A52]/10 text-[#0B4A52] text-xs font-semibold mb-2">
            <LifeBuoy className="w-3.5 h-3.5 text-[#45B5A5]" />
            <span>CareQ Help Centre</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
            Help, Support & Transparency
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-xl">
            Submit questions, report technical issues, raise complaints for person-led review, or read verified FAQ guidelines.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('contact')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'contact'
                ? 'bg-[#0B4A52] text-white shadow-xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Contact Support</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('concern')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'concern'
                ? 'bg-rose-800 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Raise a Concern</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-stone-200 gap-3 sm:gap-6 text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveSubTab('my_requests')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'my_requests'
              ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Requests ({myRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('faq')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'faq'
              ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>Help FAQ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('contact')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'contact'
              ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Contact & Technical Support</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('concern')}
          className={`pb-3 px-1 border-b-2 flex items-center gap-2 transition-all ${
            activeSubTab === 'concern'
              ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Raise a Concern</span>
        </button>
      </div>

      {/* SUB-TAB 1: MY REQUESTS & CONCERN STATUS PATH */}
      {activeSubTab === 'my_requests' && (
        <div className="space-y-4">
          {submittedRef && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-[#45B5A5]/40 text-xs text-[#0B4A52] flex items-center justify-between">
              <span className="font-semibold">
                Request submitted successfully with reference ID: <strong>{submittedRef}</strong>.
              </span>
              <button
                type="button"
                onClick={() => setSubmittedRef(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                Dismiss
              </button>
            </div>
          )}

          {concernSubmittedRef && (
            <div className="p-3.5 rounded-xl bg-teal-50 border border-[#45B5A5]/40 text-xs text-[#0B4A52] flex items-center justify-between">
              <span className="font-semibold">
                Concern submitted with reference ID: <strong>{concernSubmittedRef}</strong>. A person at CareQ reviews every concern.
              </span>
              <button
                type="button"
                onClick={() => setConcernSubmittedRef(null)}
                className="text-stone-400 hover:text-stone-700"
              >
                Dismiss
              </button>
            </div>
          )}

          {myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">No requests submitted yet</p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Need assistance with your child care application or technical troubleshooting? Submit a support request or raise a concern.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('contact')}
                  className="px-4 py-2 bg-[#0B4A52] text-white text-xs font-semibold rounded-xl"
                >
                  Create Support Request
                </button>
              </div>
            </div>
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
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4"
                  >
                    {/* Header line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#0B4A52] bg-[#0B4A52]/10 px-2 py-0.5 rounded-md border border-[#0B4A52]/20">
                          {req.referenceNumber}
                        </span>
                        <span className="text-xs font-semibold text-stone-900">{req.subject}</span>
                        {req.category && (
                          <span className="text-[11px] font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded">
                            {req.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{req.submittedAt}</span>
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            req.status === 'Resolved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : req.status === 'In progress'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {/* Message Body */}
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50/60 p-3 rounded-xl border border-stone-100">
                      {req.message}
                    </p>

                    {/* CONCERN STATUS PATH (if type is concern) */}
                    {isConcern && (
                      <div className="pt-2 border-t border-stone-100 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5 uppercase tracking-wider">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#0B4A52]" />
                            Concern Resolution Path
                          </span>

                          {/* Demo advance button on centre side */}
                          {role === 'centre' && (
                            <button
                              type="button"
                              onClick={() => onAdvanceConcernStep(req.id)}
                              className="px-2.5 py-1 text-xs font-bold text-[#0B4A52] bg-[#45B5A5]/15 hover:bg-[#45B5A5]/25 rounded-lg border border-[#45B5A5]/30 transition-colors flex items-center gap-1"
                              title="Demonstration button to advance the concern resolution status"
                            >
                              <Sparkles className="w-3 h-3 text-[#0B4A52]" />
                              <span>Demo: advance status</span>
                            </button>
                          )}
                        </div>

                        {/* Step progress track */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
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
                                    ? 'bg-teal-50 border-[#45B5A5]/40 text-[#0B4A52]'
                                    : 'bg-stone-50 border-stone-200 text-stone-400'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-bold mb-1">
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#45B5A5]" />
                                  ) : isCurrent ? (
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                                  ) : (
                                    <span className="w-2 h-2 rounded-full bg-stone-300"></span>
                                  )}
                                  <span>Step {idx + 1}</span>
                                </div>
                                <div
                                  className={`text-[11px] leading-tight font-semibold ${
                                    isCurrent
                                      ? 'text-white'
                                      : isCompleted
                                      ? 'text-stone-800'
                                      : 'text-stone-400'
                                  }`}
                                >
                                  {step}
                                </div>
                                {stepHistory && (
                                  <div
                                    className={`text-[10px] mt-1.5 ${
                                      isCurrent ? 'text-teal-200' : 'text-stone-500'
                                    }`}
                                  >
                                    Completed: {stepHistory.date}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Target response note */}
                        <div className="flex items-center justify-between text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg border border-stone-200/70">
                          <span className="font-medium text-stone-700">
                            Prototype: target response within 2 business days.
                          </span>
                          <span className="text-stone-400">
                            Managed by CareQ Independent Oversight
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: SHORT HELP FAQ */}
      {activeSubTab === 'faq' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Verified answers regarding Ontario child care intake, waitlist positions, simulated data, and AI policy.
            </p>
          </div>

          <div className="divide-y divide-stone-100">
            {HELP_FAQS.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div key={faq.id} className="py-3.5">
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full flex items-center justify-between text-left gap-3 group"
                  >
                    <span className="text-sm font-semibold text-stone-900 group-hover:text-[#0B4A52] transition-colors">
                      {faq.question}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed pr-6 space-y-2 animate-in fade-in-50 duration-150">
                      <p>{faq.answer}</p>
                      <div className="text-[11px] text-stone-400 font-medium">
                        Source: {faq.source}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CONTACT US & TECHNICAL SUPPORT FORM */}
      {activeSubTab === 'contact' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-5 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Contact Us & Technical Support
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Have an operational question or experiencing a technical issue with the portal? Submit a ticket below.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                Support Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setContactType('contact')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    contactType === 'contact'
                      ? 'bg-[#0B4A52] text-white border-[#0B4A52]'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Contact Us</span>
                </button>
                <button
                  type="button"
                  onClick={() => setContactType('tech_support')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                    contactType === 'tech_support'
                      ? 'bg-[#0B4A52] text-white border-[#0B4A52]'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <LifeBuoy className="w-3.5 h-3.5" />
                  <span>Technical Support</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={contactSubject}
                onChange={(e) => setContactSubject(e.target.value)}
                placeholder="e.g. Question about toddler waitlist estimate update"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Please describe your inquiry or technical error in detail..."
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500">
                A tracking reference number (e.g., CQ-1042) will be generated.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#0B4A52] hover:bg-[#08383e] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: RAISE A CONCERN FORM */}
      {activeSubTab === 'concern' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-7 shadow-xs space-y-5 max-w-2xl">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Independent Party Resolution</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Raise a Concern
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Submit a formal complaint or concern regarding communication, fairness, or privacy.
            </p>
          </div>

          {/* Mandatory note */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>A person at CareQ reviews every concern.</span>
          </div>

          <form onSubmit={handleConcernSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider">
                Concern Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Communication', 'Fairness', 'Privacy', 'Other'] as ConcernCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setConcernCategory(cat)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center transition-all ${
                        concernCategory === cat
                          ? 'bg-[#0B4A52] text-white border-[#0B4A52]'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={concernSubject}
                onChange={(e) => setConcernSubject(e.target.value)}
                placeholder="e.g. Unanswered status inquiries or policy inconsistency"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Message / Description of Concern
              </label>
              <textarea
                required
                rows={4}
                value={concernMessage}
                onChange={(e) => setConcernMessage(e.target.value)}
                placeholder="Please provide specific details regarding what happened and when..."
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-stone-500">
                You will receive a step-by-step progress tracking path.
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Submit Concern</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
