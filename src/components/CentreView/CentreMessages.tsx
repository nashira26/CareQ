import React from 'react';
import { shortRef } from '../../lib/centreQueue';
import { Centre, Application, ConversationsMap, conversationKey } from '../../data/mockData';
import {
  PageHeader,
  Card,
  GhostButton,
  IconTile,
  DemoBanner,
  SimNote,
} from '../ui/CareUI';
import { Heart, PenLine, MessageCircle } from 'lucide-react';
import { EmptyState, SpotMessages } from '../ui/Illustrations';

export interface CentreMessagesProps {
  singleCentre: Centre;
  applications: Application[];
  conversations: ConversationsMap;
  onOpenConversation: (application: Application) => void;
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

export const CentreMessages: React.FC<CentreMessagesProps> = ({
  singleCentre,
  applications,
  conversations,
  onOpenConversation,
}) => {
  const centreApps = applications.filter(
    (a) =>
      a.centreId === singleCentre.id &&
      a.status !== 'Withdrawn' &&
      a.status !== 'Draft'
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <PageHeader
        title="Family messages"
        subtitle="Read and reply to simulated family messages. AI can help you draft; you approve every message. Nothing leaves this browser."
      />

      <DemoBanner title="Demo workspace.">
        Every application, queue position, offer and message here is simulated. No real family is contacted.
      </DemoBanner>

      <Card>
        {centreApps.length === 0 ? (
          <EmptyState title="No families to message yet." spot={<SpotMessages />} />
        ) : (
          <div className="divide-y divide-cq-line">
            {centreApps.map((app) => {
              const convKey = conversationKey(singleCentre.id, app.childId);
              const thread = conversations[convKey] || [];
              const lastMessage = thread.length > 0 ? thread[thread.length - 1] : null;

              return (
                <div key={app.id} className="py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-mint text-sm font-extrabold text-brand flex items-center justify-center shrink-0">
                    {getInitials(app.parentName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      <span className="text-sm font-bold text-cq-ink">
                        {app.parentName}
                      </span>
                      <span className="text-xs text-cq-soft">
                        {' · '}
                        {app.childName}
                      </span>
                    </div>
                    <p className="text-sm text-ink-muted truncate mt-0.5">
                      {lastMessage
                        ? lastMessage.text
                        : 'No messages yet. Start a conversation.'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-cq-soft">
                        {shortRef(app.id)} · {app.status}
                      </span>
                      {lastMessage?.aiAssisted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-mint text-brand text-xs font-bold px-2 py-0.5">
                          <PenLine className="w-3.5 h-3.5" aria-hidden="true" />
                          AI-assisted draft
                        </span>
                      )}
                    </div>
                  </div>
                  </div>

                  <GhostButton
                    onClick={() => onOpenConversation(app)}
                    className="h-10 shrink-0 self-start sm:self-auto"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    Open messages
                  </GhostButton>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <SimNote>
        Messages are drafted with AI only when you ask, and sent only when you press Send.
      </SimNote>
    </div>
  );
};
