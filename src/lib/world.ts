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
  DEMO_CENTRE_ACCOUNT_ID,
  JESSE_KETCHUM_ACCOUNT_ID,
  conversationKey,
} from '../data/mockData';
import { DEMO_CENTRE_ID, REAL_DEMO_CENTRES, simulatedAccountName } from '../data/demoCentres';
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

/** Login emails for the centre portal demo accounts (reserved .example domain). */
const REAL_CENTRE_EMAIL_SLUG: Record<string, string> = {
  'on-00576': 'jesse-ketchum',
  'on-0002899': 'wellesley-cdi',
  'on-0004062': 'macaulay-dovercourt',
  'on-0002575': 'leaside',
  'on-03394': 'harmony',
  'on-07205': 'bf-toronto',
  'on-12256': 'mary-ward',
};
export const demoCentreEmail = (centreId: string) =>
  centreId === DEMO_CENTRE_ID ? 'centre@careq-demo.example' : `${REAL_CENTRE_EMAIL_SLUG[centreId]}.demo@careq.example`;
const centreAccountId = (centreId: string) => (centreId === DEMO_CENTRE_ID ? DEMO_CENTRE_ACCOUNT_ID : `centre-${centreId}`);

export const DEMO_ACCOUNT_IDS = [
  PRIYA_ACCOUNT_ID,
  DEMO_CENTRE_ACCOUNT_ID,
  ...REAL_DEMO_CENTRES.map((c) => centreAccountId(c.id)),
];
export { JESSE_KETCHUM_ACCOUNT_ID };
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

  const conversations: ConversationRecord[] = clone(INITIAL_CONVERSATIONS).map(({ centreId, childId, messages }) => ({
    key: conversationKey(centreId, childId),
    centreId,
    childId,
    parentAccountId: ownerOfChild.get(childId) ?? 'unknown',
    messages,
  }));

  // Real centres: SIMULATED demo accounts (not operated by or affiliated with the centre)
  const realCentreAccounts: AccountRecord[] = REAL_DEMO_CENTRES.map((c) => ({
    id: centreAccountId(c.id),
    role: 'centre',
    email: demoCentreEmail(c.id),
    name: simulatedAccountName(c.name),
    passwordHash: demoHash,
    centreId: c.id,
    centreName: c.name,
    createdAt,
  }));

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
        id: DEMO_CENTRE_ACCOUNT_ID,
        role: 'centre',
        email: demoCentreEmail(DEMO_CENTRE_ID),
        name: 'CareQ Demo Centre staff (fictional)',
        passwordHash: demoHash,
        centreId: DEMO_CENTRE_ID,
        centreName: 'CareQ Demo Centre (fictional)',
        createdAt,
      },
      ...realCentreAccounts,
    ],
    children: clone(PRIYA_CHILDREN).map((c) => ({ ...c, parentAccountId: PRIYA_ACCOUNT_ID })),
    centres: clone(INITIAL_CENTRES),
    applications,
    conversations,
    notifications: clone(INITIAL_NOTIFICATIONS),
    supportRequests: clone(INITIAL_SUPPORT_REQUESTS).map((r) => ({
      ...r,
      submittedByAccountId: r.submittedByRole === 'parent' ? PRIYA_ACCOUNT_ID : DEMO_CENTRE_ACCOUNT_ID,
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
