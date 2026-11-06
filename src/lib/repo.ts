/**
 * Storage interface used by the service layer. Two implementations:
 *  - MemoryRepo (this file): a World kept in memory; browser-only local mode and unit tests.
 *  - MongoRepo (server/mongoRepo.ts): MongoDB Atlas.
 * Queries are always narrowed by the scoping fields (parentAccountId, centreId, recipientId).
 */
import type { Application, Centre, InAppNotification } from '../data/mockData';
import type {
  AccountRecord,
  ApplicationRecord,
  ChildRecord,
  ConversationRecord,
  SupportRequestRecord,
  World,
} from './world';

export interface Repo {
  findAccountByEmail(email: string): Promise<AccountRecord | null>;
  getAccount(id: string): Promise<AccountRecord | null>;
  insertAccount(a: AccountRecord): Promise<void>;
  updateAccount(id: string, patch: Partial<AccountRecord>): Promise<void>;

  listChildren(parentAccountId: string): Promise<ChildRecord[]>;
  getChild(id: string): Promise<ChildRecord | null>;
  insertChildren(children: ChildRecord[]): Promise<void>;

  listCentres(): Promise<Centre[]>;
  getCentre(id: string): Promise<Centre | null>;
  insertCentre(c: Centre): Promise<void>;
  updateCentre(id: string, patch: Partial<Centre>): Promise<void>;

  getApplication(id: string): Promise<ApplicationRecord | null>;
  listApplications(filter: { parentAccountId?: string; centreId?: string; childId?: string }): Promise<ApplicationRecord[]>;
  insertApplication(a: ApplicationRecord): Promise<void>;
  updateApplication(id: string, patch: Partial<ApplicationRecord>): Promise<void>;

  getConversation(key: string): Promise<ConversationRecord | null>;
  listConversations(filter: { parentAccountId?: string; centreId?: string }): Promise<ConversationRecord[]>;
  upsertConversation(c: ConversationRecord): Promise<void>;

  listNotifications(recipientId: string): Promise<InAppNotification[]>;
  insertNotifications(n: InAppNotification[]): Promise<void>;
  markNotificationsRead(recipientId: string, ids: string[] | 'all'): Promise<void>;

  listSupportRequests(accountId: string): Promise<SupportRequestRecord[]>;
  getSupportRequest(id: string): Promise<SupportRequestRecord | null>;
  insertSupportRequest(r: SupportRequestRecord): Promise<void>;
  updateSupportRequest(id: string, patch: Partial<SupportRequestRecord>): Promise<void>;
}

const copy = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const matches = <T extends object>(doc: T, filter: Partial<Record<keyof T, unknown>>) =>
  Object.entries(filter).every(([k, v]) => v === undefined || (doc as Record<string, unknown>)[k] === v);

/** In-memory repository over a World. onChange is called after every write (local mode saves then). */
export class MemoryRepo implements Repo {
  constructor(public world: World, private onChange: () => void = () => {}) {}

  private patch<T extends { id: string }>(list: T[], id: string, patch: Partial<T>) {
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) {
      list[i] = { ...list[i], ...copy(patch) };
      this.onChange();
    }
  }

  async findAccountByEmail(email: string) {
    return copy(this.world.accounts.find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null);
  }
  async getAccount(id: string) {
    return copy(this.world.accounts.find((a) => a.id === id) ?? null);
  }
  async insertAccount(a: AccountRecord) {
    this.world.accounts.push(copy(a));
    this.onChange();
  }
  async updateAccount(id: string, patch: Partial<AccountRecord>) {
    this.patch(this.world.accounts, id, patch);
  }

  async listChildren(parentAccountId: string) {
    return copy(this.world.children.filter((c) => c.parentAccountId === parentAccountId));
  }
  async getChild(id: string) {
    return copy(this.world.children.find((c) => c.id === id) ?? null);
  }
  async insertChildren(children: ChildRecord[]) {
    this.world.children.push(...copy(children));
    this.onChange();
  }

  async listCentres() {
    return copy(this.world.centres);
  }
  async getCentre(id: string) {
    return copy(this.world.centres.find((c) => c.id === id) ?? null);
  }
  async insertCentre(c: Centre) {
    this.world.centres.unshift(copy(c));
    this.onChange();
  }
  async updateCentre(id: string, patch: Partial<Centre>) {
    this.patch(this.world.centres, id, patch);
  }

  async getApplication(id: string) {
    return copy(this.world.applications.find((a) => a.id === id) ?? null);
  }
  async listApplications(filter: { parentAccountId?: string; centreId?: string; childId?: string }) {
    return copy(this.world.applications.filter((a) => matches<Application>(a, filter)));
  }
  async insertApplication(a: ApplicationRecord) {
    this.world.applications.unshift(copy(a));
    this.onChange();
  }
  async updateApplication(id: string, patch: Partial<ApplicationRecord>) {
    this.patch(this.world.applications, id, patch);
  }

  async getConversation(key: string) {
    return copy(this.world.conversations.find((c) => c.key === key) ?? null);
  }
  async listConversations(filter: { parentAccountId?: string; centreId?: string }) {
    return copy(this.world.conversations.filter((c) => matches(c, filter)));
  }
  async upsertConversation(c: ConversationRecord) {
    const i = this.world.conversations.findIndex((x) => x.key === c.key);
    if (i >= 0) this.world.conversations[i] = copy(c);
    else this.world.conversations.push(copy(c));
    this.onChange();
  }

  async listNotifications(recipientId: string) {
    return copy(this.world.notifications.filter((n) => n.recipientId === recipientId));
  }
  async insertNotifications(n: InAppNotification[]) {
    this.world.notifications.unshift(...copy(n));
    this.onChange();
  }
  async markNotificationsRead(recipientId: string, ids: string[] | 'all') {
    this.world.notifications = this.world.notifications.map((n) =>
      n.recipientId === recipientId && (ids === 'all' || ids.includes(n.id)) ? { ...n, read: true } : n
    );
    this.onChange();
  }

  async listSupportRequests(accountId: string) {
    return copy(this.world.supportRequests.filter((r) => r.submittedByAccountId === accountId));
  }
  async getSupportRequest(id: string) {
    return copy(this.world.supportRequests.find((r) => r.id === id) ?? null);
  }
  async insertSupportRequest(r: SupportRequestRecord) {
    this.world.supportRequests.unshift(copy(r));
    this.onChange();
  }
  async updateSupportRequest(id: string, patch: Partial<SupportRequestRecord>) {
    this.patch(this.world.supportRequests, id, patch);
  }
}
