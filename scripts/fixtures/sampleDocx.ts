/**
 * A tiny, FICTIONAL Word (.docx) policy built in code, so the mammoth ingestion path is tested
 * without a binary fixture. A .docx is a zip; this writes an uncompressed ("stored") zip with the
 * three parts Word needs. Used by server/docs.test.ts.
 */
import { crc32 } from 'node:zlib';

export const SAMPLE_DOCX_CENTRE_NAME = 'Birchwood Lane Child Care (fictional)';

export const SAMPLE_DOCX_PARAGRAPHS = [
  'Admission Policy',
  `${SAMPLE_DOCX_CENTRE_NAME} keeps one waiting list for each age group, ordered by the date the application was received.`,
  'Registration Requirements',
  "Families must provide the child's birth certificate and an up-to-date immunization record before the first day.",
  'A completed emergency contact form and a signed parent handbook acknowledgement are also required at enrolment.',
  'When a space opens, the centre contacts the family by phone and email and holds the offer for five business days.',
  'Families who decline an offer may ask to stay on the waiting list for a later start date.',
  'Hours and Fees',
  'The centre is open Monday to Friday from 7:30 a.m. to 6:00 p.m. and closes on statutory holidays.',
  'Fees are set under the Canada-wide Early Learning and Child Care system and are billed on the first day of each month.',
  'A late pick-up fee applies after 6:00 p.m., and repeated late pick-ups are discussed with the family.',
  'Health and Safety',
  'Children who have a fever, vomiting or diarrhea must stay home for twenty-four hours after symptoms end.',
  'Staff give medication only with a signed medication authorization form and the original pharmacy label.',
  'Meals and Outdoor Play',
  'A morning snack, a hot lunch and an afternoon snack are provided; the menu is posted weekly at the entrance.',
  'Children play outside twice a day unless the weather is unsafe, so please send weather-appropriate clothing.',
  'Communication',
  'Educators share a short daily note about meals, naps and activities, and families can book a meeting with the supervisor at any time.',
  'Changes to this policy are posted at the entrance and sent to families by email at least thirty days before they take effect.',
  'Withdrawal',
  'Please give the centre two weeks written notice before withdrawing your child.',
];

/** Minimal stored zip (no compression) from name -> content. */
export function makeZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.from(content, 'utf8');
    const crc = crc32(data) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += local.length + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

const xmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** A .docx with one paragraph per entry. */
export function makeDocx(paragraphs: string[]): Buffer {
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`).join('');
  return makeZip({
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  });
}

export const sampleDocx = () => makeDocx(SAMPLE_DOCX_PARAGRAPHS);
