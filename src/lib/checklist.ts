import type { Application, Centre } from '../data/mockData';

/**
 * One checklist item's state, the same on the parent and centre sides:
 * - ready: a document is attached, or the parent marked it done
 * - not-applicable: an "if applicable" item the parent marked N/A (with an optional note)
 * - due-later: the centre asks for it only once a space is confirmed (e.g. a deposit), and there is no offer yet
 * - missing: everything else
 * Not applicable and due later are never counted as Missing or Ready.
 */
export type RequirementState = 'ready' | 'not-applicable' | 'due-later' | 'missing';

/** Only items whose requirement says "if applicable" can be marked Not applicable. */
export const canBeNotApplicable = (requirement: string) => /\bif applicable\b/i.test(requirement);

/** Once a space is offered (or accepted), "due when a space is confirmed" items are due. */
const SPACE_CONFIRMED: Application['status'][] = ['Offer', 'Accepted'];

export const DUE_LATER_LABEL = 'Due when a space is confirmed';

type AppLike = Pick<Application, 'status' | 'completedRequirements' | 'uploadedDocuments' | 'notApplicable'>;

export function requirementState(app: AppLike, centre: Pick<Centre, 'requirementsDueWhenConfirmed'>, requirement: string): RequirementState {
  if (app.uploadedDocuments?.[requirement] || app.completedRequirements.includes(requirement)) return 'ready';
  if (app.notApplicable?.[requirement] && canBeNotApplicable(requirement)) return 'not-applicable';
  if (centre.requirementsDueWhenConfirmed?.includes(requirement) && !SPACE_CONFIRMED.includes(app.status)) return 'due-later';
  return 'missing';
}

export interface ChecklistSummary {
  ready: number;
  notApplicable: number;
  dueLater: number;
  missing: number;
  /** Items that count now: everything except N/A and due later. */
  needed: number;
}

export function checklistSummary(app: AppLike, centre: Pick<Centre, 'requirements' | 'requirementsDueWhenConfirmed'>): ChecklistSummary {
  const s: ChecklistSummary = { ready: 0, notApplicable: 0, dueLater: 0, missing: 0, needed: 0 };
  for (const r of centre.requirements) {
    const state = requirementState(app, centre, r);
    if (state === 'ready') s.ready++;
    else if (state === 'not-applicable') s.notApplicable++;
    else if (state === 'due-later') s.dueLater++;
    else s.missing++;
  }
  s.needed = s.ready + s.missing;
  return s;
}
