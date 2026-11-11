import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, ArrowRight } from 'lucide-react';
import { bellPreview, type ParentUpdate } from '../lib/parentUpdates';

interface ParentUpdatesBellProps {
  /** The same list the Updates tab shows (buildParentUpdates), so the counts always agree. */
  updates: ParentUpdate[];
  /** Marks the update read and opens it: its application in My applications, or the conversation for a message. */
  onOpenUpdate: (update: ParentUpdate) => void;
  onMarkAllAsRead: () => void;
  /** Opens the Updates tab. */
  onSeeAll: () => void;
}

/** Parent bell: a quick preview of the Updates tab (latest unread only; filters and Reply live in Updates). */
export const ParentUpdatesBell: React.FC<ParentUpdatesBellProps> = ({ updates, onOpenUpdate, onMarkAllAsRead, onSeeAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { count, items: shown } = bellPreview(updates);

  useEffect(() => {
    if (!isOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const close = (then: () => void) => () => {
    setIsOpen(false);
    then();
  };

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications (${count} unread)`}
        title="Notifications"
        className={`relative p-2 rounded-xl transition-all border shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-cq-secondary/30 ${
          isOpen ? 'bg-cq-stone-100 border-cq-stone-300 text-cq-brand' : 'bg-white border-cq-stone-200 text-cq-stone-700 hover:text-cq-brand hover:bg-cq-stone-50'
        }`}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {count > 0 && (
          <span
            data-testid="bell-count"
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-coral rounded-full shadow-xs ring-2 ring-white"
          >
            {count}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Latest updates"
          // Phones: full width with 16px gutters, just under the bell (the bell isn't at the screen edge)
          className="absolute right-0 mt-2 w-96 max-sm:fixed max-sm:inset-x-4 max-sm:w-auto bg-white rounded-2xl shadow-xl border border-cq-line z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150"
        >
          <div className="px-4 py-3 border-b border-cq-line flex items-center justify-between gap-2">
            <span className="font-bold text-sm text-brand">Updates</span>
            {count > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-mint text-brand">{count} unread</span>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <Check className="w-7 h-7 text-cq-sage-ink mx-auto mb-2" aria-hidden="true" />
              <p className="text-sm font-semibold text-ink">You're up to date.</p>
            </div>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto divide-y divide-cq-line">
              {shown.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={close(() => onOpenUpdate(u))}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-page transition-colors cursor-pointer"
                  >
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-coral shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink-muted truncate">{u.label}</span>
                      <span className="block text-sm font-bold text-ink mt-0.5">{u.headline}</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-ink-muted shrink-0 mt-2" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="px-4 py-2.5 border-t border-cq-line bg-page flex items-center justify-between gap-3">
            {count > 0 ? (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-xs font-semibold text-cq-sage-ink hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" /> Mark all as read
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={close(onSeeAll)}
              className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              See all updates <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
