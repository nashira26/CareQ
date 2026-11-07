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
        <span className={`${base} bg-[#F3F1EA] text-[#6E7C77] border-[#E7E4DA]`}>
          <FileText className="w-3 h-3 text-[#6E7C77]" />
          Draft
        </span>
      );
    case 'Submitted':
      return (
        <span className={`${base} bg-[#E8F1F4] text-[#3F6E7E] border-[#CFE0E6]`}>
          <Clock className="w-3 h-3 text-[#3F6E7E]" />
          Submitted
        </span>
      );
    case 'Under review':
      return (
        <span className={`${base} bg-[#FDF3DD] text-[#8A6411] border-[#F2D9A0]`}>
          <AlertCircle className="w-3 h-3 text-[#8A6411]" />
          Under review
        </span>
      );
    case 'Waitlisted':
      return (
        <span className={`${base} bg-[#EFEAF7] text-[#6B5B95] border-[#D9D0EC]`}>
          <Clock className="w-3 h-3 text-[#6B5B95]" />
          Waitlisted {waitlistPosition ? `(#${waitlistPosition})` : ''}
        </span>
      );
    case 'Offer':
      return (
        <span className={`${base} bg-[#FFF4D6] text-[#7A5A00] border-[#F9BE2F]`}>
          <Sparkles className="w-3 h-3 text-[#7A5A00]" />
          Offer Available
        </span>
      );
    case 'Accepted':
      return (
        <span className={`${base} bg-[#E4ECE1] text-[#2F5E45] border-[#C9DCC2]`}>
          <Check className="w-3 h-3 text-[#2F5E45]" />
          Accepted
        </span>
      );
    case 'Withdrawn':
      return (
        <span className={`${base} bg-[#F3F1EA] text-[#9AA59F] border-[#E7E4DA] line-through`}>
          <Ban className="w-3 h-3 text-[#9AA59F]" />
          Withdrawn
        </span>
      );
    default:
      return null;
  }
};
