/**
 * End-to-end journey check in a real browser (Playwright, headless Chromium).
 *
 *   npm run journey                                  # http://localhost:$PORT (default 3000), desktop + phone
 *   npm run journey -- http://localhost:3123         # another server
 *   npm run journey -- --width=390                   # one viewport width only
 *   npm run journey -- --headed                      # watch it run
 *
 * It changes demo data (accepts Priya's Macaulay offer, sets Maya's waitlist position to #2).
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
  await step('parent demo login lands on Overview', async () => {
    await login(p, 'Test Parent: Priya Patel');
    await visible(p, 'Priya').waitFor({ timeout: 10000 });
  });
  await step('Find: a described search returns centres', async () => {
    await openTab(p, 'Find Centres');
    const input = p.locator('input[type="text"]:visible, input:not([type]):visible, input[type="search"]:visible').first();
    await input.fill('toddler full day near The Annex');
    const search = p.getByRole('button', { name: /^search$/i }).locator('visible=true').first();
    if (await search.count()) await search.click();
    else await input.press('Enter');
    await visible(p, /centres? match/).waitFor({ timeout: 25000 });
  });
  await step('Apply opens', async () => {
    await openTab(p, 'Apply');
  });
  await step('Track lists the applications with "Simulated" tags', async () => {
    await openTab(p, 'Track Status');
    await visible(p, 'Macaulay').waitFor({ timeout: 10000 });
    const n = await p.getByText('Simulated', { exact: true }).locator('visible=true').count();
    if (n < 5) throw new Error(`only ${n} "Simulated" tags visible`);
  });
  await step('accept the offer -> confirmation -> Accepted', async () => {
    await p.locator('button:visible', { hasText: /^\s*Accept( offer)?\s*$/ }).first().click();
    await p.locator('button:visible', { hasText: /Accept & Keep Others|Confirm & Accept Offer/ }).first().click({ timeout: 8000 });
    await visible(p, 'You’ve completed this step').waitFor({ timeout: 8000 });
    await visible(p, 'Accepted').waitFor({ timeout: 8000 });
  });
  await step('Ask CareQ opens', async () => {
    const close = p.getByRole('button', { name: 'Close' }).locator('visible=true');
    if (await close.count()) await close.first().click();
    await p.getByRole('button', { name: /Ask CareQ/ }).locator('visible=true').last().click();
    await p.getByRole('dialog', { name: 'Ask CareQ' }).waitFor({ timeout: 5000 });
  });
  await ctx.close();
}

async function centreJourney(b: Browser, width: number, errors: string[]) {
  const ctx = await b.newContext({ viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  collectErrors(p, 'centre', errors);

  await step('centre demo login shows the simulated-account banner', async () => {
    await login(p, 'CareQ Demo Centre (fictional)');
    await visible(p, 'Simulated demo account').waitFor({ timeout: 10000 });
  });
  await step('centre sets a waitlist position to #2', async () => {
    await openTab(p, 'Applications & queue');
    await p.locator('button:visible', { hasText: /^\s*Review/ }).nth(2).click(); // Maya: waitlisted #3 in the seed
    await p
      .locator('button:visible:not([disabled])', { hasText: /^\s*(Waitlist…|Waitlisted( \(#\d+\)| · #\d+))\s*$/ })
      .first()
      .click({ timeout: 8000 });
    await p.locator('#waitlist-pos-input').fill('2');
    await p.locator('button:visible', { hasText: 'Save waitlist position' }).click();
    await p.locator('#waitlist-pos-input').waitFor({ state: 'detached', timeout: 5000 });
    await visible(p, '#2').waitFor({ timeout: 8000 });
  });
  await step('Review opens an application', async () => {
    await openTab(p, 'Applications & queue');
    await p.locator('button:visible', { hasText: /^\s*Review/ }).first().click();
    await p.locator('[role="dialog"]:visible, .fixed:visible').first().waitFor({ timeout: 5000 });
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
