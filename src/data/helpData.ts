export type RequestType = 'contact' | 'tech_support' | 'concern';

export type ConcernCategory = 'Communication' | 'Fairness' | 'Privacy' | 'Other';

export type ConcernStep =
  | 'Submitted'
  | 'Under review by CareQ support'
  | 'Shared with the other party (if needed)'
  | 'Resolved';

export interface StepHistoryItem {
  step: ConcernStep;
  date: string;
}

export interface SupportRequest {
  id: string;
  referenceNumber: string; // e.g. "CQ-1042"
  type: RequestType;
  submittedByRole: 'parent' | 'centre';
  submittedByName: string;
  submittedAt: string;
  subject: string;
  message: string;
  status: 'Open' | 'In progress' | 'Resolved';
  category?: ConcernCategory;
  concernStep?: ConcernStep;
  concernStepsHistory?: StepHistoryItem[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  source: string;
}

export const HELP_FAQS: FAQItem[] = [
  {
    id: 'faq-1',
    question: 'How do applications work in CareQ?',
    answer:
      'CareQ simplifies child care intake across Ontario licensed centres. Parents explore licensed centres, add centres to their intake list, upload required documents (such as immunization records and proof of residency), and review their application before submitting. Participating centres receive the verified file directly and update application progress.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-2',
    question: 'How are waitlist positions set?',
    answer:
      'Waitlist positions are set independently by each centre under its own published admission policy (such as sibling priority, catchment area, or intake application date). CareQ is a communication and intake coordination tool—CareQ ranks no one and does not decide placement order.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-3',
    question: 'What does "simulated data" mean?',
    answer:
      'CareQ is currently operating as an interactive prototype demonstration. Simulated data indicates sample demonstration records—such as mock waitlist position histories, demo parent profiles, and sample notifications—created to demonstrate realistic coordination without exposing real confidential personal information.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-4',
    question: 'How is AI used in CareQ?',
    answer:
      'AI in CareQ assists with administrative productivity: it reads published centre intake policies to extract required document checklists, prepares draft messages, and suggests calmer phrasing for messages. Human beings approve everything—the AI never decides who gets a child care space, never ranks families, and never takes automated actions.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-5',
    question: 'Who can see my documents?',
    answer:
      'Documents are shared with a centre only after the parent explicitly reviews and approves submission. CareQ does not share your uploaded files publicly, does not sell data, and competing centres cannot see files submitted to other centres.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-6',
    question: 'How do I contact support or report an issue?',
    answer:
      'You can submit a Contact Us inquiry or Technical Support ticket directly in the Help tab. Every submission receives a tracking reference number (e.g., CQ-1042). If you experience a communication, fairness, or privacy concern with another party, you can use the "Raise a concern" form.',
    source: 'Help FAQ',
  },
  {
    id: 'faq-7',
    question: 'Can I decline an offer or withdraw an application?',
    answer:
      'Yes. When an offer is extended by a centre, you can choose to accept the offer (and optionally withdraw pending applications from other centres) or decline/withdraw directly from your Track Status dashboard.',
    source: 'Help FAQ',
  },
];

export const INITIAL_SUPPORT_REQUESTS: SupportRequest[] = [
  {
    id: 'req-1',
    referenceNumber: 'CQ-1042',
    type: 'concern',
    submittedByRole: 'parent',
    submittedByName: 'Priya Patel',
    submittedAt: 'Nov 1, 2026',
    subject: 'Unanswered waitlist estimate inquiry',
    message: 'We requested clarification on estimated intake dates two weeks ago and haven’t received a reply.',
    status: 'In progress',
    category: 'Communication',
    concernStep: 'Under review by CareQ support',
    concernStepsHistory: [
      { step: 'Submitted', date: 'Nov 1, 2026' },
      { step: 'Under review by CareQ support', date: 'Nov 2, 2026' },
    ],
  },
  {
    id: 'req-2',
    referenceNumber: 'CQ-1038',
    type: 'tech_support',
    submittedByRole: 'parent',
    submittedByName: 'Priya Patel',
    submittedAt: 'Oct 28, 2026',
    subject: 'Immunization card PDF upload preview error',
    message: 'File uploaded successfully but the preview thumbnail took a minute to refresh on mobile browser.',
    status: 'Resolved',
  },
  {
    id: 'req-3',
    referenceNumber: 'CQ-1031',
    type: 'contact',
    submittedByRole: 'centre',
    submittedByName: 'Riverdale Early Learning Centre',
    submittedAt: 'Oct 22, 2026',
    subject: 'CWELCC 2027 fee guideline synchronization',
    message: 'Inquiring about upcoming regional municipal fee subsidy integration timelines for toddler care.',
    status: 'In progress',
  },
];
