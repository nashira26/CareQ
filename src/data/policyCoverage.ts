/**
 * Which centres have published documents indexed for Ask CareQ (one entry per operator handbook),
 * built from the committed data/policies/<operator>/meta.json files. Shared by the server
 * (/api/ask-careq) and the browser ("Ask about this centre" buttons).
 */
import bfToronto from '../../data/policies/bf-toronto-centre-for-early-childhood/meta.json';
import cdi from '../../data/policies/child-development-institute/meta.json';
import familyDayCare from '../../data/policies/family-day-care-services/meta.json';
import harmony from '../../data/policies/harmony-community-school-centre/meta.json';
import macaulay from '../../data/policies/macaulay-centres-for-children/meta.json';
import rolphRoad from '../../data/policies/rolph-road-day-care/meta.json';
import telccs from '../../data/policies/toronto-early-learning-child-care-services/meta.json';

export interface OperatorCoverage {
  /** Same as the folder name and policyChunks.operatorId. */
  operatorId: string;
  operatorName: string;
  demoCentreId: string;
  centreIds: string[];
  docTitle: string;
}

type Meta = { operator: string; demoCentreId: string; appliesToCentreIds: string[]; documents: { title: string }[] };

const entries: [string, Meta][] = [
  ['bf-toronto-centre-for-early-childhood', bfToronto],
  ['child-development-institute', cdi],
  ['family-day-care-services', familyDayCare],
  ['harmony-community-school-centre', harmony],
  ['macaulay-centres-for-children', macaulay],
  ['rolph-road-day-care', rolphRoad],
  ['toronto-early-learning-child-care-services', telccs],
];

export const OPERATOR_COVERAGE: OperatorCoverage[] = entries.map(([operatorId, m]) => ({
  operatorId,
  operatorName: m.operator,
  demoCentreId: m.demoCentreId,
  centreIds: m.appliesToCentreIds,
  docTitle: m.documents[0]?.title ?? 'Parent Handbook',
}));

const byCentre = new Map<string, OperatorCoverage>();
for (const op of OPERATOR_COVERAGE) for (const id of op.centreIds) byCentre.set(id, op);

/** The operator whose handbook covers this centre, or null ("No published documents for this centre yet."). */
export const coverageFor = (centreId: string | null | undefined): OperatorCoverage | null =>
  (centreId && byCentre.get(centreId)) || null;

/** B.F. Toronto's handbook link wasn't found; its source is the City of Toronto centre listing. */
export const BF_TORONTO_OPERATOR_ID = 'bf-toronto-centre-for-early-childhood';
export const BF_TORONTO_SOURCE_NOTE = '(handbook link not found; centre listing)';
