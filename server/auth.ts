/**
 * Sessions: a random token in an httpOnly, sameSite=lax cookie (secure in production), 7-day expiry.
 * Only a SHA-256 of the token is stored in the sessions collection, so a database leak
 * doesn't reveal usable session tokens.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Db } from 'mongodb';
import type { AccountRecord } from '../src/lib/world';

export const SESSION_COOKIE = 'careq_session';
export const SESSION_DAYS = 7;
const isProd = () => process.env.NODE_ENV === 'production';
const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export async function createSession(db: Db, res: Response, accountId: string) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  await db.collection('sessions').insertOne({
    tokenHash: hashToken(token),
    accountId,
    createdAt: new Date(now),
    expiresAt: new Date(now + SESSION_DAYS * 24 * 3600 * 1000),
  });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600 * 1000,
  });
}

/** The signed-in account for this request, or null. */
export async function sessionAccount(db: Db, req: Request): Promise<AccountRecord | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const session = await db.collection('sessions').findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  return (await db.collection('accounts').findOne({ id: session.accountId }, { projection: { _id: 0, emailLower: 0 } })) as AccountRecord | null;
}

export async function destroySession(db: Db, req: Request, res: Response) {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) await db.collection('sessions').deleteOne({ tokenHash: hashToken(token) });
  res.clearCookie(SESSION_COOKIE, { path: '/', httpOnly: true, secure: isProd(), sameSite: 'lax' });
}

/** Constant-time comparison for the reset token. */
export function tokensMatch(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
