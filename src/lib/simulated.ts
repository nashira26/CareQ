/**
 * Wording for simulated items, shared by every page so they read the same everywhere.
 * Positions and estimates are shown only as the centre reported them; CareQ never predicts them.
 */
export const reportedLine = (centreName: string, date: string) => `Reported by ${centreName} · Simulated · ${date}`;

export const estimateLine = (estimate: string) => `Centre's estimate: ${estimate}, not a guarantee · Simulated`;
