/**
 * Wording for centre-reported items, shared by every page so they read the same everywhere.
 * Positions and estimates are shown only as the centre reported them; CareQ never predicts them.
 * Demo accounts are told once, in the banner at the top of every portal screen, that these are
 * simulated (plus one tag next to the position and the offer in Track), so these lines don't repeat it.
 */
export const reportedLine = (centreName: string, date: string) => `Reported by ${centreName} · ${date}`;

export const estimateLine = (estimate: string) => `Centre's estimate: ${estimate}, not a guarantee`;

/**
 * Same line for a card whose title already names the centre: "Reported by the centre · {date}".
 * Keeps the reporter's name if it isn't that centre, so nothing is attributed wrongly.
 */
export const reportedLineOnCard = (reportedBy: string | undefined, cardCentreName: string | undefined, date: string) =>
  !reportedBy || reportedBy === cardCentreName ? `Reported by the centre · ${date}` : reportedLine(reportedBy, date);
