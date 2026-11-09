import React, { useState } from 'react';
import { ShieldCheck, User, Building2, Check, ExternalLink } from 'lucide-react';
import { LogoFull } from './Logo';

interface SignUpModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onOpenTrustPage: () => void;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onComplete,
  onOpenTrustPage,
}) => {
  const [hasAgreed, setHasAgreed] = useState<boolean>(false);
  const [name, setName] = useState<string>('Priya Patel');
  const [email, setEmail] = useState<string>('priya.patel@example.ca');
  const [role, setRole] = useState<'parent' | 'centre'>('parent');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAgreed) return;
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-cq-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-cq-stone-200 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 my-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <LogoFull size={40} />
          </div>
          <h2 className="text-xl font-bold text-cq-stone-900 tracking-tight">
            Create Your CareQ Account
          </h2>
          <p className="text-xs text-cq-stone-500 leading-relaxed">
            Welcome to CareQ. Sign up to manage Ontario licensed child care intake, document checklists, and queue communications.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Choice */}
          <div>
            <label className="block text-xs font-semibold text-cq-stone-700 mb-1.5 uppercase tracking-wider">
              I am registering as:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('parent')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'parent'
                    ? 'border-cq-brand bg-cq-brand text-white shadow-xs'
                    : 'border-cq-stone-200 bg-cq-stone-50 text-cq-stone-700 hover:bg-cq-stone-100'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Parent</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('centre')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  role === 'centre'
                    ? 'border-cq-brand bg-cq-brand text-white shadow-xs'
                    : 'border-cq-stone-200 bg-cq-stone-50 text-cq-stone-700 hover:bg-cq-stone-100'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Centre Staff</span>
              </button>
            </div>
          </div>

          {/* Name & Email inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-cq-stone-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-cq-stone-200 focus:outline-hidden focus:ring-2 focus:ring-cq-secondary/30 focus:border-cq-secondary"
                placeholder="e.g. Priya Patel"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-cq-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-cq-stone-200 focus:outline-hidden focus:ring-2 focus:ring-cq-secondary/30 focus:border-cq-secondary"
                placeholder="e.g. priya.patel@example.ca"
              />
            </div>
          </div>

          {/* Required one-time terms and AI checkbox */}
          <div className="p-3.5 rounded-xl bg-cq-stone-50 border border-cq-stone-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-cq-brand focus:ring-cq-secondary border-cq-stone-300 shrink-0"
              />
              <span className="text-xs text-cq-stone-800 leading-snug font-medium select-none">
                I have read the terms and how CareQ uses AI.
              </span>
            </label>

            <div className="pl-6.5 text-[11px] text-cq-stone-500 flex items-center gap-1">
              <button
                type="button"
                onClick={onOpenTrustPage}
                className="text-cq-brand hover:text-cq-secondary font-semibold underline inline-flex items-center gap-0.5"
              >
                <span>Read our Trust and transparency terms</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!hasAgreed}
            className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              hasAgreed
                ? 'bg-cq-brand hover:bg-cq-brand-hover text-white shadow-xs cursor-pointer'
                : 'bg-cq-stone-200 text-cq-stone-400 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Complete Sign-Up</span>
          </button>
        </form>
      </div>
    </div>
  );
};
