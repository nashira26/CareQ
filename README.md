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

**No database?** Set `DATA_MODE=local`: each browser keeps its own demo data in localStorage, exactly like before (nothing is shared between devices).

**AI settings:** `GEMINI_TIMEOUT_MS` (default 15000) sets how long to wait for Gemini. If the main model times out or is overloaded, CareQ retries once with `GEMINI_FALLBACK_MODEL` (default `gemini-3.5-flash-lite`, 10s timeout) before using the basic fallback. Successful AI answers are cached in memory for 30 minutes.

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

The login page has one-click demo buttons (Priya, parent; Riverdale Early Learning Centre, centre; password `password`). You can also create your own parent or centre account.

- **Mongo mode (default):** all demo data lives in MongoDB, so a parent and a centre on different devices see the same applications, positions, messages and notifications. Passwords are hashed with bcrypt; sessions are httpOnly cookies (7 days). The server enforces who sees what: a parent only their own family's data, a centre only its own centre's (403 otherwise).
- **Local mode** (`DATA_MODE=local`): each browser keeps its own copy; "Reset demo" clears that browser.
- All data is fictional demo data. The 1,100 Ontario open-data centres come from `src/data/ontarioCentres.json` and are never stored in the database.

### Resetting the demo (mongo mode)

Resetting replaces the shared database with the original demo data and signs everyone out. It needs **both** `ALLOW_RESET=true` on the server **and** the secret `RESET_TOKEN`:

```bash
npm run reset                                  # local server (http://localhost:$PORT)
npm run reset -- https://your-app.onrender.com # deployed demo, e.g. before presenting
```

`npm run reset` sends `RESET_TOKEN` from your `.env` as the `X-Reset-Token` header. In the app, "Reset demo" is hidden from normal users: a seeded demo account sees "Admin reset", enters the token once (kept for that browser tab), and can then reset.

## What it does

**Parents:** find licensed centres on a map, apply with a checklist built from each centre's policy, track status and queue position (as reported by the centre), accept an offer and withdraw the rest, and message centres.
**Centres:** review applications, set status, queue position and wait estimate, paste an admission policy to create a checklist, and reply to families.

## Where AI is used

Six Gemini tools run on the server (`server.ts`). The API key never reaches the browser. In mongo mode every AI endpoint needs a signed-in session except Ask CareQ (also on the login page). All are rate-limited: 20 requests per minute per session, 10 per minute per IP for anonymous Ask CareQ (429 with a plain-language message).

| Tool            | Endpoint                           | Guardrail                                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Policy reader   | `/api/extract-policy-requirements` | Quotes the exact source sentence; centre confirms before parents see it          |
| Search parser   | `/api/parse-search`                | Turns the parent's words into criteria only; never infers anything about the family |
| Result explainer| `/api/explain-results`             | Restates the ranking facts for the top 10; adds no new claims                    |
| Message drafter | `/api/generate-message`            | Sender edits and approves                                                        |
| Tone check      | `/api/check-tone`                  | Suggests only                                                                    |
| Ask CareQ       | `/api/ask-careq`                   | Answers only from confirmed info; says "I don't have that information" otherwise |

If Gemini is unavailable, each tool falls back to a basic non-AI version.

Centre search ranking is plain code, not AI: `src/lib/rankCentres.ts` (distance 50, age/program fit 30, languages and checkable extras 20; partner centres get no bonus). Run its unit tests with `npm test`.

## Responsible AI rules

- People approve every application, message and withdrawal.
- Centres decide admissions. The AI never ranks children or families.
- Queue positions and waits are shown only as the centre reported them, with a date, or as "not provided". CareQ never predicts them.
- All centres, families, waitlists and messages in the demo are simulated and labelled.

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
