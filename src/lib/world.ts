/**
 * The full CareQ demo dataset ("world") and the scoped snapshot a signed-in user receives.
 * The same shapes are used by MongoDB (server) and by browser-only local mode.
 */
import {
  Application,
  Centre,
  ChatMessage,
  ConversationsMap,
  InAppNotification,
  INITIAL_APPLICATIONS,
  INITIAL_CENTRES,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  PRIYA_ACCOUNT_ID,
  PRIYA_CHILDREN,
  RIVERDALE_CENTRE_ID,
} from '../data/mockData';
import { INITIAL_SUPPORT_REQUESTS, SupportRequest } from '../data/helpData';
import type { Child } from './family';
import type { PreparedDraft } from './prepareApplication';

export type Role = 'parent' | 'centre';

export interface AccountRecord {
  id: string;
  role: Role;
  email: string;
  name: string;
  passwordHash: string;
  centreId?: string; // centre staff
  centreName?: string;
  onboarded?: boolean; // parents
  createdAt: string;
}

export type ChildRecord = Child & { parentAccountId: string };

/** preparedDraft is the parent's unsent AI draft: never sent to centres. */
export type ApplicationRecord = Application & { preparedDraft?: PreparedDraft };

export interface ConversationRecord {
  key: string; // conversationKey(centreId, childId)
  centreId: string;
  childId: string;
  parentAccountId: string;
  messages: ChatMessage[];
}

export type SupportRequestRecord = SupportRequest & { submittedByAccountId: string };

export interface World {
  accounts: AccountRecord[];
  children: ChildRecord[];
  centres: Centre[];
  applications: ApplicationRecord[];
  conversations: ConversationRecord[];
  notifications: InAppNotification[];
  supportRequests: SupportRequestRecord[];
}

/** Who is acting. Built from the signed-in account on the server (never from the request body). */
export interface Actor {
  accountId: string;
  role: Role;
  name: string;
  centreId?: string;
}

export const actorOf = (a: AccountRecord): Actor => ({ accountId: a.id, role: a.role, name: a.name, centreId: a.centreId });

/** Account as sent to the browser: never the password hash. */
export interface PublicAccount {
  id: string;
  role: Role;
  email: string;
  name: string;
  centreId?: string;
  centreName?: string;
  onboarded?: boolean;
  children?: Child[];
  /** One of the seeded demo accounts (needed to show the admin reset). */
  isDemoAccount: boolean;
}

/** Everything the signed-in user may see. */
export interface Snapshot {
  account: PublicAccount | null;
  centres: Centre[];
  applications: Application[];
  conversations: ConversationsMap;
  notifications: InAppNotification[];
  supportRequests: SupportRequest[];
  preparedDrafts: Record<string, PreparedDraft>;
}

export const DEMO_ACCOUNT_IDS = [PRIYA_ACCOUNT_ID, 'centre-riverdale'];
export const DEMO_PASSWORD = 'password';

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** The demo data as a fresh world. Demo account passwords are hashed with the given hasher. */
export async function buildSeedWorld(hasher: PasswordHasher, now = new Date()): Promise<World> {
  const demoHash = await hasher.hash(DEMO_PASSWORD);
  const createdAt = now.toISOString();
  const applications = clone(INITIAL_APPLICATIONS) as ApplicationRecord[];
  const ownerOfChild = new Map(applications.map((a) => [a.childId, a.parentAccountId]));

  const conversations: ConversationRecord[] = Object.entries(clone(INITIAL_CONVERSATIONS)).map(([key, messages]) => {
    const childId = key.slice(key.indexOf('-') + 1);
    const centreId = key.slice(0, key.indexOf('-'));
    return { key, centreId, childId, parentAccountId: ownerOfChild.get(childId) ?? 'unknown', messages };
  });

  return {
    accounts: [
      {
        id: PRIYA_ACCOUNT_ID,
        role: 'parent',
        email: 'priya@example.ca',
        name: 'Priya Patel',
        passwordHash: demoHash,
        onboarded: true,
        createdAt,
      },
      {
        id: 'centre-riverdale',
        role: 'centre',
        email: 'centre@riverdale.ca',
        name: 'Sarah Jenkins',
        passwordHash: demoHash,
        centreId: RIVERDALE_CENTRE_ID,
        centreName: 'Riverdale Early Learning Centre',
        createdAt,
      },
    ],
    children: clone(PRIYA_CHILDREN).map((c) => ({ ...c, parentAccountId: PRIYA_ACCOUNT_ID })),
    centres: clone(INITIAL_CENTRES),
    applications,
    conversations,
    notifications: clone(INITIAL_NOTIFICATIONS),
    supportRequests: clone(INITIAL_SUPPORT_REQUESTS).map((r) => ({
      ...r,
      submittedByAccountId: r.submittedByRole === 'parent' ? PRIYA_ACCOUNT_ID : 'centre-riverdale',
    })),
  };
}

export const EMPTY_SNAPSHOT: Snapshot = {
  account: null,
  centres: [],
  applications: [],
  conversations: {},
  notifications: [],
  supportRequests: [],
  preparedDrafts: {},
};
