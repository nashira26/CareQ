import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { SpotJourney } from './Illustrations';

export interface StepCompleteInfo {
  /** One plain line under the heading, e.g. "Your application was sent to {centre}." */
  message: string;
}

/**
 * Brief, friendly confirmation after a parent finishes a step (sending an application,
 * accepting an offer). Announced politely to screen readers; closes itself after a few seconds.
 */
export const StepComplete: React.FC<{ info: StepCompleteInfo | null; onClose: () => void }> = ({ info, onClose }) => {
  useEffect(() => {
    if (!info) return;
    const t = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(t);
  }, [info, onClose]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 lg:bottom-8 z-[70] flex justify-center px-4">
      {info && (
        <div
          role="status"
          className="pointer-events-auto w-full max-w-sm rounded-2xl bg-white border border-cq-line shadow-2xl p-4 flex items-center gap-4 animate-pop"
        >
          <SpotJourney animate className="w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-brand">You’ve completed this step</p>
            <p className="text-sm text-ink-muted mt-0.5">{info.message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="self-start -mr-1 -mt-1 w-9 h-9 rounded-lg inline-flex items-center justify-center text-ink-muted hover:bg-stone cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
