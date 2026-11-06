import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { clearDemoStorage, suspendSaving } from '../lib/demoStorage';

/** Clears the saved demo (this browser only) and reloads with the original mock data. */
export function resetDemoAndReload() {
  suspendSaving(); // a pending debounced save must not write the old state back
  clearDemoStorage();
  window.location.reload();
}

interface ResetDemoProps {
  /** "sidebar": button + note under it; "link": small inline link (login page, footer) */
  variant?: 'sidebar' | 'link';
  className?: string;
}

export const ResetDemo: React.FC<ResetDemoProps> = ({ variant = 'sidebar', className = '' }) => {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {variant === 'sidebar' ? (
        <div className={className}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 text-xs text-[#5B6B66] hover:text-[#173F42] pl-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset demo</span>
          </button>
          <p className="text-[10px] text-[#7A8A84] pl-2 mt-1">Demo data is saved only in this browser.</p>
        </div>
      ) : (
        <span className={`inline-flex flex-col items-center sm:items-start ${className}`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs text-[#5B6B66] hover:text-[#173F42] underline cursor-pointer"
          >
            Reset demo
          </button>
          <span className="text-[10px] text-[#7A8A84]">Demo data is saved only in this browser.</span>
        </span>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#173F42]/40 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-demo-title"
            aria-describedby="reset-demo-desc"
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full rounded-2xl bg-white border border-[#E7E4DA] p-6 shadow-xl space-y-4"
          >
            <h3 id="reset-demo-title" className="text-lg font-bold text-[#173F42]">
              Reset the demo?
            </h3>
            <p id="reset-demo-desc" className="text-sm text-[#5B6B66]">
              This clears everything saved in this browser: applications, drafts, messages, notifications,
              support requests, new accounts, centre changes and your shortlist. The demo goes back to its
              original data.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-xl border border-[#E7E4DA] bg-white text-sm font-semibold text-[#173F42] hover:bg-[#FAF9F4] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={resetDemoAndReload}
                className="h-10 px-4 rounded-xl bg-[#A4543A] hover:bg-[#8C4530] text-white text-sm font-semibold cursor-pointer"
              >
                Reset demo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
