/**
 * A small, FICTIONAL parent handbook as a real (text) PDF, built in code so tests and the live eval
 * don't need a binary fixture. Used by server/ingest.test.ts and scripts/eval-docs.ts.
 */

/** Minimal multi-page PDF (Helvetica, one text line per entry). */
export function makePdf(pages: string[][]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const objects: string[] = [];
  const add = (body: string) => objects.push(body) - 0; // object number = index + 1
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add(''); // pages, filled below
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const kids: number[] = [];
  for (const lines of pages) {
    const stream = `BT /F1 11 Tf 14 TL 50 760 Td ${lines.map((l) => `(${esc(l)}) '`).join(' ')} ET`;
    add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    const contentNo = objects.length;
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNo} 0 R >>`);
    kids.push(objects.length);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, 'latin1'));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

export const SAMPLE_CENTRE_NAME = 'Maple Grove Child Care Centre (fictional)';

/** Three pages of a fictional handbook with clear registration, document and waitlist rules. */
export const SAMPLE_HANDBOOK_PAGES: string[][] = [
  [
    'MAPLE GROVE CHILD CARE CENTRE (FICTIONAL)',
    'Parent Handbook 2026',
    'WELCOME',
    'Maple Grove is a fictional licensed child care centre used to test CareQ.',
    'We care for toddlers and preschoolers from 7:30 a.m. to 6:00 p.m., Monday to Friday.',
    'Our programs follow the Ontario early learning framework and include daily outdoor play.',
    'This handbook explains how to register, what to bring, and how our waitlist works.',
    'Please keep this handbook for your records and ask the supervisor about anything unclear.',
  ],
  [
    'REGISTRATION AND ADMISSION',
    'To register, families must complete the Maple Grove Registration Form and return it to the office.',
    'Before the first day, parents must provide a copy of the child\'s birth certificate.',
    'Parents must provide an up-to-date immunization record before the child starts care.',
    'An Emergency Contact Form with two local contacts must be completed before admission.',
    'If your child has allergies, please provide a written allergy plan signed by your doctor.',
    'Admission is confirmed once the supervisor has reviewed all forms with the family.',
    'Fees are paid monthly by pre-authorized debit, starting on the first day of care.',
  ],
  [
    'WAITLIST POLICY',
    'Families join the waitlist by submitting the registration form; there is no fee to join.',
    'Spaces are offered in order of the date the registration form was received.',
    'Siblings of children already enrolled are offered a space first when one is available.',
    'Families must confirm every six months that they wish to stay on the waitlist.',
    'When a space is offered, families must accept it within five business days.',
    'WITHDRAWAL',
    'Parents must give two weeks written notice before withdrawing a child from care.',
  ],
];

export const samplePdf = () => makePdf(SAMPLE_HANDBOOK_PAGES);
