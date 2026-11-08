import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { coverageFor } from '../data/policyCoverage';
import { openAskCareQ } from '../lib/askCareQ';
import { useHasDocuments } from '../lib/documentCoverage';

/**
 * "Ask about this centre" for centres whose operator handbook is indexed, or which uploaded their own
 * documents (server list); otherwise "No published documents for this centre yet." (or nothing, with hideWhenUncovered).
 */
export const AskAboutCentre: React.FC<{ centreId: string; centreName: string; hideWhenUncovered?: boolean; className?: string }> = ({
  centreId,
  centreName,
  hideWhenUncovered = false,
  className = '',
}) => {
  const hasDocuments = useHasDocuments(centreId);
  if (!coverageFor(centreId) && !hasDocuments) {
    return hideWhenUncovered ? null : <p className={`text-[11px] text-[#7A8A84] ${className}`}>No published documents for this centre yet.</p>;
  }
  return (
    <button
      type="button"
      onClick={() => openAskCareQ({ centreId, centreName })}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B4A52] hover:underline cursor-pointer ${className}`}
    >
      <MessageCircleQuestion className="w-3.5 h-3.5" />
      Ask about this centre
    </button>
  );
};
