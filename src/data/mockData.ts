import type { Child } from '../lib/family';
import { CAREQ_DEMO_CENTRE, DEMO_CENTRES, DEMO_CENTRE_ID, DEMO_CENTRE_NAME, JESSE_KETCHUM_ID } from './demoCentres';

export type AgeGroup = 'Infant' | 'Toddler' | 'Preschool';

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under review'
  | 'Waitlisted'
  | 'Offer'
  | 'Accepted'
  | 'Withdrawn';

export interface UploadedDocument {
  fileName: string;
  fileSize: string;
  uploadedAt: string;
}

export interface Centre {
  id: string;
  name: string;
  neighbourhood: string;
  ageGroups: AgeGroup[];
  hours: string;
  requirements: string[];
  /**
   * Requirement title -> the policy sentence it came from. Real demo centres: quoted word for word
   * from their published handbook (real data). Fictional/self-registered centres: their own policy.
   */
  requirementSources?: Record<string, string>;
  /** Requirement title -> citation, e.g. "Parent Handbook (March 2026), p.14". Real demo centres only. */
  requirementCitations?: Record<string, string>;
  /** Requirement title -> link to the source document (when it has one; uploaded documents don't). */
  requirementSourceUrls?: Record<string, string>;
  /** The published document the requirements were extracted from (real demo centres only). */
  requirementsExtractedFrom?: {
    docTitle: string;
    sourceUrl?: string;
    sourceNote?: string;
    retrieved: string;
    /** Set when the centre's handbook had no clear requirements and the licensing manual was used. */
    fallback?: 'licensing-manual';
  };
  /**
   * 'open-data': a real Ontario centre (details from open data) with a SIMULATED demo account.
   * 'fictional': CareQ Demo Centre. Absent for centres self-registered in the demo.
   */
  demoKind?: 'open-data' | 'fictional';
  /** Real demo centres: from the Ontario open data. */
  licenceNumber?: string;
  operator?: string;
  /** Licensed spaces (open data): capacity, not availability. */
  capacity?: number;
  feeNote?: string;
  address?: string;
  policyNotes?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  /** Same values as the Ontario open data (e.g. 'Full day'). */
  programOptions?: string[];
  languages?: string[];
  /** Present only for centres registered by their own staff in this browser (demo, not verified). */
  registration?: CentreRegistration;
  /**
   * Demo centres only: hours and contact email entered by the SIMULATED demo account on its profile.
   * Never replaces open-data details; always shown with a "Simulated" tag.
   */
  simulatedContact?: { hours?: string; contactEmail?: string; updatedAt: string };
}

export interface CentreRegistration {
  selfRegistered: true;
  licenceNumber?: string; // self-reported, not verified
  contactEmail: string;
  capacity?: number;
  /** lat/lng come from the neighbourhood or postal-code area, never from a geocoder */
  locationApproximate: true;
  locationSource: 'neighbourhood' | 'postal code';
  photoDataUrl?: string; // resized in the browser, kept in this browser only
  policyText?: string;
  registeredAt: string;
  /** Set by the server when the licence number AND postal code (or a close name) match the Ontario open data. */
  licenceVerified?: LicenceVerification;
  /** Documents the centre uploaded (chunks are in policyChunks; files are not kept). */
  documents?: { docKey: string; docTitle: string; fileName: string; uploadedAt: string; chunks: number; keywordOnly: number }[];
}

export interface LicenceVerification {
  source: 'Ontario open data';
  openDataId: string;
  matchedName: string;
  matchedBy: string;
  dataDate: string | null;
}

export interface ParentProfile {
  name: string;
  /** All children on the account; the FIRST is the active child for now. */
  children: Child[];
  /** Active child (the first child for now). */
  childId: string;
  /** Active child's home area (a torontoAreas name), used to pre-fill Find. */
  homeArea?: string;
  childName: string;
  childAgeMonths: number;
  careType: string;
  preferredStartDate: string;
}

export interface PositionUpdate {
  position: number;
  date: string;
}

export interface Application {
  id: string;
  centreId: string;
  /** Account that owns this application (the parent). */
  parentAccountId: string;
  /** Child this application is for (childName is kept for display). */
  childId: string;
  parentName: string;
  childName: string;
  childAgeMonths: number;
  careType: string;
  preferredStartDate: string;
  status: ApplicationStatus;
  waitlistPosition?: number;
  waitlistReportedBy?: string;
  waitlistReportedDate?: string;
  waitlistReportedTimestamp?: number;
  waitlistEstimate?: string;
  positionHistory?: PositionUpdate[];
  submittedAt?: string;
  completedRequirements: string[];
  uploadedDocuments?: Record<string, UploadedDocument>;
  parentNotes?: string;
  /** Saved only when the parent approves and submits (see src/lib/prepareApplication.ts). */
  preparedFields?: { label: string; value: string; source: 'family profile' | 'parent to provide' }[];
  preparedChecklist?: import('../lib/prepareApplication').ChecklistItem[];
  noteToCentre?: string;
  preparedWithAi?: boolean;
  aiMode?: 'gemini' | 'fallback';
}

export interface InAppNotification {
  id: string;
  recipientRole: 'parent' | 'centre';
  /** Parent account id or centre id: each user only sees their own notifications. */
  recipientId: string;
  message: string;
  timestamp: string;
  createdAt: number;
  read: boolean;
  type?: 'status' | 'position' | 'offer' | 'application';
}

export const PRIYA_ACCOUNT_ID = 'parent-priya';
export { DEMO_CENTRE_ID };
/** Centre portal demo accounts shown on the login page. */
export const DEMO_CENTRE_ACCOUNT_ID = 'centre-careq-demo';
export const JESSE_KETCHUM_ACCOUNT_ID = `centre-${JESSE_KETCHUM_ID}`;

/** One conversation per centre and child. */
export const conversationKey = (centreId: string, childId: string) => `${centreId}-${childId}`;

/** Priya's child in the demo (fictional). Age is derived from the date of birth. */
export const PRIYA_CHILDREN: Child[] = [
  {
    id: 'child-anya',
    firstName: 'Anya',
    dateOfBirth: '2025-01-05',
    careType: 'Full day',
    preferredStartDate: 'March 2027',
    homeArea: 'The Annex',
    notes: '',
  },
];

export const PARENT_PROFILE: ParentProfile = {
  name: 'Priya',
  children: PRIYA_CHILDREN,
  childId: 'child-anya',
  homeArea: 'The Annex',
  childName: 'Anya',
  childAgeMonths: 22,
  careType: 'Full day',
  preferredStartDate: 'March 2027',
};

/** 7 real Ontario open-data centres (simulated demo accounts) + CareQ Demo Centre (fictional). See demoCentres.ts. */
export const INITIAL_CENTRES: Centre[] = DEMO_CENTRES;

const WELLESLEY_ID = 'on-0002899';
const MACAULAY_ID = 'on-0004062';
const LEASIDE_ID = 'on-0002575';
const MARY_WARD_ID = 'on-12256';
const nameOf = (id: string) => DEMO_CENTRES.find((c) => c.id === id)!.name;
const allDone = (centreId: string) => [...DEMO_CENTRES.find((c) => c.id === centreId)!.requirements];

const anya = {
  parentAccountId: PRIYA_ACCOUNT_ID,
  childId: 'child-anya',
  parentName: 'Priya',
  childName: 'Anya',
  childAgeMonths: 22,
  careType: 'Full day',
  preferredStartDate: 'March 2027',
};

/**
 * Every status, position, estimate and offer below is SIMULATED (and labelled so in the UI).
 * The families are fictional.
 */
export const INITIAL_APPLICATIONS: Application[] = [
  // ---- Priya & Anya (toddler, full day) ----
  {
    ...anya,
    id: 'app-jesse-ketchum-anya',
    centreId: JESSE_KETCHUM_ID,
    status: 'Waitlisted',
    waitlistPosition: 4,
    waitlistReportedBy: nameOf(JESSE_KETCHUM_ID),
    waitlistReportedDate: 'Nov 2',
    waitlistReportedTimestamp: new Date('2026-11-02T14:00:00Z').getTime(),
    waitlistEstimate: '4–6 months',
    positionHistory: [
      { position: 9, date: 'Sep 29' },
      { position: 6, date: 'Oct 14' },
      { position: 4, date: 'Nov 2' },
    ],
    submittedAt: 'Sep 22, 2026',
    completedRequirements: allDone(JESSE_KETCHUM_ID),
  },
  {
    ...anya,
    id: 'app-leaside-anya',
    centreId: LEASIDE_ID,
    status: 'Waitlisted',
    waitlistPosition: 10,
    waitlistReportedBy: nameOf(LEASIDE_ID),
    waitlistReportedDate: 'Oct 1',
    waitlistReportedTimestamp: new Date('2026-10-01T15:00:00Z').getTime(),
    // No waitlistEstimate -> "No wait estimate provided by the centre."
    positionHistory: [
      { position: 12, date: 'Sep 18' },
      { position: 10, date: 'Oct 1' },
    ],
    submittedAt: 'Sep 10, 2026',
    completedRequirements: allDone(LEASIDE_ID),
  },
  {
    ...anya,
    id: 'app-wellesley-anya',
    centreId: WELLESLEY_ID,
    status: 'Submitted',
    submittedAt: 'Oct 28, 2026',
    completedRequirements: allDone(WELLESLEY_ID),
  },
  {
    ...anya,
    id: 'app-macaulay-anya',
    centreId: MACAULAY_ID,
    status: 'Offer',
    submittedAt: 'Aug 20, 2026',
    completedRequirements: allDone(MACAULAY_ID),
  },
  {
    ...anya,
    id: 'app-careq-demo-anya',
    centreId: DEMO_CENTRE_ID,
    status: 'Submitted',
    submittedAt: 'Oct 14, 2026',
    completedRequirements: [...CAREQ_DEMO_CENTRE.requirements],
    uploadedDocuments: {
      "Child's Birth Certificate": { fileName: 'anya_birth_certificate.pdf', fileSize: '1.4 MB', uploadedAt: 'Oct 14, 2026' },
      'Yellow Immunization Card (ISPA)': { fileName: 'anya_ispa_yellow_card_scan.pdf', fileSize: '920 KB', uploadedAt: 'Oct 14, 2026' },
      'Proof of Toronto Residency': { fileName: 'toronto_hydro_bill_sept2026.pdf', fileSize: '410 KB', uploadedAt: 'Oct 14, 2026' },
      'Emergency Contact & Medical Consent Form': { fileName: 'emergency_consent_signed.pdf', fileSize: '650 KB', uploadedAt: 'Oct 14, 2026' },
    },
    parentNotes: 'Requesting Toddler room placement.',
  },
  {
    // Not sent yet: Priya's one draft (Drafts tab), with one of the two documents still to add
    ...anya,
    id: 'app-mary-ward-anya',
    centreId: MARY_WARD_ID,
    status: 'Draft',
    completedRequirements: ['Emergency contact information'],
  },

  // ---- Fictional families at Jesse Ketchum (so its simulated dashboard isn't empty) ----
  {
    id: 'app-jesse-ketchum-yara',
    centreId: JESSE_KETCHUM_ID,
    parentAccountId: 'seed-family-haddad',
    childId: 'child-yara',
    parentName: 'Omar Haddad',
    childName: 'Yara',
    childAgeMonths: 26,
    careType: 'Full day',
    preferredStartDate: 'January 2027',
    status: 'Waitlisted',
    waitlistPosition: 2,
    waitlistReportedBy: nameOf(JESSE_KETCHUM_ID),
    waitlistReportedDate: 'Oct 14',
    waitlistReportedTimestamp: new Date('2026-10-14T14:00:00Z').getTime(),
    positionHistory: [
      { position: 3, date: 'Sep 29' },
      { position: 2, date: 'Oct 14' },
    ],
    submittedAt: 'Aug 30, 2026',
    completedRequirements: allDone(JESSE_KETCHUM_ID),
  },
  {
    id: 'app-jesse-ketchum-theo',
    centreId: JESSE_KETCHUM_ID,
    parentAccountId: 'seed-family-okafor',
    childId: 'child-theo',
    parentName: 'Grace Okafor',
    childName: 'Theo',
    childAgeMonths: 38,
    careType: 'Full day',
    preferredStartDate: 'February 2027',
    status: 'Submitted',
    submittedAt: 'Nov 3, 2026',
    completedRequirements: allDone(JESSE_KETCHUM_ID).slice(0, 3),
    parentNotes: 'Preschool room; Theo is moving from a home child care provider.',
  },

  // ---- Fictional families at CareQ Demo Centre ----
  {
    id: 'app-careq-demo-lucas',
    centreId: DEMO_CENTRE_ID,
    parentAccountId: 'seed-family-chen',
    childId: 'child-lucas',
    parentName: 'Marcus Chen',
    childName: 'Lucas',
    childAgeMonths: 14,
    careType: 'Full day',
    preferredStartDate: 'January 2027',
    status: 'Under review',
    submittedAt: 'Oct 18, 2026',
    completedRequirements: ["Child's Birth Certificate", 'Yellow Immunization Card (ISPA)', 'Proof of Toronto Residency'],
    uploadedDocuments: {
      "Child's Birth Certificate": { fileName: 'lucas_chen_birth_record.pdf', fileSize: '1.1 MB', uploadedAt: 'Oct 18, 2026' },
      'Yellow Immunization Card (ISPA)': { fileName: 'lucas_vaccines_record.pdf', fileSize: '840 KB', uploadedAt: 'Oct 18, 2026' },
      'Proof of Toronto Residency': { fileName: 'lease_agreement.pdf', fileSize: '2.1 MB', uploadedAt: 'Oct 18, 2026' },
    },
    parentNotes: 'Sibling attended this centre 3 years ago.',
  },
  {
    id: 'app-careq-demo-maya',
    centreId: DEMO_CENTRE_ID,
    parentAccountId: 'seed-family-rodriguez',
    childId: 'child-maya',
    parentName: 'Sofia Rodriguez',
    childName: 'Maya',
    childAgeMonths: 34,
    careType: 'Full day',
    preferredStartDate: 'April 2027',
    status: 'Waitlisted',
    waitlistPosition: 3,
    waitlistReportedBy: DEMO_CENTRE_NAME,
    waitlistReportedDate: 'Sep 24',
    positionHistory: [
      { position: 6, date: 'Sep 10' },
      { position: 3, date: 'Sep 24' },
    ],
    submittedAt: 'Sep 22, 2026',
    completedRequirements: [...CAREQ_DEMO_CENTRE.requirements],
    uploadedDocuments: {
      "Child's Birth Certificate": { fileName: 'maya_rodriguez_cert.pdf', fileSize: '1.2 MB', uploadedAt: 'Sep 22, 2026' },
    },
    parentNotes: 'Preschool program transition; peanut allergy noted.',
  },
  {
    id: 'app-careq-demo-leo',
    centreId: DEMO_CENTRE_ID,
    parentAccountId: 'seed-family-miller',
    childId: 'child-leo',
    parentName: 'David Miller',
    childName: 'Leo',
    childAgeMonths: 9,
    careType: 'Full day',
    preferredStartDate: 'May 2027',
    status: 'Waitlisted',
    waitlistPosition: 8,
    waitlistReportedBy: DEMO_CENTRE_NAME,
    waitlistReportedDate: 'Sep 05',
    positionHistory: [{ position: 8, date: 'Sep 05' }],
    submittedAt: 'Sep 05, 2026',
    completedRequirements: ["Child's Birth Certificate", 'Yellow Immunization Card (ISPA)'],
    uploadedDocuments: {
      "Child's Birth Certificate": { fileName: 'leo_miller_birth_proof.pdf', fileSize: '980 KB', uploadedAt: 'Sep 05, 2026' },
    },
    parentNotes: 'Infant room intake waiting for mother returning from leave.',
  },
  {
    id: 'app-careq-demo-chloe',
    centreId: DEMO_CENTRE_ID,
    parentAccountId: 'seed-family-tremblay',
    childId: 'child-chloe',
    parentName: 'Jessica Tremblay',
    childName: 'Chloe',
    childAgeMonths: 28,
    careType: 'Full day',
    preferredStartDate: 'February 2027',
    status: 'Offer',
    submittedAt: 'Aug 14, 2026',
    completedRequirements: [...CAREQ_DEMO_CENTRE.requirements],
    uploadedDocuments: {
      "Child's Birth Certificate": { fileName: 'chloe_tremblay_cert.pdf', fileSize: '1.3 MB', uploadedAt: 'Aug 14, 2026' },
    },
    parentNotes: 'Placement spot open in Toddler B room.',
  },
  {
    id: 'app-careq-demo-noah',
    centreId: DEMO_CENTRE_ID,
    parentAccountId: 'seed-family-al-mansoor',
    childId: 'child-noah',
    parentName: 'Tariq Al-Mansoor',
    childName: 'Noah',
    childAgeMonths: 20,
    careType: 'Full day',
    preferredStartDate: 'December 2026',
    status: 'Accepted',
    submittedAt: 'Jul 29, 2026',
    completedRequirements: [...CAREQ_DEMO_CENTRE.requirements],
    parentNotes: 'Enrolment confirmed starting Dec 1.',
  },
];

export interface ChatMessage {
  id: string;
  sender: 'parent' | 'centre';
  senderName: string;
  text: string;
  timestamp: string;
  aiAssisted?: boolean;
  /** Sent from an AI draft built on simulated application data (shown as a tag to both sides). */
  basedOnSimulatedData?: boolean;
}

export type ConversationsMap = Record<string, ChatMessage[]>;

/** Seeded conversations. centreId/childId are explicit (centre ids like "on-00576" contain "-"). Centre messages are simulated. */
export const INITIAL_CONVERSATIONS: { centreId: string; childId: string; messages: ChatMessage[] }[] = [
  {
    centreId: JESSE_KETCHUM_ID,
    childId: 'child-anya',
    messages: [
      {
        id: 'm-jk-1',
        sender: 'centre',
        senderName: nameOf(JESSE_KETCHUM_ID),
        text: "Hello Priya, we have received Anya's toddler application for March 2027 and added her to our waitlist.",
        timestamp: 'Sep 23, 2026 • 10:05 AM',
      },
      {
        id: 'm-jk-2',
        sender: 'centre',
        senderName: nameOf(JESSE_KETCHUM_ID),
        text: 'Update: Anya is now #4 on our toddler waitlist as of Nov 2. We will contact you if a space opens.',
        timestamp: 'Nov 2, 2026 • 9:40 AM',
      },
      {
        id: 'm-jk-3',
        sender: 'parent',
        senderName: 'Priya',
        text: 'Thank you for the update! March 2027 is still our preferred start.',
        timestamp: 'Nov 2, 2026 • 12:15 PM',
      },
    ],
  },
  {
    centreId: MACAULAY_ID,
    childId: 'child-anya',
    messages: [
      {
        id: 'm-mac-1',
        sender: 'centre',
        senderName: nameOf(MACAULAY_ID),
        text: 'Hello Priya, we are pleased to offer Anya a toddler space starting March 2027. Please review the offer in your portal.',
        timestamp: 'Nov 4, 2026 • 11:20 AM',
      },
    ],
  },
  {
    centreId: WELLESLEY_ID,
    childId: 'child-anya',
    messages: [
      {
        id: 'm-wel-1',
        sender: 'parent',
        senderName: 'Priya',
        text: "Hello, we've submitted Anya's toddler application for March 2027. Looking forward to hearing from you!",
        timestamp: 'Oct 28, 2026 • 9:20 AM',
      },
      {
        id: 'm-wel-2',
        sender: 'centre',
        senderName: nameOf(WELLESLEY_ID),
        text: 'Hi Priya, thanks for your application. We will be in touch once we have reviewed it.',
        timestamp: 'Oct 29, 2026 • 3:45 PM',
      },
    ],
  },
  {
    centreId: DEMO_CENTRE_ID,
    childId: 'child-anya',
    messages: [
      {
        id: 'm-demo-1',
        sender: 'centre',
        senderName: DEMO_CENTRE_NAME,
        text: "Hello Priya, welcome to CareQ Demo Centre! We have received Anya's toddler application for March 2027 and are verifying the uploaded documentation.",
        timestamp: 'Oct 15, 2026 • 10:14 AM',
      },
      {
        id: 'm-demo-2',
        sender: 'parent',
        senderName: 'Priya',
        text: "Thank you! We've uploaded the birth certificate, ISPA yellow card, and Toronto utility bill. Please let us know if anything else is needed.",
        timestamp: 'Oct 16, 2026 • 2:30 PM',
      },
      {
        id: 'm-demo-3',
        sender: 'centre',
        senderName: DEMO_CENTRE_NAME,
        text: 'All documents look complete. We will follow up as toddler room allocations for March are finalized.',
        timestamp: 'Oct 17, 2026 • 11:05 AM',
      },
    ],
  },
  {
    centreId: DEMO_CENTRE_ID,
    childId: 'child-lucas',
    messages: [
      {
        id: 'm-lucas-1',
        sender: 'parent',
        senderName: 'Marcus Chen',
        text: "Hi, submitting Lucas's application. His older brother attended your centre 3 years ago!",
        timestamp: 'Oct 18, 2026 • 11:20 AM',
      },
      {
        id: 'm-lucas-2',
        sender: 'centre',
        senderName: DEMO_CENTRE_NAME,
        text: 'Wonderful to have your family back, Marcus! We are reviewing your application.',
        timestamp: 'Oct 19, 2026 • 9:00 AM',
      },
    ],
  },
  {
    centreId: DEMO_CENTRE_ID,
    childId: 'child-maya',
    messages: [
      {
        id: 'm-maya-1',
        sender: 'centre',
        senderName: DEMO_CENTRE_NAME,
        text: 'Hello Sofia, Maya is currently #3 on our preschool waitlist.',
        timestamp: 'Sep 24, 2026 • 2:10 PM',
      },
    ],
  },
  {
    centreId: DEMO_CENTRE_ID,
    childId: 'child-chloe',
    messages: [
      {
        id: 'm-chloe-1',
        sender: 'centre',
        senderName: DEMO_CENTRE_NAME,
        text: 'Hello Jessica! We are pleased to extend a Toddler placement offer for Chloe. Please review and confirm in your portal.',
        timestamp: 'Aug 14, 2026 • 10:00 AM',
      },
    ],
  },
];

const at = (iso: string) => new Date(iso).getTime();

/** All simulated (labelled "Simulated" wherever they appear). */
export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-1',
    recipientRole: 'parent',
    recipientId: PRIYA_ACCOUNT_ID,
    message: `${nameOf(MACAULAY_ID)} made an offer for Anya on Nov 4`,
    timestamp: 'Nov 4',
    createdAt: at('2026-11-04T16:20:00Z'),
    read: false,
    type: 'offer',
  },
  {
    id: 'notif-2',
    recipientRole: 'parent',
    recipientId: PRIYA_ACCOUNT_ID,
    message: `${nameOf(JESSE_KETCHUM_ID)} updated your position to 4 on Nov 2`,
    timestamp: 'Nov 2',
    createdAt: at('2026-11-02T14:00:00Z'),
    read: false,
    type: 'position',
  },
  {
    id: 'notif-3',
    recipientRole: 'parent',
    recipientId: PRIYA_ACCOUNT_ID,
    message: `${nameOf(LEASIDE_ID)} updated your position to 10 on Oct 1`,
    timestamp: 'Oct 1',
    createdAt: at('2026-10-01T15:00:00Z'),
    read: true,
    type: 'position',
  },
  {
    id: 'notif-4',
    recipientRole: 'centre',
    recipientId: DEMO_CENTRE_ID,
    message: 'Priya submitted an application for Anya on Oct 14',
    timestamp: 'Oct 14',
    createdAt: at('2026-10-14T15:00:00Z'),
    read: false,
    type: 'application',
  },
  {
    id: 'notif-5',
    recipientRole: 'centre',
    recipientId: DEMO_CENTRE_ID,
    message: 'Marcus Chen submitted an application for Lucas on Oct 18',
    timestamp: 'Oct 18',
    createdAt: at('2026-10-18T15:20:00Z'),
    read: true,
    type: 'application',
  },
  {
    id: 'notif-6',
    recipientRole: 'centre',
    recipientId: JESSE_KETCHUM_ID,
    message: 'Grace Okafor submitted an application for Theo on Nov 3',
    timestamp: 'Nov 3',
    createdAt: at('2026-11-03T17:00:00Z'),
    read: false,
    type: 'application',
  },
  {
    id: 'notif-7',
    recipientRole: 'centre',
    recipientId: JESSE_KETCHUM_ID,
    message: "Updated Anya's position to 4 on Nov 2",
    timestamp: 'Nov 2',
    createdAt: at('2026-11-02T14:00:01Z'),
    read: true,
    type: 'position',
  },
];
