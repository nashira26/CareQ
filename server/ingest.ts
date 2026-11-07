/**
 * Turning one document into policyChunks: shared by npm run build:index (published handbooks) and
 * centre uploads (POST /api/centres/:id/documents, self-registered centres only).
 *
 *   PDF (pdf-parse, page numbers) / HTML (menus, scripts, footers removed) / DOCX (mammoth, raw text)
 *     -> clean -> "too little text?" -> chunk by heading -> embed if the quota allows -> policyChunks
 *
 * Uploaded chunks: scope "operator", operatorId "self-<centreId>", appliesToCentreIds [centreId],
 * sourceUrl null, sourceNote "Uploaded by the centre · not verified". Chunks that couldn't be embedded
 * are stored with embedding null and found by keyword search.
 */
import type { Collection } from 'mongodb';
import { PDFParse } from 'pdf-parse';
import { PageText, TextChunk, chunkPages, cleanPages, htmlToText, tooLittleText } from './policyText';
import { EMBED_DIMENSIONS, EMBED_MODEL, PolicyChunk, normalise } from './policyIndexConfig';

export const UPLOAD_MAX_BYTES = 6 * 1024 * 1024; // base64 must fit in the 10 MB JSON body limit
export const UPLOAD_MAX_CHUNKS = 400;
export const UPLOAD_SOURCE_NOTE = 'Uploaded by the centre · not verified';
export type DocKind = 'pdf' | 'html' | 'docx';

export const docKindOf = (fileName: string): DocKind | null =>
  /\.pdf$/i.test(fileName) ? 'pdf' : /\.html?$/i.test(fileName) ? 'html' : /\.docx$/i.test(fileName) ? 'docx' : null;

/** Text by page (PDF) or as one page with page null (HTML, DOCX). Throws for unsupported or unreadable files. */
export async function extractPages(fileName: string, data: Buffer): Promise<PageText[]> {
  const kind = docKindOf(fileName);
  if (kind === 'pdf') {
    if (data.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error('This file is not a PDF.');
    const parser = new PDFParse({ data });
    try {
      const result = await parser.getText();
      return result.pages.map((p) => ({ page: p.num, text: p.text }));
    } finally {
      await parser.destroy();
    }
  }
  if (kind === 'html') return [{ page: null, text: htmlToText(data.toString('utf8')) }];
  if (kind === 'docx') {
    const mammoth = await import('mammoth');
    const { value } = await (mammoth.default ?? mammoth).extractRawText({ buffer: data });
    return [{ page: null, text: value }];
  }
  throw new Error('Please upload a PDF, HTML or Word (.docx) file.');
}

/** What gets embedded: the document title and heading give the passage its context. Stored text stays as extracted. */
export const embedInput = (docTitle: string, c: Pick<TextChunk, 'heading' | 'text'>) => `${docTitle}\n${c.heading}\n\n${c.text}`;

/** Embeds texts (RETRIEVAL_DOCUMENT); throws on any failure (quota, timeout). */
export type DocEmbedder = (texts: string[]) => Promise<number[][]>;

export function geminiDocEmbedder(
  ai: { models: { embedContent: (p: any) => Promise<{ embeddings?: { values?: number[] }[] }> } },
  timeoutMs = 20_000
): DocEmbedder {
  return async (texts) => {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 50) {
      const batch = texts.slice(i, i + 50);
      const controller = new AbortController();
      let timer: NodeJS.Timeout | undefined;
      try {
        const res = await Promise.race([
          ai.models.embedContent({
            model: EMBED_MODEL,
            contents: batch.map((text) => ({ parts: [{ text }] })),
            config: { taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: EMBED_DIMENSIONS, abortSignal: controller.signal },
          }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error(`embedding timed out after ${timeoutMs}ms`));
            }, timeoutMs);
          }),
        ]);
        const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
        if (vectors.length !== batch.length || vectors.some((v) => v.length !== EMBED_DIMENSIONS)) throw new Error('Unexpected embedding response');
        out.push(...vectors.map(normalise));
      } finally {
        clearTimeout(timer);
      }
    }
    return out;
  };
}

export interface UploadInput {
  centreId: string;
  centreName: string;
  fileName: string;
  title: string;
  data: Buffer;
}

export interface UploadResult {
  docKey: string;
  docTitle: string;
  pages: number;
  chunks: number;
  /** Chunks stored without embeddings (keyword search only). */
  keywordOnly: number;
  embeddingNote?: string;
}

/** Safe, stable file part of a docKey ("My Handbook (2026).pdf" -> "my-handbook-2026.pdf"). */
export const safeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'document';

/** Extracts, chunks and (if possible) embeds an uploaded document, then replaces its chunks. Throws plain-language errors. */
export async function ingestUpload(input: UploadInput, coll: Collection<PolicyChunk>, embed?: DocEmbedder, now = new Date()): Promise<UploadResult> {
  if (!docKindOf(input.fileName)) throw new Error('Please upload a PDF, HTML or Word (.docx) file.');
  if (!input.data.length) throw new Error('The file is empty.');
  if (input.data.length > UPLOAD_MAX_BYTES) throw new Error('Please upload a file under 6 MB.');
  let pages: PageText[];
  try {
    pages = await extractPages(input.fileName, input.data);
  } catch (e) {
    throw new Error(`We couldn't read this file (${(e as Error).message.slice(0, 120)}).`);
  }
  const cleaned = cleanPages(pages);
  const amount = tooLittleText(cleaned);
  if (amount.skip) throw new Error('This file has too little text to read (is it a scanned image?). Please upload a text PDF, HTML or Word file.');
  const docTitle = input.title.trim().slice(0, 120) || input.fileName;
  const chunks = chunkPages(cleaned, docTitle).slice(0, UPLOAD_MAX_CHUNKS);

  let vectors: (number[] | null)[] = chunks.map(() => null);
  let embeddingNote: string | undefined;
  if (embed) {
    try {
      vectors = await embed(chunks.map((c) => embedInput(docTitle, c)));
    } catch (e) {
      embeddingNote = `Embeddings unavailable (${(e as Error).message.slice(0, 80)}); stored for keyword search.`;
    }
  } else {
    embeddingNote = 'No embedding service; stored for keyword search.';
  }

  const operatorId = `self-${input.centreId}`;
  const docKey = `${operatorId}/${safeFileName(input.fileName)}`;
  const createdAt = now.toISOString();
  const records: PolicyChunk[] = chunks.map((c, i) => ({
    chunkId: `${docKey}#${c.index}`,
    docKey,
    text: c.text,
    heading: c.heading,
    page: c.page,
    embedding: vectors[i],
    scope: 'operator',
    operatorId,
    operatorName: input.centreName,
    appliesToCentreIds: [input.centreId],
    docTitle,
    sourceUrl: null,
    sourceNote: UPLOAD_SOURCE_NOTE,
    retrieved: createdAt.slice(0, 10),
    embeddingModel: EMBED_MODEL,
    embeddingDimensions: EMBED_DIMENSIONS,
    createdAt,
  }));
  // Replace this document's chunks (re-uploading the same file never duplicates)
  await coll.deleteMany({ docKey });
  if (records.length) await coll.insertMany(records.map((r) => ({ ...r })));
  return {
    docKey,
    docTitle,
    pages: pages[0]?.page == null ? 0 : pages.length,
    chunks: records.length,
    keywordOnly: vectors.filter((v) => !v).length,
    embeddingNote,
  };
}
