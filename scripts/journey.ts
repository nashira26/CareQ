/**
 * End-to-end journey check in a real browser (Playwright, headless Chromium).
 *
 *   npm run journey                                  # http://localhost:$PORT (default 3000), desktop + phone
 *   npm run journey -- http://localhost:3123         # another server
 *   npm run journey -- --width=390                   # one viewport width only
 *   npm run journey -- --headed                      # watch it run
 *
 * It changes demo data (edits Anya's notes and home area; as Jesse Ketchum, moves Anya to #3, changes her wait estimate, makes her an offer
 * and sets the centre's simulated hours; as Priya, accepts that offer and withdraws her other applications).
 * In local mode each run uses fresh browser storage, so nothing is shared. Against a MongoDB-backed
 * server it would change the shared demo, so it refuses unless you pass --allow-mongo (then run
 * `npm run reset` afterwards).
 *
 * First run on a new machine: npx playwright install chromium
 */
import 'dotenv/config';
import { chromium, type Browser, type Page } from 'playwright';

const args = process.argv.slice(2);
const flag = (name: string) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const widthArg = flag('width')?.split('=')[1];
const widths = widthArg ? [Number(widthArg)] : [1440, 390];

const fails: string[] = [];
const log = (ok: boolean, msg: string) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  if (!ok) fails.push(msg);
};
async function step(msg: string, fn: () => Promise<void>) {
  try {
    await fn();
    log(true, msg);
  } catch (e) {
    log(false, `${msg} :: ${(e as Error).message.split('\n')[0]}`);
  }
}
const visible = (p: Page, text: string | RegExp) => p.getByText(text).locator('visible=true').first();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function login(p: Page, account: string) {
  await p.goto(base);
  await p.getByRole('button', { name: /^log in$/i }).first().click();
  const card = p
    .locator('div')
    .filter({ hasText: account })
    .filter({ has: p.getByRole('button', { name: /^log in$/i }) })
    .last();
  await card.getByRole('button', { name: /^log in$/i }).click();
}

/** Desktop sidebar or phone tab bar: both expose the full tab name as the button's accessible name. */
async function openTab(p: Page, name: string) {
  await p
    .getByRole('button', { name: new RegExp(`^${escape(name)}`) })
    .locator('visible=true')
    .first()
    .click({ timeout: 8000 });
  await p.waitForTimeout(600);
}

function collectErrors(p: Page, who: string, errors: string[]) {
  // Vite's hot-reload socket is noise in dev; anything else is a real page error
  p.on('pageerror', (e) => {
    if (!/WebSocket/.test(e.message)) errors.push(`${who} page error: ${e.message}`);
  });
}

async function parentJourney(b: Browser, width: number, errors: string[]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  collectErrors(p, 'parent', errors);

  await step('landing page renders', async () => {
    await p.goto(base);
    await visible(p, 'Get started').waitFor({ timeout: 10000 });
  });
  await step('parent demo login lands on Home: action items and counts, no application list', async () => {
    await login(p, 'Test Parent: Priya Patel');
    await visible(p, 'What needs your attention today.').waitFor({ timeout: 10000 });
    await visible(p, 'Respond to your offer').waitFor({ timeout: 5000 });
    const actions = await p.locator('#needs-heading + ul > li').locator('visible=true').count();
    if (actions < 1 || actions > 3) throw new Error(`${actions} action items (want 1 to 3)`);
    // "Your applications": three boxes like the centre overview's (icon, count, label, arrow)
    const boxes = p.locator('#counts-heading + ul > li button').locator('visible=true');
    if ((await boxes.count()) !== 3) throw new Error(`${await boxes.count()} count boxes`);
    for (const label of [/^\d+\s*Drafts? being prepared$/, /^\d+\s*Applications? sent$/, /^\d+\s*Offers? to respond to$/]) {
      if (!(await boxes.filter({ hasText: label }).count())) throw new Error(`no box ${label}`);
    }
    // The offer box is marked (coral edge) and, with one offer, opens it in My applications
    const offerBox = boxes.filter({ hasText: /Offers? to respond to/ });
    if (!/border-l-coral/.test((await offerBox.getAttribute('class')) ?? '')) throw new Error('offer box not marked');
    await offerBox.click();
    await p.getByRole('heading', { name: 'My applications', exact: true }).waitFor({ timeout: 8000 });
    await openTab(p, 'Home');
  });
  await step('avatar menu opens with the keyboard; "Your profile" opens the Profile page', async () => {
    const avatar = p.getByRole('button', { name: /^Account menu for/ });
    await avatar.focus();
    await p.keyboard.press('ArrowDown');
    const item = p.getByRole('menuitem', { name: 'Your profile' });
    await item.waitFor({ timeout: 5000 });
    if (!(await item.evaluate((el) => el === document.activeElement))) throw new Error('first menu item not focused');
    await p.keyboard.press('Enter');
    await p.getByRole('heading', { name: 'Account and family' }).waitFor({ timeout: 8000 });
    await visible(p, "Demo account:").waitFor({ timeout: 5000 });
  });
  await step('profile: removing Anya explains why it is blocked', async () => {
    await p.getByRole('button', { name: 'Remove Anya' }).click();
    await visible(p, /can't be removed/).waitFor({ timeout: 5000 });
  });
  await step("profile: edit Anya's notes and home area", async () => {
    await p.getByRole('button', { name: 'Edit Anya' }).click();
    await p.locator('#edit-child-anya-notes').fill('Naps after lunch. Journey check.');
    await p.locator('#edit-child-anya-homeArea').fill('Leslieville');
    await p.getByRole('button', { name: 'Save changes' }).click();
    await visible(p, 'Saved. Find now starts from Leslieville.').waitFor({ timeout: 8000 });
    await visible(p, 'Naps after lunch. Journey check.').waitFor({ timeout: 5000 });
  });
  await step('Find starts from the new home area', async () => {
    await p.getByRole('button', { name: 'Go to Find' }).click();
    await visible(p, /Near Leslieville/).waitFor({ timeout: 10000 });
  });
  await step('Find: a described search returns centres', async () => {
    await openTab(p, 'Find centres');
    const input = p.locator('input[type="text"]:visible, input:not([type]):visible, input[type="search"]:visible').first();
    await input.fill('toddler full day near The Annex');
    const search = p.getByRole('button', { name: /^search$/i }).locator('visible=true').first();
    if (await search.count()) await search.click();
    else await input.press('Enter');
    await visible(p, /centres? match/).waitFor({ timeout: 25000 });
  });
  await step('Drafts lists only unsent applications (Priya has one)', async () => {
    await openTab(p, 'Drafts');
    await p.getByRole('heading', { name: 'Drafts', exact: true }).waitFor({ timeout: 8000 });
    await visible(p, /Mary Ward/).waitFor({ timeout: 8000 });
    if (await p.getByText(/Macaulay/).locator('visible=true').count()) throw new Error('a sent application is listed in Drafts');
  });
  await step('Updates: a dated feed that opens the application in My applications', async () => {
    await openTab(p, 'Updates');
    await p.getByRole('heading', { name: 'Updates', exact: true }).waitFor({ timeout: 8000 });
    await visible(p, 'Offer · Macaulay · Nov 4').waitFor({ timeout: 8000 });
    const items = await p.getByRole('button', { name: /Open in My applications/ }).locator('visible=true').count();
    if (items < 3) throw new Error(`only ${items} updates link to an application`);
    await p.getByRole('button', { name: /Open in My applications/ }).locator('visible=true').first().click();
    await p.getByRole('heading', { name: 'My applications', exact: true }).waitFor({ timeout: 8000 });
  });
  // Desktop sidebar: "Updates 3"; phone tab bar: aria-label "Updates (3)"
  const updatesBadge = async () => {
    const tab = p.getByRole('button', { name: /^Updates/ }).locator('visible=true').first();
    const name = (await tab.getAttribute('aria-label')) ?? (await tab.innerText());
    return Number(name.match(/(\d+)/)?.[1] ?? 0);
  };
  await step('Updates: Messages shows only centre messages; Reply opens that conversation and reads it', async () => {
    await openTab(p, 'Updates');
    const before = await updatesBadge();
    await p.getByRole('button', { name: 'Messages', exact: true }).locator('visible=true').first().click();
    const items = p.locator('li:visible');
    await items.first().waitFor({ timeout: 8000 });
    const labels = await items.locator('p.text-xs').allInnerTexts();
    if (!labels.length || labels.some((l) => !l.startsWith('Message ·'))) throw new Error(`non-message items: ${labels.join(' | ')}`);
    const unread = await p.getByLabel('Unread').locator('visible=true').count();
    if (unread < 1) throw new Error('no unread centre messages');
    if (before < unread) throw new Error(`badge ${before} < ${unread} unread messages`);
    const reply = p.getByRole('button', { name: /^Reply to / }).locator('visible=true').first();
    const centre = ((await reply.getAttribute('aria-label')) ?? '').replace(/^Reply to /, '');
    await reply.click();
    // The same conversation My applications opens: the centre's name, Anya, and the message box
    await p.getByRole('heading', { name: centre, exact: true }).locator('visible=true').waitFor({ timeout: 8000 });
    await visible(p, /Child: Anya/).waitFor({ timeout: 5000 });
    await p.locator('textarea:visible, input[type="text"]:visible').last().waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: 'Close conversation' }).click();
    await p.getByRole('heading', { name: 'Updates', exact: true }).waitFor({ timeout: 5000 });
    const after = await updatesBadge();
    if (after >= before) throw new Error(`badge did not drop after reading (${before} -> ${after})`);
  });
  await step('My applications: only sent applications; one demo banner; at most one "Simulated" tag per position and offer', async () => {
    await openTab(p, 'My applications');
    await visible(p, 'Macaulay').waitFor({ timeout: 10000 });
    if (await p.getByText(/Mary Ward/).locator('visible=true').count()) throw new Error('a draft is listed in My applications');
    const banners = await p.getByText('Demo account:', { exact: true }).locator('visible=true').count();
    if (banners !== 1) throw new Error(`${banners} demo banners visible (want 1)`);
    const n = await p.getByText('Simulated', { exact: true }).locator('visible=true').count();
    const queues = await p.locator('dd', { hasText: /^#\d+/ }).locator('visible=true').count();
    if (n > queues + 1) throw new Error(`${n} "Simulated" tags for ${queues} positions + 1 offer`);
  });
  await step('My applications: Jesse Ketchum lists the 3 documents sent; each opens as a sample preview', async () => {
    await p.getByRole('button', { name: /^Documents sent to Jesse Ketchum/ }).locator('visible=true').first().click();
    await visible(p, 'Application File: Anya').waitFor({ timeout: 5000 });
    const files = await p.getByText(/^File: /).locator('visible=true').count();
    if (files !== 3) throw new Error(`${files} files (want 3)`);
    await visible(p, 'Anya_Patel_Immunization_Record.pdf').waitFor({ timeout: 5000 });
    const opens = p.locator('button:visible', { hasText: 'Open & View Document' });
    for (let i = 0; i < files; i++) {
      await opens.nth(i).click();
      await visible(p, 'Sample document preview • fictional details').waitFor({ timeout: 5000 });
      await p.locator('button:visible', { hasText: /Back to/ }).first().click();
      await visible(p, 'Application File: Anya').waitFor({ timeout: 5000 });
    }
    await p.getByTitle('Close modal').click();
  });
  // The parent bell previews Updates: same unread items, same number on both badges
  const bell = () => p.getByRole('button', { name: /^Notifications \(\d+ unread\)$/ }).locator('visible=true').first();
  const bellCount = async () => Number(((await bell().getAttribute('aria-label')) ?? '').match(/\((\d+) unread\)/)?.[1] ?? -1);
  const bellPanel = () => p.getByRole('dialog', { name: 'Latest updates' });
  await step('bell: same count as the Updates badge; up to 5 unread items with label and headline', async () => {
    const [n, tab] = [await bellCount(), await updatesBadge()];
    if (n !== tab) throw new Error(`bell ${n} vs Updates badge ${tab}`);
    if (n < 1) throw new Error('no unread updates to preview');
    await bell().click();
    const items = bellPanel().getByRole('listitem');
    const k = await items.count();
    if (k !== Math.min(n, 5)) throw new Error(`${k} items for ${n} unread`);
    const first = await items.first().innerText();
    if (!/ · /.test(first)) throw new Error(`no readable label: ${first}`);
    for (const t of ['Mark all as read', 'See all updates']) await bellPanel().getByRole('button', { name: t }).waitFor({ timeout: 3000 });
    // Updates' filter tabs and Reply buttons (item buttons start with a label like "Waitlist · …")
    if (await bellPanel().getByRole('button', { name: /^(Reply to .*|All|Waitlist|Offers|Applications|Messages)$/ }).count()) throw new Error('filters or Reply in the bell');
  });
  await step('bell: opening an item reads it (both badges drop) and opens it', async () => {
    const before = await bellCount();
    const item = bellPanel().getByRole('listitem').first();
    const isMessage = /^Message ·/.test(await item.innerText());
    await item.getByRole('button').click();
    if (isMessage) {
      await visible(p, /Child: Anya/).waitFor({ timeout: 8000 });
      await p.getByRole('button', { name: 'Close conversation' }).click();
    } else {
      await p.getByRole('heading', { name: 'My applications', exact: true }).waitFor({ timeout: 8000 });
    }
    await p.waitForTimeout(500);
    const [n, tab] = [await bellCount(), await updatesBadge()];
    // A message opens its conversation, which reads every centre message in it: at least one fewer
    if (n >= before || tab !== n) throw new Error(`bell ${before} -> ${n}, Updates badge ${tab}`);
  });
  await step('bell: See all updates opens Updates; Mark all as read empties both badges; "You\'re up to date."', async () => {
    await bell().click();
    await bellPanel().getByRole('button', { name: 'See all updates' }).click();
    await p.getByRole('heading', { name: 'Updates', exact: true }).waitFor({ timeout: 8000 });
    await bell().click();
    await bellPanel().getByRole('button', { name: 'Mark all as read' }).click();
    await bellPanel().getByText("You're up to date.").waitFor({ timeout: 5000 });
    await bellPanel().getByRole('button', { name: 'See all updates' }).waitFor({ timeout: 3000 });
    const [n, tab] = [await bellCount(), await updatesBadge()];
    if (n !== 0 || tab !== 0) throw new Error(`after Mark all: bell ${n}, Updates badge ${tab}`);
    await p.keyboard.press('Escape');
    await bellPanel().waitFor({ state: 'detached', timeout: 3000 });
  });
  await step('Ask CareQ opens', async () => {
    const close = p.getByRole('button', { name: 'Close' }).locator('visible=true');
    if (await close.count()) await close.first().click();
    await p.getByRole('button', { name: /Ask CareQ/ }).locator('visible=true').last().click();
    await p.getByRole('dialog', { name: 'Ask CareQ' }).waitFor({ timeout: 5000 });
  });
  await ctx.close();
}

/** The application row (desktop) or card (phone) on the centre's Applications & queue page. */
const centreRow = (p: Page, child: string) =>
  p
    .locator('div:visible')
    .filter({ hasText: new RegExp(child) }) // case-sensitive; no \b: textContent runs "Anya" into "Priya"
    .filter({ has: p.locator('button:visible', { hasText: /^\s*(Review|Close)\s*$/ }) })
    .last();

/** The Jesse Ketchum demo login updates Anya's position and makes an offer; Priya sees both and accepts it. */
async function centreJourney(b: Browser, width: number, errors: string[]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  collectErrors(p, 'centre', errors);
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // the server's "Nov 10"

  await step('the login page has one centre demo login (Jesse Ketchum), and it is the default centre email', async () => {
    await p.goto(base);
    await p.getByRole('button', { name: /^log in$/i }).first().click();
    const cards = await p.getByText(/^Test Centre:/).locator('visible=true').count();
    if (cards !== 1) throw new Error(`${cards} centre demo logins (want 1)`);
    await visible(p, 'Test Centre: Jesse Ketchum').waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: /Centre Portal/ }).first().click();
    const email = await p.locator('input[type="email"]:visible').first().inputValue();
    if (email !== 'jesse-ketchum.demo@careq.example') throw new Error(`default centre email is ${email}`);
  });
  await step('centre demo login shows the demo-account banner, and no per-item "Simulated" tags', async () => {
    await login(p, 'Test Centre: Jesse Ketchum');
    await visible(p, 'Demo account:').waitFor({ timeout: 10000 });
    const n = await p.getByText('Simulated', { exact: true }).locator('visible=true').count();
    if (n) throw new Error(`${n} "Simulated" tags on the centre overview`);
  });
  await step("centre updates Anya's waitlist position from #4 to #3", async () => {
    await openTab(p, 'Applications & queue');
    await centreRow(p, 'Anya').locator('button:visible', { hasText: /^\s*Review/ }).click();
    await p
      .locator('button:visible:not([disabled])', { hasText: /^\s*(Waitlist…|Waitlisted( \(#\d+\)| · #\d+))\s*$/ })
      .first()
      .click({ timeout: 8000 });
    await p.locator('#waitlist-pos-input').fill('3');
    await p.locator('button:visible', { hasText: 'Save waitlist position' }).click();
    await p.locator('#waitlist-pos-input').waitFor({ state: 'detached', timeout: 5000 });
    await centreRow(p, 'Anya').getByText('#3').waitFor({ timeout: 8000 });
  });
  await step("centre changes only Anya's wait estimate (Edit estimate): position stays #3", async () => {
    await p.getByRole('button', { name: 'Edit wait estimate for Anya' }).locator('visible=true').first().click({ timeout: 5000 });
    const dialog = p.getByRole('dialog', { name: 'Edit wait estimate' });
    await dialog.waitFor({ timeout: 5000 });
    if ((await p.locator('#estimate-only-input').inputValue()) !== '4–6 months') throw new Error('estimate not prefilled');
    await dialog.getByRole('button', { name: '3–6 months', exact: true }).click();
    await dialog.getByRole('button', { name: 'Save estimate' }).click();
    await dialog.waitFor({ state: 'detached', timeout: 5000 });
    await centreRow(p, 'Anya').getByText('Your estimate: 3–6 months').waitFor({ timeout: 8000 });
    await centreRow(p, 'Anya').getByText('#3').waitFor({ timeout: 5000 });
  });
  await step('centre makes Anya an offer', async () => {
    await p.locator('button:visible:not([disabled])', { hasText: /^\s*(Make offer|Offer)\s*$/ }).first().click({ timeout: 8000 });
    await visible(p, /Updated Anya's application to "Offer"/).waitFor({ timeout: 8000 });
  });
  /** Opens a child's application file (one review panel is open at a time); returns its uploaded files. */
  const openFile = async (child: string) => {
    const row = centreRow(p, child);
    if (!(await row.getByRole('button', { name: /Close/ }).count())) await row.locator('button:visible', { hasText: /^\s*Review/ }).click();
    await p.locator('button:visible', { hasText: /^\s*(View application & docs|Docs)\s*$/ }).first().click({ timeout: 5000 });
    await visible(p, `Application File: ${child}`).waitFor({ timeout: 5000 });
    return p.getByText(/^File: /).locator('visible=true').count(); // not "Submitted": that's also a status badge
  };
  await step('review: Ama has every document uploaded; Mila shows the one that is missing', async () => {
    const ama = await openFile('Ama');
    await visible(p, 'All Requirements Provided').waitFor({ timeout: 5000 });
    await p.getByTitle('Close modal').click();
    if (ama !== 4) throw new Error(`Ama: ${ama} files (want 4)`);
    const mila = await openFile('Mila');
    await visible(p, '1 Missing').waitFor({ timeout: 5000 });
    await p.getByText('Not Submitted', { exact: true }).locator('visible=true').first().waitFor({ timeout: 5000 });
    await p.getByTitle('Close modal').click();
    if (mila !== 3) throw new Error(`Mila: ${mila} files (want 3)`);
  });
  await step("review: Anya's file shows her 3 documents; custody (not applicable) is the only one not sent", async () => {
    const anya = await openFile('Anya');
    await visible(p, 'Anya_Patel_Child_Admission_Package.pdf').waitFor({ timeout: 5000 });
    await visible(p, '1 Missing').waitFor({ timeout: 5000 });
    await p.getByTitle('Close modal').click();
    if (anya !== 3) throw new Error(`Anya: ${anya} files (want 3)`);
  });
  await step('centre profile: details read-only, simulated hours saved', async () => {
    await p.getByRole('button', { name: /^Account menu for/ }).click();
    await p.getByRole('menuitem', { name: 'Your profile' }).click();
    await p.getByRole('heading', { name: 'Account and centre' }).waitFor({ timeout: 8000 });
    await visible(p, "can't be edited here").waitFor({ timeout: 5000 });
    await p.locator('#sim-hours').fill('8:00 AM – 5:30 PM');
    await p.getByRole('button', { name: /^Save$/ }).click();
    await visible(p, /Families using demo accounts see these/).waitFor({ timeout: 8000 });
  });
  await step('Priya: the position update and offer are in Updates, with the date', async () => {
    await p.getByRole('button', { name: /^Account menu for/ }).click();
    await p.getByRole('menuitem', { name: 'Log out' }).click();
    await login(p, 'Test Parent: Priya Patel');
    await visible(p, 'What needs your attention today.').waitFor({ timeout: 10000 });
    await openTab(p, 'Updates');
    await visible(p, new RegExp(`^Offer · Jesse Ketchum.* · ${today}$`)).waitFor({ timeout: 8000 });
    await visible(p, new RegExp(`^Waitlist · Jesse Ketchum.* · ${today}$`)).waitFor({ timeout: 8000 });
  });
  await step('Priya: the estimate change is under the Waitlist filter as "Wait estimate updated"', async () => {
    await p.getByRole('button', { name: 'Waitlist', exact: true }).locator('visible=true').first().click();
    await visible(p, 'Wait estimate updated').waitFor({ timeout: 8000 });
    await visible(p, /updated its wait estimate for Anya to 3–6 months/).waitFor({ timeout: 5000 });
    await p.getByRole('button', { name: 'All', exact: true }).locator('visible=true').first().click();
  });
  // By its heading: after accepting, other cards also mention Jesse Ketchum ("Withdrawn when you accepted …")
  const jkCard = () => p.locator('li:visible').filter({ has: p.getByRole('heading', { name: /^Jesse Ketchum/ }) }).first();
  await step('Priya: My applications shows the Jesse Ketchum offer, #3 and the date it was reported', async () => {
    await openTab(p, 'My applications');
    await jkCard().locator('button', { hasText: /^\s*Accept offer\s*$/ }).waitFor({ timeout: 8000 });
    await jkCard().getByText('#3').waitFor({ timeout: 5000 });
    await jkCard().getByText("Centre's estimate: 3–6 months, not a guarantee").waitFor({ timeout: 5000 });
    await jkCard().getByText(new RegExp(today)).first().waitFor({ timeout: 5000 });
  });
  const acceptDialog = () => p.getByRole('dialog', { name: /^Accept the offer from Jesse Ketchum/ });
  let others = 0;
  await step('offer: the dialog lists Anya\'s other applications (drafts too); Cancel changes nothing', async () => {
    await jkCard().getByRole('button', { name: 'Have a question about this offer? Message the centre' }).waitFor({ timeout: 5000 });
    await jkCard().locator('button', { hasText: /^\s*Accept offer\s*$/ }).click();
    await acceptDialog().getByText(/Accepting will also withdraw your other applications for Anya, so those places can go to other families\. This can't be undone\./).waitFor({ timeout: 5000 });
    others = await acceptDialog().getByRole('list', { name: 'Your other applications for Anya' }).getByRole('listitem').count();
    if (others < 2) throw new Error(`${others} other applications listed`);
    for (const t of ['Macaulay', 'Mary Ward']) await acceptDialog().getByText(new RegExp(t)).first().waitFor({ timeout: 3000 });
    await acceptDialog().getByRole('button', { name: 'Cancel' }).click();
    await acceptDialog().waitFor({ state: 'detached', timeout: 3000 });
    await jkCard().locator('button', { hasText: /^\s*Accept offer\s*$/ }).waitFor({ timeout: 3000 });
    await openTab(p, 'Home');
    await visible(p, 'Respond to your offer').waitFor({ timeout: 5000 });
    await openTab(p, 'My applications');
  });
  await step('offer: Decline asks first ("The centre can then offer this place to another family."); Cancel keeps it', async () => {
    await jkCard().getByRole('button', { name: 'Decline offer' }).click();
    const d = p.getByRole('dialog', { name: /^Decline the offer from Jesse Ketchum/ });
    await d.getByText('The centre can then offer this place to another family.').waitFor({ timeout: 5000 });
    await d.getByRole('button', { name: 'Cancel' }).click();
    await d.waitFor({ state: 'detached', timeout: 3000 });
    await jkCard().locator('button', { hasText: /^\s*Accept offer\s*$/ }).waitFor({ timeout: 3000 });
  });
  await step('Priya accepts the Jesse Ketchum offer: the others are withdrawn (Macaulay too), the draft deleted', async () => {
    await jkCard().locator('button', { hasText: /^\s*Accept offer\s*$/ }).click();
    await acceptDialog().getByRole('button', { name: 'Accept and withdraw others' }).click();
    const must = async (what: string, l: { waitFor: (o: { timeout: number }) => Promise<void> }) =>
      l.waitFor({ timeout: 8000 }).catch(() => { throw new Error(`not shown: ${what}`); });
    const msg = `Offer accepted. You withdrew ${others} applications, and those places can now go to other families.`;
    await must(msg, visible(p, msg));
    const close = p.getByRole('button', { name: 'Close' }).locator('visible=true');
    if (await close.count()) await close.first().click();
    await must('Confirmed on the Jesse Ketchum card', jkCard().getByText('Confirmed'));
    const label = `Withdrawn when you accepted Jesse Ketchum Early Learning & Child Care Centre · ${today}`;
    const macaulay = p.locator('li:visible').filter({ has: p.getByRole('heading', { name: /^Macaulay/ }) }).first();
    await must(`"${label}" on the Macaulay card`, macaulay.getByText(label));
    const open = await p.locator('li:visible').filter({ has: p.getByRole('button', { name: /^Withdraw$/ }) }).count();
    if (open) throw new Error(`${open} applications still open`);
    await openTab(p, 'Drafts');
    await p.getByRole('heading', { name: 'Drafts', exact: true }).waitFor({ timeout: 8000 });
    if (await p.getByText(/Mary Ward/).locator('visible=true').count()) throw new Error('the draft was not deleted');
  });
  await step('centre side: Macaulay sees "Withdrawn by the family · date", never which centre was chosen', async () => {
    await p.getByRole('button', { name: /^Account menu for/ }).click();
    await p.getByRole('menuitem', { name: 'Log out' }).click();
    await p.goto(base);
    await p.getByRole('button', { name: /^log in$/i }).first().click();
    await p.getByRole('button', { name: /Centre Portal/ }).first().click();
    await p.locator('input[type="email"]:visible').first().fill('macaulay-dovercourt.demo@careq.example');
    await p.locator('input[type="password"]:visible').first().fill('password');
    await p.locator('form button[type="submit"]:visible').first().click();
    await visible(p, 'Demo account:').waitFor({ timeout: 10000 });
    await openTab(p, 'Applications & queue');
    const row = centreRow(p, 'Anya');
    await row.getByText(`Withdrawn by the family · ${today}`).first().waitFor({ timeout: 8000 });
    if (await row.getByText(/Jesse Ketchum/).count()) throw new Error("the other centre's name is shown");
  });
  await ctx.close();
}

async function main() {
  let mode: string | undefined;
  try {
    mode = ((await (await fetch(`${base}/api/mode`)).json()) as { dataMode?: string }).dataMode;
  } catch {
    console.error(`Can't reach ${base}. Start the app first (npm run dev).`);
    process.exit(2);
  }
  if (mode === 'mongo' && !flag('allow-mongo')) {
    console.error(
      `${base} uses MongoDB (shared demo data). This check accepts an offer and changes a waitlist position.\n` +
        'Run it against a local-mode server (DATA_MODE=local npm run dev), or pass --allow-mongo and run npm run reset afterwards.'
    );
    process.exit(2);
  }

  const b = await chromium.launch({ headless: !flag('headed') });
  const errors: string[] = [];
  for (const width of widths) {
    console.log(`\n== ${base} · ${width}px · data mode: ${mode ?? 'unknown'}`);
    await parentJourney(b, width, errors);
    await centreJourney(b, width, errors);
  }
  await b.close();
  for (const e of errors) log(false, e);
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASSED');
  process.exit(fails.length ? 1 : 0);
}

main();
