import React from 'react';
import { Centre, Application, ConversationsMap, conversationKey } from '../../data/mockData';
import {
  PageHeader,
  Card,
  GhostButton,
  IconTile,
  DemoBanner,
  SimNote,
} from '../ui/CareUI';
import { Heart } from 'lucide-react';

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
        eyebrow="Family communication"
        title="Clear words, calmer families."
        subtitle="Read and reply to simulated family messages. AI can help you draft; you approve every message. Nothing leaves this browser."
      />

      <DemoBanner title="Demo workspace.">
        Every application, queue position, offer and message here is simulated. No real family is contacted.
      </DemoBanner>

      <Card>
        {centreApps.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <IconTile icon={Heart} tone="sage" />
            <p className="text-sm font-semibold text-cq-ink">
              No families to message yet.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-cq-line">
            {centreApps.map((app) => {
              const convKey = conversationKey(singleCentre.id, app.childId);
              const thread = conversations[convKey] || [];
              const lastMessage = thread.length > 0 ? thread[thread.length - 1] : null;

              return (
                <div key={app.id} className="py-6 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-cq-sage border border-cq-sage-line-2 text-[11px] font-bold text-cq-sage-ink flex items-center justify-center shrink-0">
                    {getInitials(app.parentName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      <span className="text-sm font-bold text-cq-ink">
                        {app.parentName}
                      </span>
                      <span className="text-[11px] text-cq-soft">
                        {' · '}
                        {app.childName}
                      </span>
                    </div>
                    <p className="text-sm text-cq-sage-ink truncate mt-0.5">
                      {lastMessage
                        ? lastMessage.text
                        : 'No messages yet. Start a conversation.'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-cq-soft">
                        {app.id} · {app.status}
                      </span>
                      {lastMessage?.aiAssisted && (
                        <span className="rounded-full bg-cq-lilac text-cq-lilac-ink text-[10px] font-semibold px-2 py-0.5">
                          AI-assisted draft
                        </span>
                      )}
                    </div>
                  </div>

                  <GhostButton
                    onClick={() => onOpenConversation(app)}
                    className="h-10 text-xs shrink-0"
                  >
                    Open messages →
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
