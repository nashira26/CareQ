/**
 * The one interface the app uses for demo data. Two implementations behind it:
 *  - ApiStore  (DATA_MODE=mongo, default): REST API on the server; data shared across devices.
 *  - LocalStore (DATA_MODE=local): the same service layer running in the browser over localStorage.
 * Every call returns the signed-in user's scoped Snapshot, so components only ever see their own data.
 */
import type { ApplicationStatus } from '../data/mockData';
import type { SupportRequest } from '../data/helpData';
import type { CentreFormInput, Child } from './family';
import type { DraftChange } from './service';
import * as svc from './service';
import { MemoryRepo } from './repo';
import { AccountRecord, Snapshot, actorOf, buildSeedWorld } from './world';
import { browserHasher, loadLocalWorld, saveLocalWorld } from './demoStorage';
import type { Area, FsaCentroids } from './rankCentres';
import torontoAreas from '../data/torontoAreas.json';
import fsaCentroids from '../data/fsaCentroids.json';

export type DataMode = 'mongo' | 'local';
export type CentreStatus = Extract<ApplicationStatus, 'Under review' | 'Waitlisted' | 'Offer'>;
export type SupportInput = Pick<SupportRequest, 'type' | 'subject' | 'message' | 'category'>;

/** Error with an HTTP-like status: 0 = server unreachable, 503 = database down, 4xx = user-facing. */
export class StoreError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export const isOutage = (e: unknown) => e instanceof StoreError && (e.status === 0 || e.status === 503);

export interface DemoStore {
  mode: DataMode;
  load(): Promise<Snapshot>;
  signUp(input: { role: 'parent' | 'centre'; name: string; email: string; password: string }): Promise<Snapshot>;
  logIn(input: { role: 'parent' | 'centre'; email: string; password: string }): Promise<Snapshot>;
  logOut(): Promise<Snapshot>;
  completeOnboarding(children: Child[]): Promise<Snapshot>;
  registerCentre(form: CentreFormInput, photoDataUrl?: string): Promise<Snapshot>;
  updateRequirements(centreId: string, requirements: string[], sources: Record<string, string>): Promise<Snapshot>;
  createDraft(centreId: string): Promise<{ id: string; snapshot: Snapshot }>;
  updateDraft(id: string, change: DraftChange): Promise<Snapshot>;
  submit(id: string): Promise<Snapshot>;
  withdraw(id: string): Promise<Snapshot>;
  acceptOffer(id: string, withdrawOthers: boolean): Promise<Snapshot>;
  setStatus(id: string, status: CentreStatus, waitlistPosition?: number, waitlistEstimate?: string): Promise<Snapshot>;
  sendMessage(target: { centreId: string; childId: string }, text: string, aiAssisted: boolean): Promise<Snapshot>;
  markRead(ids: string[] | 'all'): Promise<Snapshot>;
  createSupportRequest(input: SupportInput): Promise<Snapshot>;
  advanceConcern(id: string): Promise<Snapshot>;
}

// ---------------- MongoDB mode: REST API ----------------

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new StoreError(0, "Can't reach the CareQ server. Changes aren't being saved.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StoreError(res.status, (data as { error?: string }).error ?? `Request failed (${res.status}).`);
  return data as T;
}

export class ApiStore implements DemoStore {
  mode: DataMode = 'mongo';
  load = () => call<Snapshot>('GET', '/state');
  signUp = (i: Parameters<DemoStore['signUp']>[0]) => call<Snapshot>('POST', '/auth/signup', { ...i, termsAccepted: true });
  logIn = (i: Parameters<DemoStore['logIn']>[0]) => call<Snapshot>('POST', '/auth/login', i);
  logOut = () => call<Snapshot>('POST', '/auth/logout');
  completeOnboarding = (children: Child[]) => call<Snapshot>('POST', '/onboarding', { children });
  registerCentre = (form: CentreFormInput, photoDataUrl?: string) => call<Snapshot>('POST', '/centres/register', { form, photoDataUrl });
  updateRequirements = (centreId: string, requirements: string[], sources: Record<string, string>) =>
    call<Snapshot>('PUT', `/centres/${encodeURIComponent(centreId)}/requirements`, { requirements, sources });
  createDraft = (centreId: string) => call<{ id: string; snapshot: Snapshot }>('POST', '/applications', { centreId });
  updateDraft = (id: string, change: DraftChange) => call<Snapshot>('PATCH', `/applications/${encodeURIComponent(id)}/draft`, { change });
  submit = (id: string) => call<Snapshot>('POST', `/applications/${encodeURIComponent(id)}/submit`);
  withdraw = (id: string) => call<Snapshot>('POST', `/applications/${encodeURIComponent(id)}/withdraw`);
  acceptOffer = (id: string, withdrawOthers: boolean) => call<Snapshot>('POST', `/applications/${encodeURIComponent(id)}/accept`, { withdrawOthers });
  setStatus = (id: string, status: CentreStatus, waitlistPosition?: number, waitlistEstimate?: string) =>
    call<Snapshot>('POST', `/applications/${encodeURIComponent(id)}/status`, { status, waitlistPosition, waitlistEstimate });
  sendMessage = (target: { centreId: string; childId: string }, text: string, aiAssisted: boolean) =>
    call<Snapshot>('POST', '/messages', { ...target, text, aiAssisted });
  markRead = (ids: string[] | 'all') => call<Snapshot>('POST', '/notifications/read', { ids });
  createSupportRequest = (input: SupportInput) => call<Snapshot>('POST', '/support-requests', input);
  advanceConcern = (id: string) => call<Snapshot>('POST', `/support-requests/${encodeURIComponent(id)}/advance`);
}

/** Mongo mode admin reset (needs ALLOW_RESET=true on the server and the secret token). */
export async function resetServerDemo(token: string): Promise<string> {
  const res = await fetch('/api/reset', { method: 'POST', headers: { 'X-Reset-Token': token } }).catch(() => null);
  if (!res) throw new StoreError(0, "Can't reach the CareQ server.");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new StoreError(res.status, (data as { error?: string }).error ?? 'Reset failed.');
  return (data as { message?: string }).message ?? 'Reset done.';
}

// ---------------- Local mode: same service layer, in this browser ----------------

const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;

export class LocalStore implements DemoStore {
  mode: DataMode = 'local';
  private repo: MemoryRepo | null = null;
  private sessionAccountId: string | null = null;
  private saveTimer: number | undefined;

  private async ready(): Promise<MemoryRepo> {
    if (this.repo) return this.repo;
    const saved = loadLocalWorld();
    const world = saved?.world ?? (await buildSeedWorld(browserHasher));
    this.sessionAccountId = saved?.sessionAccountId ?? null;
    this.repo = new MemoryRepo(world, () => this.scheduleSave());
    if (!saved) this.scheduleSave();
    window.addEventListener('pagehide', () => this.saveNow());
    return this.repo;
  }
  private scheduleSave() {
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.saveNow(), 300);
  }
  private saveNow() {
    if (this.repo) saveLocalWorld(this.repo.world, this.sessionAccountId);
  }
  private async account(): Promise<AccountRecord | null> {
    const repo = await this.ready();
    return this.sessionAccountId ? repo.getAccount(this.sessionAccountId) : null;
  }
  /** Runs a service call as the signed-in user, mapping service errors to StoreError. */
  private async run(fn: (repo: MemoryRepo, account: AccountRecord) => Promise<unknown>): Promise<Snapshot> {
    const repo = await this.ready();
    const account = await this.account();
    if (!account) throw new StoreError(401, 'Please log in to continue.');
    try {
      await fn(repo, account);
    } catch (e) {
      throw new StoreError((e as { status?: number }).status ?? 500, (e as Error).message);
    }
    return svc.getSnapshot(repo, await repo.getAccount(account.id));
  }

  async load() {
    const repo = await this.ready();
    return svc.getSnapshot(repo, await this.account());
  }
  async signUp(input: Parameters<DemoStore['signUp']>[0]) {
    const repo = await this.ready();
    try {
      const account = await svc.signUp(repo, browserHasher, input);
      this.sessionAccountId = account.id;
      this.scheduleSave();
      return svc.getSnapshot(repo, account);
    } catch (e) {
      throw new StoreError((e as { status?: number }).status ?? 500, (e as Error).message);
    }
  }
  async logIn(input: Parameters<DemoStore['logIn']>[0]) {
    const repo = await this.ready();
    try {
      const account = await svc.logIn(repo, browserHasher, input);
      this.sessionAccountId = account.id;
      this.scheduleSave();
      return svc.getSnapshot(repo, account);
    } catch (e) {
      throw new StoreError((e as { status?: number }).status ?? 500, (e as Error).message);
    }
  }
  async logOut() {
    const repo = await this.ready();
    this.sessionAccountId = null;
    this.scheduleSave();
    return svc.getSnapshot(repo, null);
  }
  completeOnboarding = (children: Child[]) => this.run((r, a) => svc.completeOnboarding(r, actorOf(a), children));
  registerCentre = (form: CentreFormInput, photoDataUrl?: string) =>
    this.run((r, a) => svc.registerCentre(r, actorOf(a), form, photoDataUrl, AREAS, FSA));
  updateRequirements = (centreId: string, requirements: string[], sources: Record<string, string>) =>
    this.run((r, a) => svc.updateRequirements(r, actorOf(a), centreId, requirements, sources));
  async createDraft(centreId: string) {
    let id = '';
    const snapshot = await this.run(async (r, a) => {
      id = await svc.createDraft(r, actorOf(a), centreId);
    });
    return { id, snapshot };
  }
  updateDraft = (id: string, change: DraftChange) => this.run((r, a) => svc.updateDraft(r, actorOf(a), id, change));
  submit = (id: string) => this.run((r, a) => svc.submitApplication(r, actorOf(a), id));
  withdraw = (id: string) => this.run((r, a) => svc.withdrawApplication(r, actorOf(a), id));
  acceptOffer = (id: string, withdrawOthers: boolean) => this.run((r, a) => svc.acceptOffer(r, actorOf(a), id, withdrawOthers));
  setStatus = (id: string, status: CentreStatus, pos?: number, est?: string) =>
    this.run((r, a) => svc.setStatus(r, actorOf(a), id, status, pos, est));
  sendMessage = (target: { centreId: string; childId: string }, text: string, aiAssisted: boolean) =>
    this.run((r, a) => svc.sendMessage(r, actorOf(a), target, text, aiAssisted));
  markRead = (ids: string[] | 'all') => this.run((r, a) => svc.markNotificationsRead(r, actorOf(a), ids));
  createSupportRequest = (input: SupportInput) => this.run((r, a) => svc.createSupportRequest(r, actorOf(a), input));
  advanceConcern = (id: string) => this.run((r, a) => svc.advanceConcern(r, actorOf(a), id));
}

/** Asks the server which data mode it runs in (defaults to mongo if the answer is missing). */
export async function fetchConfig(): Promise<{ dataMode: DataMode; resetAvailable: boolean }> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new StoreError(res.status, "Can't reach the CareQ server.");
  const data = (await res.json()) as { dataMode?: string; resetAvailable?: boolean };
  return { dataMode: data.dataMode === 'local' ? 'local' : 'mongo', resetAvailable: Boolean(data.resetAvailable) };
}
