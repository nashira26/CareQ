# CareQ

One portal and an AI agent for Ontario's child-care waitlists.
Team 38 – Coalesce · WAI Canada Hackathon 2026

CareQ helps parents **find** licensed centres, **apply** with applications prepared to each centre's requirements, **track** status and queue positions reported by centres, manage **offers**, and **communicate** with centres. A lightweight centre view shows the other side of the process. People approve every application and message; the AI never decides who gets a space.

## Getting started (local)

Requirements: Node.js 18 or later, Git.

```bash
git clone https://github.com/nashira26/CareQ.git
cd CareQ
npm install
```

Create a file called `.env` in the project folder (copy `.env.example`):

```
GEMINI_API_KEY=your_own_key_here
GEMINI_MODEL=gemini-3.5-flash
```

`.env` is in `.gitignore`; never commit it. Optional: `GEMINI_TIMEOUT_MS` (default 15000) sets how long to wait for Gemini before the basic fallback is used.

Then run:

```bash
npm run dev
```

## Working wit GitHub

**Every session locally:**

1. `git pull` before you start.
2. Work on your own area only.
3. Check what changed: `git status`
4. Stage your changes: `git add .` (or `git add path/to/file` for one file)
5. Commit: `git commit -m "Add queue position to Track tab"`
6. `git push` when it works.

Open http://localhost:3000 (or the port in your `PORT` variable).

## Demo accounts

The login page has one-click demo buttons. Accounts are mock, nothing is stored on a server, and refreshing the page resets the demo.

## What it does

**Parents:** find licensed centres on a map, apply with a checklist built from each centre's policy, track status and queue position (as reported by the centre), accept an offer and withdraw the rest, and message centres.
**Centres:** review applications, set status, queue position and wait estimate, paste an admission policy to create a checklist, and reply to families.

## Where AI is used

Five Gemini tools run on the server (`server.ts`). The API key never reaches the browser.

| Tool            | Endpoint                           | Guardrail                                                                        |
| --------------- | ---------------------------------- | -------------------------------------------------------------------------------- |
| Policy reader   | `/api/extract-policy-requirements` | Quotes the exact source sentence; centre confirms before parents see it          |
| Centre matcher  | `/api/match-centres`               | Only explains why a centre fits                                                  |
| Message drafter | `/api/generate-message`            | Sender edits and approves                                                        |
| Tone check      | `/api/check-tone`                  | Suggests only                                                                    |
| Ask CareQ       | `/api/ask-careq`                   | Answers only from confirmed info; says "I don't have that information" otherwise |

If Gemini is unavailable, each tool falls back to a basic non-AI version.

## Responsible AI rules

- People approve every application, message and withdrawal.
- Centres decide admissions. The AI never ranks children or families.
- Queue positions and waits are shown only as the centre reported them, with a date, or as "not provided". CareQ never predicts them.
- All centres, families, waitlists and messages in the demo are simulated and labelled.

## Tech stack

React 19 · Vite · Tailwind CSS 4 · Express · Google Gemini API (`@google/genai`) · Leaflet + OpenStreetMap

## Project structure

- `server.ts`: Express server and the Gemini endpoints
- `src/App.tsx`: app state, login and routing
- `src/components/ParentView/`: parent pages (Find, Apply, Track, home)
- `src/components/CentreView/`: centre pages
- `src/data/`: mock centres, applications, messages and help content
