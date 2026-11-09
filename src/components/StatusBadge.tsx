import React from 'react';
import { ApplicationStatus } from '../data/mockData';
import { Clock, AlertCircle, FileText, Check, Ban, Sparkles } from 'lucide-react';
import { SimTag } from './ui/CareUI';

interface StatusBadgeProps {
  status: ApplicationStatus;
  waitlistPosition?: number;
  size?: 'sm' | 'md';
  /** Every non-draft status in the demo is simulated; set false only where a tag is already shown next to it. */
  simulated?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, waitlistPosition, size, simulated = true }) => {
  const badge = <Badge status={status} waitlistPosition={waitlistPosition} size={size} />;
  // A draft is the parent's own unsent work, not a simulated centre status
  if (!simulated || status === 'Draft' || !badge) return badge;
  return (
    <span className="inline-flex items-center gap-1">
      {badge}
      <SimTag />
    </span>
  );
};

const Badge: React.FC<Omit<StatusBadgeProps, 'simulated'>> = ({ status, waitlistPosition }) => {
  const base = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold select-none';

  switch (status) {
    case 'Draft':
      return (
        <span className={`${base} bg-cq-surface-stone-2 text-cq-muted-2 border-cq-line`}>
          <FileText className="w-3 h-3 text-cq-muted-2" />
          Draft
        </span>
      );
    case 'Submitted':
      return (
        <span className={`${base} bg-cq-sky text-cq-sky-ink border-cq-sky-line`}>
          <Clock className="w-3 h-3 text-cq-sky-ink" />
          Submitted
        </span>
      );
    case 'Under review':
      return (
        <span className={`${base} bg-cq-cream-amber text-cq-amber-ink border-cq-amber-line`}>
          <AlertCircle className="w-3 h-3 text-cq-amber-ink" />
          Under review
        </span>
      );
    case 'Waitlisted':
      return (
        <span className={`${base} bg-cq-lilac-50 text-cq-lilac-ink border-cq-lilac-line`}>
          <Clock className="w-3 h-3 text-cq-lilac-ink" />
          Waitlisted {waitlistPosition ? `(#${waitlistPosition})` : ''}
        </span>
      );
    case 'Offer':
      return (
        <span className={`${base} bg-cq-cream-amber-2 text-cq-amber-ink-2 border-cq-accent`}>
          <Sparkles className="w-3 h-3 text-cq-amber-ink-2" />
          Offer Available
        </span>
      );
    case 'Accepted':
      return (
        <span className={`${base} bg-cq-sage text-cq-sage-ink-4 border-cq-sage-200`}>
          <Check className="w-3 h-3 text-cq-sage-ink-4" />
          Accepted
        </span>
      );
    case 'Withdrawn':
      return (
        <span className={`${base} bg-cq-surface-stone-2 text-cq-faint border-cq-line line-through`}>
          <Ban className="w-3 h-3 text-cq-faint" />
          Withdrawn
        </span>
      );
    default:
      return null;
  }
};
