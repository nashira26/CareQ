/**
 * REST API for the demo data (DATA_MODE=mongo). Every body is validated with zod; every action
 * goes through the service layer, which applies the same scoping rules as local mode (403 otherwise).
 * Each change responds with the signed-in user's fresh scoped snapshot.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Db } from 'mongodb';
import { MongoRepo, bcryptHasher, mongo, reseed } from './db';
import { createSession, destroySession, sessionAccount, tokensMatch } from './auth';
import * as svc from '../src/lib/service';
import { actorOf, AccountRecord, Actor } from '../src/lib/world';
import { CHILD_CARE_TYPES } from '../src/lib/family';
import type { Area, FsaCentroids } from '../src/lib/rankCentres';
import { verifyLicence } from './licence';

// ---------------- Schemas ----------------

const str = (max: number) => z.string().max(max);
const role = z.enum(['parent', 'centre']);

const childFields = {
  firstName: str(40).min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  careType: z.enum(CHILD_CARE_TYPES as [string, ...string[]]),
  preferredStartDate: str(40).min(1),
  homeArea: str(80).min(1),
  notes: str(500),
};
const childSchema = z.object({ id: str(80), ...childFields });
/** Profile edits: no id in the body (it's in the URL); unknown keys such as parentAccountId are rejected. */
const childInputSchema = z.object(childFields).strict();

const centreFormSchema = z.object({
  name: str(120),
  street: str(160),
  postalCode: str(10),
  neighbourhood: str(80),
  licenceNumber: str(20),
  ageGroups: z.array(z.enum(['Infant', 'Toddler', 'Preschool'])).max(3),
  programOptions: z.array(str(40)).max(6),
  languages: z.array(str(40)).max(20),
  hours: str(80),
  capacity: str(4),
  contactEmail: str(200),
  policyText: str(8000),
});

const preparedDraftSchema = z.object({
  fields: z
    .array(z.object({ label: str(60), value: str(500), source: z.enum(['family profile', 'parent to provide']), editedByParent: z.boolean().optional() }))
    .max(20),
  checklist: z
    .array(
      z.object({
        requirement: str(120),
        sourceSentence: str(400),
        status: z.enum(['ready', 'missing', 'needs parent check']),
        matchedDocument: str(120).optional(),
        citation: str(240).optional(),
        sourceUrl: str(500).optional(),
        setBy: z.enum(['ai', 'rules', 'parent']),
        parentConfirmed: z.boolean().optional(),
      })
    )
    .max(20),
  missingItems: z.array(str(200)).max(40),
  noteToCentre: str(1200),
  noteEditedByParent: z.boolean().optional(),
  aiMode: z.enum(['gemini', 'fallback']),
  modelUsed: str(80).nullable(),
});

const draftChangeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('toggleRequirement'), requirement: str(120) }),
  z.object({ kind: z.literal('uploadDocument'), requirement: str(120), fileName: str(160), fileSize: str(20) }),
  z.object({ kind: z.literal('removeDocument'), requirement: str(120) }),
  z.object({ kind: z.literal('noteToCentre'), note: str(1000) }),
  z.object({ kind: z.literal('preparedDraft'), draft: preparedDraftSchema }),
]);

export const schemas = {
  signup: z.object({ role, name: str(80), email: str(200), password: str(200), termsAccepted: z.literal(true) }),
  login: z.object({ role, email: str(200), password: str(200) }),
  onboarding: z.object({ children: z.array(childSchema).min(1).max(8) }),
  registerCentre: z.object({ form: centreFormSchema, photoDataUrl: z.string().max(1_500_000).optional() }),
  requirements: z.object({
    requirements: z.array(str(120)).max(30),
    sources: z.record(z.string(), str(400)),
    citations: z.record(z.string(), z.object({ citation: str(240), sourceUrl: str(500).nullable().optional() })).optional(),
    extractedFrom: z
      .object({ docTitle: str(200), sourceUrl: str(500).nullable().optional(), sourceNote: str(300).nullable().optional(), retrieved: str(20).nullable().optional() })
      .optional(),
  }),
  accountName: z.object({ name: str(80) }).strict(),
  password: z.object({ currentPassword: str(200).min(1), newPassword: str(200) }).strict(),
  child: childInputSchema,
  centreDetails: z
    .object({
      form: centreFormSchema.omit({ policyText: true }).strict(),
      // undefined keeps the photo, null removes it
      photoDataUrl: z.string().max(1_500_000).nullable().optional(),
    })
    .strict(),
  simulatedContact: z.object({ hours: str(80), contactEmail: str(200) }).strict(),
  createDraft: z.object({ centreId: str(80) }),
  draftChange: z.object({ change: draftChangeSchema }),
  status: z.object({
    status: z.enum(['Under review', 'Waitlisted', 'Offer']),
    waitlistPosition: z.number().int().min(1).max(10000).optional(),
    waitlistEstimate: str(80).optional(),
  }),
  message: z.object({ centreId: str(80), childId: str(80), text: str(2000).min(1), aiAssisted: z.boolean(), fromSimulatedDraft: z.boolean().optional() }),
  markRead: z.object({ ids: z.union([z.literal('all'), z.array(str(120)).max(500)]) }),
  supportRequest: z.object({
    type: z.enum(['contact', 'tech_support', 'concern']),
    subject: str(200).min(1),
    message: str(4000).min(1),
    category: z.enum(['Communication', 'Fairness', 'Privacy', 'Other']).optional(),
  }),
};

// ---------------- Router ----------------

interface Ctx {
  allowReset: boolean;
  resetToken?: string;
  areas: Area[];
  fsa: FsaCentroids;
}

type AuthedRequest = Request & { account?: AccountRecord | null; actor?: Actor };

const db = (): Db => mongo.db!;
const repo = () => new MongoRepo(db());
const snapshotFor = async (req: AuthedRequest) => svc.getSnapshot(repo(), req.account ? (await repo().getAccount(req.account.id)) : null);

/** Validates the body, returning parsed data or sending a 400. */
function body<T>(schema: z.ZodType<T>, req: Request, res: Response): T | undefined {
  const r = schema.safeParse(req.body);
  if (r.success) return r.data;
  const first = r.error.issues[0];
  res.status(400).json({ error: `Invalid request${first ? `: ${first.path.join('.') || 'body'} ${first.message}` : ''}.` });
  return undefined;
}

/** Maps service errors (400/403/404) to JSON; anything else is a 500 without internals. */
function handle(fn: (req: AuthedRequest, res: Response) => Promise<unknown>) {
  return async (req: AuthedRequest, res: Response) => {
    try {
      await fn(req, res);
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 400 || status === 403 || status === 404) {
        res.status(status).json({ error: (e as Error).message });
      } else {
        console.error('[api] error:', e);
        res.status(500).json({ error: 'Something went wrong on the server. Please try again.' });
      }
    }
  };
}

/** Paths served by this router (its middleware must not touch other /api routes, e.g. the AI endpoints). */
const DATA_PATHS = ['/auth', '/state', '/account', '/children', '/onboarding', '/centres', '/applications', '/messages', '/notifications', '/support-requests', '/reset'];

export function createDataApi(ctx: Ctx): Router {
  const r = Router();

  // Database must be reachable for every data route
  r.use(DATA_PATHS, (req: Request, res: Response, next: NextFunction) => {
    if (mongo.status !== 'up' || !mongo.db) {
      res.status(503).json({ error: "The CareQ database can't be reached right now. Changes aren't being saved." });
      return;
    }
    next();
  });

  // Who is signed in (from the session cookie only)
  r.use(DATA_PATHS, async (req: AuthedRequest, _res: Response, next: NextFunction) => {
    try {
      req.account = await sessionAccount(db(), req);
      req.actor = req.account ? actorOf(req.account) : undefined;
      next();
    } catch (e) {
      next(e);
    }
  });

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.actor) {
      res.status(401).json({ error: 'Please log in to continue.' });
      return;
    }
    next();
  };

  // ---- auth
  r.post('/auth/signup', handle(async (req, res) => {
    const b = body(schemas.signup, req, res);
    if (!b) return;
    const account = await svc.signUp(repo(), bcryptHasher, b);
    await createSession(db(), res, account.id);
    res.status(201).json(await svc.getSnapshot(repo(), account));
  }));
  r.post('/auth/login', handle(async (req, res) => {
    const b = body(schemas.login, req, res);
    if (!b) return;
    const account = await svc.logIn(repo(), bcryptHasher, b);
    await createSession(db(), res, account.id);
    res.json(await svc.getSnapshot(repo(), account));
  }));
  r.post('/auth/logout', handle(async (req, res) => {
    await destroySession(db(), req, res);
    res.json(await svc.getSnapshot(repo(), null));
  }));
  r.get('/state', handle(async (req, res) => {
    res.json(await snapshotFor(req));
  }));

  // ---- everything below needs a signed-in user
  const act = (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) => [requireAuth, handle(fn)] as const;

  r.post('/onboarding', ...act(async (req, res) => {
    const b = body(schemas.onboarding, req, res);
    if (!b) return;
    await svc.completeOnboarding(repo(), req.actor!, b.children as Parameters<typeof svc.completeOnboarding>[2]);
    res.json(await snapshotFor(req));
  }));
  r.post('/centres/register', ...act(async (req, res) => {
    const b = body(schemas.registerCentre, req, res);
    if (!b) return;
    const licenceVerified = verifyLicence({ licenceNumber: b.form.licenceNumber, postalCode: b.form.postalCode, name: b.form.name });
    await svc.registerCentre(repo(), req.actor!, b.form, b.photoDataUrl, ctx.areas, ctx.fsa, licenceVerified);
    res.status(201).json(await snapshotFor(req));
  }));
  r.put('/centres/:id/requirements', ...act(async (req, res) => {
    const b = body(schemas.requirements, req, res);
    if (!b) return;
    await svc.updateRequirements(repo(), req.actor!, req.params.id, b.requirements, b.sources, b.citations ?? {}, b.extractedFrom);
    res.json(await snapshotFor(req));
  }));

  // ---- profile: always the signed-in user's own account, children and centre (the service checks scoping)
  r.patch('/account', ...act(async (req, res) => {
    const b = body(schemas.accountName, req, res);
    if (!b) return;
    await svc.updateAccountName(repo(), req.actor!, b.name);
    res.json(await snapshotFor(req));
  }));
  r.patch('/account/password', ...act(async (req, res) => {
    const b = body(schemas.password, req, res);
    if (!b) return;
    await svc.changePassword(repo(), bcryptHasher, req.actor!, b.currentPassword, b.newPassword);
    res.json(await snapshotFor(req));
  }));
  r.post('/children', ...act(async (req, res) => {
    const b = body(schemas.child, req, res);
    if (!b) return;
    await svc.addChild(repo(), req.actor!, b as svc.ChildInput, ctx.areas);
    res.status(201).json(await snapshotFor(req));
  }));
  r.patch('/children/:id', ...act(async (req, res) => {
    const b = body(schemas.child, req, res);
    if (!b) return;
    await svc.updateChild(repo(), req.actor!, req.params.id, b as svc.ChildInput, ctx.areas);
    res.json(await snapshotFor(req));
  }));
  r.delete('/children/:id', ...act(async (req, res) => {
    await svc.removeChild(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));
  r.patch('/centres/:id', ...act(async (req, res) => {
    const b = body(schemas.centreDetails, req, res);
    if (!b) return;
    const form = { ...b.form, policyText: '' };
    const licenceVerified = verifyLicence({ licenceNumber: form.licenceNumber, postalCode: form.postalCode, name: form.name });
    await svc.updateCentreDetails(repo(), req.actor!, req.params.id, form, b.photoDataUrl, ctx.areas, ctx.fsa, licenceVerified);
    res.json(await snapshotFor(req));
  }));
  r.patch('/centres/:id/contact', ...act(async (req, res) => {
    const b = body(schemas.simulatedContact, req, res);
    if (!b) return;
    await svc.updateSimulatedContact(repo(), req.actor!, req.params.id, b);
    res.json(await snapshotFor(req));
  }));

  r.post('/applications', ...act(async (req, res) => {
    const b = body(schemas.createDraft, req, res);
    if (!b) return;
    const id = await svc.createDraft(repo(), req.actor!, b.centreId);
    res.status(201).json({ id, snapshot: await snapshotFor(req) });
  }));
  r.patch('/applications/:id/draft', ...act(async (req, res) => {
    const b = body(schemas.draftChange, req, res);
    if (!b) return;
    await svc.updateDraft(repo(), req.actor!, req.params.id, b.change as svc.DraftChange);
    res.json(await snapshotFor(req));
  }));
  r.post('/applications/:id/submit', ...act(async (req, res) => {
    await svc.submitApplication(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));
  r.post('/applications/:id/withdraw', ...act(async (req, res) => {
    await svc.withdrawApplication(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));
  // Accepting always withdraws the child's other applications (and deletes their drafts)
  r.post('/applications/:id/accept', ...act(async (req, res) => {
    await svc.acceptOffer(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));
  r.post('/applications/:id/decline', ...act(async (req, res) => {
    await svc.declineOffer(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));
  r.post('/applications/:id/status', ...act(async (req, res) => {
    const b = body(schemas.status, req, res);
    if (!b) return;
    await svc.setStatus(repo(), req.actor!, req.params.id, b.status, b.waitlistPosition, b.waitlistEstimate);
    res.json(await snapshotFor(req));
  }));

  r.post('/messages', ...act(async (req, res) => {
    const b = body(schemas.message, req, res);
    if (!b) return;
    await svc.sendMessage(repo(), req.actor!, { centreId: b.centreId, childId: b.childId }, b.text, b.aiAssisted, new Date(), b.fromSimulatedDraft ?? false);
    res.json(await snapshotFor(req));
  }));
  r.post('/notifications/read', ...act(async (req, res) => {
    const b = body(schemas.markRead, req, res);
    if (!b) return;
    await svc.markNotificationsRead(repo(), req.actor!, b.ids);
    res.json(await snapshotFor(req));
  }));
  r.post('/support-requests', ...act(async (req, res) => {
    const b = body(schemas.supportRequest, req, res);
    if (!b) return;
    await svc.createSupportRequest(repo(), req.actor!, b);
    res.status(201).json(await snapshotFor(req));
  }));
  r.post('/support-requests/:id/advance', ...act(async (req, res) => {
    await svc.advanceConcern(repo(), req.actor!, req.params.id);
    res.json(await snapshotFor(req));
  }));

  // ---- reset: only with ALLOW_RESET=true AND the secret X-Reset-Token header
  r.post('/reset', handle(async (req, res) => {
    if (!ctx.allowReset || !ctx.resetToken) {
      res.status(403).json({ error: 'Reset is turned off on this server.' });
      return;
    }
    if (!tokensMatch(req.header('x-reset-token') ?? undefined, ctx.resetToken)) {
      res.status(403).json({ error: 'That reset token is not right.' });
      return;
    }
    await reseed(db());
    res.json({ ok: true, message: 'The demo data was reset. Everyone has been signed out.' });
  }));

  return r;
}
