import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  GoogleGenAI,
  Type,
  ApiError,
  GenerateContentParameters,
  GenerateContentResponse,
} from '@google/genai';
import { sanitizeCriteria, parseSearchFallback } from './src/lib/searchCriteria';
import { factsSentence } from './src/lib/rankCentres';
import { sanitizePrepareInput, finalizePrepared, prepareFallback } from './src/lib/prepareApplication';
import type { Area, FsaCentroids } from './src/lib/rankCentres';
import { createDataApi } from './server/api';
import { connectMongo, ensureIndexes, isEmpty, reseed, mongo, pingMongo } from './server/db';
import { sessionAccount } from './server/auth';
import { rateLimit, AI_LIMIT_PER_SESSION, AI_LIMIT_ANON_ASK, RATE_LIMIT_MESSAGE } from './server/rateLimit';
import torontoAreas from './src/data/torontoAreas.json';
import fsaCentroids from './src/data/fsaCentroids.json';

dotenv.config();

// Single place to set the Gemini model. Override with the GEMINI_MODEL env var.
// gemini-3.8-flash is listed but timed out (504) in testing on 2026-11-05; gemini-3.5-flash responds.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

// Max time to wait for Gemini before using the non-AI fallback. Override with GEMINI_TIMEOUT_MS.
const GEMINI_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 15000;

// Backup model, tried once when the main model times out or is overloaded (429/503).
// gemini-3.5-flash-lite was the fastest reliable other flash model in testing on 2026-11-05.
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_FALLBACK_TIMEOUT_MS = Number(process.env.GEMINI_FALLBACK_TIMEOUT_MS) || 10000;

// In-memory cache of successful Gemini answers, so repeated demo inputs answer instantly.
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;

class GeminiTimeoutError extends Error {}

/** Errors worth retrying on the backup model: our timeout, rate limit, or overload. */
const isRetryable = (err: unknown): boolean =>
  err instanceof GeminiTimeoutError ||
  (err instanceof ApiError && (err.status === 429 || err.status === 503));

/** Why an endpoint used its fallback: 'timeout' if Gemini took too long, otherwise 'error'. */
const fallbackReasonFor = (err: unknown): 'timeout' | 'error' =>
  err instanceof GeminiTimeoutError ? 'timeout' : 'error';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Where demo data lives: "mongo" (default, shared across devices) or "local" (each browser keeps its own).
const DATA_MODE: 'mongo' | 'local' = process.env.DATA_MODE === 'local' ? 'local' : 'mongo';
const ALLOW_RESET = process.env.ALLOW_RESET === 'true';
const RESET_TOKEN = process.env.RESET_TOKEN || undefined;

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '10mb' }));
  // Render (and most hosts) terminate HTTPS at a proxy: needed for secure cookies and client IPs
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ---------------- Data mode, health, data API ----------------

  app.get('/api/config', (_req, res) => {
    res.json({ dataMode: DATA_MODE, resetAvailable: DATA_MODE === 'mongo' && ALLOW_RESET && Boolean(RESET_TOKEN) });
  });

  // Health for Render: MongoDB reachable (mongo mode) and a Gemini key configured (never the key itself)
  app.get('/api/health', async (_req, res) => {
    const mongoUp = DATA_MODE === 'mongo' ? await pingMongo() : null;
    const geminiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
    const ok = (DATA_MODE === 'local' || mongoUp === true) && geminiKeyConfigured;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      dataMode: DATA_MODE,
      mongo: DATA_MODE === 'mongo' ? (mongoUp ? 'up' : 'down') : 'not used',
      geminiKeyConfigured,
    });
  });

  if (DATA_MODE === 'mongo') {
    app.use(
      '/api',
      createDataApi({
        allowReset: ALLOW_RESET,
        resetToken: RESET_TOKEN,
        areas: (torontoAreas as { areas: Area[] }).areas,
        fsa: fsaCentroids as FsaCentroids,
      })
    );
    // Connect once at startup (reused for every request); seed automatically if the database is empty
    connectMongo(process.env.MONGODB_URI, process.env.MONGODB_DB, async (db) => {
      await ensureIndexes(db);
      if (await isEmpty(db)) {
        console.log('[mongo] database is empty: seeding demo data');
        await reseed(db);
      }
    });
  }

  // ---------------- AI endpoints: sign-in (mongo mode) + rate limits ----------------

  /**
   * In mongo mode every AI endpoint needs a signed-in session, except Ask CareQ (also on the
   * login page), which is allowed anonymously but limited per IP. Limits: 20/min per session,
   * 10/min per IP for anonymous Ask CareQ. In local mode there are no server sessions, so limits are per IP.
   */
  const aiGuard = (endpoint: string) => async (req: Request, res: Response, next: () => void) => {
    let accountId: string | null = null;
    if (DATA_MODE === 'mongo' && mongo.db) {
      try {
        accountId = (await sessionAccount(mongo.db, req))?.id ?? null;
      } catch {
        accountId = null;
      }
    }
    const anonymousAllowed = endpoint === 'ask-careq' || DATA_MODE === 'local';
    if (!accountId && !anonymousAllowed) {
      res.status(401).json({ error: 'Please log in to use CareQ\'s AI features.' });
      return;
    }
    const limit = accountId
      ? rateLimit(`ai:session:${accountId}`, AI_LIMIT_PER_SESSION)
      : rateLimit(`ai:ip:${req.ip}:${endpoint === 'ask-careq' ? 'ask' : 'ai'}`, endpoint === 'ask-careq' ? AI_LIMIT_ANON_ASK : AI_LIMIT_PER_SESSION);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(limit.retryAfterSeconds));
      res.status(429).json({ error: RATE_LIMIT_MESSAGE, retryAfterSeconds: limit.retryAfterSeconds });
      return;
    }
    next();
  };

  // Shared Gemini client (initialized with User-Agent header)
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  type GeminiParams = Omit<GenerateContentParameters, 'model'>;
  type GeminiResult = { response: GenerateContentResponse; modelUsed: string };

  const geminiCache = new Map<string, GeminiResult & { expiresAt: number }>();

  // One call to one model, cut off after timeoutMs.
  const callModel = async (
    label: string,
    model: string,
    params: GeminiParams,
    timeoutMs: number
  ): Promise<GenerateContentResponse> => {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        console.warn(`[gemini] ${label}: ${model} timed out after ${timeoutMs}ms`);
        reject(new GeminiTimeoutError(`${model} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        ai.models.generateContent({
          ...params,
          model,
          config: { ...params.config, abortSignal: controller.signal },
        }),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  };

  // Every Gemini call goes through here: cache -> main model -> backup model (once) -> throw.
  // When this throws, the endpoint uses its non-AI fallback.
  const generateWithTimeout = async (label: string, params: GeminiParams): Promise<GeminiResult> => {
    const cacheKey = `${label}|${JSON.stringify(params)}`;
    const cached = geminiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[gemini] ${label}: cache hit (answered earlier by ${cached.modelUsed})`);
      return { response: cached.response, modelUsed: cached.modelUsed };
    }
    geminiCache.delete(cacheKey);

    const started = Date.now();
    let response: GenerateContentResponse;
    let modelUsed = GEMINI_MODEL;
    try {
      response = await callModel(label, GEMINI_MODEL, params, GEMINI_TIMEOUT_MS);
    } catch (err) {
      if (!isRetryable(err)) throw err;
      const status = err instanceof ApiError ? `HTTP ${err.status}` : 'timeout';
      console.warn(`[gemini] ${label}: ${GEMINI_MODEL} failed (${status}); retrying with ${GEMINI_FALLBACK_MODEL}`);
      modelUsed = GEMINI_FALLBACK_MODEL;
      response = await callModel(label, GEMINI_FALLBACK_MODEL, params, GEMINI_FALLBACK_TIMEOUT_MS);
    }
    console.log(`[gemini] ${label}: answered by ${modelUsed} in ${Date.now() - started}ms`);

    if (geminiCache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = geminiCache.keys().next().value;
      if (oldestKey !== undefined) geminiCache.delete(oldestKey);
    }
    geminiCache.set(cacheKey, { response, modelUsed, expiresAt: Date.now() + CACHE_TTL_MS });
    return { response, modelUsed };
  };

  // API 1: Extract policy requirements from pasted text using Gemini
  app.post('/api/extract-policy-requirements', aiGuard('extract-policy-requirements'), async (req: Request, res: Response) => {
    const { policyText } = req.body;

    if (!policyText || typeof policyText !== 'string' || !policyText.trim()) {
      return res.status(400).json({ error: 'Policy text is required.' });
    }

    try {
      const { response, modelUsed } = await generateWithTimeout('extract-policy-requirements', {
        contents: `You are an expert Ontario child care licensing and intake policy analyst. Read the following child care centre intake policy text carefully.
Extract every specific prerequisite document, certificate, immunization, proof of address, medical form, or parental consent that a parent must submit as part of the application or enrolment package.
For every extracted requirement:
1. Provide a clear, concise requirement title (e.g., "Child's Official Birth Certificate", "Yellow Immunization Record Card (ISPA)", "Proof of Ontario Residency").
2. Include the EXACT verbatim sentence from the policy text that stated this requirement.

Policy Text:
"""
${policyText}
"""`,
        config: {
          systemInstruction:
            'You are a precise policy extraction engine. Extract requirements as JSON. Do not invent requirements not mentioned in the text.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'List of extracted application requirements with exact source sentences',
            items: {
              type: Type.OBJECT,
              properties: {
                requirement: {
                  type: Type.STRING,
                  description: 'Concise, clean title of the required document or prerequisite.',
                },
                sourceSentence: {
                  type: Type.STRING,
                  description: 'The verbatim exact sentence from the policy text.',
                },
              },
              required: ['requirement', 'sourceSentence'],
            },
          },
        },
      });

      const rawText = response.text || '[]';
      const extracted = JSON.parse(rawText);
      return res.json({ success: true, aiMode: 'gemini', modelUsed, requirements: extracted });
    } catch (err: unknown) {
      console.warn('Gemini extraction error or missing key; using fallback parser:', err);

      // Fallback heuristic extraction if Gemini is unavailable
      const sentences = policyText
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const keywords = [
        'birth certificate',
        'immunization',
        'yellow card',
        'proof of address',
        'residency',
        'medical',
        'allergy',
        'emergency contact',
        'consent',
        'intake form',
        'health assessment',
        'dietary',
        'registration fee',
        'photo id',
      ];

      const fallbackList: Array<{ requirement: string; sourceSentence: string }> = [];

      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        for (const kw of keywords) {
          if (lower.includes(kw)) {
            const formattedName = kw
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');
            if (!fallbackList.some((item) => item.requirement.toLowerCase().includes(kw))) {
              fallbackList.push({
                requirement: `${formattedName} Documentation`,
                sourceSentence: sentence,
              });
            }
          }
        }
      }

      if (fallbackList.length === 0) {
        fallbackList.push(
          {
            requirement: "Child's Birth Certificate or Proof of Age",
            sourceSentence: sentences[0] || policyText.slice(0, 80),
          },
          {
            requirement: 'Immunization Record (ISPA Compliance)',
            sourceSentence: sentences[1] || 'Proof of current immunization required.',
          }
        );
      }

      return res.json({
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        success: true,
        requirements: fallbackList,
        fallbackNotice: 'Heuristic parsing applied',
      });
    }
  });

  // API 2a: Parse a parent's description into search criteria (no ranking, no scores).
  // Ranking happens in plain code in the browser (src/lib/rankCentres.ts).
  app.post('/api/parse-search', aiGuard('parse-search'), async (req: Request, res: Response) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Search text is required.' });
    }
    const description = text.trim().slice(0, 500);

    try {
      const { response, modelUsed } = await generateWithTimeout('parse-search', {
        contents: `Extract child care search criteria from this parent's description.

Rules:
- Use ONLY what the parent wrote. Never infer or guess anything about the family, the child, income, culture or needs.
- Anything not stated: null (or [] for lists).
- areaText: the place exactly as written (neighbourhood, intersection, street, landmark or postal code), else null.
- maxDistanceKm: only if a distance is stated.
- childAgeMonths: only if an age is stated (e.g. "2-year-old" = 24, "18 months" = 18).
- ageGroup: only if the words infant, toddler or preschool(er) are used.
- careType: "Full day" for full-time/full day, "Part day" for part-time/half day, "Before school", "After school", else null.
- startDate: the start time as written (e.g. "March", "September 2027"), else null.
- languages: languages of care the parent asked for.
- mustHaves: other requirements stated as needed (e.g. "near subway", "CWELCC", "outdoor space"), short phrases.
- niceToHaves: things stated as preferred or optional.

Parent's description:
"""
${description}
"""`,
        config: {
          systemInstruction:
            'You convert a parent\'s words into structured search criteria. You never rank, score or recommend centres and never infer anything about the family.',
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              areaText: { type: Type.STRING, nullable: true },
              maxDistanceKm: { type: Type.NUMBER, nullable: true },
              ageGroup: { type: Type.STRING, nullable: true, enum: ['Infant', 'Toddler', 'Preschool'] },
              childAgeMonths: { type: Type.INTEGER, nullable: true },
              careType: {
                type: Type.STRING,
                nullable: true,
                enum: ['Full day', 'Part day', 'Before school', 'After school'],
              },
              startDate: { type: Type.STRING, nullable: true },
              languages: { type: Type.ARRAY, items: { type: Type.STRING } },
              mustHaves: { type: Type.ARRAY, items: { type: Type.STRING } },
              niceToHaves: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'areaText', 'maxDistanceKm', 'ageGroup', 'childAgeMonths', 'careType', 'startDate',
              'languages', 'mustHaves', 'niceToHaves',
            ],
          },
        },
      });
      // sanitizeCriteria validates every field and derives ageGroup from childAgeMonths.
      const criteria = sanitizeCriteria(JSON.parse(response.text || '{}'));
      return res.json({ success: true, aiMode: 'gemini', modelUsed, criteria });
    } catch (err: unknown) {
      console.warn('Gemini parse-search error; using keyword parser:', err);
      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        criteria: parseSearchFallback(description),
      });
    }
  });

  // API 2b: One plain sentence per top result, restating ONLY the facts computed by rankCentres.
  app.post('/api/explain-results', aiGuard('explain-results'), async (req: Request, res: Response) => {
    const raw = Array.isArray(req.body?.results) ? req.body.results : null;
    if (!raw || raw.length === 0) {
      return res.status(400).json({ error: 'results are required.' });
    }
    const strings = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map((x) => x.slice(0, 120)).slice(0, 12) : [];
    // Top 10 only; nothing but ids, names and facts is sent to the model.
    type ExplainInput = { id: string; name: string; matchedFacts: string[]; unknownFacts: string[] };
    const results: ExplainInput[] = raw.slice(0, 10).map((r: any) => ({
      id: String(r?.id ?? '').slice(0, 40),
      name: String(r?.name ?? '').slice(0, 120),
      matchedFacts: strings(r?.matchedFacts),
      unknownFacts: strings(r?.unknownFacts),
    }));
    const fallbackFor = (r: ExplainInput) => factsSentence(r.matchedFacts, r.unknownFacts);

    try {
      const { response, modelUsed } = await generateWithTimeout('explain-results', {
        contents: `For each child care centre below, write ONE short, plain sentence for a parent that restates its facts.

Rules:
- Use ONLY the listed facts. Do not add any claim, adjective or detail that is not in the facts.
- Never mention availability, open spaces, waitlists, quality, cost (other than CWELCC if listed) or a recommendation.
- Never compare centres or say which is best.
- Mention unknown facts plainly (e.g. "ages are not reported").

Centres (JSON):
${JSON.stringify(results)}`,
        config: {
          systemInstruction: 'You restate given facts in plain language. You never add information.',
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, sentence: { type: Type.STRING } },
              required: ['id', 'sentence'],
            },
          },
        },
      });
      const parsed = JSON.parse(response.text || '[]');
      const byId = new Map<string, string>(
        Array.isArray(parsed)
          ? parsed
              .filter((p: any) => typeof p?.id === 'string' && typeof p?.sentence === 'string')
              .map((p: any) => [p.id, p.sentence.trim().slice(0, 300)])
          : []
      );
      // Any centre the model skipped gets the plain facts sentence.
      const explanations = Object.fromEntries(results.map((r) => [r.id, byId.get(r.id) || fallbackFor(r)]));
      return res.json({ success: true, aiMode: 'gemini', modelUsed, explanations });
    } catch (err: unknown) {
      console.warn('Gemini explain-results error; using facts sentences:', err);
      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        explanations: Object.fromEntries(results.map((r) => [r.id, fallbackFor(r)])),
      });
    }
  });

  // API 2c: Prepare an application for a CareQ partner centre (parent reviews and approves before sending).
  // Only the fields in PrepareInput are sent to Gemini; guardrails in src/lib/prepareApplication.ts
  // are applied to every result.
  app.post('/api/prepare-application', aiGuard('prepare-application'), async (req: Request, res: Response) => {
    const input = sanitizePrepareInput(req.body);
    if (!input) {
      return res.status(400).json({ error: 'Child first name and at least one requirement are required.' });
    }

    try {
      const { response, modelUsed } = await generateWithTimeout('prepare-application', {
        contents: `Prepare a child care application for a parent to review. The parent reviews and approves everything before it is sent.

Rules:
- Use ONLY the data below. Never invent documents, facts, dates, names, phone numbers or reasons.
- Never mention other families, priority, ranking, waitlist positions or availability.
- Never assume the child's or parent's gender: no he/she/his/her; use the child's name.
- fields: list ONLY extra information a requirement asks the parent to write in (e.g. "Emergency contact" for an emergency contact form). Leave value "" and source "parent to provide". Do not repeat the child's name, age, care type or start date, and never list a requirement itself (documents go in the checklist).
- checklist: one item per requirement, using the requirement text exactly.
  - "ready" ONLY if an uploaded document clearly matches the requirement; put its exact fileName in matchedDocument.
  - "needs parent check" if the requirement is a condition the app cannot verify (e.g. living in a catchment area, toilet training).
  - otherwise "missing".
- noteToCentre: an optional short, polite cover note from the parent to the centre (max 80 words), using only the given facts.

Data (JSON):
${JSON.stringify(input)}`,
        config: {
          systemInstruction:
            'You help a parent prepare an application. You only organise the data you are given. You never invent information and never rank or compare families.',
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fields: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    source: { type: Type.STRING, enum: ['family profile', 'parent to provide'] },
                  },
                  required: ['label', 'value', 'source'],
                },
              },
              checklist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    requirement: { type: Type.STRING },
                    status: { type: Type.STRING, enum: ['ready', 'missing', 'needs parent check'] },
                    matchedDocument: { type: Type.STRING, nullable: true },
                  },
                  required: ['requirement', 'status'],
                },
              },
              missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
              noteToCentre: { type: Type.STRING },
            },
            required: ['fields', 'checklist', 'missingItems', 'noteToCentre'],
          },
        },
      });
      const result = finalizePrepared(input, JSON.parse(response.text || '{}'));
      return res.json({ success: true, aiMode: 'gemini', modelUsed, ...result });
    } catch (err: unknown) {
      console.warn('Gemini prepare-application error; using rule-based preparation:', err);
      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        ...prepareFallback(input),
      });
    }
  });

  // API 3: AI Message Drafting for Parent & Centre communication
  app.post('/api/generate-message', aiGuard('generate-message'), async (req: Request, res: Response) => {
    const {
      role = 'parent', // 'parent' | 'centre'
      childName = 'Anya',
      childAgeMonths = 22,
      centreName = 'Riverdale Early Learning Centre',
      applicationStatus = 'Submitted',
      intent = 'general inquiry',
      waitlistPosition,
      customNote,
    } = req.body;

    try {
      const isParent = role === 'parent';
      const prompt = isParent
        ? `You are an AI communication assistant for Priya, mother of ${childName} (${childAgeMonths} months old).
Priya is messaging the child care administration at "${centreName}".
The current application status is "${applicationStatus}".
Intent of message: "${intent}".
${customNote ? `Additional parent note: "${customNote}"` : ''}

Draft a warm, polite, professional message (2-4 sentences) that Priya can review, edit, and approve before sending to the centre.
Return only the message text without quotes.`
        : `You are an AI communication assistant for the administrative staff at "${centreName}" (licensed Ontario child care).
The centre is messaging the parent of ${childName} (${childAgeMonths} months old).
The child's application status is "${applicationStatus}"${waitlistPosition ? ` (Waitlist position #${waitlistPosition})` : ''}.
Intent / message purpose: "${intent}".
${customNote ? `Centre staff note: "${customNote}"` : ''}

Draft a clear, courteous, and official message (2-4 sentences) on behalf of the centre that staff can review, edit, and approve before sending to the parent.
Return only the message text without quotes.`;

      const { response, modelUsed } = await generateWithTimeout('generate-message', {
        contents: prompt,
        config: {
          systemInstruction:
            'You are an expert communicator for Ontario child care admissions. Write clear, friendly, and practical messages.',
        },
      });

      const draftMessage = (response.text || '').trim();
      return res.json({ success: true, aiMode: 'gemini', modelUsed, draftMessage });
    } catch (err: unknown) {
      console.warn('Gemini message generation error; using template fallback:', err);

      let fallbackMessage = '';
      if (role === 'parent') {
        if (intent.toLowerCase().includes('waitlist')) {
          fallbackMessage = `Hello, I am checking in regarding Anya's application for the Toddler room starting March 2027. Could you share an update on our current queue position and estimated timeline? Thank you!`;
        } else if (intent.toLowerCase().includes('tour')) {
          fallbackMessage = `Hello ${centreName} team, we would love to schedule a brief morning tour of the toddler classroom facilities ahead of our desired March 2027 start date. Please let us know when tours are available.`;
        } else {
          fallbackMessage = `Hello ${centreName} team, I am following up on Anya's toddler application. Please let us know if any additional documentation or health verification is required at this stage.`;
        }
      } else {
        if (applicationStatus === 'Waitlisted') {
          fallbackMessage = `Dear ${childName}'s family, thank you for your patience. Your child is currently #${waitlistPosition || 5} on our active Toddler intake waitlist. We will notify you immediately once a placement spot becomes available.`;
        } else if (applicationStatus === 'Offer') {
          fallbackMessage = `Dear ${childName}'s family, we are pleased to offer you a licensed Toddler placement at ${centreName}! Please review the offer in your CareQ portal within 48 hours to confirm enrolment.`;
        } else if (applicationStatus === 'Under review') {
          fallbackMessage = `Hello, our intake committee is currently reviewing ${childName}'s application and verification documents. We will update you shortly regarding placement availability.`;
        } else {
          fallbackMessage = `Hello, thank you for submitting ${childName}'s application to ${centreName}. We have received your documentation and your application is active in our intake queue.`;
        }
      }

      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        draftMessage: fallbackMessage,
      });
    }
  });

  // API 4: Message tone check before sending
  app.post('/api/check-tone', aiGuard('check-tone'), async (req: Request, res: Response) => {
    const { text, role = 'parent' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    try {
      const { response, modelUsed } = await generateWithTimeout('check-tone', {
        contents: `You are a professional child-care communication mediator for Ontario families and licensed centres.
Analyze the tone of the following message being sent by a ${role === 'parent' ? 'parent to a child care centre' : 'child care centre to a parent'}:

"""
${text}
"""

Evaluate whether the message is rude, threatening, aggressive, hostile, or overly confrontational.
If it IS rude, threatening, or aggressive:
- set "isHarsh": true
- provide "suggestedCalmerVersion": a polite, calm, constructive revision that conveys the sender's underlying inquiry or message without hostility, anger, or rudeness.
- provide "reason": a brief 1-sentence note explaining what makes it sound harsh.

If it is respectful, calm, neutral, professional, or standard:
- set "isHarsh": false
- set "suggestedCalmerVersion": ""
- set "reason": ""`,
        config: {
          systemInstruction:
            'You are an expert communication mediator. Detect rude, threatening, or aggressive tones accurately. Provide constructive, calm revisions.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isHarsh: {
                type: Type.BOOLEAN,
                description: 'Whether the message tone is rude, threatening, or aggressive.',
              },
              suggestedCalmerVersion: {
                type: Type.STRING,
                description: 'A calmer, polite alternative version of the message.',
              },
              reason: {
                type: Type.STRING,
                description: 'Brief explanation of why the message may come across as harsh.',
              },
            },
            required: ['isHarsh', 'suggestedCalmerVersion'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        aiMode: 'gemini',
        modelUsed,
        success: true,
        isHarsh: Boolean(parsed.isHarsh),
        suggestedCalmerVersion: parsed.suggestedCalmerVersion || '',
        reason: parsed.reason || '',
      });
    } catch (err: unknown) {
      console.warn('Gemini check-tone error or missing key; using fallback tone check:', err);

      const lower = text.toLowerCase();
      const aggressivePatterns = [
        'threat',
        'lawyer',
        'sue you',
        'sue',
        'fire you',
        'incompetent',
        'useless',
        'idiot',
        'liar',
        'terrible',
        'shut up',
        'unacceptable',
        'demand',
        'or else',
        'worst daycare',
        'worst centre',
      ];

      const isHarsh = aggressivePatterns.some((p) => lower.includes(p));

      let suggested = '';
      if (isHarsh) {
        if (role === 'parent') {
          suggested = `Hello, I am following up on our child's application. We are quite concerned about the delay and would appreciate an update on our status as soon as possible. Thank you for your time.`;
        } else {
          suggested = `Hello, we would like to address your questions regarding the enrolment process. Please let us know a convenient time to discuss your child's application respectfully.`;
        }
      }

      return res.json({
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        success: true,
        isHarsh,
        suggestedCalmerVersion: suggested,
        reason: isHarsh ? 'Contains confrontational phrasing.' : '',
      });
    }
  });

  // API 5: Ask CareQ Assistant
  app.post('/api/ask-careq', aiGuard('ask-careq'), async (req: Request, res: Response) => {
    const { question, centres } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const fallbackExact = "I don't have that information; please contact the centre or use Help.";

    try {
      const centresContext = Array.isArray(centres)
        ? centres
            .map(
              (c: any) =>
                `Centre Name: ${c.name}\nNeighbourhood: ${c.neighbourhood}\nAge Groups: ${(c.ageGroups || []).join(', ')}\nHours: ${c.hours || 'N/A'}\nConfirmed Requirements: ${(c.requirements || []).join('; ')}\nFee Note: ${c.feeNote || 'N/A'}`
            )
            .join('\n\n')
        : '';

      const prompt = `You are the "Ask CareQ" official assistant for CareQ, an Ontario child care intake coordination platform prototype.

CRITICAL INSTRUCTIONS & BOUNDARIES:
1. You may ONLY answer using the provided KNOWLEDGE BASE below.
2. If the user's question cannot be answered strictly and directly from the provided KNOWLEDGE BASE, you MUST reply with this EXACT phrase and nothing else:
"${fallbackExact}"
3. NEVER give legal advice under any circumstances.
4. NEVER guess or estimate space availability, open spots, wait times, or waitlist positions.
5. NEVER make decisions or recommendations for the user.
6. When answering from the KNOWLEDGE BASE, provide a concise, factual answer, and end your answer with a short source attribution line on a new line in this format:
Source: <Name of Source>
(For example: "Source: Help FAQ" or "Source: Maple Grove's requirements" or "Source: Trust and transparency page")

KNOWLEDGE BASE:

--- SOURCE 1: HELP FAQ ---
Q: How do applications work in CareQ?
A: CareQ simplifies child care intake across Ontario licensed centres. Parents explore licensed centres, add centres to their intake list, upload required documents (such as immunization records and proof of residency), and review their application before submitting. Participating centres receive the verified file directly and update application progress.
(Source: Help FAQ)

Q: How are waitlist positions set?
A: Waitlist positions are set independently by each centre under its own published admission policy (such as sibling priority, catchment area, or intake application date). CareQ is a communication and intake coordination tool—CareQ ranks no one and does not decide placement order.
(Source: Help FAQ)

Q: What does "simulated data" mean?
A: CareQ is currently operating as an interactive prototype demonstration. Simulated data indicates sample demonstration records—such as mock waitlist position histories, demo parent profiles, and sample notifications—created to demonstrate realistic coordination without exposing real confidential personal information.
(Source: Help FAQ)

Q: How is AI used in CareQ?
A: AI in CareQ assists with administrative productivity: it reads published centre intake policies to extract required document checklists, prepares draft messages, and suggests calmer phrasing for messages. Human beings approve everything—the AI never decides who gets a child care space, never ranks families, and never takes automated actions.
(Source: Help FAQ)

Q: Who can see my documents?
A: Documents are shared with a centre only after the parent explicitly reviews and approves submission. CareQ does not share your uploaded files publicly, does not sell data, and competing centres cannot see files submitted to other centres.
(Source: Help FAQ)

Q: How do I contact support or report an issue?
A: You can submit a Contact Us inquiry or Technical Support ticket directly in the Help tab. Every submission receives a tracking reference number (e.g., CQ-1042). If you experience a communication, fairness, or privacy concern with another party, you can use the "Raise a concern" form.
(Source: Help FAQ)

Q: Can I decline an offer or withdraw an application?
A: Yes. When an offer is extended by a centre, you can choose to accept the offer (and optionally withdraw pending applications from other centres) or decline/withdraw directly from your Track Status dashboard.
(Source: Help FAQ)

--- SOURCE 2: TRUST AND TRANSPARENCY PAGE ---
1. Prototype terms of use: CareQ is an interactive demonstration for Ontario licensed child care intake. Marked: "Prototype terms, not legal advice". Does not create a binding legal placement contract.
2. How we use your information: Basic contact details and child profile are collected solely to coordinate intake applications. Documents are shared with a centre only after the parent approves. CareQ never sells data or displays public profiles.
3. How the AI is used: AI reads published policies to extract checklists, prepares draft messages, and checks tone. People approve everything. It never decides who gets a space. Simulated data is labelled.
4. Fairness: Centres decide admissions under their own published rules (such as sibling priority, catchment, application date). CareQ ranks no one.
5. Policies and regulations: Governed by Ontario's licensed child care guidelines (Child Care and Early Years Act, 2014, and municipal operating guidelines). Links provided without summaries of the law.
(Source: Trust and transparency page)

--- SOURCE 3: CONFIRMED REQUIREMENTS OF CENTRES ---
${centresContext}

USER'S QUESTION:
"""
${question}
"""`;

      const { response, modelUsed } = await generateWithTimeout('ask-careq', {
        contents: prompt,
        config: {
          temperature: 0.1,
        },
      });

      let text = response.text ? response.text.trim() : fallbackExact;

      // Double-check fallback adherence if Gemini generated a hallucinated apology
      if (!text || text.toLowerCase().includes("as an ai") || text.toLowerCase().includes("i am unable")) {
        text = fallbackExact;
      }

      return res.json({
        aiMode: 'gemini',
        modelUsed,
        success: true,
        answer: text,
      });
    } catch (err) {
      console.error('Ask CareQ API error:', err);
      // Deterministic rule-based fallback based on keywords
      const q = question.toLowerCase();
      let answer = fallbackExact;

      if (q.includes('waitlist') || q.includes('position') || q.includes('rank')) {
        answer = 'Waitlist positions are set independently by each centre under its own published admission policy. CareQ ranks no one.\n\nSource: Help FAQ';
      } else if (q.includes('document') || q.includes('see') || q.includes('privacy') || q.includes('upload')) {
        answer = 'Documents are shared with a centre only after the parent approves. They are never shared publicly or sold.\n\nSource: Trust and transparency page';
      } else if (q.includes('ai') || q.includes('artificial')) {
        answer = "CareQ's AI reads published policies to prepare checklists, drafts messages, and checks tone. People approve everything and the AI never decides who gets a space.\n\nSource: Help FAQ";
      } else if (q.includes('simulated')) {
        answer = 'Simulated data refers to labelled sample records used in this prototype demonstration to test coordination safely.\n\nSource: Help FAQ';
      } else if (q.includes('support') || q.includes('contact') || q.includes('help')) {
        answer = 'You can reach support by submitting a Contact Us or Technical Support request directly in the Help tab.\n\nSource: Help FAQ';
      }

      return res.json({
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        success: true,
        answer,
      });
    }
  });

  // Unknown /api routes are JSON 404s (never the HTML app)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  if (process.env.NODE_ENV === 'production') {
    // Serve the built frontend (npm run build -> dist/); no Vite in production
    const dist = path.resolve(__dirname, 'dist');
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    // Development: Vite middleware (imported only here so production never needs it)
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(Number(port), () => {
    console.log(`CareQ server running at http://localhost:${port} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'}, data: ${DATA_MODE})`);
  });
}

startServer();
