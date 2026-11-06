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
  feeNote?: string;
  address?: string;
  policyNotes?: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
  /** Simulated for the demo; same values as the Ontario open data (e.g. 'Full day'). */
  programOptions?: string[];
  /** Simulated for the demo. */
  languages?: string[];
}

export interface ParentProfile {
  name: string;
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
}

export interface InAppNotification {
  id: string;
  recipientRole: 'parent' | 'centre';
  message: string;
  timestamp: string;
  createdAt: number;
  read: boolean;
  type?: 'status' | 'position' | 'offer' | 'application';
}

export const PARENT_PROFILE: ParentProfile = {
  name: 'Priya',
  childName: 'Anya',
  childAgeMonths: 22,
  careType: 'Full-time',
  preferredStartDate: 'March 2027',
};

export const INITIAL_CENTRES: Centre[] = [
  {
    id: 'c1',
    programOptions: ['Full day', 'Before school', 'After school'],
    languages: ['English'],
    name: 'Riverdale Early Learning Centre',
    neighbourhood: 'Riverdale',
    ageGroups: ['Infant', 'Toddler', 'Preschool'],
    hours: '7:30 AM – 6:00 PM',
    feeNote: 'CWELCC Participating ($10/day program)',
    address: '428 Broadview Ave, Toronto, ON M4K 2N3',
    lat: 43.6653,
    lng: -79.3528,
    imageUrl: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
      'Emergency Contact & Medical Consent Form',
    ],
    policyNotes:
      'Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance). Families residing in Toronto must verify residency with a utility bill or lease agreement. An Emergency Contact & Medical Consent Form signed by both legal guardians is required before queue ranking.',
  },
  {
    id: 'c2',
    programOptions: ['Full day', 'Half day'],
    languages: ['English'],
    name: "Bloor West Children's Village",
    neighbourhood: 'Bloor West Village',
    ageGroups: ['Toddler', 'Preschool'],
    hours: '8:00 AM – 5:30 PM',
    feeNote: 'CWELCC Participating',
    address: '2215 Bloor St W, Toronto, ON M6S 1N5',
    lat: 43.6508,
    lng: -79.4795,
    imageUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate",
      'Immunization Record',
      'Health & Allergy Questionnaire',
      'Proof of Ontario Address',
    ],
  },
  {
    id: 'c3',
    programOptions: ['Full day', 'Half day'],
    languages: ['English'],
    name: 'High Park Forest Care & Preschool',
    neighbourhood: 'High Park',
    ageGroups: ['Infant', 'Toddler', 'Preschool'],
    hours: '7:00 AM – 6:00 PM',
    feeNote: 'CWELCC Participating',
    address: '1870 Bloor St W, Toronto, ON M6P 3K7',
    lat: 43.6538,
    lng: -79.4682,
    imageUrl: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate or Passport",
      'Immunization Records',
      'Parent Consent & Outdoors Agreement',
      'Child Developmental History Summary',
    ],
  },
  {
    id: 'c4',
    programOptions: ['Full day'],
    languages: ['English', 'Greek'],
    name: 'Danforth Sprouts Daycare',
    neighbourhood: 'The Danforth',
    ageGroups: ['Infant', 'Toddler'],
    hours: '7:30 AM – 5:30 PM',
    feeNote: 'CWELCC Participating',
    address: '612 Danforth Ave, Toronto, ON M4K 1R3',
    lat: 43.6784,
    lng: -79.3482,
    imageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate",
      'Immunization Yellow Card',
      "Physician's Health Assessment",
      'Proof of Ontario Address',
    ],
  },
  {
    id: 'c5',
    programOptions: ['Half day', 'Before school', 'After school'],
    languages: ['English', 'French'],
    name: 'Annex Community Child Care',
    neighbourhood: 'The Annex',
    ageGroups: ['Toddler', 'Preschool'],
    hours: '8:00 AM – 6:00 PM',
    feeNote: 'CWELCC Participating',
    address: '380 Huron St, Toronto, ON M5S 2G6',
    lat: 43.6658,
    lng: -79.3995,
    imageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate",
      'Immunization History',
      'Emergency Contact Authorization',
      'Family Information & Schedule Sheet',
    ],
  },
  {
    id: 'c6',
    programOptions: ['Full day', 'Extended hours'],
    languages: ['English'],
    name: 'Leslieville Little Stars Child Care',
    neighbourhood: 'Leslieville',
    ageGroups: ['Infant', 'Toddler', 'Preschool'],
    hours: '7:30 AM – 5:45 PM',
    feeNote: 'CWELCC Participating',
    address: '1095 Queen St E, Toronto, ON M4M 1K7',
    lat: 43.6601,
    lng: -79.3375,
    imageUrl: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Proof of Child's Age / Birth Certificate",
      'Yellow Immunization Card',
      'Proof of Ontario Residency',
      'Dietary & Medical Needs Form',
    ],
  },
  {
    id: 'c7',
    programOptions: ['Full day', 'Before school', 'After school'],
    languages: ['English', 'French'],
    name: 'Maple Grove Children’s Centre',
    neighbourhood: 'High Park',
    ageGroups: ['Infant', 'Toddler', 'Preschool'],
    hours: '7:30 AM – 6:00 PM',
    feeNote: 'CWELCC Participating ($10/day program)',
    address: '154 Maple Grove Ave, Toronto, ON M6R 2L4',
    lat: 43.6456,
    lng: -79.4523,
    imageUrl: 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?auto=format&fit=crop&w=800&q=80',
    requirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Ontario Address',
      'Parent Intake Questionnaire',
    ],
  },
];

// Initial applications across centres (including multiple kids for Riverdale Early Learning Centre)
export const INITIAL_APPLICATIONS: Application[] = [
  // Applications for Riverdale Early Learning Centre (c1) featuring multiple kids
  {
    id: 'app-c1-anya',
    centreId: 'c1',
    parentName: 'Priya',
    childName: 'Anya',
    childAgeMonths: 22,
    careType: 'Full-time',
    preferredStartDate: 'March 2027',
    status: 'Submitted',
    submittedAt: 'Oct 14, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
      'Emergency Contact & Medical Consent Form',
    ],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'anya_patel_birth_certificate.pdf',
        fileSize: '1.4 MB',
        uploadedAt: 'Oct 14, 2026',
      },
      'Yellow Immunization Card (ISPA)': {
        fileName: 'anya_ispa_yellow_card_scan.pdf',
        fileSize: '920 KB',
        uploadedAt: 'Oct 14, 2026',
      },
      'Proof of Toronto Residency': {
        fileName: 'toronto_hydro_bill_sept2026.pdf',
        fileSize: '410 KB',
        uploadedAt: 'Oct 14, 2026',
      },
      'Emergency Contact & Medical Consent Form': {
        fileName: 'emergency_consent_signed.pdf',
        fileSize: '650 KB',
        uploadedAt: 'Oct 14, 2026',
      },
    },
    parentNotes: 'Requesting Toddler room placement; both parents work near Broadview station.',
  },
  {
    id: 'app-c1-lucas',
    centreId: 'c1',
    parentName: 'Marcus Chen',
    childName: 'Lucas',
    childAgeMonths: 14,
    careType: 'Full-time',
    preferredStartDate: 'January 2027',
    status: 'Under review',
    submittedAt: 'Oct 18, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
    ],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'lucas_chen_birth_record.pdf',
        fileSize: '1.1 MB',
        uploadedAt: 'Oct 18, 2026',
      },
      'Yellow Immunization Card (ISPA)': {
        fileName: 'lucas_vaccines_record.pdf',
        fileSize: '840 KB',
        uploadedAt: 'Oct 18, 2026',
      },
      'Proof of Toronto Residency': {
        fileName: 'lease_agreement_riverdale.pdf',
        fileSize: '2.1 MB',
        uploadedAt: 'Oct 18, 2026',
      },
    },
    parentNotes: 'Sibling attended Riverdale ELC 3 years ago.',
  },
  {
    id: 'app-c1-maya',
    centreId: 'c1',
    parentName: 'Sofia Rodriguez',
    childName: 'Maya',
    childAgeMonths: 34,
    careType: 'Full-time',
    preferredStartDate: 'April 2027',
    status: 'Waitlisted',
    waitlistPosition: 3,
    waitlistReportedBy: 'Riverdale Early Learning Centre',
    waitlistReportedDate: 'Sep 24',
    positionHistory: [
      { position: 6, date: 'Sep 10' },
      { position: 3, date: 'Sep 24' },
    ],
    submittedAt: 'Sep 22, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
      'Emergency Contact & Medical Consent Form',
    ],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'maya_rodriguez_cert.pdf',
        fileSize: '1.2 MB',
        uploadedAt: 'Sep 22, 2026',
      },
    },
    parentNotes: 'Preschool program transition; peanut allergy noted.',
  },
  {
    id: 'app-c1-leo',
    centreId: 'c1',
    parentName: 'David Miller',
    childName: 'Leo',
    childAgeMonths: 9,
    careType: 'Full-time',
    preferredStartDate: 'May 2027',
    status: 'Waitlisted',
    waitlistPosition: 8,
    waitlistReportedBy: 'Riverdale Early Learning Centre',
    waitlistReportedDate: 'Sep 05',
    positionHistory: [
      { position: 8, date: 'Sep 05' },
    ],
    submittedAt: 'Sep 05, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
    ],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'leo_miller_birth_proof.pdf',
        fileSize: '980 KB',
        uploadedAt: 'Sep 05, 2026',
      },
    },
    parentNotes: 'Infant room intake waiting for mother returning from leave.',
  },
  {
    id: 'app-c1-chloe',
    centreId: 'c1',
    parentName: 'Jessica Tremblay',
    childName: 'Chloe',
    childAgeMonths: 28,
    careType: 'Full-time',
    preferredStartDate: 'February 2027',
    status: 'Offer',
    submittedAt: 'Aug 14, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
      'Emergency Contact & Medical Consent Form',
    ],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'chloe_tremblay_cert.pdf',
        fileSize: '1.3 MB',
        uploadedAt: 'Aug 14, 2026',
      },
    },
    parentNotes: 'Placement spot open in Toddler B room.',
  },
  {
    id: 'app-c1-noah',
    centreId: 'c1',
    parentName: 'Tariq Al-Mansoor',
    childName: 'Noah',
    childAgeMonths: 20,
    careType: 'Full-time',
    preferredStartDate: 'December 2026',
    status: 'Accepted',
    submittedAt: 'Jul 29, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Toronto Residency',
      'Emergency Contact & Medical Consent Form',
    ],
    parentNotes: 'Enrolment confirmed starting Dec 1.',
  },

  // Additional applications for Priya & Anya at other centres for the parent view
  {
    id: 'app-c2-anya',
    centreId: 'c2',
    parentName: 'Priya',
    childName: 'Anya',
    childAgeMonths: 22,
    careType: 'Full-time',
    preferredStartDate: 'March 2027',
    status: 'Under review',
    submittedAt: 'Oct 02, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Immunization Record',
      'Health & Allergy Questionnaire',
      'Proof of Ontario Address',
    ],
  },
  {
    id: 'app-c7-anya',
    centreId: 'c7',
    parentName: 'Priya',
    childName: 'Anya',
    childAgeMonths: 22,
    careType: 'Full-time',
    preferredStartDate: 'March 2027',
    status: 'Waitlisted',
    waitlistPosition: 14,
    waitlistReportedBy: 'Maple Grove',
    waitlistReportedDate: 'Nov 3',
    waitlistReportedTimestamp: new Date('2026-11-03T09:00:00Z').getTime(),
    waitlistEstimate: '8–12 months',
    positionHistory: [
      { position: 22, date: 'Oct 1' },
      { position: 17, date: 'Oct 20' },
      { position: 14, date: 'Nov 3' },
    ],
    submittedAt: 'Oct 20, 2026',
    completedRequirements: [
      "Child's Birth Certificate",
      'Yellow Immunization Card (ISPA)',
      'Proof of Ontario Address',
    ],
  },
  {
    id: 'app-c3-anya',
    centreId: 'c3',
    parentName: 'Priya',
    childName: 'Anya',
    childAgeMonths: 22,
    careType: 'Full-time',
    preferredStartDate: 'March 2027',
    status: 'Waitlisted',
    waitlistPosition: 7,
    waitlistReportedBy: 'High Park Forest Care',
    waitlistReportedDate: 'Sep 18',
    waitlistReportedTimestamp: new Date('2026-09-18T10:00:00Z').getTime(),
    positionHistory: [
      { position: 11, date: 'Aug 15' },
      { position: 7, date: 'Sep 18' },
    ],
    // No waitlistEstimate -> shows "No wait estimate provided by the centre."
    // Reported Sep 18 (over 30 days ago from Nov 2) -> shows "Last update over a month ago."
    submittedAt: 'Sep 18, 2026',
    completedRequirements: [
      "Child's Birth Certificate or Passport",
      'Immunization Records',
      'Parent Consent & Outdoors Agreement',
      'Child Developmental History Summary',
    ],
  },
  {
    id: 'app-c4-anya',
    centreId: 'c4',
    parentName: 'Priya',
    childName: 'Anya',
    childAgeMonths: 22,
    careType: 'Full-time',
    preferredStartDate: 'March 2027',
    status: 'Draft',
    completedRequirements: ["Child's Birth Certificate"],
    uploadedDocuments: {
      "Child's Birth Certificate": {
        fileName: 'anya_patel_birth_certificate.pdf',
        fileSize: '1.4 MB',
        uploadedAt: 'Oct 28, 2026',
      },
    },
  },
];

export interface ChatMessage {
  id: string;
  sender: 'parent' | 'centre';
  senderName: string;
  text: string;
  timestamp: string;
  aiAssisted?: boolean;
}

export type ConversationsMap = Record<string, ChatMessage[]>;

export const INITIAL_CONVERSATIONS: ConversationsMap = {
  // Keyed by `${centreId}-${childName.toLowerCase()}`
  'c1-anya': [
    {
      id: 'm1',
      sender: 'centre',
      senderName: 'Riverdale Early Learning Centre',
      text: "Hello Priya, welcome to Riverdale Early Learning Centre! We have received Anya's toddler application for March 2027 and are verifying the uploaded documentation.",
      timestamp: 'Oct 15, 2026 • 10:14 AM',
    },
    {
      id: 'm2',
      sender: 'parent',
      senderName: 'Priya',
      text: "Thank you! We've uploaded the birth certificate, ISPA yellow card, and Toronto utility bill. Please let us know if anything else is needed.",
      timestamp: 'Oct 16, 2026 • 2:30 PM',
    },
    {
      id: 'm3',
      sender: 'centre',
      senderName: 'Riverdale Early Learning Centre',
      text: 'All documents look complete and verified. We will follow up as toddler room allocations for March are finalized.',
      timestamp: 'Oct 17, 2026 • 11:05 AM',
    },
  ],
  'c2-anya': [
    {
      id: 'm-c2-1',
      sender: 'parent',
      senderName: 'Priya',
      text: "Hello Bloor West team, we've submitted our toddler application for March 2027. Looking forward to hearing from you!",
      timestamp: 'Oct 02, 2026 • 9:20 AM',
    },
    {
      id: 'm-c2-2',
      sender: 'centre',
      senderName: "Bloor West Children's Village",
      text: 'Hi Priya, thanks for your submission. Your file is currently under review by our intake committee.',
      timestamp: 'Oct 03, 2026 • 3:45 PM',
    },
  ],
  'c3-anya': [
    {
      id: 'm-c3-1',
      sender: 'centre',
      senderName: 'High Park Forest Care & Preschool',
      text: 'Hello Priya, Anya is placed at #7 on our Toddler waitlist for March. We will notify you if a spot opens up.',
      timestamp: 'Sep 19, 2026 • 1:15 PM',
    },
  ],
  'c1-lucas': [
    {
      id: 'm-lucas-1',
      sender: 'parent',
      senderName: 'Marcus Chen',
      text: "Hi, submitting Lucas's toddler application. His older brother Noah was at Riverdale 3 years ago!",
      timestamp: 'Oct 18, 2026 • 11:20 AM',
    },
    {
      id: 'm-lucas-2',
      sender: 'centre',
      senderName: 'Riverdale Early Learning Centre',
      text: 'Wonderful to have your family back, Marcus! Our committee is reviewing your sibling priority status.',
      timestamp: 'Oct 19, 2026 • 9:00 AM',
    },
  ],
  'c1-maya': [
    {
      id: 'm-maya-1',
      sender: 'centre',
      senderName: 'Riverdale Early Learning Centre',
      text: 'Hello Sofia, Maya is currently #3 on our preschool intake waitlist. We anticipate movement in early spring.',
      timestamp: 'Sep 24, 2026 • 2:10 PM',
    },
  ],
  'c1-chloe': [
    {
      id: 'm-chloe-1',
      sender: 'centre',
      senderName: 'Riverdale Early Learning Centre',
      text: 'Hello Jessica! We are pleased to extend a Toddler placement offer for Chloe. Please review and confirm in your portal.',
      timestamp: 'Aug 14, 2026 • 10:00 AM',
    },
  ],
};

export const INITIAL_NOTIFICATIONS: InAppNotification[] = [
  {
    id: 'notif-1',
    recipientRole: 'parent',
    message: 'Maple Grove updated your position to 14 on Nov 3',
    timestamp: 'Nov 3',
    createdAt: Date.now() - 86400000,
    read: false,
    type: 'position',
  },
  {
    id: 'notif-2',
    recipientRole: 'parent',
    message: 'Riverdale Early Learning Centre updated your application status to Under review on Oct 28',
    timestamp: 'Oct 28',
    createdAt: Date.now() - 86400000 * 7,
    read: false,
    type: 'status',
  },
  {
    id: 'notif-3',
    recipientRole: 'centre',
    message: 'Priya submitted an application for Anya on Oct 25',
    timestamp: 'Oct 25',
    createdAt: Date.now() - 86400000 * 10,
    read: false,
    type: 'application',
  },
  {
    id: 'notif-4',
    recipientRole: 'centre',
    message: 'Marcus Chen submitted an application for Lucas on Oct 18',
    timestamp: 'Oct 18',
    createdAt: Date.now() - 86400000 * 17,
    read: true,
    type: 'application',
  },
];
