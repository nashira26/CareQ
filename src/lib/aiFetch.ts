/**
 * POST to an AI endpoint. Never throws: returns ok=false with a plain-language message when the
 * server says "please log in" (401), "slow down" (429), or can't be reached, so each feature can
 * show the message and use its existing basic fallback.
 */
export type AiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string };

export async function aiPost<T>(url: string, body: unknown): Promise<AiResult<T>> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data as T };
    const message =
      typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error
        : res.status === 429
        ? "You've used CareQ's AI features a lot in the last minute. Please wait a moment and try again."
        : 'The AI feature is not available right now.';
    return { ok: false, status: res.status, message };
  } catch {
    return { ok: false, status: 0, message: "Can't reach the CareQ server right now." };
  }
}

/** Only these need to be shown to the user; other failures quietly use the basic fallback. */
export const isUserFacingAiError = (status: number) => status === 401 || status === 429 || status === 0;
