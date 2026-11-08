# CareQ

One portal and an AI agent for Ontario's child-care waitlists.
Team 38 – Coalesce · WAI Canada Hackathon 2026

CareQ helps parents **find** licensed centres, **apply** with applications prepared to each centre's requirements, **track** status and queue positions reported by centres, manage **offers**, and **communicate** with centres. A lightweight centre view shows the other side of the process. People approve every application and message; the AI never decides who gets a space.

## Getting started (local)

Requirements: Node.js 18 or later, Git, and a MongoDB Atlas cluster (free tier is fine) — or use local mode below.

```bash
git clone https://github.com/nashira26/CareQ.git
cd CareQ
npm install
```

Copy `.env.example` to `.env` and fill in at least:

```
GEMINI_API_KEY=your_own_key_here
MONGODB_URI=mongodb+srv://USER:PASSWORD@YOUR-CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=careq_dev
```

`.env` is in `.gitignore`; never commit it. Every variable is listed and explained in `.env.example`.

Then run:

```bash
npm run dev
```

Open http://localhost:3000 (or the port in your `PORT` variable). If the database is empty, the server fills it with the demo data on start (or run `npm run seed`).

**No database?** Set `DATA_MODE=local`: each browser keeps its own demo data in localStorage, exactly like before (nothing is shared between devices). If `MONGODB_URI` is not set at all, the server starts in local mode by itself, logs why, and the app shows a small "Demo mode" notice. If `MONGODB_URI` is set but Atlas can't be reached, it stays in mongo mode, keeps retrying, and the app shows the offline banner. `GET /api/mode` (also in `/api/config` and `/api/health`) reports `dataMode`, `dataModeReason` and the MongoDB status. If the browser can't reach the server at all, the app opens an offline demo in that browser instead of failing.

**AI settings:** `GEMINI_TIMEOUT_MS` (default 15000) sets how long to wait for Gemini. If the main model times out or is overloaded, CareQ retries once with `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash-lite`, 10s timeout) before using the basic fallback. Successful AI answers are cached in memory for 30 minutes. Each endpoint's models can be set separately with `GEMINI_MODEL_<ENDPOINT>` / `GEMINI_BACKUP_MODEL_<ENDPOINT>` (see `.env.example`); Ask CareQ starts with the fast model and keeps `GEMINI_MODEL` as its backup. Every AI response logs `[ai] <endpoint>: <mode> · model <name> · <ms>ms` and returns `latencyMs`.

## Working wit GitHub

**Every session locally:**

1. `git pull` before you start.
2. Work on your own area only.
3. Check what changed: `git status`
4. Stage your changes: `git add .` (or `git add path/to/file` for one file)
5. Commit: `git commit -m "Add queue position to Track tab"`
6. `git push` when it works.

Open http://localhost:3000 (or the port in your `PORT` variable).

## Demo accounts and data

The login page has one-click demo buttons (password `password` for all):

- **Priya** (parent, `priya@example.ca`): home area The Annex; child Anya, 22 months, toddler, full day.
- **CareQ Demo Centre (fictional)** (centre, `centre@careq-demo.example`).
- **Jesse Ketchum Early Learning & Child Care Centre · simulated demo account** (centre, `jesse-ketchum.demo@careq.example`).

You can also create your own parent or centre account.

**Demo centres.** Seven real Ontario centres (the `demoCentreId` in each `data/policies/*/meta.json`) plus one fictional "CareQ Demo Centre". The real centres keep their open-data details, and their checklists are quoted word for word from each operator's published handbook, with page citations (Family Day Care's handbook lists no admission documents, so it uses the Ontario licensing manual). Each real centre has a centre-portal account named "{centre} · simulated demo account". Every centre-portal page shows "Simulated demo account. Not operated by or affiliated with {centre}." Applications, positions, offers and messages involving these centres are simulated and labelled "Simulated"; these centres have not partnered with CareQ. The operators' other sites stay open-data centres (information only). Other accounts follow the same pattern: `{slug}.demo@careq.example` (see `src/lib/world.ts`).

**Handbooks.** The PDFs/HTML in `data/policies/` and `data/provincial/` are third-party documents. Get them from the team shared drive; they are git-ignored, and only each folder's `meta.json` is committed.

- **Mongo mode (default):** all demo data lives in MongoDB, so a parent and a centre on different devices see the same applications, positions, messages and notifications. Passwords are hashed with bcrypt; sessions are httpOnly cookies (7 days). The server enforces who sees what: a parent only their own family's data, a centre only its own centre's (403 otherwise).
- **Local mode** (`DATA_MODE=local`): each browser keeps its own copy; "Reset demo" clears that browser.
- Families, applications, positions, offers and messages are simulated. The 1,100 Ontario open-data centres come from `src/data/ontarioCentres.json`; only the 7 demo centres are copied into the database (`src/data/demoCentres.ts`).

### Resetting the demo (mongo mode)

Resetting replaces the shared database with the original demo data and signs everyone out. It needs **both** `ALLOW_RESET=true` on the server **and** the secret `RESET_TOKEN`:

```bash
npm run reset                                  # local server (http://localhost:$PORT)
npm run reset -- https://your-app.onrender.com # deployed demo, e.g. before presenting
```

`npm run reset` sends `RESET_TOKEN` from your `.env` as the `X-Reset-Token` header. In the app, "Reset demo" is hidden from normal users: a seeded demo account sees "Admin reset", enters the token once (kept for that browser tab), and can then reset.

### Building the policy index (handbooks → MongoDB)

The published handbooks and the Ontario licensing manual are split into passages, embedded with Gemini and stored in MongoDB for retrieval. Do this once per database (and again when a document changes):

1. Get the PDFs/HTML from the team shared drive into `data/policies/<operator>/` and `data/provincial/<doc>/`, next to each `meta.json` (they are git-ignored; the repo is public).
2. Run:

```bash
npm run build:index                              # all documents, into MONGODB_DB
npm run build:index -- --dry-run                 # extract and chunk only (no Gemini calls, no database writes)
npm run build:index -- --only=rolph-road-day-care  # one folder
```

What it does: extracts text (PDF with page numbers; HTML without menus/scripts/footers), removes running headers/footers, page numbers and print stamps, splits by section heading into ~800–1,200-character passages (one-sentence overlap), embeds them with `gemini-embedding-2` at 768 dimensions (override with `GEMINI_EMBED_MODEL`), and stores them in the `policyChunks` collection. Re-running replaces each document's chunks (no duplicates). It also creates the Atlas Vector Search index `policy_chunks_vector` (cosine, filters `scope` and `appliesToCentreIds`); if your cluster refuses, it prints the index JSON to paste into Atlas (*Search Indexes → Create → Atlas Vector Search → JSON editor*). Finally it writes `data/index/policyChunks.json` (chunks + embeddings, git-ignored) for local mode, and prints a summary table.

- Files with too little extractable text (e.g. scanned PDFs) are reported and skipped, not indexed.
- **Quota:** the Gemini free tier allows a limited number of embedding requests per day (each passage counts). If the quota runs out, that document is reported as skipped and the run still finishes; embeddings already made are cached in `data/index/.cache/`, so running `npm run build:index` again later resumes where it stopped.
- `npm run reset` and `npm run seed` never touch `policyChunks`: the index survives a demo reset.
- The deployed app uses the MongoDB index (the JSON file isn't deployed). Build the index into each database you use (e.g. `careq_dev`, then `careq_demo` before deploying).

## What it does

**Parents:** find licensed centres on a map, apply with a checklist built from each centre's policy, track status and queue position (as reported by the centre), accept an offer and withdraw the rest, and message centres.
**Centres:** review applications, set status, queue position and wait estimate, paste an admission policy to create a checklist, and reply to families.

## Where AI is used

Six Gemini tools run on the server (`server.ts`). The API key never reaches the browser. In mongo mode every AI endpoint needs a signed-in session except Ask CareQ (also on the login page). All are rate-limited: 20 requests per minute per session, 10 per minute per IP for anonymous Ask CareQ (429 with a plain-language message).

| Tool            | Endpoint                           | Guardrail                                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Policy reader   | `/api/extract-policy-requirements` | Quotes the exact source sentence; centre confirms before parents see it          |
| Policy reader (documents) | `/api/centres/:id/extract-from-documents` | Reads the centre's own indexed documents; every quote verified verbatim, with page and title; centre confirms |
| Search parser   | `/api/parse-search`                | Turns the parent's words into criteria only; never infers anything about the family |
| Result explainer| `/api/explain-results`             | Restates the ranking facts for the top 10; adds no new claims                    |
| Message drafter | `/api/generate-message`            | Facts from the application itself; handbook quote verified; sender edits and approves; tone check before sending |
| Tone check      | `/api/check-tone`                  | Suggests only                                                                    |
| Ask CareQ       | `/api/ask-careq`                   | Agent with two tools; cites a verified quote for every fact; says "I don't have that information" otherwise |

If Gemini is unavailable, each tool falls back to a basic non-AI version.

**Requirements from documents.** In the centre portal, *Policy & requirements → Load a published document* lists the documents indexed for that centre (its operator's handbook, or its own uploads) and suggests requirements (registration, admission, documents, waitlist rules) from the retrieved passages, each with a verbatim quote (checked like Ask CareQ's), page and document title. The centre edits and confirms; confirmed requirements replace the old ones together with their quotes, citations and links. Prepare with AI shows them on each checklist item ("From {document}, {page}" + link); the citations come from the centre's confirmed data, never from the model.

**Centre sign-up.** A self-registered centre can upload its handbook or policy (PDF, HTML or Word .docx, up to 6 MB; `server/ingest.ts`, the same chunking as `npm run build:index`). Its passages are stored for that centre only (embedded if the Gemini quota allows, otherwise found by keyword search); the file itself is not kept. The real demo centres' simulated accounts can't upload. A centre is shown as "Licensed · verified against Ontario open data" only when its licence number **and** postal code (or a close name match) match the open data (`server/licence.ts`); otherwise "Self-registered · not verified".

**Follow-up messages.** The draft uses the selected application's facts, loaded by the server (status, position and who reported it, the centre's estimate, dates), and a line from the centre's own handbook when retrieval finds one (e.g. next steps after an offer). A "Facts used" panel under the draft labels simulated values; the word never appears in the message. A message sent from such a draft shows "Based on simulated application data" to both sides.

Live check: `npm run eval:docs -- http://localhost:3000` (Prepare with AI at two demo centres, a follow-up about Priya's Macaulay offer, and a new centre uploading a small fictional sample PDF; cleans up after itself).

**Ask CareQ** (`server/askAgent.ts`) is a Gemini function-calling agent with exactly two tools: `search_documents(query)` (the published handbooks, the Ontario licensing manual and the Help FAQ; the centre filter is set by the server from the page the user is on, never by the model) and `get_my_application()` (a signed-in parent's own application at that centre; nothing for anonymous users or centre accounts). At most 2 tool calls and 15 s per question.

- Questions about the user's own position, wait, spot or availability ("Where am I on the list?", "When will I get a spot?", "Is there a space next week?") never reach Gemini: anonymous users, centre accounts and parents without an application at that centre get the exact refusal; a parent with one gets the server-written application lines ("From your application · Simulated"). Logged as mode `rule`.

- With a centre ("Ask about this centre" on Find and Track cards, for every centre with indexed documents: the published handbooks and centres' own uploads, from `GET /api/document-centres`): that operator's handbook first, plus at most one provincial passage when it clearly answers better. Without a centre (the floating button): the licensing manual and the Help FAQ.
- Every fact carries a citation (operator, document, "PDF p.N" or section, link, a quote of at most 25 words). The server checks each quote word for word against the retrieved passage and drops any sentence it can't support. Provincial passages say "General Ontario rule; check with the centre."
- Positions, waits and availability are never stated unless the parent's own application has them; then the server writes who reported it, when, and "Simulated".
- Fallback without Gemini: the top 2 passages with their sources under "Here's what the handbook says:".
- Answers are cached per user (anonymous / parent / centre account); questions about the parent's application, positions, lists, waits, spots or availability are never cached.
- Live check against a running server (real Gemini and the MongoDB index): `npm run eval:ask -- http://localhost:3000` prints a results table.

Centre search ranking is plain code, not AI: `src/lib/rankCentres.ts` (distance 50, age/program fit 30, languages and checkable extras 20; demo centres get no bonus). Run its unit tests with `npm test`.

## Responsible AI rules

- People approve every application, message and withdrawal.
- Centres decide admissions. The AI never ranks children or families.
- Queue positions and waits are shown only as the centre reported them, with a date, or as "not provided". CareQ never predicts them.
- Families, applications, positions, offers and messages in the demo are simulated and labelled "Simulated". Real centres' published documents and open data are used for information and are never labelled simulated.

## Tech stack

React 19 · Vite · Tailwind CSS 4 · Express · Google Gemini API (`@google/genai`) · Leaflet + OpenStreetMap

## Deploy on Render

1. **MongoDB Atlas:** create a database user, and under *Network Access* allow Render to connect (for a hackathon demo, `0.0.0.0/0`). Copy the connection string.
2. **New Web Service** on Render, connected to this repository, branch `main`:
   - Build command: `npm ci && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health` (returns 200 when MongoDB is reachable and `GEMINI_API_KEY` is set)
3. **Environment variables** (Environment tab; see `.env.example` for all of them):
   - `NODE_ENV=production`
   - `DATA_MODE=mongo`
   - `MONGODB_URI` = your Atlas connection string
   - `MONGODB_DB=careq_demo`
   - `GEMINI_API_KEY` = your key (optional: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`)
   - `ALLOW_RESET=true` and `RESET_TOKEN` = a long random secret (generate one with `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`). Put the same `RESET_TOKEN` in your local `.env` so `npm run reset -- https://your-app.onrender.com` works.
   - Render sets `PORT` itself.
4. Deploy. On first start the server seeds the empty `careq_demo` database automatically.
5. Before presenting: `npm run reset -- https://your-app.onrender.com`.

In production the server serves the built frontend from `dist/` (no Vite), uses secure cookies, and trusts Render's HTTPS proxy.

## Tests

```bash
npm test
```

Unit tests cover ranking, search parsing, application preparation, browser storage and the access rules (a parent can't read another parent's application; a centre can't read another centre's or any draft). If `MONGODB_URI` is set, an API integration test also runs against a temporary `careq_test` database on your cluster (created and dropped by the test) with two parents and two centres.

## Project structure

- `server.ts`: Express server, Gemini endpoints, health, production static serving
- `server/`: MongoDB connection, repository and seeding (`db.ts`), sessions (`auth.ts`), REST API with validation (`api.ts`), rate limits
- `src/lib/service.ts`, `src/lib/access.ts`: everything users can do and who may do it (shared by the server and local mode)
- `src/lib/store.ts`: the data interface the app uses (API in mongo mode, this browser in local mode)
- `src/App.tsx`: app state, login and routing
- `src/components/ParentView/`: parent pages (Find, Apply, Track, home)
- `src/components/CentreView/`: centre pages
- `src/data/`: demo centres, applications, messages, help content, and the Ontario open data
- `scripts/`: `seed.ts`, `reset.ts`, `import-ontario-data.ts`
