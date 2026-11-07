/**
 * Live check of Ask CareQ against a running server (real Gemini + the MongoDB policy index).
 *
 *   npm run eval:ask                          # http://localhost:$PORT (default 3000)
 *   npm run eval:ask -- http://localhost:3100
 *
 * Asks the demo questions anonymously and as Priya (priya@example.ca / password) and prints a
 * results table: question, expected, got, sources, mode, pass. Exits 1 if any check fails.
 */
import 'dotenv/config';

const BASE = (process.argv[2] || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const NO_INFO = "I don't have that information; please contact the centre or use Help.";
const PROVINCIAL_LABEL = 'General Ontario rule; check with the centre.';
const JK = 'on-00576'; // Jesse Ketchum Early Learning & Child Care Centre
const TELCCS = 'Toronto Early Learning & Child Care Services (City of Toronto)';

type Citation = { kind: string; operatorName: string; docTitle: string; page: string; quote: string; label?: string; simulated?: boolean; scope?: string };
type Answer = { answer: string; citations: Citation[]; toolsUsed: string[]; retrievalMode: string; aiMode: string; modelUsed: string | null };

interface Case {
  group: string;
  question: string;
  as: 'anonymous' | 'priya';
  centreId?: string;
  expected: string;
  check: (a: Answer) => boolean;
}

const answered = (a: Answer) => a.answer !== NO_INFO && a.citations.length > 0;
const onlyOperator = (name: string) => (a: Answer) => a.citations.filter((c) => c.kind === 'document' && c.scope === 'operator').every((c) => c.operatorName === name);
const refused = (a: Answer) => a.answer === NO_INFO && a.citations.length === 0;

const CASES: Case[] = [
  { group: 'Answerable', question: 'What documents do I need to register?', as: 'anonymous', centreId: JK, expected: 'Cited answer (JK handbook)', check: (a) => answered(a) && onlyOperator(TELCCS)(a) },
  { group: 'Answerable', question: 'How much notice do I need to give to withdraw?', as: 'anonymous', centreId: JK, expected: 'Two weeks written notice, cited', check: (a) => answered(a) && onlyOperator(TELCCS)(a) && /two (\(2\) )?weeks/i.test(a.answer) },
  { group: 'Answerable', question: 'How do I pay fees?', as: 'anonymous', centreId: JK, expected: 'Fee payment methods, cited', check: (a) => answered(a) && onlyOperator(TELCCS)(a) },
  { group: 'Answerable', question: 'What immunization records are needed?', as: 'anonymous', centreId: JK, expected: 'Immunization rule, cited', check: (a) => answered(a) && onlyOperator(TELCCS)(a) },
  { group: 'Answerable', question: 'How does the waitlist work?', as: 'anonymous', centreId: JK, expected: 'Waitlist policy, cited (no position)', check: (a) => answered(a) && onlyOperator(TELCCS)(a) && !/#\d/.test(a.answer) },
  { group: 'Unanswerable', question: 'When will I get a spot?', as: 'anonymous', centreId: JK, expected: 'Refusal', check: refused },
  { group: 'Unanswerable', question: 'Is there a space next week?', as: 'anonymous', centreId: JK, expected: 'Refusal', check: refused },
  { group: 'Unanswerable', question: 'Do you offer swimming lessons?', as: 'anonymous', centreId: JK, expected: 'Refusal (not in handbook)', check: refused },
  { group: 'Unanswerable', question: 'Is there a space next week?', as: 'priya', centreId: JK, expected: 'Refusal (even signed in)', check: refused },
  {
    group: 'Position',
    question: 'Where am I on the list?',
    as: 'priya',
    centreId: JK,
    expected: 'Her simulated application: #4, reported by JK, Nov 2',
    check: (a) => a.toolsUsed.includes('get_my_application') && a.citations.some((c) => c.kind === 'application' && c.simulated) && /Position #4/.test(a.answer) && /Simulated/.test(a.answer) && /Nov 2/.test(a.answer),
  },
  { group: 'Position', question: 'Where am I on the list?', as: 'anonymous', centreId: JK, expected: 'Refusal', check: refused },
  {
    group: 'Position',
    question: 'When will I get a spot?',
    as: 'priya',
    centreId: JK,
    expected: "Only the centre's reported estimate, Simulated",
    check: (a) => a.citations.some((c) => c.kind === 'application') && /not a guarantee · Simulated/.test(a.answer),
  },
  {
    group: 'Provincial',
    question: 'What are the staff-to-child ratios for toddlers?',
    as: 'anonymous',
    expected: 'Manual passage + "General Ontario rule"',
    check: (a) => answered(a) && a.citations.some((c) => c.scope === 'provincial') && a.answer.includes(PROVINCIAL_LABEL),
  },
  {
    group: 'Provincial',
    question: "What must a centre's waiting list policy include?",
    as: 'anonymous',
    expected: 'Manual passage + "General Ontario rule"',
    check: (a) => answered(a) && a.citations.some((c) => c.scope === 'provincial') && a.answer.includes(PROVINCIAL_LABEL),
  },
  {
    group: 'Scope',
    question: "What is Macaulay's withdrawal notice policy?",
    as: 'anonymous',
    centreId: JK,
    expected: 'No Macaulay chunks (JK or refusal)',
    check: (a) => a.citations.every((c) => !/Macaulay/i.test(c.operatorName)),
  },
];

async function login(): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya@example.ca', password: 'password', role: 'parent' }),
  });
  if (!res.ok) throw new Error(`Priya login failed: ${res.status} ${await res.text()}`);
  return (res.headers.get('set-cookie') || '').split(';')[0];
}

async function ask(c: Case, cookie: string): Promise<Answer> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/api/ask-careq`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(c.as === 'priya' ? { Cookie: cookie } : {}) },
      body: JSON.stringify({ question: c.question, ...(c.centreId ? { centreId: c.centreId } : {}) }),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') || 10);
      console.log(`  (rate limited; waiting ${wait}s)`);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return (await res.json()) as Answer;
  }
  throw new Error('rate limited 3 times');
}

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const shortSource = (c: Citation) =>
  c.kind === 'application'
    ? `your application${c.simulated ? ' · Simulated' : ''}`
    : `${c.operatorName.replace(/ \(.*\)$/, '').replace('Toronto Early Learning & Child Care Services', 'TELCCS').replace('Government of Ontario', 'Ontario manual')}, ${c.page}`;

async function main() {
  const cookie = await login();
  const rows: string[] = [];
  let failed = 0;
  for (const c of CASES) {
    process.stdout.write(`… ${c.question} (${c.as})\n`);
    const started = Date.now();
    const a = await ask(c, cookie);
    const ok = c.check(a);
    if (!ok) failed++;
    const sources = [...new Set(a.citations.map(shortSource))].join('; ') || '-';
    const mode = `${a.aiMode}${a.modelUsed ? ` (${a.modelUsed})` : ''} · ${a.retrievalMode} · tools: ${a.toolsUsed.join(', ') || '-'} · ${((Date.now() - started) / 1000).toFixed(1)}s`;
    rows.push(`| ${c.group} | ${cell(c.question)} | ${c.as} | ${cell(c.expected)} | ${cell(a.answer.slice(0, 220))}${a.answer.length > 220 ? '…' : ''} | ${cell(sources)} | ${cell(mode)} | ${ok ? '✅' : '❌'} |`);
  }
  console.log('\n| Group | Question | As | Expected | Got | Sources | Mode | Pass |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of rows) console.log(r);
  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
