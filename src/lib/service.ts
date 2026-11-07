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
  isValidEmail,
  validateCentre,
} from './family';
import type { Area, FsaCentroids } from './rankCentres';
import { doesntServeLabel } from './searchCriteria';
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
  fsa: FsaCentroids
): Promise<string> {
  assertAllowed(actor.role === 'centre' && !actor.centreId, 'This account already manages a centre.');
  const errors = validateCentre(input, areas);
  const first = Object.values(errors)[0];
  if (first) throw new InputError(first);
  if (photoDataUrl && !/^data:image\/(jpeg|png|webp);base64,/.test(photoDataUrl)) throw new InputError('The photo must be an image.');
  const centre = buildRegisteredCentre(input, photoDataUrl, areas, fsa, rid('c-self'));
  await repo.insertCentre(centre);
  await repo.updateAccount(actor.accountId, { centreId: centre.id, centreName: centre.name });
  return centre.id;
}

export async function updateRequirements(repo: Repo, actor: Actor, centreId: string, requirements: string[], sources: Record<string, string>) {
  assertAllowed(canUpdateCentre(actor, centreId), 'You can only change your own centre.');
  const clean = Array.from(new Set(requirements.map((r) => r.trim()).filter(Boolean)));
  await repo.updateCentre(centreId, {
    requirements: clean,
    requirementSources: Object.fromEntries(clean.map((r) => [r, (sources[r] ?? '').trim()])),
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
  await repo.updateApplication(id, { status: 'Withdrawn' });
  await notify(repo, [
    centreNotification(app.centreId, `${app.parentName} withdrew the application for ${app.childName} on ${shortDate(now)}`, 'status', now),
  ]);
}

/** Accept an offer; optionally withdraw the same parent's other applications for the same child. */
export async function acceptOffer(repo: Repo, actor: Actor, id: string, withdrawOthers: boolean, now = new Date()) {
  const app = await ownApp(repo, actor, id, canAcceptOffer);
  await repo.updateApplication(id, { status: 'Accepted' });
  if (withdrawOthers) {
    const others = await repo.listApplications({ parentAccountId: actor.accountId, childId: app.childId });
    for (const o of others) {
      if (o.id !== id && o.status !== 'Withdrawn' && o.status !== 'Accepted') await repo.updateApplication(o.id, { status: 'Withdrawn' });
    }
  }
  await notify(repo, [
    centreNotification(app.centreId, `${app.parentName} accepted the offer for ${app.childName} on ${shortDate(now)}`, 'offer', now),
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

  const [parentMessage, centreMessage, type] =
    isWaitlisted
      ? [`${centreName} updated your position to ${waitlistPosition} on ${date}`, `Updated ${app.childName}'s position to ${waitlistPosition} on ${date}`, 'position' as const]
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
  now = new Date()
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
