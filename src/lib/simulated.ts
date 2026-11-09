/**
 * Wording for simulated items, shared by every page so they read the same everywhere.
 * Positions and estimates are shown only as the centre reported them; CareQ never predicts them.
 */
export const reportedLine = (centreName: string, date: string) => `Reported by ${centreName} · Simulated · ${date}`;

export const estimateLine = (estimate: string) => `Centre's estimate: ${estimate}, not a guarantee · Simulated`;

/**
 * Same line for a card whose title already names the centre: "Reported by the centre · Simulated · {date}".
 * Keeps the reporter's name if it isn't that centre, so nothing is attributed wrongly.
 */
export const reportedLineOnCard = (reportedBy: string | undefined, cardCentreName: string | undefined, date: string) =>
  !reportedBy || reportedBy === cardCentreName ? `Reported by the centre · Simulated · ${date}` : reportedLine(reportedBy, date);
