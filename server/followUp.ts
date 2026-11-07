/**
 * Context-aware follow-up messages (/api/generate-message). The server builds the facts from the
 * application itself (never from the browser in mongo mode): centre, child's first name, status,
 * position with who reported it and when, the centre's estimate, start and submitted dates, and
 * whether they are simulated. If retrieval finds a relevant line in the centre's own handbook (how to
 * accept an offer, notice periods…), the draft may use it and must quote it verbatim; the quote is
 * verified like Ask CareQ's. The word "simulated" never appears in the message body: the facts panel
 * under the draft carries the labels. The sender edits and approves; nothing is sent automatically.
 */
import { Type } from '@google/genai';
import type { Application, Centre } from '../src/data/mockData';
import { AskPassage, Citation, citationFor, excerpt, pageOf, retrieveForAsk, verifiedQuote } from './askAgent';
import type { RetrieverDeps } from './retrieval';

export interface MessageFact {
  label: string;
  value: string;
  simulated: boolean;
}

export interface FollowUpContext {
  role: 'parent' | 'centre';
  senderName: string;
  childFirstName: string;
  centreId: string;
  centreName: string;
  intent: string;
  facts: MessageFact[];
  /** Any fact is simulated (demo centre). */
  simulated: boolean;
  status: string;
}

const first = (name: string) => name.trim().split(/\s+/)[0] || 'your child';

/** Facts from the application (demo centres' applications are simulated; self-registered centres' are not). */
export function buildFollowUpContext(
  app: Pick<Application, 'childName' | 'status' | 'waitlistPosition' | 'waitlistReportedBy' | 'waitlistReportedDate' | 'waitlistEstimate' | 'preferredStartDate' | 'submittedAt' | 'careType'>,
  centre: Pick<Centre, 'id' | 'name' | 'registration'>,
  role: 'parent' | 'centre',
  senderName: string,
  intent: string
): FollowUpContext {
  const sim = !centre.registration;
  const facts: MessageFact[] = [
    { label: 'Centre', value: centre.name, simulated: false },
    { label: 'Child', value: first(app.childName), simulated: false },
    { label: 'Application status', value: app.status === 'Offer' ? 'Offer made by the centre' : app.status, simulated: sim },
  ];
  if (typeof app.waitlistPosition === 'number' && app.waitlistPosition > 0) {
    const by = app.waitlistReportedBy || centre.name;
    facts.push({ label: 'Queue position', value: `#${app.waitlistPosition}, reported by ${by}${app.waitlistReportedDate ? ` on ${app.waitlistReportedDate}` : ''}`, simulated: sim });
  }
  if (app.waitlistEstimate) facts.push({ label: "Centre's estimate", value: `${app.waitlistEstimate} (not a guarantee)`, simulated: sim });
  if (app.careType) facts.push({ label: 'Care type', value: app.careType, simulated: false });
  if (app.preferredStartDate) facts.push({ label: 'Preferred start', value: app.preferredStartDate, simulated: false });
  if (app.submittedAt) facts.push({ label: 'Submitted', value: app.submittedAt, simulated: sim });
  return {
    role,
    senderName: first(senderName),
    childFirstName: first(app.childName),
    centreId: centre.id,
    centreName: centre.name,
    intent: intent.trim().slice(0, 200) || 'general follow-up',
    facts,
    simulated: sim,
    status: app.status,
  };
}

/** What to look up in the centre's handbook for this message. */
export function handbookQuery(intent: string, status: string): string {
  const t = `${intent} ${status}`.toLowerCase();
  if (/offer|accept|confirm/.test(t)) return 'accepting an offer of a space and the next steps before the first day: visit, admission forms, enrolment';
  if (/withdraw|decline|cancel|leave/.test(t)) return 'notice period for withdrawing a child or declining a space';
  if (/tour|visit|orientation/.test(t)) return 'visiting or touring the centre before enrolment, orientation';
  if (/document|form|immuni|health/.test(t)) return 'documents and forms parents must provide before admission';
  if (/wait|position|queue|list|timeline/.test(t)) return 'waitlist policy: how spaces are offered and how families are kept updated';
  return intent;
}

/** The centre's own handbook passages (operator scope only; the licensing manual isn't the centre's rule). */
export async function findHandbookPassages(ctx: FollowUpContext, deps: RetrieverDeps): Promise<AskPassage[]> {
  const r = await retrieveForAsk(handbookQuery(ctx.intent, ctx.status), ctx.centreId, deps).catch(() => null);
  return (r?.passages ?? []).filter((p) => p.scope === 'operator').slice(0, 2);
}

export const FOLLOW_UP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    message: { type: Type.STRING },
    handbookQuote: {
      type: Type.OBJECT,
      nullable: true,
      properties: { chunkId: { type: Type.STRING }, quote: { type: Type.STRING } },
      required: ['chunkId', 'quote'],
    },
  },
  required: ['message'],
};

export function followUpPrompt(ctx: FollowUpContext, passages: AskPassage[]): string {
  const to = ctx.role === 'parent' ? `the staff at ${ctx.centreName}` : `${ctx.childFirstName}'s family`;
  return `Draft a short message (2–4 sentences) from ${ctx.role === 'parent' ? `a parent, ${ctx.senderName},` : `the staff at ${ctx.centreName}`} to ${to}. The sender will edit and approve it before sending.

Purpose: "${ctx.intent}"

Rules:
- Use ONLY these facts and passages. Never invent dates, deadlines, positions, waits, fees or promises.
- Mention the centre and the application's current status where it helps (e.g. the offer).
- Never estimate or predict a position, wait or availability.
- Never use the word "simulated" or say anything about demo data.
- Use ${ctx.childFirstName}'s name; never he/she/his/her.
- If a handbook passage is relevant (e.g. how to accept an offer, notice periods), you may refer to it in plain words and then return its chunkId and an exact quote (at most 25 words, copied character for character) in handbookQuote. Otherwise handbookQuote is null.
- Plain text, no subject line, no placeholders like [Name].

Facts (JSON):
${JSON.stringify(ctx.facts.map(({ label, value }) => ({ label, value })))}

Handbook passages from ${ctx.centreName}'s own published documents (JSON):
${JSON.stringify(passages.map((p) => ({ chunkId: p.chunkId, heading: p.heading, text: p.text })))}`;
}

/** Removes demo wording the body must never carry ("(simulated)", "Simulated"). */
export const stripSimulatedWord = (s: string) =>
  s
    .replace(/[ \t]*\((?:simulated|demo)[^)]*\)/gi, '')
    .replace(/\bsimulated[ \t]+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

export interface FollowUpResult {
  draftMessage: string;
  facts: MessageFact[];
  simulated: boolean;
  citation: Citation | null;
}

/** Verifies the model's draft: a handbook quote must be verbatim in a passage it was given, else null. */
export function finaliseFollowUp(ctx: FollowUpContext, passages: AskPassage[], raw: unknown): FollowUpResult | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { message?: unknown; handbookQuote?: { chunkId?: unknown; quote?: unknown } | null };
  const message = typeof r.message === 'string' ? stripSimulatedWord(r.message).slice(0, 1500) : '';
  if (!message) return null;
  let citation: Citation | null = null;
  if (r.handbookQuote && typeof r.handbookQuote.quote === 'string') {
    const p = passages.find((x) => x.chunkId === r.handbookQuote!.chunkId);
    const quote = p ? verifiedQuote(r.handbookQuote.quote as string, p.text) : null;
    // A handbook claim we can't verify: the draft is not used (the caller falls back to the template)
    if (!p || !quote) return null;
    citation = citationFor(p, quote);
  }
  return { draftMessage: message, facts: ctx.facts, simulated: ctx.simulated, citation };
}

/** Non-AI draft from the same facts, with the handbook line (verbatim excerpt) when one was found. */
export function fallbackFollowUp(ctx: FollowUpContext, passages: AskPassage[]): FollowUpResult {
  const p = passages[0];
  const quote = p ? excerpt(p.text, 25).replace(/…$/, '') : null;
  const statusLine =
    ctx.status === 'Offer'
      ? `Thank you for the offer of a space for ${ctx.childFirstName} at ${ctx.centreName}.`
      : `I'm following up on ${ctx.childFirstName}'s application at ${ctx.centreName} (status: ${ctx.status}).`;
  const handbookLine = p && quote ? ` Your ${p.docTitle} (${pageOf(p)}) says: "${quote}…"` : '';
  const ask =
    ctx.status === 'Offer'
      ? ' Could you let us know the next steps to accept and confirm enrolment?'
      : ` Could you share any update or anything else you need from us?`;
  const parentDraft = `Hello ${ctx.centreName} team,\n\n${statusLine}${handbookLine}${ask}\n\nThank you,\n${ctx.senderName}`;
  const centreDraft = `Hello, this is ${ctx.centreName} following up about ${ctx.childFirstName}'s application (status: ${ctx.status}).${handbookLine} Please let us know if you have any questions.`;
  return {
    draftMessage: stripSimulatedWord(ctx.role === 'parent' ? parentDraft : centreDraft),
    facts: ctx.facts,
    simulated: ctx.simulated,
    citation: p && quote ? citationFor(p, quote) : null,
  };
}
