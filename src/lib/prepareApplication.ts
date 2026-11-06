/**
 * AI-prepared applications (partner centres only): shared types, input/output guardrails and the
 * rule-based fallback. Used by server.ts (/api/prepare-application), the Apply tab and unit tests.
 *
 * Guardrails applied to every result, AI or not:
 *  - The four profile fields (child name, age, care type, start date) are built in code from the
 *    family profile; the model can only ADD fields, and those are always "parent to provide".
 *  - The checklist has exactly the centre's requirements, in order, with the centre's own source
 *    sentences. "ready" needs a real uploaded document; condition-type requirements (e.g. catchment)
 *    are always "needs parent check" — CareQ never verifies them itself.
 *  - missingItems is recomputed from the checklist and fields; the note is capped at 80 words.
 */

export type FieldSource = 'family profile' | 'parent to provide';
export type ChecklistStatus = 'ready' | 'missing' | 'needs parent check';
export const CHECKLIST_STATUSES: ChecklistStatus[] = ['ready', 'missing', 'needs parent check'];
export const NOT_PROVIDED = 'Not provided by parent';

export interface PreparedField {
  label: string;
  value: string;
  source: FieldSource;
  editedByParent?: boolean;
}

export interface ChecklistItem {
  requirement: string;
  sourceSentence: string;
  status: ChecklistStatus;
  matchedDocument?: string;
  setBy: 'ai' | 'rules' | 'parent';
  parentConfirmed?: boolean; // only meaningful for "needs parent check"
}

export interface PrepareInput {
  centreName: string;
  parentFirstName: string;
  childFirstName: string;
  childAgeMonths: number;
  careType: string;
  preferredStartDate: string;
  parentNotes: string;
  documents: { fileName: string; attachedTo: string }[];
  requirements: { requirement: string; sourceSentence: string }[];
}

export interface PrepareResult {
  fields: PreparedField[];
  checklist: ChecklistItem[];
  missingItems: string[];
  noteToCentre: string;
}

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const firstName = (v: unknown) => clip(v, 60).split(/\s+/)[0] ?? '';

/** Keeps only the allowed fields (no email, date of birth or anything else) and bounds sizes. */
export function sanitizePrepareInput(raw: unknown): PrepareInput | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const requirements = (Array.isArray(r.requirements) ? r.requirements : [])
    .map((q: any) => ({ requirement: clip(q?.requirement, 120), sourceSentence: clip(q?.sourceSentence, 400) }))
    .filter((q) => q.requirement)
    .slice(0, 20);
  const childFirstName = firstName(r.childFirstName);
  if (!requirements.length || !childFirstName) return null;
  const age = Number(r.childAgeMonths);
  return {
    centreName: clip(r.centreName, 120),
    parentFirstName: firstName(r.parentFirstName),
    childFirstName,
    childAgeMonths: Number.isFinite(age) && age >= 0 && age <= 144 ? Math.round(age) : 0,
    careType: clip(r.careType, 40),
    preferredStartDate: clip(r.preferredStartDate, 40),
    parentNotes: clip(r.parentNotes, 500),
    documents: (Array.isArray(r.documents) ? r.documents : [])
      .map((d: any) => ({ fileName: clip(d?.fileName, 120), attachedTo: clip(d?.attachedTo, 120) }))
      .filter((d) => d.fileName)
      .slice(0, 30),
    requirements,
  };
}

/** The four profile fields, straight from the family profile (never from the model). */
export function profileFields(input: PrepareInput): PreparedField[] {
  const f = (label: string, value: string): PreparedField =>
    value ? { label, value, source: 'family profile' } : { label, value: '', source: 'parent to provide' };
  return [
    f('Child name', input.childFirstName),
    f('Child age', input.childAgeMonths ? `${input.childAgeMonths} months` : ''),
    f('Care type', input.careType),
    f('Preferred start date', input.preferredStartDate),
  ];
}

// ---------- Rules ----------

const DOCUMENT_WORDS = /\b(certificate|record|records|card|form|proof|copy|questionnaire|assessment|summary|sheet|agreement|consent|authori[sz]ation|history|passport|letter)\b/i;
const CONDITION_WORDS = /\b(must (?:live|reside|be)|eligib\w*|resident of|residence in|reside in|catchment|toilet[\s-]?trained|toilet)\b/i;

/** A condition the app can't verify (e.g. catchment, toilet trained), as opposed to a document. */
export const isConditionRequirement = (requirement: string) =>
  CONDITION_WORDS.test(requirement) && !DOCUMENT_WORDS.test(requirement.replace(/\bresidence\b/i, ''));

// Words that mean the same thing in requirement titles and file names.
const SYNONYMS: string[][] = [
  ['birth', 'certificate', 'passport', 'age'],
  ['immunization', 'immunisation', 'ispa', 'vaccine', 'vaccines', 'vaccination', 'yellow'],
  ['residency', 'residence', 'address', 'hydro', 'utility', 'lease', 'bill'],
  ['emergency', 'contact'],
  ['medical', 'health', 'physician', 'doctor'],
  ['allergy', 'allergies', 'dietary', 'diet'],
  ['consent', 'authorization', 'authorisation', 'agreement'],
  ['developmental', 'development'],
  ['questionnaire', 'intake'],
  ['schedule', 'family'],
];
const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((w) => w.length > 2);
const groupsOf = (s: string) => {
  const t = new Set(tokens(s));
  return new Set(SYNONYMS.map((g, i) => (g.some((w) => t.has(w)) ? i : -1)).filter((i) => i >= 0));
};

/** The uploaded document for a requirement: attached to it, or clearly matching by keywords. */
export function matchDocument(requirement: string, documents: PrepareInput['documents']): string | undefined {
  const attached = documents.find((d) => d.attachedTo.toLowerCase() === requirement.toLowerCase());
  if (attached) return attached.fileName;
  const want = groupsOf(requirement);
  if (!want.size) return undefined;
  // Every topic of the requirement must appear in the file name (e.g. "immunization" AND nothing else needed)
  return documents.find((d) => {
    const have = groupsOf(d.fileName);
    return [...want].every((g) => have.has(g));
  })?.fileName;
}

const wordCap = (s: string, max: number) => {
  const words = s.trim().split(/\s+/).filter(Boolean);
  return words.length <= max ? words.join(' ') : `${words.slice(0, max).join(' ')}…`;
};

export function computeMissingItems(fields: PreparedField[], checklist: ChecklistItem[]): string[] {
  return [
    ...checklist.filter((c) => c.status === 'missing').map((c) => `Upload: ${c.requirement}`),
    ...checklist
      .filter((c) => c.status === 'needs parent check' && !c.parentConfirmed)
      .map((c) => `Confirm: ${c.requirement}`),
    ...fields.filter((f) => f.source === 'parent to provide' && !f.value.trim()).map((f) => `Provide: ${f.label}`),
  ];
}

export function templateNote(input: PrepareInput): string {
  const docs = input.documents.length;
  return wordCap(
    `Hello ${input.centreName || 'team'}, I would like to apply for ${input.childFirstName}` +
      `${input.childAgeMonths ? ` (${input.childAgeMonths} months)` : ''}` +
      `${input.careType ? ` for ${input.careType.toLowerCase()} care` : ''}` +
      `${input.preferredStartDate ? ` starting ${input.preferredStartDate}` : ''}. ` +
      `${docs ? `I have attached the documents I have so far` : 'I will send the required documents'} and will follow up on anything still missing. ` +
      `Thank you${input.parentFirstName ? `, ${input.parentFirstName}` : ''}.`,
    80
  );
}

/** Rule-based preparation (used when Gemini is unavailable). */
export function prepareFallback(input: PrepareInput): PrepareResult {
  const checklist: ChecklistItem[] = input.requirements.map(({ requirement, sourceSentence }) => {
    if (isConditionRequirement(requirement)) {
      return { requirement, sourceSentence, status: 'needs parent check', setBy: 'rules' };
    }
    const doc = matchDocument(requirement, input.documents);
    return doc
      ? { requirement, sourceSentence, status: 'ready', matchedDocument: doc, setBy: 'rules' }
      : { requirement, sourceSentence, status: 'missing', setBy: 'rules' };
  });
  const fields = profileFields(input);
  return { fields, checklist, missingItems: computeMissingItems(fields, checklist), noteToCentre: templateNote(input) };
}

const FORBIDDEN_NOTE = /\b(priority|prioriti[sz]e|other famil|rank|ranking|queue position|waitlist position|jump)\b/i;

/** Applies every guardrail to model output; anything invalid falls back to the rules. */
export function finalizePrepared(input: PrepareInput, raw: unknown): PrepareResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const rules = prepareFallback(input);
  const modelItems: any[] = Array.isArray(r.checklist) ? r.checklist : [];
  const uploaded = new Map(input.documents.map((d) => [d.fileName.toLowerCase(), d.fileName]));

  const checklist: ChecklistItem[] = input.requirements.map(({ requirement, sourceSentence }, i) => {
    const ruled = rules.checklist[i];
    // Conditions are never decided by the model, and a document attached to the requirement is a fact.
    if (ruled.status === 'needs parent check') return ruled;
    const attached = input.documents.find((d) => d.attachedTo.toLowerCase() === requirement.toLowerCase());
    if (attached) return { requirement, sourceSentence, status: 'ready', matchedDocument: attached.fileName, setBy: 'rules' };

    const m = modelItems.find((x) => typeof x?.requirement === 'string' && x.requirement.trim().toLowerCase() === requirement.toLowerCase());
    let status: ChecklistStatus = CHECKLIST_STATUSES.includes(m?.status) ? m.status : ruled.status;
    // A requirement that names a document (proof, card, form…) is uploaded, not a condition to confirm
    if (status === 'needs parent check' && DOCUMENT_WORDS.test(requirement)) status = 'missing';
    if (status === 'ready') {
      const doc = typeof m?.matchedDocument === 'string' ? uploaded.get(m.matchedDocument.trim().toLowerCase()) : undefined;
      // "ready" only with a real uploaded document; otherwise missing
      return doc
        ? { requirement, sourceSentence, status: 'ready', matchedDocument: doc, setBy: 'ai' }
        : { requirement, sourceSentence, status: 'missing', setBy: 'ai' };
    }
    return { requirement, sourceSentence, status, setBy: 'ai' };
  });

  // Fields: profile fields from code + extra labels from the model, always "parent to provide"
  const fields = profileFields(input);
  // Requirements are documents in the checklist, not fields to type in (compared loosely:
  // "Family information and schedule" == "Family Information & Schedule Sheet")
  const fieldKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\b(sheet|form|card|record|records|document|copy|details|the|of|and)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const seen = new Set([...fields.map((f) => fieldKey(f.label)), ...input.requirements.map((q) => fieldKey(q.requirement))]);
  for (const f of Array.isArray(r.fields) ? r.fields : []) {
    const label = clip(f?.label, 60);
    if (!label || seen.has(fieldKey(label)) || /^(child|age|care type|start|preferred start)/i.test(label)) continue;
    seen.add(fieldKey(label));
    fields.push({ label, value: '', source: 'parent to provide' });
    if (fields.length >= 12) break;
  }

  const note = clip(r.noteToCentre, 1200);
  const noteToCentre = note && !FORBIDDEN_NOTE.test(note) ? wordCap(note, 80) : rules.noteToCentre;

  return { fields, checklist, missingItems: computeMissingItems(fields, checklist), noteToCentre };
}

// ---------- Re-running never overwrites what the parent changed ----------

export interface PreparedDraft extends PrepareResult {
  noteEditedByParent?: boolean;
  aiMode: 'gemini' | 'fallback';
  modelUsed: string | null;
}

export function mergePrepared(previous: PreparedDraft | undefined, next: PreparedDraft): PreparedDraft {
  if (!previous) return next;
  const prevFields = new Map(previous.fields.map((f) => [f.label.toLowerCase(), f]));
  const fields = next.fields.map((f) => {
    const p = prevFields.get(f.label.toLowerCase());
    return p?.editedByParent ? p : f;
  });
  // Keep parent-added/edited fields the new run no longer lists
  previous.fields.forEach((p) => {
    if (p.editedByParent && !fields.some((f) => f.label.toLowerCase() === p.label.toLowerCase())) fields.push(p);
  });
  const prevItems = new Map(previous.checklist.map((c) => [c.requirement.toLowerCase(), c]));
  const checklist = next.checklist.map((c) => {
    const p = prevItems.get(c.requirement.toLowerCase());
    if (!p) return c;
    if (p.setBy === 'parent') return { ...c, status: p.status, setBy: 'parent' as const, parentConfirmed: p.parentConfirmed };
    return p.parentConfirmed ? { ...c, parentConfirmed: true } : c;
  });
  return {
    ...next,
    fields,
    checklist,
    noteToCentre: previous.noteEditedByParent ? previous.noteToCentre : next.noteToCentre,
    noteEditedByParent: previous.noteEditedByParent,
    missingItems: computeMissingItems(fields, checklist),
  };
}

/** How the centre sees each checklist status (and who set it). */
export function centreStatusLabel(item: ChecklistItem): string {
  if (item.status === 'ready') {
    return item.setBy === 'parent' && !item.matchedDocument ? 'Ready · marked by parent' : 'Ready · document attached';
  }
  if (item.status === 'missing') return 'Missing';
  return item.parentConfirmed ? 'Needs parent check · confirmed by parent' : 'Needs parent check · not confirmed by parent';
}
