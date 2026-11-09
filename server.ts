import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
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
import { connectMongo, ensureIndexes, isEmpty, reseed, mongo, pingMongo, MongoRepo } from './server/db';
import { AskCache, AskModelCall, AskUser, AppFact, askCacheKey, runAskAgent } from './server/askAgent';
import { MemoryQueryStore, MongoQueryStore, RetrieverDeps, StoredChunk, documentCentreIds, geminiQueryEmbedder, memoryChunkSource, mongoChunkSource } from './server/retrieval';
import { actorOf, type AccountRecord } from './src/lib/world';
import type { Centre } from './src/data/mockData';
import { canReadApplication } from './src/lib/access';
import { recordCentreDocument } from './src/lib/service';
import { FollowUpContext, FOLLOW_UP_SCHEMA, buildFollowUpContext, fallbackFollowUp, finaliseFollowUp, findHandbookPassages, followUpPrompt } from './server/followUp';
import { geminiDocEmbedder, ingestUpload } from './server/ingest';
import { EXTRACT_SCHEMA, extractPrompt, fallbackCandidates, gatherRequirementChunks, verifyCandidates } from './server/requirementsFromDocs';
import { POLICY_CHUNKS, PolicyChunk } from './server/policyIndexConfig';
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
/**
 * Per-endpoint first-model time limit: GEMINI_TIMEOUT_MS_<ENDPOINT> (e.g. GEMINI_TIMEOUT_MS_EXTRACT_POLICY_REQUIREMENTS).
 * The centre-side policy readers read long documents with the main model, so they get 30 s by default;
 * everything else keeps GEMINI_TIMEOUT_MS (15 s).
 */
const ENDPOINT_TIMEOUT_DEFAULTS: Record<string, number> = {
  'extract-policy-requirements': 30000,
  'extract-from-documents': 30000,
};
const timeoutFor = (endpoint: string) =>
  Number(process.env[`GEMINI_TIMEOUT_MS_${endpoint.toUpperCase().replace(/-/g, '_')}`]) || ENDPOINT_TIMEOUT_DEFAULTS[endpoint] || GEMINI_TIMEOUT_MS;

// Backup model, tried once when the main model times out or is overloaded (429/503).
// gemini-3.5-flash-lite was the fastest reliable other flash model in testing on 2026-11-05.
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
const GEMINI_FALLBACK_TIMEOUT_MS = Number(process.env.GEMINI_FALLBACK_TIMEOUT_MS) || 10000;

// Ask CareQ: each turn of its first model is cut off after this, so a stalled call leaves time for the
// backup inside the 15 s budget (flash-lite turns take 1–3 s; single calls stalled for 7–14 s in the
// 2026-11-08 debug runs).
const ASK_TURN_TIMEOUT_MS = Number(process.env.GEMINI_ASK_TURN_TIMEOUT_MS) || 5000;

/**
 * Models per AI endpoint: GEMINI_MODEL_<ENDPOINT> (first) and GEMINI_BACKUP_MODEL_<ENDPOINT> (tried
 * once on timeout/429/503), e.g. GEMINI_MODEL_ASK_CAREQ, GEMINI_BACKUP_MODEL_PREPARE_APPLICATION.
 * Defaults: GEMINI_MODEL, then GEMINI_FALLBACK_MODEL; except the parent-facing endpoints where speed
 * matters, which start with the fast model and keep the main model as backup:
 *  - Ask CareQ runs 2–3 model turns inside 15 s (flash-lite answered correctly in ~2 s, 2026-11-07 eval);
 *  - Prepare with AI and follow-up drafts: gemini-3.5-flash timed out at 15 s on Prepare in the
 *    2026-11-08 eval (17.2 s with the backup); flash-lite produced the same checks.
 * The centre-side policy readers keep the main model first, where quality matters more than speed.
 */
const FAST_FIRST = { primary: GEMINI_FALLBACK_MODEL, backup: GEMINI_MODEL };
const ENDPOINT_MODEL_DEFAULTS: Record<string, { primary: string; backup: string }> = {
  'ask-careq': FAST_FIRST,
  'prepare-application': FAST_FIRST,
  'generate-message': FAST_FIRST,
};
const modelsFor = (endpoint: string) => {
  const key = endpoint.toUpperCase().replace(/-/g, '_');
  const d = ENDPOINT_MODEL_DEFAULTS[endpoint] ?? { primary: GEMINI_MODEL, backup: GEMINI_FALLBACK_MODEL };
  return {
    primary: process.env[`GEMINI_MODEL_${key}`] || d.primary,
    backup: process.env[`GEMINI_BACKUP_MODEL_${key}`] || d.backup,
  };
};
const AI_ENDPOINTS = ['extract-policy-requirements', 'extract-from-documents', 'parse-search', 'explain-results', 'prepare-application', 'generate-message', 'check-tone', 'ask-careq'];

// In-memory cache of successful Gemini answers, so repeated demo inputs answer instantly.
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
/** AI_CACHE=off: no response caching at all (Gemini calls and Ask CareQ answers), e.g. for npm run eval. */
const AI_CACHE_OFF = process.env.AI_CACHE === 'off';

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

/**
 * Where demo data lives: "mongo" (shared across devices) or "local" (each browser keeps its own).
 * DATA_MODE=local -> local. No MONGODB_URI -> local automatically (instead of 503s on every call).
 * MONGODB_URI set but unreachable -> stays mongo: connectMongo retries and the API answers 503 until it's up.
 */
const resolveDataMode = (): { mode: 'mongo' | 'local'; reason: string } => {
  if (process.env.DATA_MODE === 'local') return { mode: 'local', reason: 'DATA_MODE=local' };
  if (!process.env.MONGODB_URI?.trim()) return { mode: 'local', reason: 'MONGODB_URI is not set' };
  return { mode: 'mongo', reason: 'MONGODB_URI is set' };
};
const { mode: DATA_MODE, reason: DATA_MODE_REASON } = resolveDataMode();
if (DATA_MODE === 'local' && process.env.DATA_MODE !== 'local') {
  console.warn(`[data] ${DATA_MODE_REASON}: starting in local mode (each browser keeps its own demo data). Set MONGODB_URI and MONGODB_DB to share data across devices.`);
}
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

  const modeInfo = () => ({ dataMode: DATA_MODE, dataModeReason: DATA_MODE_REASON, mongo: DATA_MODE === 'mongo' ? mongo.status : 'not used' });
  app.get('/api/config', (_req, res) => {
    res.json({ ...modeInfo(), resetAvailable: DATA_MODE === 'mongo' && ALLOW_RESET && Boolean(RESET_TOKEN) });
  });
  app.get('/api/mode', (_req, res) => {
    res.json(modeInfo());
  });

  // Health for Render: MongoDB reachable (mongo mode) and a Gemini key configured (never the key itself)
  app.get('/api/health', async (_req, res) => {
    const mongoUp = DATA_MODE === 'mongo' ? await pingMongo() : null;
    const geminiKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
    const ok = (DATA_MODE === 'local' || mongoUp === true) && geminiKeyConfigured;
    res.status(ok ? 200 : 503).json({
      status: ok ? 'ok' : 'degraded',
      dataMode: DATA_MODE,
      dataModeReason: DATA_MODE_REASON,
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
    let account: AccountRecord | null = null;
    if (DATA_MODE === 'mongo' && mongo.db) {
      try {
        account = await sessionAccount(mongo.db, req);
      } catch {
        account = null;
      }
    }
    const accountId = account?.id ?? null;
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
    res.locals.account = account ?? undefined;
    // Per-endpoint latency and the model that answered: logged, and returned as latencyMs
    const started = Date.now();
    const json = res.json.bind(res);
    res.json = (body?: any) => {
      if (body && typeof body === 'object' && 'aiMode' in body) {
        const ms = Date.now() - started;
        console.log(`[ai] ${endpoint}: ${body.aiMode}${body.cached ? ' (cached)' : ''} · model ${body.modelUsed ?? 'none'} · ${ms}ms`);
        return json({ ...body, latencyMs: ms });
      }
      return json(body);
    };
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
    const cached = AI_CACHE_OFF ? undefined : geminiCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`[gemini] ${label}: cache hit (answered earlier by ${cached.modelUsed})`);
      return { response: cached.response, modelUsed: cached.modelUsed };
    }
    geminiCache.delete(cacheKey);

    const started = Date.now();
    const { primary, backup } = modelsFor(label);
    let response: GenerateContentResponse;
    let modelUsed = primary;
    try {
      response = await callModel(label, primary, params, timeoutFor(label));
    } catch (err) {
      if (!isRetryable(err)) throw err;
      const status = err instanceof ApiError ? `HTTP ${err.status}` : 'timeout';
      console.warn(`[gemini] ${label}: ${primary} failed (${status}); retrying with ${backup}`);
      modelUsed = backup;
      response = await callModel(label, backup, params, GEMINI_FALLBACK_TIMEOUT_MS);
    }
    console.log(`[gemini] ${label}: answered by ${modelUsed} in ${Date.now() - started}ms`);

    if (AI_CACHE_OFF) return { response, modelUsed };
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

  // API 3: Follow-up message drafts (server/followUp.ts). Facts come from the application itself
  // (mongo mode: loaded and access-checked here); a relevant handbook line is quoted and verified.
  // The sender edits and approves; nothing is sent automatically. The tone check runs before sending.
  app.post('/api/generate-message', aiGuard('generate-message'), async (req: Request, res: Response) => {
    const b = req.body ?? {};
    const role: 'parent' | 'centre' = b.role === 'centre' ? 'centre' : 'parent';
    const intent = typeof b.intent === 'string' && b.intent.trim() ? b.intent.trim().slice(0, 200) : 'general follow-up';
    const account = res.locals.account as AccountRecord | undefined;

    let ctx: FollowUpContext | null = null;
    if (DATA_MODE === 'mongo' && mongo.db) {
      const applicationId = typeof b.applicationId === 'string' ? b.applicationId.slice(0, 120) : '';
      const repo = new MongoRepo(mongo.db);
      const app = applicationId ? await repo.getApplication(applicationId) : null;
      // Same rule as the data API: a parent only their own applications, a centre only its own
      if (!app || !account || !canReadApplication(actorOf(account), app)) {
        return res.status(404).json({ error: 'Application not found.' });
      }
      const centre = await repo.getCentre(app.centreId);
      if (!centre) return res.status(404).json({ error: 'Centre not found.' });
      ctx = buildFollowUpContext(app, centre, account.role === 'centre' ? 'centre' : 'parent', account.role === 'centre' ? centre.name : account.name, intent);
    } else {
      // Local mode: the browser holds the demo data, so the facts come from the request (bounded)
      const s = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
      const position = Number(b.waitlistPosition);
      ctx = buildFollowUpContext(
        {
          childName: s(b.childName, 60) || 'your child',
          status: (s(b.applicationStatus, 30) || 'Submitted') as any,
          waitlistPosition: Number.isFinite(position) && position > 0 ? position : undefined,
          waitlistReportedBy: s(b.waitlistReportedBy) || undefined,
          waitlistReportedDate: s(b.waitlistReportedDate, 40) || undefined,
          waitlistEstimate: s(b.waitlistEstimate, 80) || undefined,
          preferredStartDate: s(b.preferredStartDate, 40),
          submittedAt: s(b.submittedAt, 40) || undefined,
          careType: s(b.careType, 40),
        },
        { id: s(b.centreId, 80), name: s(b.centreName) || 'the centre', registration: b.selfRegistered ? ({} as any) : undefined },
        role,
        s(b.senderName, 60) || (role === 'centre' ? s(b.centreName) : 'Parent'),
        intent
      );
    }

    const passages = await findHandbookPassages(ctx, getRetrieverDeps());
    try {
      const { response, modelUsed } = await generateWithTimeout('generate-message', {
        contents: followUpPrompt(ctx, passages),
        config: {
          systemInstruction:
            'You draft clear, friendly, practical messages for Ontario child care admissions. You only use the facts and passages given, and the sender approves everything.',
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: FOLLOW_UP_SCHEMA,
        },
      });
      const result = finaliseFollowUp(ctx, passages, JSON.parse(response.text || '{}'));
      if (!result) throw new Error('draft rejected: empty message or unverified handbook quote');
      return res.json({ success: true, aiMode: 'gemini', modelUsed, ...result });
    } catch (err: unknown) {
      console.warn('Gemini generate-message error; using template fallback:', (err as Error)?.message ?? err);
      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        ...fallbackFollowUp(ctx, passages),
      });
    }
  });

  // ---------------- Centre documents: list, upload (self-registered centres), requirements from documents ----------------

  /** The signed-in centre account for this centre, or a 403/400 already sent. */
  const ownCentre = async (req: Request, res: Response): Promise<{ account: AccountRecord; centre: Centre } | null> => {
    const account = res.locals.account as AccountRecord | undefined;
    if (DATA_MODE !== 'mongo' || !mongo.db) {
      res.status(400).json({ error: 'Documents are available with the shared database (DATA_MODE=mongo).' });
      return null;
    }
    if (!account || account.role !== 'centre' || account.centreId !== req.params.id) {
      res.status(403).json({ error: 'You can only manage your own centre.' });
      return null;
    }
    const centre = await new MongoRepo(mongo.db).getCentre(req.params.id);
    if (!centre) {
      res.status(404).json({ error: 'Centre not found.' });
      return null;
    }
    return { account, centre };
  };

  // The documents indexed for this centre (its operator's published handbook, or its own uploads)
  app.get('/api/centres/:id/documents', aiGuard('centre-documents'), async (req: Request, res: Response) => {
    const own = await ownCentre(req, res);
    if (!own) return;
    const chunks = (await getRetrieverDeps().source.all().catch(() => [] as StoredChunk[])).filter(
      (c) => c.scope === 'operator' && c.appliesToCentreIds.includes(own.centre.id)
    );
    const docs = new Map<string, { docKey: string; docTitle: string; operatorName: string; sourceUrl: string | null; sourceNote: string | null; pages: Set<number>; chunks: number; uploaded: boolean }>();
    for (const c of chunks) {
      const d =
        docs.get(c.docKey) ??
        { docKey: c.docKey, docTitle: c.docTitle, operatorName: c.operatorName, sourceUrl: c.sourceUrl, sourceNote: c.sourceNote, pages: new Set<number>(), chunks: 0, uploaded: c.operatorId.startsWith('self-') };
      if (c.page != null) d.pages.add(c.page);
      d.chunks++;
      docs.set(c.docKey, d);
    }
    res.json({
      documents: [...docs.values()].map(({ pages, ...d }) => ({ ...d, pages: pages.size })),
      canUpload: Boolean(own.centre.registration),
    });
  });

  // Upload a document (self-registered centres only): extract, chunk, embed if the quota allows, store
  app.post('/api/centres/:id/documents', aiGuard('upload-document'), async (req: Request, res: Response) => {
    const own = await ownCentre(req, res);
    if (!own) return;
    if (!own.centre.registration) {
      return res.status(403).json({ error: "Only self-registered centres can upload documents. This centre's published handbook is already indexed." });
    }
    const { fileName, title, dataBase64 } = req.body ?? {};
    if (typeof fileName !== 'string' || typeof dataBase64 !== 'string' || !fileName.trim()) {
      return res.status(400).json({ error: 'Please choose a file.' });
    }
    const started = Date.now();
    try {
      const result = await ingestUpload(
        {
          centreId: own.centre.id,
          centreName: own.centre.name,
          fileName: fileName.slice(0, 160),
          title: typeof title === 'string' ? title : '',
          data: Buffer.from(dataBase64, 'base64'),
        },
        mongo.db!.collection<PolicyChunk>(POLICY_CHUNKS),
        process.env.GEMINI_API_KEY ? geminiDocEmbedder(ai) : undefined
      );
      getRetrieverDeps().source.invalidate?.();
      await recordCentreDocument(new MongoRepo(mongo.db!), actorOf(own.account), own.centre.id, {
        docKey: result.docKey,
        docTitle: result.docTitle,
        fileName: fileName.slice(0, 160),
        chunks: result.chunks,
        keywordOnly: result.keywordOnly,
      });
      console.log(`[upload] ${own.centre.id}: ${result.docKey} · ${result.chunks} chunks (${result.keywordOnly} keyword-only) · ${Date.now() - started}ms`);
      return res.status(201).json({ success: true, ...result });
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }
  });

  // Requirements from the centre's documents (retrieved chunks), each with a verified verbatim quote.
  // The centre reviews, edits and confirms before anything is published.
  app.post('/api/centres/:id/extract-from-documents', aiGuard('extract-from-documents'), async (req: Request, res: Response) => {
    const own = await ownCentre(req, res);
    if (!own) return;
    const docKey = typeof req.body?.docKey === 'string' ? req.body.docKey.slice(0, 200) : undefined;
    const chunks = await gatherRequirementChunks(own.centre.id, getRetrieverDeps(), docKey);
    if (!chunks.length) {
      return res.json({ success: true, aiMode: 'fallback', modelUsed: null, requirements: [], chunksRead: 0, notice: 'No published documents for this centre yet.' });
    }
    try {
      const { response, modelUsed } = await generateWithTimeout('extract-from-documents', {
        contents: extractPrompt(chunks),
        config: {
          systemInstruction: 'You extract admission requirements from published child care documents. You copy quotes exactly and never invent requirements.',
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: EXTRACT_SCHEMA,
        },
      });
      const requirements = verifyCandidates(JSON.parse(response.text || '[]'), chunks);
      if (!requirements.length) throw new Error('no requirement with a verified quote');
      return res.json({ success: true, aiMode: 'gemini', modelUsed, requirements, chunksRead: chunks.length });
    } catch (err) {
      console.warn('extract-from-documents: using the sentence fallback:', (err as Error)?.message ?? err);
      return res.json({
        success: true,
        aiMode: 'fallback',
        modelUsed: null,
        fallbackReason: fallbackReasonFor(err),
        requirements: fallbackCandidates(chunks),
        chunksRead: chunks.length,
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

  // API 5: Ask CareQ, an agent with two tools (search_documents, get_my_application); see server/askAgent.ts
  const askCache = new AskCache();
  let retrieverDeps: { db: unknown; deps: RetrieverDeps } | null = null;
  const embed = process.env.GEMINI_API_KEY ? geminiQueryEmbedder(ai) : undefined;
  const getRetrieverDeps = (): RetrieverDeps => {
    const db = DATA_MODE === 'mongo' ? mongo.db : null;
    if (retrieverDeps && retrieverDeps.db === db) return retrieverDeps.deps;
    let deps: RetrieverDeps;
    if (db) {
      deps = { source: mongoChunkSource(db), embed, queryStore: new MongoQueryStore(db), log: console.warn };
    } else {
      // Local mode (or MongoDB not connected yet): the index file written by npm run build:index, if present
      const file = path.resolve(__dirname, 'data', 'index', 'policyChunks.json');
      let chunks: StoredChunk[] = [];
      try {
        if (fs.existsSync(file)) chunks = JSON.parse(fs.readFileSync(file, 'utf8')).chunks ?? [];
      } catch (e) {
        console.warn('[ask-careq] could not read data/index/policyChunks.json:', (e as Error).message);
      }
      deps = { source: memoryChunkSource(chunks), embed, queryStore: new MemoryQueryStore(), log: console.warn };
    }
    retrieverDeps = { db, deps };
    return deps;
  };

  app.post('/api/ask-careq', aiGuard('ask-careq'), async (req: Request, res: Response) => {
    const { question } = req.body ?? {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question is required.' });
    }
    // The centre page the user is on. Only the server uses it (as the search filter); the model never chooses it.
    const rawCentre = req.body?.centreId;
    const centreId = typeof rawCentre === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(rawCentre) ? rawCentre : undefined;
    const account = res.locals.account as AccountRecord | undefined;
    const user: AskUser = !account
      ? { kind: 'anonymous' }
      : account.role === 'parent'
      ? { kind: 'parent', accountId: account.id }
      : { kind: 'centre', accountId: account.id };

    // get_my_application: a signed-in parent's own applications at this centre (never drafts), from MongoDB
    const db = DATA_MODE === 'mongo' ? mongo.db : null;
    const getApplications =
      user.kind === 'parent' && centreId && db
        ? async (): Promise<AppFact[]> => {
            const repo = new MongoRepo(db);
            const [apps, centre] = await Promise.all([repo.listApplications({ parentAccountId: user.accountId, centreId }), repo.getCentre(centreId)]);
            return apps
              .filter((a) => a.status !== 'Draft')
              .map((a) => ({
                childName: a.childName,
                centreName: centre?.name ?? 'the centre',
                status: a.status,
                position: typeof a.waitlistPosition === 'number' && a.waitlistPosition > 0 ? a.waitlistPosition : null,
                reportedBy: a.waitlistReportedBy ?? null,
                reportedDate: a.waitlistReportedDate ?? null,
                estimate: a.waitlistEstimate ?? null,
                // Demo centres (real or fictional) are simulated; a self-registered centre's data is not
                simulated: !centre?.registration,
              }));
          }
        : undefined;

    const cacheKey = askCacheKey(user, centreId, question);
    // ASK_DEBUG=1 or AI_CACHE=off: every question runs for real (so repeated runs show the full log)
    const cached = process.env.ASK_DEBUG === '1' || AI_CACHE_OFF ? null : askCache.get(cacheKey);
    if (cached) {
      console.log('[gemini] ask-careq: cache hit');
      return res.json({ success: true, ...cached, cached: true });
    }

    // One model pair per request: the endpoint's first model, and its backup from then on if that fails
    const { primary, backup } = modelsFor('ask-careq');
    let current = primary;
    const askModel: AskModelCall = async (params, deadline) => {
      const remaining = () => deadline - Date.now();
      try {
        const timeout = Math.min(current === primary ? ASK_TURN_TIMEOUT_MS : GEMINI_FALLBACK_TIMEOUT_MS, remaining());
        return { response: await callModel('ask-careq', current, params, timeout), modelUsed: current };
      } catch (err) {
        if (current !== primary || primary === backup || !isRetryable(err) || remaining() < 2000) throw err;
        console.warn(`[gemini] ask-careq: ${primary} failed (${err instanceof ApiError ? `HTTP ${err.status}` : 'timeout'}); retrying with ${backup}`);
        current = backup;
        // A search already returned passages: the backup answers from them (no new search), so it fits in the time left
        const hasPassages = params.contents.some((c) => c.parts?.some((p) => ((p.functionResponse?.response as any)?.result?.passages?.length ?? 0) > 0));
        const retry = hasPassages ? { ...params, config: { ...params.config, toolConfig: { functionCallingConfig: { mode: 'NONE' as any } } } } : params;
        return { response: await callModel('ask-careq', current, retry, Math.min(GEMINI_FALLBACK_TIMEOUT_MS, remaining())), modelUsed: current };
      }
    };

    const started = Date.now();
    const result = await runAskAgent({ question: question.trim().slice(0, 500), centreId, deps: getRetrieverDeps(), getApplications }, askModel);
    console.log(
      `[ask-careq] ${result.aiMode}${result.modelUsed ? ` (${result.modelUsed})` : ''} in ${Date.now() - started}ms · tools ${result.toolsUsed.join(',') || '-'} · ${result.retrievalMode} · ${result.citations.length} citation(s)`
    );
    askCache.set(cacheKey, question, result);
    return res.json({ success: true, ...result });
  });

  // Centres with indexed documents (handbooks + uploads): which cards show "Ask about this centre".
  // Ids only; a distinct query in mongo mode, so no passages or embeddings are loaded.
  app.get('/api/document-centres', async (_req: Request, res: Response) => {
    try {
      const db = DATA_MODE === 'mongo' ? mongo.db : null;
      const centreIds = db
        ? ((await db.collection<PolicyChunk>(POLICY_CHUNKS).distinct('appliesToCentreIds', { scope: 'operator' })) as string[]).sort()
        : documentCentreIds(await getRetrieverDeps().source.all());
      res.json({ centreIds });
    } catch (e) {
      console.warn('[document-centres] failed:', (e as Error).message);
      res.json({ centreIds: [] });
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

  console.log(`[ai] models: ${AI_ENDPOINTS.map((e) => `${e} ${modelsFor(e).primary} (backup ${modelsFor(e).backup})`).join('; ')}`);
  app.listen(Number(port), () => {
    console.log(`CareQ server running at http://localhost:${port} (${process.env.NODE_ENV === 'production' ? 'production' : 'development'}, data: ${DATA_MODE} · ${DATA_MODE_REASON})`);
  });
}

startServer();
