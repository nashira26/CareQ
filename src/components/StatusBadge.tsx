import React from 'react';
import { ApplicationStatus } from '../data/mockData';
import { Clock, CheckCircle2, AlertCircle, FileText, Check, Ban, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: ApplicationStatus;
  waitlistPosition?: number;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  waitlistPosition,
  size = 'md',
}) => {
  const isSmall = size === 'sm';
  const padding = isSmall ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs sm:text-sm';

  switch (status) {
    case 'Draft':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${padding}`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          Draft
        </span>
      );
    case 'Submitted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${padding}`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-600" />
          Submitted
        </span>
      );
    case 'Under review':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${padding}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          Under review
        </span>
      );
    case 'Waitlisted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${padding}`}
        >
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          Waitlisted {waitlistPosition ? `(#${waitlistPosition})` : ''}
        </span>
      );
    case 'Offer':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-[#F9BE2F] text-[#451A03] border border-[#E0A31A] shadow-2xs ${padding}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#6D4200]" />
          Offer Available
        </span>
      );
    case 'Accepted':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-[#45B5A5]/20 text-[#0B4A52] border border-[#45B5A5]/40 ${padding}`}
        >
          <Check className="w-3.5 h-3.5 text-[#0B4A52]" />
          Accepted
        </span>
      );
    case 'Withdrawn':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-zinc-100 text-zinc-500 line-through border border-zinc-200 ${padding}`}
        >
          <Ban className="w-3.5 h-3.5 text-zinc-400" />
          Withdrawn
        </span>
      );
    default:
      return null;
  }
};
