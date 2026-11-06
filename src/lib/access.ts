/**
 * Who may see and change what. Pure functions, used by the server (MongoDB mode) and by
 * browser-only local mode, and unit-tested. Anything not allowed here is a 403.
 *
 *  - A parent sees only their own children, applications (incl. drafts), conversations,
 *    notifications and support requests.
 *  - A centre sees only its own centre's SENT applications (never drafts), its conversations,
 *    its notifications and its staff's support requests; it changes only its own centre.
 *  - Partner centres' public details are visible to everyone.
 */
import type { Application, InAppNotification } from '../data/mockData';
import type { Actor, ChildRecord, ConversationRecord, SupportRequestRecord } from './world';

export class AccessError extends Error {
  status = 403;
  constructor(message = "You don't have access to this.") {
    super(message);
  }
}
export class NotFoundError extends Error {
  status = 404;
  constructor(message = 'Not found.') {
    super(message);
  }
}
export class InputError extends Error {
  status = 400;
}

export const isParent = (a: Actor) => a.role === 'parent';
export const isCentreStaff = (a: Actor) => a.role === 'centre' && Boolean(a.centreId);

export function canReadApplication(actor: Actor, app: Application): boolean {
  if (isParent(actor)) return app.parentAccountId === actor.accountId;
  if (isCentreStaff(actor)) return app.centreId === actor.centreId && app.status !== 'Draft';
  return false;
}

/** Parent edits to their own draft (documents, note, AI draft). */
export const canEditDraft = (actor: Actor, app: Application) =>
  isParent(actor) && app.parentAccountId === actor.accountId && app.status === 'Draft';

export const canSubmit = canEditDraft;

export const canWithdraw = (actor: Actor, app: Application) =>
  isParent(actor) &&
  app.parentAccountId === actor.accountId &&
  app.status !== 'Draft' &&
  app.status !== 'Withdrawn' &&
  app.status !== 'Accepted';

export const canAcceptOffer = (actor: Actor, app: Application) =>
  isParent(actor) && app.parentAccountId === actor.accountId && app.status === 'Offer';

/** Centre status changes: only its own centre's sent, still-open applications. */
export const canSetStatus = (actor: Actor, app: Application) =>
  isCentreStaff(actor) &&
  app.centreId === actor.centreId &&
  app.status !== 'Draft' &&
  app.status !== 'Withdrawn' &&
  app.status !== 'Accepted';

export const canUpdateCentre = (actor: Actor, centreId: string) => isCentreStaff(actor) && actor.centreId === centreId;

export function canReadConversation(actor: Actor, c: Pick<ConversationRecord, 'centreId' | 'parentAccountId'>): boolean {
  if (isParent(actor)) return c.parentAccountId === actor.accountId;
  if (isCentreStaff(actor)) return c.centreId === actor.centreId;
  return false;
}

/**
 * Starting or continuing a conversation.
 *  - Parent: about their own child, with any partner centre (enquiries before applying are fine).
 *  - Centre: only with a family that has sent it an application, or that already wrote to it.
 */
export function canMessage(
  actor: Actor,
  target: { centreId: string; childId: string },
  ctx: { childOwnerId?: string; sentApplicationExists: boolean; conversationExists: boolean }
): boolean {
  if (isParent(actor)) return ctx.childOwnerId === actor.accountId;
  if (isCentreStaff(actor)) {
    return target.centreId === actor.centreId && (ctx.sentApplicationExists || ctx.conversationExists);
  }
  return false;
}

/** Notifications are addressed to a parent account or a centre. */
export const recipientIdOf = (actor: Actor) => (isCentreStaff(actor) ? actor.centreId! : actor.accountId);
export const canReadNotification = (actor: Actor, n: InAppNotification) => n.recipientId === recipientIdOf(actor);

export const canReadChild = (actor: Actor, c: ChildRecord) => isParent(actor) && c.parentAccountId === actor.accountId;

export const canReadSupportRequest = (actor: Actor, r: SupportRequestRecord) => r.submittedByAccountId === actor.accountId;

/** Throws a 403 unless allowed. */
export function assertAllowed(allowed: boolean, message?: string): asserts allowed {
  if (!allowed) throw new AccessError(message);
}
