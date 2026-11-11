/**
 * Everything users can do, in one place, with the access rules applied before every write.
 * Runs on the server against MongoDB, and in the browser against local storage (DATA_MODE=local),
 * so both modes behave the same. Returns nothing: callers fetch a fresh scoped snapshot afterwards.
 */
import {
  Application,
  ApplicationStatus,
  ChatMessage,
  InAppNotification,
  LicenceVerification,
  conversationKey,
} from '../data/mockData';
import type { ConcernStep, SupportRequest } from '../data/helpData';
import {
  AccessError,
  InputError,
  NotFoundError,
  assertAllowed,
  canAcceptOffer,
  canEditDraft,
  canMessage,
  canReadApplication,
  canReadConversation,
  canReadSupportRequest,
  canSetStatus,
  canSubmit,
  canEditChild,
  canUpdateCentre,
  canWithdraw,
  isCentreStaff,
  isParent,
  recipientIdOf,
} from './access';
import type { Repo } from './repo';
import {
  AccountRecord,
  Actor,
  ApplicationRecord,
  DEMO_ACCOUNT_IDS,
  PasswordHasher,
  PublicAccount,
  Snapshot,
  SupportRequestRecord,
  actorOf,
} from './world';
import {
  CentreFormInput,
  Child,
  MIN_PASSWORD_LENGTH,
  ageInMonths,
  buildRegisteredCentre,
  childRecordError,
  findArea,
  isValidEmail,
  simulatedContactErrors,
  validateCentre,
} from './family';
import type { Area, FsaCentroids } from './rankCentres';
import { doesntServeLabel } from './searchCriteria';
import { shortCentreName } from './parentUpdates';
import { otherOpenApplications } from './offers';
import { NOT_PROVIDED, PreparedDraft } from './prepareApplication';

const shortDate = (now: Date) => now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const longDate = (now: Date) => now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const rid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ---------------- Snapshot ----------------

export async function toPublicAccount(repo: Repo, a: AccountRecord): Promise<PublicAccount> {
  const children = a.role === 'parent' ? (await repo.listChildren(a.id)).map(({ parentAccountId: _p, ...c }) => c) : undefined;
  return {
    id: a.id,
    role: a.role,
    email: a.email,
    name: a.name,
    centreId: a.centreId,
    centreName: a.centreName,
    onboarded: a.onboarded,
    children,
    isDemoAccount: DEMO_ACCOUNT_IDS.includes(a.id),
  };
}

/** Only what this user may see. Signed out: just the public partner centres. */
export async function getSnapshot(repo: Repo, account: AccountRecord | null): Promise<Snapshot> {
  const centres = await repo.listCentres();
  if (!account) {
    return { account: null, centres, applications: [], conversations: {}, notifications: [], supportRequests: [], preparedDrafts: {} };
  }
  const actor = actorOf(account);
  const apps = isParent(actor)
    ? await repo.listApplications({ parentAccountId: actor.accountId })
    : isCentreStaff(actor)
    ? await repo.listApplications({ centreId: actor.centreId })
    : [];
  const visible = apps.filter((a) => canReadApplication(actor, a));
  const preparedDrafts: Record<string, PreparedDraft> = {};
  const applications: Application[] = visible.map(({ preparedDraft, ...a }) => {
    if (preparedDraft && isParent(actor)) preparedDrafts[a.id] = preparedDraft; // parent-only
    // Centres never learn which other centre the family chose
    if (!isParent(actor) && a.withdrawal?.acceptedApplicationId) {
      const { acceptedApplicationId: _hidden, ...w } = a.withdrawal;
      return { ...a, withdrawal: w };
    }
    return a;
  });

  const convs = isParent(actor)
    ? await repo.listConversations({ parentAccountId: actor.accountId })
    : isCentreStaff(actor)
    ? await repo.listConversations({ centreId: actor.centreId })
    : [];
  const conversations = Object.fromEntries(convs.filter((c) => canReadConversation(actor, c)).map((c) => [c.key, c.messages]));

  const notifications = (await repo.listNotifications(recipientIdOf(actor))).sort((a, b) => b.createdAt - a.createdAt);
  const supportRequests = (await repo.listSupportRequests(actor.accountId))
    .filter((r) => canReadSupportRequest(actor, r))
    .map(({ submittedByAccountId: _s, ...r }) => r as SupportRequest);

  return { account: await toPublicAccount(repo, account), centres, applications, conversations, notifications, supportRequests, preparedDrafts };
}

// ---------------- Accounts ----------------

export async function signUp(
  repo: Repo,
  hasher: PasswordHasher,
  input: { role: 'parent' | 'centre'; name: string; email: string; password: string }
): Promise<AccountRecord> {
  const email = input.email.trim();
  if (!input.name.trim()) throw new InputError('Please enter your name.');
  if (!isValidEmail(email)) throw new InputError('Please enter a valid email address, like name@example.ca.');
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new InputError(`Please use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (await repo.findAccountByEmail(email)) throw new InputError('An account with this email already exists. Please log in instead.');
  const account: AccountRecord = {
    id: rid('acc'),
    role: input.role,
    email,
    name: input.name.trim().slice(0, 80),
    passwordHash: await hasher.hash(input.password),
    ...(input.role === 'parent' ? { onboarded: false } : {}),
    createdAt: new Date().toISOString(),
  };
  await repo.insertAccount(account);
  return account;
}

export async function logIn(
  repo: Repo,
  hasher: PasswordHasher,
  input: { role: 'parent' | 'centre'; email: string; password: string }
): Promise<AccountRecord> {
  const account = await repo.findAccountByEmail(input.email.trim());
  if (!account || account.role !== input.role) {
    throw new InputError(
      `We couldn't find a ${input.role === 'parent' ? 'parent' : 'centre'} account with that email. Check the email, or create an account.`
    );
  }
  if (!(await hasher.verify(input.password, account.passwordHash))) {
    throw new InputError(
      DEMO_ACCOUNT_IDS.includes(account.id)
        ? 'That password isn\'t right. The demo accounts use the password "password".'
        : "That password isn't right. Please try again."
    );
  }
  return account;
}

export async function completeOnboarding(repo: Repo, actor: Actor, children: Child[]) {
  assertAllowed(isParent(actor));
  const account = await repo.getAccount(actor.accountId);
  if (!account || account.onboarded) throw new InputError('Onboarding is already complete.');
  if (!children.length) throw new InputError('Please add at least one child.');
  for (const c of children) {
    const months = ageInMonths(c.dateOfBirth);
    if (Number.isNaN(months) || months < 0 || months >= 72) throw new InputError('CareQ is for children under 6 years old.');
  }
  await repo.insertChildren(children.map((c, i) => ({ ...c, id: `child-${actor.accountId}-${i + 1}`, parentAccountId: actor.accountId })));
  await repo.updateAccount(actor.accountId, { onboarded: true });
}

export async function registerCentre(
  repo: Repo,
  actor: Actor,
  input: CentreFormInput,
  photoDataUrl: string | undefined,
  areas: Area[],
  fsa: FsaCentroids,
  /** From the server's open-data check (server/licence.ts); never from the browser. */
  licenceVerified?: LicenceVerification
): Promise<string> {
  assertAllowed(actor.role === 'centre' && !actor.centreId, 'This account already manages a centre.');
  const errors = validateCentre(input, areas);
  const first = Object.values(errors)[0];
  if (first) throw new InputError(first);
  if (photoDataUrl && !/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl)) throw new InputError('The photo must be an image.');
  const built = buildRegisteredCentre(input, photoDataUrl, areas, fsa, rid('c-self'));
  const centre = licenceVerified ? { ...built, registration: { ...built.registration!, licenceVerified } } : built;
  await repo.insertCentre(centre);
  await repo.updateAccount(actor.accountId, { centreId: centre.id, centreName: centre.name });
  return centre.id;
}

/** Where a confirmed requirement came from in a published document (policy reader "Load a published document"). */
export interface RequirementCitationInput {
  /** "Parent Handbook (March 2026), PDF p.13" */
  citation: string;
  sourceUrl?: string | null;
}
export interface ExtractedFromInput {
  docTitle: string;
  sourceUrl?: string | null;
  sourceNote?: string | null;
  retrieved?: string | null;
}

/**
 * Confirmed requirements REPLACE the old ones together with their quotes, citations, links and the
 * document they came from, so nothing stale is left (pasted text: no citations).
 */
export async function updateRequirements(
  repo: Repo,
  actor: Actor,
  centreId: string,
  requirements: string[],
  sources: Record<string, string>,
  citations: Record<string, RequirementCitationInput> = {},
  extractedFrom?: ExtractedFromInput
) {
  assertAllowed(canUpdateCentre(actor, centreId), 'You can only change your own centre.');
  const clean = Array.from(new Set(requirements.map((r) => r.trim()).filter(Boolean)));
  const cited = clean.filter((r) => citations[r]?.citation?.trim());
  await repo.updateCentre(centreId, {
    requirements: clean,
    requirementSources: Object.fromEntries(clean.map((r) => [r, (sources[r] ?? '').trim()])),
    requirementCitations: cited.length ? Object.fromEntries(cited.map((r) => [r, citations[r].citation.trim()])) : undefined,
    requirementSourceUrls: cited.some((r) => citations[r].sourceUrl)
      ? Object.fromEntries(cited.filter((r) => citations[r].sourceUrl).map((r) => [r, String(citations[r].sourceUrl)]))
      : undefined,
    requirementsExtractedFrom:
      cited.length && extractedFrom?.docTitle
        ? {
            docTitle: extractedFrom.docTitle,
            ...(extractedFrom.sourceUrl ? { sourceUrl: extractedFrom.sourceUrl } : {}),
            ...(extractedFrom.sourceNote ? { sourceNote: extractedFrom.sourceNote } : {}),
            retrieved: extractedFrom.retrieved || new Date().toISOString().slice(0, 10),
          }
        : undefined,
  });
}

/** An uploaded document is recorded on the centre (self-registered centres only; the file itself is not kept). */
export async function recordCentreDocument(
  repo: Repo,
  actor: Actor,
  centreId: string,
  doc: { docKey: string; docTitle: string; fileName: string; chunks: number; keywordOnly: number },
  now = new Date()
) {
  assertAllowed(canUpdateCentre(actor, centreId), 'You can only change your own centre.');
  const centre = await repo.getCentre(centreId);
  if (!centre) throw new NotFoundError('Centre not found.');
  assertAllowed(Boolean(centre.registration), 'Only self-registered centres can upload documents.');
  const others = (centre.registration!.documents ?? []).filter((d) => d.docKey !== doc.docKey);
  await repo.updateCentre(centreId, {
    registration: { ...centre.registration!, documents: [...others, { ...doc, uploadedAt: now.toISOString() }] },
  });
}

// ---------------- Applications (parent) ----------------

async function activeChildOf(repo: Repo, actor: Actor): Promise<Child & { parentAccountId: string }> {
  const children = await repo.listChildren(actor.accountId);
  if (!children.length) throw new InputError('Please add your child first.');
  return children[0]; // the first child is the active child for now
}

async function ownApp(repo: Repo, actor: Actor, id: string, check: (a: Actor, app: Application) => boolean) {
  const app = await repo.getApplication(id);
  if (!app) throw new NotFoundError('Application not found.');
  assertAllowed(canReadApplication(actor, app)); // another family's or centre's application: 403
  assertAllowed(check(actor, app), 'This action is not available for this application.');
  return app;
}

/** Start (or reuse) a draft for the active child at a partner centre. Returns the application id. */
export async function createDraft(repo: Repo, actor: Actor, centreId: string): Promise<string> {
  assertAllowed(isParent(actor));
  const centre = await repo.getCentre(centreId);
  if (!centre) throw new NotFoundError('Centre not found.');
  const child = await activeChildOf(repo, actor);
  // e.g. a preschool-only centre can't take a toddler application
  const notServed = doesntServeLabel(centre.ageGroups, ageInMonths(child.dateOfBirth));
  if (notServed) throw new InputError(`${centre.name}: ${notServed}.`);
  const existing = (await repo.listApplications({ parentAccountId: actor.accountId, centreId, childId: child.id }))[0];
  if (existing) return existing.id;
  const app: ApplicationRecord = {
    id: `app-${centreId}-${child.id}-${Date.now()}`,
    centreId,
    parentAccountId: actor.accountId,
    childId: child.id,
    parentName: actor.name,
    childName: child.firstName,
    childAgeMonths: ageInMonths(child.dateOfBirth),
    careType: child.careType,
    preferredStartDate: child.preferredStartDate,
    parentNotes: child.notes || undefined,
    status: 'Draft',
    completedRequirements: [],
    uploadedDocuments: {},
  };
  await repo.insertApplication(app);
  return app.id;
}

export type DraftChange =
  | { kind: 'toggleRequirement'; requirement: string }
  | { kind: 'uploadDocument'; requirement: string; fileName: string; fileSize: string }
  | { kind: 'removeDocument'; requirement: string }
  | { kind: 'noteToCentre'; note: string }
  | { kind: 'preparedDraft'; draft: PreparedDraft };

export async function updateDraft(repo: Repo, actor: Actor, id: string, change: DraftChange) {
  const app = await ownApp(repo, actor, id, canEditDraft);
  const done = new Set(app.completedRequirements);
  const docs = { ...(app.uploadedDocuments ?? {}) };
  switch (change.kind) {
    case 'toggleRequirement':
      if (done.has(change.requirement)) done.delete(change.requirement);
      else done.add(change.requirement);
      return repo.updateApplication(id, { completedRequirements: [...done] });
    case 'uploadDocument':
      done.add(change.requirement);
      docs[change.requirement] = { fileName: change.fileName, fileSize: change.fileSize, uploadedAt: longDate(new Date()) };
      return repo.updateApplication(id, { completedRequirements: [...done], uploadedDocuments: docs });
    case 'removeDocument':
      done.delete(change.requirement);
      delete docs[change.requirement];
      return repo.updateApplication(id, { completedRequirements: [...done], uploadedDocuments: docs });
    case 'noteToCentre':
      return repo.updateApplication(id, { noteToCentre: change.note.slice(0, 1000) });
    case 'preparedDraft':
      return repo.updateApplication(id, { preparedDraft: change.draft });
  }
}

export async function submitApplication(repo: Repo, actor: Actor, id: string, now = new Date()) {
  const app = await ownApp(repo, actor, id, canSubmit);
  const draft = app.preparedDraft;
  const prepared: Partial<ApplicationRecord> = draft
    ? {
        preparedFields: draft.fields.map((f) => ({ label: f.label, value: f.value.trim() || NOT_PROVIDED, source: f.source })),
        preparedChecklist: draft.checklist,
        noteToCentre: draft.noteToCentre.trim() || undefined,
        preparedWithAi: true,
        aiMode: draft.aiMode,
      }
    : {};
  await repo.updateApplication(id, { ...prepared, preparedDraft: undefined, status: 'Submitted', submittedAt: longDate(now) });
  await notify(repo, [
    centreNotification(app.centreId, `${app.parentName} submitted an application for ${app.childName} on ${shortDate(now)}`, 'application', now),
  ]);
}

export async function withdrawApplication(repo: Repo, actor: Actor, id: string, now = new Date()) {
  const app = await ownApp(repo, actor, id, canWithdraw);
  await repo.updateApplication(id, { status: 'Withdrawn', withdrawal: { reason: 'withdrawn', date: shortDate(now) } });
  await notify(repo, [
    centreNotification(app.centreId, `${app.parentName} withdrew the application for ${app.childName} on ${shortDate(now)}`, 'status', now),
  ]);
}

/** The parent's record of something they did (shown in Updates, already read). Starts with the centre's name. */
const parentNote = (app: Application, message: string, now: Date, i = 0): InAppNotification => ({
  id: rid('notif-parent'),
  recipientRole: 'parent',
  recipientId: app.parentAccountId,
  message,
  timestamp: shortDate(now),
  createdAt: now.getTime() + i,
  read: true,
  type: 'status',
});

/**
 * Accept an offer. The same child's other sent applications and open offers become Withdrawn
 * ("withdrawn when you accepted …"); the child's drafts are deleted. Other children: untouched.
 * Returns how many applications were closed (withdrawn + drafts deleted).
 */
export async function acceptOffer(repo: Repo, actor: Actor, id: string, now = new Date()): Promise<{ closed: number }> {
  const app = await ownApp(repo, actor, id, canAcceptOffer);
  const date = shortDate(now);
  const nameOf = async (centreId: string) => (await repo.getCentre(centreId))?.name ?? 'The centre';
  const acceptedName = await nameOf(app.centreId);
  const others = otherOpenApplications(await repo.listApplications({ parentAccountId: actor.accountId, childId: app.childId }), app);

  await repo.updateApplication(id, { status: 'Accepted' });
  const parentNotes: InAppNotification[] = [
    parentNote(app, `${acceptedName}: you accepted the offer for ${app.childName} on ${date}`, now, others.length + 1),
  ];
  const centreNotes: InAppNotification[] = [
    centreNotification(app.centreId, `${app.parentName} accepted the offer for ${app.childName} on ${date}`, 'offer', now),
  ];
  for (const [i, o] of others.entries()) {
    const name = await nameOf(o.centreId);
    if (o.status === 'Draft') {
      await repo.deleteApplication(o.id); // never sent: the centre never saw it
      parentNotes.push(parentNote(o, `${name}: draft for ${o.childName} deleted when you accepted ${shortCentreName(acceptedName)} on ${date}`, now, i));
    } else {
      await repo.updateApplication(o.id, { status: 'Withdrawn', withdrawal: { reason: 'accepted-other', date, acceptedApplicationId: id } });
      parentNotes.push(parentNote(o, `${name}: application for ${o.childName} withdrawn when you accepted ${shortCentreName(acceptedName)} on ${date}`, now, i));
      // The centre is told the family withdrew, never which centre they chose
      centreNotes.push(centreNotification(o.centreId, `${o.parentName} withdrew the application for ${o.childName} on ${date}`, 'status', now));
    }
  }
  await notify(repo, [...centreNotes, ...parentNotes]);
  return { closed: others.length };
}

/** Decline an offer: only this application becomes Withdrawn ("Offer declined by you"). */
export async function declineOffer(repo: Repo, actor: Actor, id: string, now = new Date()) {
  const app = await ownApp(repo, actor, id, canAcceptOffer);
  const date = shortDate(now);
  const centreName = (await repo.getCentre(app.centreId))?.name ?? 'The centre';
  await repo.updateApplication(id, { status: 'Withdrawn', withdrawal: { reason: 'declined', date } });
  await notify(repo, [
    centreNotification(app.centreId, `${app.parentName} declined the offer for ${app.childName} on ${date}`, 'offer', now),
    parentNote(app, `${centreName}: you declined the offer for ${app.childName} on ${date}`, now),
  ]);
}

// ---------------- Applications (centre) ----------------

export async function setStatus(
  repo: Repo,
  actor: Actor,
  id: string,
  status: Extract<ApplicationStatus, 'Under review' | 'Waitlisted' | 'Offer'>,
  waitlistPosition?: number,
  waitlistEstimate?: string,
  now = new Date()
) {
  const app = await repo.getApplication(id);
  if (!app) throw new NotFoundError('Application not found.');
  assertAllowed(canReadApplication(actor, app)); // another centre's application, or a draft: 403
  assertAllowed(canSetStatus(actor, app), 'This application can no longer be changed.');
  const centre = await repo.getCentre(app.centreId);
  const centreName = centre?.name ?? 'The centre';
  const date = shortDate(now);
  const isWaitlisted = status === 'Waitlisted';
  if (isWaitlisted && !(Number.isInteger(waitlistPosition) && waitlistPosition! > 0)) {
    throw new InputError('Please enter a waitlist position of 1 or more.');
  }

  const history = app.positionHistory ? [...app.positionHistory] : [];
  if (isWaitlisted) {
    if (!history.length && app.waitlistPosition && app.waitlistReportedDate) {
      history.push({ position: app.waitlistPosition, date: app.waitlistReportedDate });
    }
    history.push({ position: waitlistPosition!, date });
  }
  await repo.updateApplication(id, {
    status,
    ...(isWaitlisted
      ? {
          waitlistPosition,
          waitlistReportedBy: centreName,
          waitlistReportedDate: date,
          waitlistReportedTimestamp: now.getTime(),
          waitlistEstimate: waitlistEstimate?.trim() || undefined,
          positionHistory: history,
        }
      : {}),
  });

  // Same wording as the seeded notifications: "… moved Anya's waitlist position to #4 (from #6) on Nov 2".
  // No earlier position (or the same one again): "… set Anya's waitlist position to #4 on Nov 2".
  const oldPosition = Number.isInteger(app.waitlistPosition) && app.waitlistPosition! > 0 ? app.waitlistPosition : undefined;
  const positionMessage =
    oldPosition !== undefined && oldPosition !== waitlistPosition
      ? `${centreName} moved ${app.childName}'s waitlist position to #${waitlistPosition} (from #${oldPosition}) on ${date}`
      : `${centreName} set ${app.childName}'s waitlist position to #${waitlistPosition} on ${date}`;
  const [parentMessage, centreMessage, type] =
    isWaitlisted
      ? [positionMessage, `Updated ${app.childName}'s position to ${waitlistPosition} on ${date}`, 'position' as const]
      : status === 'Offer'
      ? [`${centreName} made an offer for ${app.childName} on ${date}`, `Made an offer to ${app.parentName} for ${app.childName} on ${date}`, 'offer' as const]
      : [`${centreName} updated your application status to ${status} on ${date}`, `Updated ${app.childName}'s status to ${status} on ${date}`, 'status' as const];
  await notify(repo, [
    { id: rid('notif-parent'), recipientRole: 'parent', recipientId: app.parentAccountId, message: parentMessage, timestamp: date, createdAt: now.getTime(), read: false, type },
    { id: rid('notif-centre'), recipientRole: 'centre', recipientId: app.centreId, message: centreMessage, timestamp: date, createdAt: now.getTime() + 1, read: false, type },
  ]);
}

// ---------------- Messages ----------------

export async function sendMessage(
  repo: Repo,
  actor: Actor,
  target: { centreId: string; childId: string },
  text: string,
  aiAssisted: boolean,
  now = new Date(),
  /** The AI draft used simulated application facts; kept only for demo (simulated) centres. */
  fromSimulatedDraft = false
) {
  const body = text.trim().slice(0, 2000);
  if (!body) throw new InputError('Please write a message.');
  const key = conversationKey(target.centreId, target.childId);
  const [existing, child, centre, sent] = await Promise.all([
    repo.getConversation(key),
    repo.getChild(target.childId),
    repo.getCentre(target.centreId),
    repo.listApplications({ centreId: target.centreId, childId: target.childId }),
  ]);
  if (!centre) throw new NotFoundError('Centre not found.');
  const sentApp = sent.find((a) => a.status !== 'Draft');
  const allowed = canMessage(actor, target, {
    childOwnerId: child?.parentAccountId,
    sentApplicationExists: Boolean(sentApp),
    conversationExists: Boolean(existing),
  });
  if (!allowed) throw new AccessError('You can only message families and centres you are connected with.');

  const parentAccountId = existing?.parentAccountId ?? child?.parentAccountId ?? sentApp?.parentAccountId;
  if (!parentAccountId) throw new NotFoundError('Family not found.');
  const msg: ChatMessage = {
    id: rid('msg'),
    sender: actor.role,
    senderName: isParent(actor) ? actor.name : centre.name,
    text: body,
    timestamp: `${longDate(now)} • ${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
    aiAssisted,
    // Demo centres' applications are simulated; a self-registered centre's are not
    ...(aiAssisted && fromSimulatedDraft && !centre.registration ? { basedOnSimulatedData: true } : {}),
  };
  await repo.upsertConversation({
    key,
    centreId: target.centreId,
    childId: target.childId,
    parentAccountId,
    messages: [...(existing?.messages ?? []), msg],
  });
}

// ---------------- Notifications ----------------

const centreNotification = (centreId: string, message: string, type: InAppNotification['type'], now: Date): InAppNotification => ({
  id: rid('notif-centre'),
  recipientRole: 'centre',
  recipientId: centreId,
  message,
  timestamp: shortDate(now),
  createdAt: now.getTime(),
  read: false,
  type,
});

async function notify(repo: Repo, notes: InAppNotification[]) {
  await repo.insertNotifications(notes);
}

export async function markNotificationsRead(repo: Repo, actor: Actor, ids: string[] | 'all') {
  await repo.markNotificationsRead(recipientIdOf(actor), ids); // only the actor's own, by construction
}

// ---------------- Support requests ----------------

export async function createSupportRequest(
  repo: Repo,
  actor: Actor,
  input: Pick<SupportRequest, 'type' | 'subject' | 'message' | 'category'>,
  now = new Date()
) {
  const r: SupportRequestRecord = {
    id: rid('req'),
    referenceNumber: `CQ-${Math.floor(1000 + Math.random() * 9000)}`,
    type: input.type,
    submittedByRole: actor.role,
    submittedByName: actor.name,
    submittedByAccountId: actor.accountId,
    submittedAt: longDate(now),
    subject: input.subject.trim().slice(0, 200),
    message: input.message.trim().slice(0, 4000),
    status: 'Open',
    ...(input.type === 'concern'
      ? { category: input.category, concernStep: 'Submitted' as ConcernStep, concernStepsHistory: [{ step: 'Submitted' as ConcernStep, date: longDate(now) }] }
      : {}),
  };
  await repo.insertSupportRequest(r);
}

const CONCERN_STEPS: ConcernStep[] = ['Submitted', 'Under review by CareQ support', 'Shared with the other party (if needed)', 'Resolved'];

/** Demo control: moves a concern to its next step (own requests only). */
export async function advanceConcern(repo: Repo, actor: Actor, id: string, now = new Date()) {
  const r = await repo.getSupportRequest(id);
  if (!r) throw new NotFoundError('Request not found.');
  assertAllowed(canReadSupportRequest(actor, r));
  if (r.type !== 'concern') throw new InputError('Only concerns have steps.');
  const next = CONCERN_STEPS[Math.min(CONCERN_STEPS.length - 1, CONCERN_STEPS.indexOf(r.concernStep ?? 'Submitted') + 1)];
  const history = r.concernStepsHistory ?? [];
  await repo.updateSupportRequest(id, {
    concernStep: next,
    concernStepsHistory: history.some((h) => h.step === next) ? history : [...history, { step: next, date: longDate(now) }],
    status: next === 'Resolved' ? 'Resolved' : 'In progress',
  });
}

// ---------------- Profile (both roles) ----------------

export const DEMO_PASSWORD_MESSAGE = "Demo account: password can't be changed.";
export const OPEN_DATA_READ_ONLY_MESSAGE = "These details come from Ontario open data and can't be edited here.";

/** Drops undefined keys, so nested objects are stored the same way in MongoDB and in local mode. */
const withoutUndefined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** Name shown on the account (and on the parent's unsent drafts). Always the signed-in user's own account. */
export async function updateAccountName(repo: Repo, actor: Actor, name: string) {
  const clean = name.trim();
  if (!clean) throw new InputError('Please enter your name.');
  if (clean.length > 80) throw new InputError('Please use 80 characters or fewer for your name.');
  await repo.updateAccount(actor.accountId, { name: clean });
  if (isParent(actor)) {
    const drafts = (await repo.listApplications({ parentAccountId: actor.accountId })).filter((a) => a.status === 'Draft');
    for (const d of drafts) await repo.updateApplication(d.id, { parentName: clean });
  }
}

/** Needs the current password; demo accounts can't change theirs (everyone shares "password"). */
export async function changePassword(repo: Repo, hasher: PasswordHasher, actor: Actor, currentPassword: string, newPassword: string) {
  assertAllowed(!DEMO_ACCOUNT_IDS.includes(actor.accountId), DEMO_PASSWORD_MESSAGE);
  const account = await repo.getAccount(actor.accountId);
  if (!account) throw new NotFoundError('Account not found.');
  if (!(await hasher.verify(currentPassword, account.passwordHash))) throw new InputError("Your current password isn't right.");
  if (newPassword.length < MIN_PASSWORD_LENGTH) throw new InputError(`Please use a new password with at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (newPassword === currentPassword) throw new InputError('Please choose a new password that is different from your current one.');
  await repo.updateAccount(actor.accountId, { passwordHash: await hasher.hash(newPassword) });
}

export type ChildInput = Omit<Child, 'id'>;

function checkChild(c: ChildInput, areas: Area[]): ChildInput {
  const error = childRecordError(c, areas);
  if (error) throw new InputError(error);
  return {
    firstName: c.firstName.trim(),
    dateOfBirth: c.dateOfBirth,
    careType: c.careType,
    preferredStartDate: c.preferredStartDate.trim(),
    homeArea: findArea(c.homeArea, areas)!.name,
    notes: (c.notes ?? '').trim(),
  };
}

async function ownChild(repo: Repo, actor: Actor, id: string) {
  assertAllowed(isParent(actor));
  const child = await repo.getChild(id);
  if (!child) throw new NotFoundError('Child not found.');
  assertAllowed(canEditChild(actor, child), 'You can only change your own children.');
  return child;
}

/**
 * Edits a child. Unsent drafts for this child pick up the new details; applications already sent
 * keep what the centre received.
 */
export async function updateChild(repo: Repo, actor: Actor, id: string, input: ChildInput, areas: Area[]) {
  await ownChild(repo, actor, id);
  const c = checkChild(input, areas);
  await repo.updateChild(id, c);
  const drafts = (await repo.listApplications({ parentAccountId: actor.accountId, childId: id })).filter((a) => a.status === 'Draft');
  for (const d of drafts) {
    await repo.updateApplication(d.id, {
      childName: c.firstName,
      childAgeMonths: ageInMonths(c.dateOfBirth),
      careType: c.careType,
      preferredStartDate: c.preferredStartDate,
      parentNotes: c.notes || undefined,
    });
  }
}

/** Adds a child after the existing ones (the first child stays the active child). Returns its id. */
export async function addChild(repo: Repo, actor: Actor, input: ChildInput, areas: Area[]): Promise<string> {
  assertAllowed(isParent(actor));
  const existing = await repo.listChildren(actor.accountId);
  if (existing.length >= 8) throw new InputError('You can add up to 8 children.');
  const c = checkChild(input, areas);
  const id = rid(`child-${actor.accountId}`);
  await repo.insertChildren([{ ...c, id, parentAccountId: actor.accountId }]);
  return id;
}

/** Why a child can't be removed, or null. Any application other than Withdrawn keeps a child on the account. */
export function childRemovalBlocker(childId: string, childCount: number, applications: Pick<Application, 'childId' | 'status'>[]): string | null {
  const open = applications.filter((a) => a.childId === childId && a.status !== 'Withdrawn');
  if (open.length) {
    const statuses = [...new Set(open.map((a) => a.status))].join(', ');
    return open.length === 1
      ? `This child has an application (${statuses}), so they can't be removed. A child can be removed only when all of their applications are withdrawn.`
      : `This child has ${open.length} applications (${statuses}), so they can't be removed. A child can be removed only when all of their applications are withdrawn.`;
  }
  if (childCount <= 1) return 'Your account needs at least one child. Add another child before removing this one.';
  return null;
}

export async function removeChild(repo: Repo, actor: Actor, id: string) {
  await ownChild(repo, actor, id);
  const [children, apps] = await Promise.all([
    repo.listChildren(actor.accountId),
    repo.listApplications({ parentAccountId: actor.accountId, childId: id }),
  ]);
  const blocker = childRemovalBlocker(id, children.length, apps);
  if (blocker) throw new InputError(blocker);
  await repo.deleteChild(id);
}

/**
 * Self-registered centre details, with the same rules as registration: location recomputed from the
 * neighbourhood or postal-code area, licence check result from the server. photoDataUrl: undefined
 * keeps the photo, null removes it. Policy text and documents are not touched here.
 */
export async function updateCentreDetails(
  repo: Repo,
  actor: Actor,
  centreId: string,
  input: CentreFormInput,
  photoDataUrl: string | null | undefined,
  areas: Area[],
  fsa: FsaCentroids,
  /** From the open-data check (server/licence.ts); never from the browser in mongo mode. */
  licenceVerified?: LicenceVerification
) {
  assertAllowed(canUpdateCentre(actor, centreId), 'You can only change your own centre.');
  const centre = await repo.getCentre(centreId);
  if (!centre) throw new NotFoundError('Centre not found.');
  assertAllowed(Boolean(centre.registration) && !centre.demoKind, OPEN_DATA_READ_ONLY_MESSAGE);
  const errors = validateCentre(input, areas);
  const first = Object.values(errors)[0];
  if (first) throw new InputError(first);
  if (photoDataUrl && !/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl)) throw new InputError('The photo must be an image.');
  const built = buildRegisteredCentre({ ...input, policyText: '' }, undefined, areas, fsa, centre.id);
  const old = centre.registration!;
  await repo.updateCentre(centreId, {
    name: built.name,
    neighbourhood: built.neighbourhood,
    address: built.address,
    ageGroups: built.ageGroups,
    programOptions: built.programOptions,
    languages: built.languages,
    hours: built.hours,
    lat: built.lat,
    lng: built.lng,
    registration: withoutUndefined({
      ...old,
      licenceNumber: built.registration!.licenceNumber,
      contactEmail: built.registration!.contactEmail,
      capacity: built.registration!.capacity,
      locationSource: built.registration!.locationSource,
      photoDataUrl: photoDataUrl === undefined ? old.photoDataUrl : photoDataUrl ?? undefined,
      licenceVerified,
    }),
  });
  await repo.updateAccount(actor.accountId, { centreName: built.name });
}

/** Demo centres (open data or fictional): only simulated hours and contact email can change. */
export async function updateSimulatedContact(
  repo: Repo,
  actor: Actor,
  centreId: string,
  input: { hours: string; contactEmail: string },
  now = new Date()
) {
  assertAllowed(canUpdateCentre(actor, centreId), 'You can only change your own centre.');
  const centre = await repo.getCentre(centreId);
  if (!centre) throw new NotFoundError('Centre not found.');
  assertAllowed(Boolean(centre.demoKind), 'Use the centre details form for a self-registered centre.');
  const first = Object.values(simulatedContactErrors(input))[0];
  if (first) throw new InputError(first);
  const hours = input.hours.trim();
  const contactEmail = input.contactEmail.trim();
  await repo.updateCentre(centreId, {
    simulatedContact: hours || contactEmail ? withoutUndefined({ hours: hours || undefined, contactEmail: contactEmail || undefined, updatedAt: now.toISOString() }) : undefined,
  });
}
