/**
 * Message ideas for a parent, built only from this application's facts: the preferred start date,
 * the child's age group, the status (an offer comes first) and the centre's confirmed checklist.
 * Nothing hard-coded about months, documents or rooms. Pure, unit-tested.
 */
import type { Application, Centre } from '../data/mockData';
import { ageGroupFromMonths } from './searchCriteria';

const MAX = 4;

export function parentMessageSuggestions(
  app: Pick<Application, 'status' | 'childName' | 'childAgeMonths' | 'preferredStartDate' | 'waitlistPosition' | 'completedRequirements'>,
  centre: Pick<Centre, 'requirements'>
): string[] {
  const child = app.childName || 'my child';
  const room = `${ageGroupFromMonths(app.childAgeMonths).toLowerCase()} room`;
  const start = app.preferredStartDate?.trim();
  const confirmed = (centre.requirements ?? []).filter(Boolean);
  const done = new Set(app.completedRequirements ?? []);
  const missing = confirmed.filter((r) => !done.has(r));

  const byStatus: string[] = (() => {
    switch (app.status) {
      case 'Offer':
        return ['Accept the offer and ask about next steps', 'Ask a question about the offer before deciding', 'Decline the offer politely'];
      case 'Accepted':
        return [`Ask what ${child} needs on the first day`, `Ask about settling-in visits for the ${room}`];
      case 'Waitlisted':
        return [
          app.waitlistPosition ? `Ask how the waitlist is moving (now #${app.waitlistPosition})` : 'Ask how the waitlist is moving',
          'Confirm you want to stay on the waitlist',
        ];
      case 'Submitted':
      case 'Under review':
        return ['Ask when the centre expects to review the application'];
      case 'Withdrawn':
        return ['Ask about applying again later'];
      default: // Draft or an enquiry before applying
        return [`Ask whether the ${room} has space for ${child}`];
    }
  })();

  const startIdea = start && app.status !== 'Withdrawn' ? [`Confirm a ${start} start is possible`] : [];
  const roomIdea = app.status !== 'Accepted' && app.status !== 'Withdrawn' ? [`Ask for a short visit to the ${room}`] : [];
  const checklistIdea =
    app.status === 'Accepted' || app.status === 'Withdrawn' || !confirmed.length
      ? []
      : app.status === 'Draft' && missing.length
      ? [`Ask about the "${missing[0]}" requirement`]
      : app.status !== 'Draft'
      ? [`Check the centre has your "${(missing[0] ?? confirmed[0])}"`]
      : [];

  // Offer first, then the facts; no duplicates, at most four
  return Array.from(new Set([...byStatus.slice(0, app.status === 'Offer' ? 2 : 1), ...startIdea, ...checklistIdea, ...roomIdea, ...byStatus.slice(1)])).slice(0, MAX);
}
