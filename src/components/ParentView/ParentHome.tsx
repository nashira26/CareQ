import React, { useState } from 'react';
import type { ParentUpdate, UpdateKind } from '../../lib/parentUpdates';
import { PageHeader, GhostButton, Card, IconTile } from '../ui/CareUI';
import { TrendingUp, Gift, FileText, MessageSquare, Check, ArrowRight } from 'lucide-react';
import { SpotMessages, EmptyState } from '../ui/Illustrations';

interface ParentHomeProps {
  /** Built by buildParentUpdates: notifications and centre messages, newest first. */
  updates: ParentUpdate[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  /** Opens that application in My applications. */
  onOpenApplication: (applicationId: string) => void;
}

type Filter = 'all' | 'waitlist' | 'offers' | 'applications';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'offers', label: 'Offers' },
  { id: 'applications', label: 'Applications' },
];

const ICON: Record<UpdateKind, { icon: typeof Gift; tone: 'sand' | 'lilac' | 'sage' | 'peach' }> = {
  waitlist: { icon: TrendingUp, tone: 'lilac' },
  offer: { icon: Gift, tone: 'sand' },
  application: { icon: FileText, tone: 'sage' },
  message: { icon: MessageSquare, tone: 'peach' },
};

/** Updates: one job, a dated feed of everything centres sent about the parent's applications. */
export const ParentHome: React.FC<ParentHomeProps> = ({ updates, onMarkAsRead, onMarkAllAsRead, onOpenApplication }) => {
  const [activeFilter, setActiveFilter] = useState<Filter>('all');

  const shown = updates.filter((u) => {
    if (activeFilter === 'waitlist') return u.kind === 'waitlist';
    if (activeFilter === 'offers') return u.kind === 'offer';
    if (activeFilter === 'applications') return u.kind === 'application';
    return true;
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title="Updates"
        subtitle="Every waitlist update, offer and message from your centres, with the date."
        action={
          <GhostButton onClick={onMarkAllAsRead}>
            <Check className="w-4 h-4" aria-hidden="true" /> Mark all as read
          </GhostButton>
        }
      />

      <Card className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-cq-line">
          <h2 className="text-lg font-extrabold text-brand">Latest updates</h2>
        </div>

        {/* Filters as underline text tabs */}
        <div className="flex items-center gap-6 text-sm border-b border-cq-line -mt-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={activeFilter === f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`pb-3 font-medium transition-colors cursor-pointer border-b-2 -mb-[1px] whitespace-nowrap ${
                activeFilter === f.id ? 'text-cq-ink font-semibold border-cq-ink' : 'text-cq-muted hover:text-cq-ink border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <EmptyState title="No updates yet." spot={<SpotMessages />}>
            When a centre updates your application, it appears here.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {shown.map((u) => (
              <li
                key={u.id}
                className={`p-4 rounded-xl border border-cq-line bg-white flex items-start gap-4 ${
                  u.unread ? 'border-l-4 border-l-coral shadow-sm' : ''
                }`}
              >
                <IconTile icon={ICON[u.kind].icon} tone={ICON[u.kind].tone} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-cq-soft flex items-center gap-2">
                    <span>{u.label}</span>
                    {u.unread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cq-sage-ink inline-block shrink-0" aria-label="Unread" />
                    )}
                  </p>
                  <h3 className="text-[15px] font-bold text-cq-ink mt-0.5">{u.headline}</h3>
                  <p className="text-sm text-cq-muted mt-1 leading-relaxed line-clamp-3">{u.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {u.applicationId && (
                      <button
                        type="button"
                        onClick={() => onOpenApplication(u.applicationId!)}
                        className="text-xs font-semibold text-cq-brand hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Open in My applications <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                    {u.unread && u.notificationId && (
                      <button
                        type="button"
                        onClick={() => onMarkAsRead(u.notificationId!)}
                        className="text-xs font-semibold text-cq-sage-ink hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Mark as read <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};
