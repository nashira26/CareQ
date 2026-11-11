/** Offers: what accepting closes, and how a withdrawn application is labelled for each side (pure). */
import type { Application, Centre } from '../data/mockData';
import { shortCentreName } from './parentUpdates';

/** A child's other open applications (sent, offers, drafts): what accepting an offer closes. Same child only. */
export const otherOpenApplications = <T extends Application>(apps: T[], accepted: Pick<Application, 'id' | 'childId'>) =>
  apps.filter((o) => o.id !== accepted.id && o.childId === accepted.childId && o.status !== 'Withdrawn' && o.status !== 'Accepted');

/** "Offer accepted. You withdrew 2 applications, and those places can now go to other families." */
export const acceptedMessage = (closed: number) =>
  closed > 0
    ? `Offer accepted. You withdrew ${closed} application${closed === 1 ? '' : 's'}, and those places can now go to other families.`
    : 'Offer accepted.';

/**
 * Why a Withdrawn application was closed, with the date. Parents see which offer they accepted;
 * centres only ever see "by the family" (never the other centre's name).
 */
export function withdrawalLabel(
  app: Pick<Application, 'status' | 'withdrawal'>,
  viewer: 'parent' | 'centre',
  context: { applications?: Pick<Application, 'id' | 'centreId'>[]; centres?: Pick<Centre, 'id' | 'name'>[] } = {}
): string | null {
  if (app.status !== 'Withdrawn' || !app.withdrawal) return null;
  const { reason, date, acceptedApplicationId } = app.withdrawal;
  if (viewer === 'centre') return reason === 'declined' ? `Offer declined by the family · ${date}` : `Withdrawn by the family · ${date}`;
  if (reason === 'declined') return `Offer declined by you · ${date}`;
  if (reason === 'accepted-other') {
    const accepted = context.applications?.find((a) => a.id === acceptedApplicationId);
    const name = accepted && context.centres?.find((c) => c.id === accepted.centreId)?.name;
    return name ? `Withdrawn when you accepted ${shortCentreName(name)} · ${date}` : `Withdrawn when you accepted another offer · ${date}`;
  }
  return `Withdrawn by you · ${date}`;
}
