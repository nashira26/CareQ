# CareQ visual identity redesign

Branch: `redesign/visual-identity`. A visual redesign only: no changes to architecture, data, auth, workflows, navigation or state. Open `design/preview.html` in a browser for the palette, type, buttons, inputs, status pills, sample cards and illustrations.

## Identity

**Colour roles.** Teal is the anchor; coral and sunshine are controlled accents; leaf marks progress.

| Role | Fill | Text-safe shade | Used for |
|---|---|---|---|
| Teal `brand` | #124B50 | same (9.3:1) | navigation, primary buttons, key headings |
| Coral `coral` | #F26D55 (never text) | `coral-ink` #B23F27 | "Needs you", active tab indicator, current progress step, focus ring (#C4492F) |
| Sunshine `sun` | #F4C95D (never text) | `sun-ink` #7A5600 | Offer pill, reminders |
| Leaf `leaf` | #8FB99A (never text) | `leaf-ink` #2E6741 | completed steps, ticks |

Surfaces: page #FCF9F2, white, mint #E8F0EB, peach #FCEBE4, butter #F4EFD9, stone #F1EEE6. Text: ink #1B3438, muted #55615E. Semantic colours (feedback only, never statuses): success #256B3F, warning #7A4F00, error #A8231A, info #245C8A, each on its own tint. Every text pair is at least 4.5:1.

**Application statuses** keep their wording; each has its own colour and icon: Draft (stone, dashed), Submitted (info blue), Under review (peach), Waitlisted (violet, used only here; "Waitlisted · #4"), Offer Available (solid sunshine), Accepted (mint), Withdrawn (stone, struck through). The "Simulated" tag is a butter tag with square-ish corners so it never reads as a status.

**Type.** Nunito Sans (chosen over Lato: larger x-height on phones, warmer, one variable font). Page title 30px (24 on phones), section 22, card title 18, body 16, minimum 13. No uppercase labels, no letter spacing.

**Shape and depth.** Radius 6 tags · 10 buttons/inputs · 14 cards · 20 landing panels; full pill only for status pills and chips. Border first; soft teal-tinted shadows only for raised cards and overlays.

**Illustrations.** Six spot illustrations in one style (2px teal line, flat surface fills, one warm accent): centre/home, neighbourhood, checklist, journey, messages, empty state (`src/components/ui/Illustrations.tsx`), plus the house scene (`HouseIllustration`). No faces, no stock or AI images.

**Parent vs centre.** Parents (mostly phones): personal and reassuring, next step first, progress per application, no statistics dashboard, bottom tab bar on phones. Centre staff (desktop): table first, compact rows and quick actions, same identity.

## Where things live

- Tokens: `src/index.css` (`@theme`). Core names (`brand`, `coral-ink`, `mint`, `status-wait`…) for new code. The `cq-*` names are the phase-0 legacy names, now pointing at the new palette; replace them screen by screen.
- Shared components: `src/components/ui/CareUI.tsx` (buttons, Card, PageHeader, IconTile, CentreAvatar, ProgressStrip, SimTag, trust banners, AI notes, HouseIllustration), `Illustrations.tsx` (spots, EmptyState), `StepComplete.tsx` ("You've completed this step"), `StatusBadge.tsx`, `AppSidebar.tsx` (sidebar + phone tab bar), `Navbar.tsx`, `Onboarding/FormBits.tsx`.

## Phases

| Phase | Scope | Status |
|---|---|---|
| 0 | Hard-coded colours and fonts → named tokens, no visual change (verified: computed styles of every element on 26 screens identical) | done |
| 1 | Design system applied globally: tokens, Nunito Sans, type and radius scale, buttons, inputs, focus, status pills, navigation (phone tab bar), illustrations, centre avatar, progress strip, step confirmation | done |
| 2 | Landing, login/sign-up, parent Overview (butter greeting band, progress per application), Find (avatar tiles, "More details"), Apply, Track (shorter repeated centre names); arrows back on buttons that go to another screen | done |
| 3 | Centre portal, messaging, companion, Help, Trust page, empty/loading/error/confirmation states | done |

## Must not change

Every "Simulated" tag; "Not verified" and "Licensed · verified against Ontario open data"; the "Simulated demo account" banners; AI fallback notes ("AI unavailable: basic mode used", "basic search used"); Ask CareQ quote cards and citations; "Prepared with AI"; all wording about positions, estimates and "not a guarantee". Before each commit, compare the counts of these strings in `src/` with the previous commit.

## Checks after each phase

```bash
npm test && npm run lint && npm run build
DATA_MODE=local PORT=3123 npm run dev        # in another terminal
npm run journey -- http://localhost:3123     # desktop 1440 px + phone 390 px
```

`npm run journey` drives a real browser: parent login, Find search, Apply, Track, accept an offer (and its confirmation), Ask CareQ, centre waitlist update and review. It refuses to run against a MongoDB-backed server unless given `--allow-mongo`, because it changes demo data. First run on a new machine: `npx playwright install chromium`.

`design/*.png` (screenshots) are git-ignored; the Before / After section of the preview shows a note instead when they're absent.
