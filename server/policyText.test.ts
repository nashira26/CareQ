import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHUNK_MAX, chunkPages, cleanPages, htmlToText, isHeading, selectSections, splitSentences, tooLittleText } from './policyText';

const sentence = (i: number) => `Sentence number ${i} explains one rule about enrolment and the documents families provide to the centre.`;

test('cleanPages removes print stamps, URL footers, page numbers, TOC lines and repeated headers', () => {
  const pages = Array.from({ length: 6 }, (_, i) => ({
    page: i + 1,
    text: [
      '11/6/26, 6:16 PM Child Care Centre Licensing Manual | ontario.ca',
      'Family Handbook 2025',
      `Real content on page ${i + 1}. It stays.`,
      'Admission Procedures ........................ 13',
      `${i + 1} | P a g e`,
      `https://www.ontario.ca/document/child-care-centre-licensing-manual# ${i + 1}/283`,
      String(i + 1),
    ].join('\n'),
  }));
  const cleaned = cleanPages(pages);
  for (const p of cleaned) {
    assert.equal(p.text, `Real content on page ${p.page}. It stays.`);
  }
});

test('cleanPages removes tables of contents with ellipsis leaders, including entries run together', () => {
  const [p] = cleanPages([
    {
      page: 2,
      text: ['Program Statement ………………………………………… 13', 'Days ……………… 13 Holiday Fees ……………… 13 Statutory Holidays ……', 'Real sentence stays. Ends with a period.'].join('\n'),
    },
  ]);
  assert.equal(p.text, 'Real sentence stays. Ends with a period.');
});

test('cleanPages joins words hyphenated across lines and keeps short documents intact', () => {
  const [p] = cleanPages([{ page: 1, text: 'Proof of immuniz-\nation is required.' }]);
  assert.equal(p.text, 'Proof of immunization is required.');
});

test('headings: caps, numbered and standalone title case; not sentences, bullets or addresses', () => {
  assert.ok(isHeading('ADMISSION PROCEDURES', 'previous sentence.', 'Once your child is admitted.'));
  assert.ok(isHeading('Part 5.3 Immunization of Children', '', 'Intent'));
  assert.ok(isHeading('8. Admission Policy', '', 'To apply for Daycare a form must be filled out.'));
  assert.ok(isHeading('Emergency Contact', 'This ends a sentence.', 'At admission, staff will ask.'));
  assert.ok(!isHeading('Parents must provide the centre with a form.', '', ''));
  assert.ok(!isHeading('• Copy of Immunization Record', '', ''));
  assert.ok(!isHeading('35 Saskatoon Dr. Etobicoke, ON, M9P 2E8', '', 'Telephone: 416'));
  // Title Case line in the middle of a wrapped sentence is not a heading
  assert.ok(!isHeading('Toronto Public Health', 'Please call', 'for more information.'));
});

test('splitSentences keeps abbreviations and section numbers together', () => {
  assert.deepEqual(splitSentences('See section 5.3 for details. Bring e.g. a health card. Done!'), [
    'See section 5.3 for details.',
    'Bring e.g. a health card.',
    'Done!',
  ]);
});

test('chunks: 800–1,200 characters, heading and start page kept, one-sentence overlap', () => {
  const page1 = ['ADMISSION PROCEDURES', ...Array.from({ length: 8 }, (_, i) => sentence(i))].join('\n');
  const page2 = Array.from({ length: 8 }, (_, i) => sentence(i + 8)).join('\n');
  const chunks = chunkPages(
    [
      { page: 13, text: page1 },
      { page: 14, text: page2 },
    ],
    'Parent Handbook'
  );
  assert.ok(chunks.length >= 2);
  for (const c of chunks) {
    assert.equal(c.heading, 'ADMISSION PROCEDURES');
    assert.ok(c.text.length <= CHUNK_MAX, `chunk ${c.index} is ${c.text.length} chars`);
  }
  for (const c of chunks.slice(0, -1)) assert.ok(c.text.length >= 800, `chunk ${c.index} is only ${c.text.length} chars`);
  assert.equal(chunks[0].page, 13);
  assert.ok(chunks.some((c) => c.page === 14), 'a later chunk starts on page 14');
  // Overlap: the last sentence of chunk 0 starts chunk 1
  const lastOf0 = splitSentences(chunks[0].text).at(-1)!;
  assert.ok(chunks[1].text.startsWith(lastOf0));
  // Every sentence appears somewhere (nothing lost)
  for (let i = 0; i < 16; i++) assert.ok(chunks.some((c) => c.text.includes(`Sentence number ${i} `)), `sentence ${i}`);
});

test('chunks: a new heading starts a new chunk; a long sentence is split, never over the maximum', () => {
  const long = 'word '.repeat(400).trim() + '.';
  const fees = 'Fees are due on the first day of every month by pre-authorized debit.';
  const chunks = chunkPages([{ page: 1, text: `FEES\n${fees}\n\nWITHDRAWAL\nGive one month notice.\n${long}` }], 'Doc');
  assert.equal(chunks[0].heading, 'FEES');
  assert.equal(chunks[0].text, fees);
  assert.ok(chunks.slice(1).every((c) => c.heading === 'WITHDRAWAL' && c.text.length <= CHUNK_MAX));
});

test('tooLittleText flags (nearly) empty extractions such as scanned PDFs', () => {
  assert.equal(tooLittleText([{ page: 1, text: ' ' }, { page: 2, text: 'x' }]).skip, true);
  assert.equal(tooLittleText([{ page: 1, text: 'a'.repeat(2000) }]).skip, false);
});

test('htmlToText keeps the handbook body and headings; drops nav, scripts, footer, link lists', () => {
  const html = `<html><head><script>var x = 1;</script><style>p{}</style></head><body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <div class="main-menu"><h3>Main Menu</h3><p>Programs</p></div>
    <div id="content">
      <h2>Table of Contents</h2>
      <ul><li><a href="#a">8. Admission Policy</a></li><li><a href="#b">9. Waiting list Policy</a></li></ul>
      <h2 id="a">8. Admission Policy</h2>
      <p>To apply for Daycare a waiting list application form must be filled out.</p>
      <p>All relevant forms are required to be filled out before your child's start date. <a href="#top">↑ Back to top</a></p>
      <h2 id="b">9. Waiting list Policy</h2>
      <p>There are three ways to get on our waiting list.</p>
      <ul><li>Fill out a waiting list application form at any of our 3 locations</li><li>Call the office</li></ul>
    </div>
    <footer><p>Copyright Leaside</p></footer>
  </body></html>`;
  const text = htmlToText(html);
  assert.ok(!/var x|Main Menu|Copyright|Home|Back to top/.test(text), text);
  const chunks = chunkPages(cleanPages([{ page: null, text }]), 'Parent Handbook');
  const admission = chunks.find((c) => c.heading === '8. Admission Policy');
  assert.ok(admission?.text.includes('To apply for Daycare a waiting list application form must be filled out.'));
  assert.equal(admission?.page, null);
  assert.ok(chunks.some((c) => c.heading === '9. Waiting list Policy' && c.text.includes('Call the office')));
});

test('selectSections keeps whole top-level parts (with their sub-sections) and prefixes the part to the heading', () => {
  const mk = (heading: string, i: number) => ({ index: i, heading, page: i + 1, text: `text ${i}` });
  const chunks = ['Glossary of Terms', 'Part 2 — Canada-Wide', 'Intent', 'Part 2.3 Base Fees', 'Part 3.2 Ratios', 'Part 20 Imaginary', 'Part 5.3 Immunization of Children', 'Clarifying guidance', 'Part 5.4 Daily Observation', 'Intent'].map(mk);
  const { chunks: kept, kept: sections } = selectSections(chunks, ['Part 2', 'Part 5.3']);
  assert.deepEqual(
    kept.map((c) => c.heading),
    ['Part 2 — Canada-Wide', 'Part 2 — Canada-Wide › Intent', 'Part 2.3 Base Fees', 'Part 5.3 Immunization of Children', 'Part 5.3 Immunization of Children › Clarifying guidance']
  );
  assert.deepEqual(kept.map((c) => c.index), [0, 1, 2, 3, 4]);
  assert.equal(kept[4].page, 8);
  assert.deepEqual(sections.map((s) => s.section), ['Part 2 — Canada-Wide', 'Part 2.3 Base Fees', 'Part 5.3 Immunization of Children']);
});
