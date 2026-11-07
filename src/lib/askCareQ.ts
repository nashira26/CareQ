/**
 * Opens the floating Ask CareQ panel scoped to one centre ("Ask about this centre" on Find and
 * Track cards). A window event, so the buttons don't need props threaded through App.
 */
export interface AskCentre {
  centreId: string;
  centreName: string;
}

export const ASK_CENTRE_EVENT = 'careq:ask-centre';

export const openAskCareQ = (centre: AskCentre) => window.dispatchEvent(new CustomEvent<AskCentre>(ASK_CENTRE_EVENT, { detail: centre }));

export const CENTRE_QUESTIONS = ['What do I need to register?', 'How do I withdraw?', 'Where am I on the list?'];
export const GENERAL_QUESTIONS = [
  'How are waitlist positions set?',
  'What does simulated data mean?',
  'What are the age groups in Ontario child care?',
  'What must a centre’s waiting list policy include?',
];

/** One source under an answer (shape returned by /api/ask-careq). */
export interface AskCitation {
  kind: 'document' | 'application';
  scope?: 'operator' | 'provincial' | 'help';
  operatorName: string;
  docTitle: string;
  page: string;
  sourceUrl: string | null;
  sourceNote: string | null;
  quote: string;
  label?: string;
  simulated?: boolean;
}

export interface AskResponse {
  answer?: string;
  citations?: AskCitation[];
  toolsUsed?: string[];
  retrievalMode?: 'vector' | 'vector-local' | 'keyword' | 'none';
  aiMode?: 'gemini' | 'fallback' | 'rule';
  modelUsed?: string | null;
  notice?: string;
}

/** "From Toronto Early Learning…'s Parent Handbook (March 2026), PDF p.20" */
export const citationHeading = (c: AskCitation) =>
  c.kind === 'application' ? 'From your application' : `From ${c.operatorName}'s ${c.docTitle}${c.page ? `, ${c.page}` : ''}`;

/** The source note is shown when the link is a website, not the exact file. */
export const showSourceNote = (c: AskCitation) => Boolean(c.sourceNote) && c.sourceNote !== 'Exact file';
