/**
 * What the parent's Home and Updates pages show, built from data the app already has:
 * the parent's notifications (waitlist positions, offers, status changes) and the centres'
 * messages in their conversations. Nothing here is stored; it's derived on every render.
 */
import type { Application, Centre, ChatMessage, InAppNotification } from '../data/mockData';
import { conversationKey } from '../data/mockData';

export type UpdateKind = 'waitlist' | 'offer' | 'application' | 'message';

export interface ParentUpdate {
  id: string;
  kind: UpdateKind;
  /** "Waitlist position updated", "Offer received", "Application updated", "Message from the centre". */
  headline: string;
  /** "Waitlist · Macaulay · Nov 4" */
  label: string;
  text: string;
  centreId?: string;
  centreName?: string;
  /** The parent's application this update is about (opens it in My applications). */
  applicationId?: string;
  /** Notifications: their read flag. Centre messages: not in the parent's read list and not replied to since. */
  unread: boolean;
  notificationId?: string;
  /** Centre messages only: the chat message id (used to mark it read). */
  messageId?: string;
  sortKey: number;
}

const KIND: Record<UpdateKind, { word: string; headline: string }> = {
  waitlist: { word: 'Waitlist', headline: 'Waitlist position updated' },
  offer: { word: 'Offer', headline: 'Offer received' },
  application: { word: 'Application', headline: 'Application updated' },
  message: { word: 'Message', headline: 'Message from the centre' },
};

const kindOf = (type: InAppNotification['type']): UpdateKind =>
  type === 'position' ? 'waitlist' : type === 'offer' ? 'offer' : 'application';

/** "Macaulay - Dovercourt Child Care Centre" -> "Macaulay"; "Leaside Day Care Centre (Rolph Road…)" -> "Leaside Day Care Centre". */
export const shortCentreName = (name: string) => name.split(/\s+[-–(]\s*/)[0].trim() || name;

/** Parent notifications start with the centre's name ("Macaulay - … made an offer …"): the longest match wins. */
export function centreInMessage(message: string, centres: Pick<Centre, 'id' | 'name'>[]) {
  return centres
    .filter((c) => c.name && message.startsWith(c.name))
    .sort((a, b) => b.name.length - a.name.length)[0];
}

/** The parent's application at a centre (the one naming the child, when there are several). */
function applicationAt(applications: Application[], centreId: string, text = '', childId?: string) {
  const here = applications.filter((a) => a.centreId === centreId && (!childId || a.childId === childId));
  return here.find((a) => a.status !== 'Draft' && text.includes(a.childName)) ?? here.find((a) => a.status !== 'Draft') ?? here[0];
}

/** "Nov 4, 2026 • 11:20 AM" -> { key: <time>, day: "Nov 4" } */
export function messageDate(timestamp: string): { key: number; day: string } {
  const key = Date.parse(timestamp.replace(/\s*•\s*/, ' '));
  return { key: Number.isNaN(key) ? 0 : key, day: timestamp.split(',')[0].trim() || timestamp };
}

const labelFor = (kind: UpdateKind, centreName: string | undefined, day: string) =>
  [KIND[kind].word, centreName && shortCentreName(centreName), day].filter(Boolean).join(' · ');

/** Every waitlist update, offer, status change and centre message for the parent, newest first. */
export function buildParentUpdates(input: {
  notifications: InAppNotification[];
  conversations: Record<string, ChatMessage[]>;
  applications: Application[];
  centres: Centre[];
  childIds: string[];
  /**
   * Centre message ids the parent has read (this browser). A centre message the parent replied after
   * is read too. Left out: centre messages count as read.
   */
  readMessageIds?: ReadonlySet<string>;
}): ParentUpdate[] {
  const { notifications, conversations, applications, centres, childIds, readMessageIds } = input;
  const out: ParentUpdate[] = [];

  for (const n of notifications) {
    if (n.recipientRole !== 'parent') continue;
    const kind = kindOf(n.type);
    const centre = centreInMessage(n.message, centres);
    out.push({
      id: n.id,
      kind,
      headline: KIND[kind].headline,
      label: labelFor(kind, centre?.name, n.timestamp),
      text: n.message,
      centreId: centre?.id,
      centreName: centre?.name,
      applicationId: centre ? applicationAt(applications, centre.id, n.message)?.id : undefined,
      unread: !n.read,
      notificationId: n.id,
      sortKey: n.createdAt,
    });
  }

  for (const centre of centres) {
    for (const childId of new Set(childIds)) {
      const messages = conversations[conversationKey(centre.id, childId)] ?? [];
      // The parent answered after it: they've read it (messages are stored in the order they were sent)
      let lastParentReply = -1;
      messages.forEach((m, i) => {
        if (m.sender === 'parent') lastParentReply = i;
      });
      messages.forEach((m, i) => {
        if (m.sender !== 'centre') return;
        const { key, day } = messageDate(m.timestamp);
        out.push({
          id: `msg-${m.id}`,
          kind: 'message',
          headline: KIND.message.headline,
          label: labelFor('message', centre.name, day),
          text: m.text,
          centreId: centre.id,
          centreName: centre.name,
          applicationId: applicationAt(applications, centre.id, '', childId)?.id,
          unread: readMessageIds ? i > lastParentReply && !readMessageIds.has(m.id) : false,
          messageId: m.id,
          sortKey: key,
        });
      });
    }
  }

  return out.sort((a, b) => b.sortKey - a.sortKey);
}

export interface AttentionItem {
  id: string;
  title: string;
  detail: string;
  cta: string;
  tab: 'apply' | 'track' | 'updates';
  applicationId?: string;
}

/**
 * Home: at most 3 things that need the parent, most urgent first:
 * offers to respond to, new (unread) waitlist or status updates, then drafts to finish or send.
 */
export function attentionItems(input: {
  applications: Application[];
  centres: Centre[];
  updates: ParentUpdate[];
  max?: number;
}): AttentionItem[] {
  const { applications, centres, updates, max = 3 } = input;
  const nameOf = (id: string) => centres.find((c) => c.id === id)?.name ?? 'The centre';
  const items: AttentionItem[] = [];

  for (const a of applications.filter((x) => x.status === 'Offer')) {
    items.push({
      id: `offer-${a.id}`,
      title: 'Respond to your offer',
      detail: `${nameOf(a.centreId)} has a spot for ${a.childName}.`,
      cta: 'Review offer',
      tab: 'track',
      applicationId: a.id,
    });
  }

  for (const u of updates.filter((x) => x.unread && (x.kind === 'waitlist' || x.kind === 'application'))) {
    items.push({
      id: `update-${u.id}`,
      title: u.kind === 'waitlist' ? 'New waitlist position' : 'Application updated',
      detail: u.text,
      cta: 'See application',
      tab: u.applicationId ? 'track' : 'updates',
      applicationId: u.applicationId,
    });
  }

  for (const a of applications.filter((x) => x.status === 'Draft')) {
    const centre = centres.find((c) => c.id === a.centreId);
    const missing = (centre?.requirements ?? []).filter((r) => !a.completedRequirements.includes(r) && !a.uploadedDocuments?.[r]).length;
    items.push({
      id: `draft-${a.id}`,
      title: missing ? 'Finish your draft' : 'Ready to send',
      detail: missing
        ? `${nameOf(a.centreId)}: ${missing} document${missing === 1 ? '' : 's'} still missing.`
        : `${nameOf(a.centreId)}: your checklist is complete.`,
      cta: 'Open Drafts',
      tab: 'apply',
      applicationId: a.id,
    });
  }

  return items.slice(0, max);
}

/** Home's counts: drafts being prepared, applications sent (not withdrawn), offers open. */
export const applicationCounts = (applications: Application[]) => ({
  preparing: applications.filter((a) => a.status === 'Draft').length,
  sent: applications.filter((a) => a.status !== 'Draft' && a.status !== 'Withdrawn').length,
  offers: applications.filter((a) => a.status === 'Offer').length,
});
