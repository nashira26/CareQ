import React from 'react';
import { ApplicationStatus } from '../data/mockData';
import { statusLabel } from '../lib/centreQueue';
import { FileText, Send, Search, ListOrdered, Gift, Check, Ban } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus;
  waitlistPosition?: number;
  size?: 'sm' | 'md';
  /** Who is looking: centres see "Received" where parents see "Submitted". */
  viewer?: 'parent' | 'centre';
}

/** No "Simulated" tag here: demo accounts see one banner at the top of every portal screen instead. */
export const StatusBadge: React.FC<StatusBadgeProps> = (props) => <Badge {...props} />;

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

const Badge: React.FC<StatusBadgeProps> = ({ status, waitlistPosition, viewer }) => {
  const s = STYLES[status];
  if (!s) return null;
  const { cls, Icon } = s;
  const label = status === 'Waitlisted' && waitlistPosition ? `Waitlisted · #${waitlistPosition}` : statusLabel(status, viewer);
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[26px] rounded-full px-2.5 text-xs font-bold leading-none whitespace-nowrap select-none transition-colors duration-300 ${cls}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
};
