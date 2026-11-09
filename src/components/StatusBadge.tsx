import React from 'react';
import { ApplicationStatus } from '../data/mockData';
import { FileText, Send, Search, ListOrdered, Gift, Check, Ban } from 'lucide-react';
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
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {badge}
      <SimTag />
    </span>
  );
};

/**
 * One colour and one icon per status, so colour is never the only cue.
 * Wording is the product's status wording; only the waitlist position format is "Waitlisted · #4".
 */
const STYLES: Record<ApplicationStatus, { cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  Draft: { cls: 'bg-stone text-status-draft border border-dashed border-[#A7ADA9]', Icon: FileText },
  Submitted: { cls: 'bg-info-bg text-info border border-transparent', Icon: Send },
  'Under review': { cls: 'bg-peach text-status-review border border-transparent', Icon: Search },
  Waitlisted: { cls: 'bg-status-wait-bg text-status-wait border border-transparent', Icon: ListOrdered },
  Offer: { cls: 'bg-sun text-status-offer border border-transparent', Icon: Gift },
  Accepted: { cls: 'bg-mint text-leaf-ink border border-transparent', Icon: Check },
  Withdrawn: { cls: 'bg-stone text-status-withdrawn border border-transparent line-through', Icon: Ban },
};

const LABEL: Record<ApplicationStatus, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  'Under review': 'Under review',
  Waitlisted: 'Waitlisted',
  Offer: 'Offer Available',
  Accepted: 'Accepted',
  Withdrawn: 'Withdrawn',
};

const Badge: React.FC<Omit<StatusBadgeProps, 'simulated'>> = ({ status, waitlistPosition }) => {
  const s = STYLES[status];
  if (!s) return null;
  const { cls, Icon } = s;
  const label = status === 'Waitlisted' && waitlistPosition ? `Waitlisted · #${waitlistPosition}` : LABEL[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[26px] rounded-full px-2.5 text-xs font-bold leading-none whitespace-nowrap select-none transition-colors duration-300 ${cls}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
};
