/**
 * Turning published handbooks into retrieval chunks: clean extracted page text, find section
 * headings, and pack sentences into ~800–1,200-character passages (with a one-sentence overlap).
 * Pure functions (no I/O) so they can be unit-tested; scripts/build-index.ts does the I/O.
 */
import { parse, HTMLElement } from 'node-html-parser';

/** Text of one PDF page (page = PDF page number) or of a whole HTML document (page = null). */
export interface PageText {
  page: number | null;
  text: string;
}

export interface TextChunk {
  /** Position of the chunk in its document, from 0. */
  index: number;
  heading: string;
  /** PDF page the chunk starts on; null for HTML documents. */
  page: number | null;
  text: string;
}

export const CHUNK_MIN = 800;
export const CHUNK_MAX = 1200;
/** A file with less extractable text than this is reported, not indexed. */
export const MIN_TOTAL_CHARS = 1500;
export const MIN_AVG_CHARS_PER_PAGE = 200;

/** Lines marked like this are known headings (HTML <h1>–<h6>). */
const HEADING_MARK = '\u0000H ';

// ---------------- Cleaning ----------------

const PRINT_STAMP = /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}\s*(AM|PM)\b.*$/i; // "11/6/26, 6:16 PM Child Care … | ontario.ca"
const URL_PAGE_FOOTER = /^https?:\/\/\S+\s+\d+\s*\/\s*\d+$/i; // "https://www.ontario.ca/document/… 242/283"
const PAGE_NUMBER_LINES = [
  /^\d{1,3}$/, // "14"
  /^\d{1,3}\s*\|\s*P\s*a\s*g\s*e$/i, // "14 | P a g e"
  /^page\s+\d{1,3}(\s+of\s+\d{1,3})?$/i, // "Page 3 of 40"
  /^-\s*\d{1,3}\s*-$/, // "- 3 -"
  /^\d{1,3}\s*\/\s*\d{1,3}$/, // "242/283"
];
const TOC_LINE = /(\.\s?){4,}\s*\d{1,3}\s*$/; // "Admission Procedures ........ 13"
const TOC_TITLE = /^table\s+of\s+contents$/i;

const normaliseForRepeat = (line: string) => line.toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();

/** Bullet glyphs from PDF fonts (private-use area, replacement chars) become "•". */
const fixGlyphs = (s: string) =>
  s
    .replace(/[-�▪●•◦‣⁃]/g, '•')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ');

/**
 * Removes running headers/footers (lines repeated on ≥30% of pages), page numbers, browser print
 * stamps, table-of-contents lines; joins words hyphenated across lines.
 */
export function cleanPages(pages: PageText[]): PageText[] {
  const split = pages.map((p) => ({ page: p.page, lines: fixGlyphs(p.text).split(/\r?\n/).map((l) => l.trim()) }));

  // Lines repeated on many pages (running headers/footers), only for multi-page documents
  const repeated = new Set<string>();
  if (split.length >= 4) {
    const counts = new Map<string, number>();
    for (const p of split) {
      // Only short lines without a sentence ending can be running headers/footers
      for (const key of new Set(p.lines.filter((l) => l && l.length <= 80 && !/[.!?]$/.test(l)).map(normaliseForRepeat))) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const threshold = Math.max(3, Math.ceil(split.length * 0.3));
    for (const [key, n] of counts) if (n >= threshold && key.length > 1) repeated.add(key);
  }

  return split.map(({ page, lines }) => {
    const kept: string[] = [];
    for (const line of lines) {
      if (!line) {
        kept.push('');
        continue;
      }
      if (line.startsWith(HEADING_MARK)) {
        kept.push(line);
        continue;
      }
      if (PRINT_STAMP.test(line) || URL_PAGE_FOOTER.test(line)) continue;
      if (PAGE_NUMBER_LINES.some((re) => re.test(line))) continue;
      if (TOC_LINE.test(line) || TOC_TITLE.test(line)) continue;
      if (repeated.has(normaliseForRepeat(line))) continue;
      // "immuniz-" + "ation" -> "immunization" (lowercase continuation only)
      const prev = kept.length ? kept[kept.length - 1] : '';
      if (prev && /[a-z]-$/.test(prev) && /^[a-z]/.test(line)) {
        kept[kept.length - 1] = prev.slice(0, -1) + line;
        continue;
      }
      kept.push(line);
    }
    return { page, text: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim() };
  });
}

/** True when a document has too little extractable text to index (e.g. a scanned PDF). */
export function tooLittleText(pages: PageText[]): { skip: boolean; totalChars: number; avgPerPage: number } {
  const totalChars = pages.reduce((n, p) => n + p.text.replace(/\s+/g, ' ').trim().length, 0);
  const avgPerPage = pages.length ? Math.round(totalChars / pages.length) : 0;
  return { skip: totalChars < MIN_TOTAL_CHARS || avgPerPage < MIN_AVG_CHARS_PER_PAGE, totalChars, avgPerPage };
}

// ---------------- Headings ----------------

const BULLET = /^(•|-|–|—|\*|o\s|\(?[a-z]\)\s|\(?[ivx]+\)\s)/i;

/**
 * A heading: a short line (≤ 80 chars, ≤ 12 words) with no sentence ending, that is ALL CAPS,
 * numbered ("Part 5.3 Immunization of Children", "8. Admission Policy"), or a standalone Title Case
 * line (the previous line ended a sentence or was blank, and the next line starts with a capital).
 */
export function isHeading(line: string, prev: string, next: string): boolean {
  const s = line.trim();
  if (s.length < 3 || s.length > 80) return false;
  if (/[.,;:!?]$/.test(s) || BULLET.test(s)) return false;
  const words = s.split(/\s+/);
  if (words.length > 12) return false;
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  // "Part 5.3 Immunization of Children", "8. Admission Policy" (not "35 Saskatoon Dr.")
  if (/^(Part\s+\d{1,2}(\.\d{1,2})*\s+|\d{1,2}(\.\d{1,2})*\.\s*)[A-Z]/.test(s)) return true;
  // Addresses and other lines starting with a number, postal codes, phone numbers
  if (/^\d/.test(s) || /[A-Z]\d[A-Z]\s?\d[A-Z]\d/.test(s) || /\d{3}[-.\s]\d{3}[-.\s]\d{4}/.test(s)) return false;
  if (letters === letters.toUpperCase() && letters.length >= 4) return true;
  const longWords = words.filter((w) => /^[A-Za-z’']{4,}/.test(w));
  const titleCase = longWords.length > 0 && longWords.filter((w) => /^[A-Z]/.test(w)).length / longWords.length >= 0.8;
  const standalone = (!prev || /[.!?:)]$/.test(prev.trim())) && (!next || /^[A-Z0-9•"“(]/.test(next.trim()));
  return titleCase && standalone && words.length <= 9;
}

// ---------------- Sentences ----------------

interface Unit {
  text: string;
  page: number | null;
}

/** Split a paragraph into sentences without breaking "e.g.", "i.e.", "St.", "Dr." or numbers like "5.3". */
export function splitSentences(paragraph: string): string[] {
  const protectedText = paragraph
    .replace(/\b(e\.g|i\.e|etc|St|Dr|Mr|Mrs|Ms|No|vs|Ave|Blvd|Rd|approx)\./gi, (m) => m.replace(/\./g, '\u0001'))
    .replace(/(\d)\.(\d)/g, '$1\u0001$2');
  return protectedText
    .split(/(?<=[.!?]["”’)]?)\s+(?=["“(]?[A-Z0-9•])/)
    .map((s) => s.replace(/\u0001/g, '.').trim())
    .filter(Boolean);
}

// ---------------- Chunking ----------------

interface Section {
  heading: string;
  units: Unit[];
}

/** Group cleaned pages into sections (by heading) of sentence/bullet units, each with its page. */
export function toSections(pages: PageText[], documentTitle: string): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: documentTitle, units: [] };
  const flushPara = (para: string[], page: number | null) => {
    if (!para.length) return;
    const text = para.join(' ').replace(/\s+/g, ' ').trim();
    para.length = 0;
    if (!text) return;
    for (const s of splitSentences(text)) current.units.push({ text: s, page });
  };

  for (const { page, text } of pages) {
    const lines = text.split('\n');
    const para: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const prev = i > 0 ? lines[i - 1].trim() : '';
      const next = i + 1 < lines.length ? lines[i + 1].trim() : '';
      if (!line) {
        flushPara(para, page);
        continue;
      }
      const marked = line.startsWith(HEADING_MARK);
      if (marked || isHeading(line, prev, next)) {
        flushPara(para, page);
        // Consecutive headings with no text between them: the later (more specific) one wins
        if (current.units.length) sections.push(current);
        current ={ heading: (marked ? line.slice(HEADING_MARK.length) : line).trim(), units: [] };
        continue;
      }
      // A bullet starts a new unit (lists stay readable inside chunks)
      if (BULLET.test(line)) flushPara(para, page);
      para.push(line);
    }
    flushPara(para, page);
  }
  if (current.units.length) sections.push(current);
  return sections;
}

/** Hard-split a unit longer than CHUNK_MAX at word boundaries. */
function splitLong(u: Unit): Unit[] {
  if (u.text.length <= CHUNK_MAX) return [u];
  const out: Unit[] = [];
  let rest = u.text;
  while (rest.length > CHUNK_MAX) {
    let cut = rest.lastIndexOf(' ', CHUNK_MAX);
    if (cut < CHUNK_MIN / 2) cut = CHUNK_MAX;
    out.push({ text: rest.slice(0, cut).trim(), page: u.page });
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push({ text: rest, page: u.page });
  return out;
}

/**
 * Chunks: within each section, add whole sentences until the chunk reaches CHUNK_MIN characters
 * (never past CHUNK_MAX); the next chunk repeats the previous chunk's last sentence (overlap) when
 * it is short. Each chunk keeps its section heading and the page it starts on.
 */
export function chunkPages(pages: PageText[], documentTitle: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const push = (heading: string, units: Unit[]) => {
    const text = units.map((u) => u.text).join(' ').trim();
    if (text.replace(/[^A-Za-z]/g, '').length < 20) return; // nothing worth retrieving
    chunks.push({ index: chunks.length, heading, page: units[0].page, text });
  };

  for (const section of toSections(pages, documentTitle)) {
    const units = section.units.flatMap(splitLong);
    let buf: Unit[] = [];
    let len = 0;
    for (const u of units) {
      const add = (len ? 1 : 0) + u.text.length;
      if (len && len + add > CHUNK_MAX) {
        push(section.heading, buf);
        const last = buf[buf.length - 1];
        // One-sentence overlap, only if it leaves room for new text
        buf = last.text.length <= 300 ? [last] : [];
        len = buf.reduce((n, x) => n + x.text.length + 1, 0);
      }
      // Drop the overlap sentence if keeping it would push the chunk past CHUNK_MAX
      if (len && len + 1 + u.text.length > CHUNK_MAX) {
        buf = [];
        len = 0;
      }
      buf.push(u);
      len += (len ? 1 : 0) + u.text.length;
      if (len >= CHUNK_MIN) {
        push(section.heading, buf);
        const last = buf[buf.length - 1];
        buf = last.text.length <= 300 ? [last] : [];
        len = buf.reduce((n, x) => n + x.text.length + 1, 0);
      }
    }
    // Leftover: keep unless it is only the overlap sentence already in the previous chunk
    const isOnlyOverlap = buf.length === 1 && chunks.length > 0 && chunks[chunks.length - 1].text.endsWith(buf[0].text);
    if (buf.length && !isOnlyOverlap) push(section.heading, buf);
  }
  return chunks;
}

// ---------------- HTML ----------------

const DROP_SELECTORS = ['script', 'style', 'noscript', 'nav', 'header', 'footer', 'aside', 'form', 'iframe', 'svg', 'button'];
const DROP_ATTR = /(^|[-_\s])(menu|nav|navbar|footer|header|breadcrumb|sidebar|cookie|social|share|skip)([-_\s]|$)/i;
const BLOCK_TAGS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH', 'DT', 'DD', 'BLOCKQUOTE', 'PRE', 'DIV', 'SECTION', 'ARTICLE', 'TR', 'BR']);

const linkDensity = (el: HTMLElement) => {
  const total = el.textContent.replace(/\s+/g, '').length || 1;
  const links = el.querySelectorAll('a').reduce((n, a) => n + a.textContent.replace(/\s+/g, '').length, 0);
  return links / total;
};

/**
 * Handbook body from an HTML page: drops scripts, menus, headers/footers and link lists (like a
 * table of contents), picks the element holding the most paragraph text, and returns its text with
 * <h1>–<h6> marked as headings.
 */
export function htmlToText(html: string): string {
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  for (const sel of DROP_SELECTORS) root.querySelectorAll(sel).forEach((el) => el.remove());
  root.querySelectorAll('[class], [id], [role]').forEach((el) => {
    const attrs = `${el.getAttribute('class') ?? ''} ${el.getAttribute('id') ?? ''} ${el.getAttribute('role') ?? ''}`;
    if (DROP_ATTR.test(attrs) || el.getAttribute('role') === 'navigation') el.remove();
  });
  // Link lists (TOC, menus) and "Back to top" links
  root.querySelectorAll('ul, ol').forEach((el) => {
    if (linkDensity(el) > 0.6) el.remove();
  });
  root.querySelectorAll('a').forEach((a) => {
    if (/back to top/i.test(a.textContent)) a.remove();
  });

  // Content container: the element whose direct <p>/<li>/<h*> children hold the most text
  const score = new Map<HTMLElement, number>();
  root.querySelectorAll('p, li, h2, h3, h4').forEach((el) => {
    const parent = el.parentNode as HTMLElement | null;
    if (!parent) return;
    score.set(parent, (score.get(parent) ?? 0) + el.textContent.trim().length);
  });
  let best: HTMLElement = (root.querySelector('main, article') as HTMLElement | null) ?? (root.querySelector('body') as HTMLElement | null) ?? root;
  let bestScore = 0;
  for (const [el, n] of score) {
    if (n > bestScore) {
      best = el;
      bestScore = n;
    }
  }
  // Climb while the parent adds substantial paragraph text (sections split across siblings)
  for (let p = best.parentNode as HTMLElement | null; p && p.tagName && p.tagName !== 'BODY' && p.tagName !== 'HTML'; p = p.parentNode as HTMLElement | null) {
    const inner = p.querySelectorAll('p, li').reduce((n, el) => n + el.textContent.trim().length, 0);
    if (inner > bestScore * 1.3 && linkDensity(p) < 0.3) {
      best = p;
      bestScore = inner;
    } else break;
  }

  const lines: string[] = [];
  const walk = (el: HTMLElement) => {
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const t = node.textContent.replace(/\s+/g, ' ');
        if (t.trim()) lines[lines.length - 1] = (lines[lines.length - 1] ?? '') + t;
        continue;
      }
      if (node.nodeType !== 1) continue;
      const child = node as HTMLElement;
      const tag = child.tagName;
      // <h1>–<h6>, or a short paragraph that is a styled section title (<p id="sec9"> or all bold)
      const asText = child.textContent.replace(/\s+/g, ' ').trim();
      const boldOnly =
        tag === 'P' &&
        asText.length > 0 &&
        asText.length <= 80 &&
        !/[.,;:]$/.test(asText) &&
        (/^sec\d+$/i.test(child.getAttribute('id') ?? '') ||
          child.querySelectorAll('strong, b').map((b) => b.textContent.replace(/\s+/g, ' ').trim()).join(' ') === asText);
      if (/^H[1-6]$/.test(tag) || boldOnly) {
        const t = child.textContent.replace(/\s+/g, ' ').replace(/↑\s*Back to top/gi, '').trim();
        if (t) lines.push(HEADING_MARK + t, '');
        continue;
      }
      if (tag === 'LI') {
        lines.push('• ');
        walk(child);
        lines.push('');
        continue;
      }
      if (BLOCK_TAGS.has(tag)) {
        lines.push('');
        walk(child);
        lines.push('');
        continue;
      }
      walk(child);
    }
  };
  lines.push('');
  walk(best);
  return lines
    .map((l) =>
      l.startsWith(HEADING_MARK)
        ? l
        : l
            .replace(/\s+/g, ' ')
            .replace(/↑\s*Back to top/gi, '')
            // Website e-mail cloaking text, not handbook content
            .replace(/This email address is being protected from spambots\.\s*You need JavaScript enabled to view it\.?/gi, '')
            .trim()
    )
    .filter((l, i, a) => l !== '• ' && l !== '•' && !(l === '' && a[i - 1] === ''))
    .join('\n')
    .trim();
}
