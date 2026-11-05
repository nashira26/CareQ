# CareQ

One portal and an AI agent for Ontario's child-care waitlists.
Team 38 – Coalesce · WAI Canada Hackathon 2026

CareQ helps parents **find** licensed centres, **apply** with applications prepared to each centre's requirements, **track** status and queue positions reported by centres, manage **offers**, and **communicate** with centres. A lightweight centre view shows the other side of the process. People approve every application and message; the AI never decides who gets a space.


## Getting started (local)

Requirements: Node.js 18 or later, Git.

```bash
git clone https://github.com/nashira26/CareQ.git
cd careq
npm install
```

Create a file called `.env.local` in the project folder:

```
GEMINI_API_KEY=your_own_key_here
```

Then run:

```bash
npm run dev
```

Get a free Gemini API key from Google AI Studio. **Never commit keys.** `.env.local` must stay in `.gitignore`. AI Studio does not copy secrets to GitHub, so everyone adds their own key locally.

---

## Working with Google AI Studio and GitHub

AI Studio is linked to this repository with two-way sync (Settings → GitHub tab).

**Every session in AI Studio:**

1. **Pull first** from GitHub, so you have your teammates' latest changes.
2. Make **one small change per prompt** (see "Prompting rules" below).
3. Check it works in the preview.
4. **Push** to GitHub straight away.

**Every session locally:**

1. `git pull` before you start.
2. Work on your own area only.
3. Commit small, clear changes: `git commit -m "Add queue position to Track tab"`.
4. `git push` when it works.

**To avoid conflicts:**

- GitHub is the source of truth. If AI Studio and GitHub disagree, GitHub wins.
- Never edit the same files in AI Studio and locally at the same time.
- If a sync goes wrong, stop and tell the team before pushing again.

---

## Prompting rules (to save credits)

- One feature per prompt, and end with: *"Do not change anything else. When done, list the files you changed and stop."*
- Never say "make it better" or "improve the design"; name the exact change.
- Fix small text and colour changes by hand in the code, not by prompting.
- For anything big, ask for a plan first: *"List the files you'd change and stop."*

---

## Data rules (important for judging)

| Type | Examples | How to show it |
| --- | --- | --- |
| **Real, public** | Ontario licensed centres dataset; centres' published policies | Show the source link |
| **From a centre** | Status, queue position, wait given by the centre | "Reported by [centre] on [date]" |
| **Simulated** | Families, centre replies, waitlists, past placements | Always tagged **"Simulated data"** |

- Never show simulated information as real availability or real waitlist positions.
- Never show a wait or position the centre didn't enter. If there's none: "No wait estimate provided by the centre."
- Every application, message and withdrawal needs a person's approval before it is sent.

---

## Build order

1. App skeleton: parent and centre views with mock data *(done when the flow clicks through)*
2. Queue position and wait reported by centres
3. AI reads a centre's policy and extracts requirements, with source sentences
4. AI prepares application drafts and flags missing documents
5. AI-drafted messages, confirmed by the sender
6. Real Toronto centres from the Ontario dataset
7. *Optional, if time:* estimated wait from simulated past records
