/**
 * The demo centres CareQ uses for the walkthrough.
 *
 *  - Seven REAL Ontario centres (the `demoCentreId` of each folder in data/policies/). Their details
 *    are copied from the Ontario / City of Toronto open data (src/data/ontarioCentres.json; a unit
 *    test checks they still match). Their admission requirements are quoted word for word from the
 *    operator's published handbook, with a page citation. Real data is never labelled simulated.
 *    Applications, positions, offers and messages involving them ARE simulated: these centres have
 *    not partnered with CareQ, and their portal accounts are simulated demo accounts.
 *  - One FICTIONAL centre, "CareQ Demo Centre (fictional)", with a sample admission policy.
 *
 * The operators' other sites (appliesToCentreIds in each meta.json) stay open-data centres:
 * information only, no applications.
 *
 * Neighbourhood: the nearest name in src/data/torontoAreas.json (derived, approximate).
 * Hours: not in the open data, so left empty (shown as "not in open data").
 */
import type { Centre } from './mockData';

export const DEMO_CENTRE_ID = 'careq-demo';
export const DEMO_CENTRE_NAME = 'CareQ Demo Centre (fictional)';
export const JESSE_KETCHUM_ID = 'on-00576';
export const HARMONY_ID = 'on-03394';

/** Quote + citation for one requirement. Several items can share one sentence. */
type Req = { title: string; quote: string; page: string };

const fromHandbook = (
  base: Omit<Centre, 'requirements' | 'requirementSources' | 'requirementCitations' | 'requirementsExtractedFrom'>,
  doc: NonNullable<Centre['requirementsExtractedFrom']>,
  reqs: Req[]
): Centre => {
  const citeTitle = doc.sourceUrl ? doc.docTitle : `${doc.docTitle} (source link not found)`;
  return {
    ...base,
    requirements: reqs.map((r) => r.title),
    requirementSources: Object.fromEntries(reqs.map((r) => [r.title, r.quote])),
    requirementCitations: Object.fromEntries(reqs.map((r) => [r.title, `${citeTitle}, ${r.page}`])),
    requirementsExtractedFrom: doc,
  };
};

const openData = (licenceNumber: string, operator: string, capacity: number): Pick<Centre, 'demoKind' | 'licenceNumber' | 'operator' | 'capacity'> => ({
  demoKind: 'open-data',
  licenceNumber,
  operator,
  capacity,
});

const CWELCC = 'CWELCC participating (open data)';

export const REAL_DEMO_CENTRES: Centre[] = [
  fromHandbook(
    {
      id: 'on-00576',
      name: 'Jesse Ketchum Early Learning & Child Care Centre',
      ...openData('00576', 'Toronto Early Learning & Child Care Services (City of Toronto)', 26),
      neighbourhood: 'Yorkville',
      address: '7 Berryman Street, Toronto, ON M5R 1M7',
      lat: 43.673604783,
      lng: -79.391598893,
      ageGroups: ['Toddler', 'Preschool'],
      programOptions: ['Full day', 'Half day', 'Extended hours', 'Before school', 'After school', 'Overnight'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    {
      docTitle: 'Parent Handbook (March 2026)',
      sourceUrl: 'https://www.toronto.ca/wp-content/uploads/2026/04/95b1-parenthandbook2026.pdf',
      retrieved: '2026-11-06',
    },
    [
      {
        title: 'Child Admission Package',
        quote:
          "During this meeting, the Centre Supervisor will review the Child Admission Package and gather information, such as parent contact information, your child's doctor's contact information, health related information, etc.",
        page: 'PDF p.13',
      },
      {
        title: 'Emergency contact information',
        quote:
          'Parents must provide the centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.',
        page: 'PDF p.13',
      },
      {
        title: 'Up-to-date immunization information',
        quote:
          'Licensed child care centres are required to collect and retain up-to-date immunization for all children not attending school.',
        page: 'PDF p.14',
      },
      {
        title: 'Custody documents (if applicable)',
        quote: 'Please be prepared to provide legal documentation for custody arrangements.',
        page: 'PDF p.14',
      },
    ]
  ),
  fromHandbook(
    {
      id: 'on-0002899',
      name: 'Wellesley Early Learning Centre - Earlscourt Creche Cdi - 495 Sherbourne Street',
      ...openData('0002899', 'Child Development Institute (CDI Early Learning Centres)', 62),
      neighbourhood: 'Church-Wellesley',
      address: '495 Sherbourne Street, Toronto, ON M4X 1K7',
      lat: 43.667797477,
      lng: -79.37462578,
      ageGroups: ['Infant', 'Toddler', 'Preschool'],
      programOptions: ['Full day'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    { docTitle: 'Family Handbook (revised January 1, 2025)', sourceUrl: 'https://www.childdevelop.ca', retrieved: '2026-11-06' },
    [
      {
        title: 'Registration Package and Signed Parent Contract',
        quote:
          'As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Registration Package and Signed Parent Contract',
        page: 'PDF p.13',
      },
      {
        title: 'Copy of Immunization Record',
        quote: 'Proof of immunization must be shown prior to the enrolment of a child in the Centre.',
        page: 'PDF p.13',
      },
      {
        title: 'Signed Consent Forms (those that are applicable)',
        quote:
          'As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Signed Consent Forms (those that are applicable)',
        page: 'PDF p.13',
      },
      {
        title: 'Emergency Contact Information',
        quote:
          'Parents must provide the Centre with the name and contact information of at least one person if the parent/guardian is unavailable or cannot be reached.',
        page: 'PDF p.13',
      },
      {
        title: 'Pick Up Instructions',
        quote:
          'As part of the admission procedure, the following documents must be completed by the parent and will be reviewed by the Centre Director: … Pick Up Instructions',
        page: 'PDF p.13',
      },
      {
        title: 'Preauthorized Debit form',
        quote: 'Every family enrolling into the Centre must complete a Preauthorized Debit form whether or not you currently have a fee.',
        page: 'PDF p.14',
      },
    ]
  ),
  fromHandbook(
    {
      id: 'on-0004062',
      name: 'Macaulay - Dovercourt Child Care Centre',
      ...openData('0004062', 'Macaulay Centres for Children', 131),
      neighbourhood: 'Bloor & Dufferin',
      address: '228 Bartlett Avenue, Toronto, ON M6H 3G4',
      lat: 43.666735608,
      lng: -79.435778958,
      ageGroups: ['Toddler', 'Preschool'],
      programOptions: ['Full day', 'Before school', 'After school'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    {
      docTitle: 'Parent Handbook (January 2024)',
      sourceUrl: 'https://macaulaycentre.org/services/licensed-child-care/licensed-child-care-centres',
      retrieved: '2026-11-06',
    },
    [
      {
        title: 'Child registration forms',
        quote: 'The registration process involves the completion of the child registration forms.',
        page: 'PDF p.26',
      },
      {
        // One checklist item for immunization (p.15 and p.17 both ask for it); both sentences quoted word for word
        title: 'Admission forms and up-to-date immunization records',
        quote:
          "All admission forms, including immunization records must be completed before your child's first day. Toronto Public Health requires that your child's immunizations are up-to-date before your child can start.",
        page: 'PDF p.15 and p.17',
      },
    ]
  ),
  fromHandbook(
    {
      id: 'on-0002575',
      name: 'Leaside Day Care Centre (Rolph Road Day Care)',
      ...openData('0002575', 'Rolph Road / Leaside Daycare Centres', 99),
      neighbourhood: 'Leaside',
      address: '206 Laird Drive, Toronto, ON M4G 3W4',
      lat: 43.711103192,
      lng: -79.364043707,
      ageGroups: ['Infant', 'Toddler', 'Preschool'],
      programOptions: ['Full day'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    { docTitle: 'Parent Handbook (updated June 2026)', sourceUrl: 'https://www.leasidedaycare.com', retrieved: '2026-11-06' },
    [
      // Web page: no page numbers, so the citation names the section
      {
        title: 'Waiting list application form',
        quote: 'To apply for Daycare a waiting list application form must be filled out.',
        page: 'section 8 (Admission Policy)',
      },
      {
        title: 'Deposit to guarantee your spot',
        quote: 'Once a space has been confirmed you will be contacted and a deposit and will be required to guarantee your spot.',
        page: 'section 8 (Admission Policy)',
      },
      {
        title: 'Application package forms',
        quote: "All relevant forms are required to be filled out before your child's start date.",
        page: 'section 8 (Admission Policy)',
      },
    ]
  ),
  fromHandbook(
    {
      id: 'on-03394',
      name: 'Harmony Child Care Centre (Harmony Community School Centre) 124 Northcliffe Blvd',
      ...openData('03394', 'Harmony Child Care Centre', 165),
      neighbourhood: 'Corso Italia',
      address: '124 Northcliffe Boulevard, Toronto, ON M6E 3K4',
      lat: 43.679411461,
      lng: -79.441551588,
      ageGroups: ['Preschool'],
      programOptions: ['Full day', 'Half day', 'Before school', 'After school'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    {
      docTitle: 'Policies and Procedures Parent Handbook (revised January 2020)',
      sourceUrl: 'https://www.harmonychildcarecentre.ca',
      retrieved: '2026-11-06',
    },
    [
      {
        title: 'Registration forms, including the medical',
        quote:
          'The registration forms, including the medical, must be completely filled out and submitted at least two weeks prior to your child beginning day care.',
        page: 'PDF p.14',
      },
      {
        title: 'First payment of care',
        quote:
          'A spot for your child is secured once this first payment is paid and the amount paid will be applied to your fees once your child begins care with us.',
        page: 'PDF p.14',
      },
      {
        title: 'Immunization Information Form & copy of Yellow Immunization Card',
        quote:
          'The following forms must be completed and returned before your child is admitted into the program … Immunization Information Form & provide copy of Yellow Immunization Card from Doctor',
        page: 'PDF p.15',
      },
      {
        title: 'Emergency Contact Information Form',
        quote:
          'The following forms must be completed and returned before your child is admitted into the program … Emergency Contact Information Form',
        page: 'PDF p.15',
      },
      {
        title: 'Medical and Health Care Information Form',
        quote:
          'The following forms must be completed and returned before your child is admitted into the program … Medical and Health Care Information Form (2 pages)',
        page: 'PDF p.15',
      },
    ]
  ),
  fromHandbook(
    {
      id: 'on-07205',
      name: 'B.F. Toronto Centre For Early Childhood (45 Golfdown)',
      ...openData('07205', 'B.F. Toronto Centre for Early Childhood Education', 98),
      neighbourhood: 'Rexdale',
      address: '45 Golfdown Drive, Toronto, ON M9W 2H8',
      lat: 43.7222273,
      lng: -79.552113787,
      ageGroups: ['Toddler', 'Preschool'],
      programOptions: ['Full day', 'Before school', 'After school'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    // The PDF is the real handbook; only its download link wasn't found
    { docTitle: 'Parent Handbook', retrieved: '2026-11-06', sourceNote: 'Handbook download link not found.' },
    [
      {
        title: 'Registration Fee ($25.00, non-refundable)',
        quote: 'A non-refundable Registration Fee of $25.00 prior to enrollment is required.',
        page: 'PDF p.3',
      },
      {
        title: 'Registration and Immunization Forms',
        quote:
          "All Registration and Immunization Forms must be completed and submitted to the Centre's Supervisor ONE WEEK prior to enrollment.",
        page: 'PDF p.3',
      },
      {
        title: "Toronto Public Health Immunization Form with your child's immunization record",
        quote:
          "Prior to admission, parents are required to complete a Toronto Public Health Immunization Form. A copy of your child's up to date immunization record must be attached and returned to the centre.",
        page: 'PDF p.6',
      },
    ]
  ),
  // Family Day Care's handbook has no list of admission documents (it only says to register on the
  // parent portal), so this centre uses the provincial licensing-manual checklist instead.
  fromHandbook(
    {
      id: 'on-12256',
      name: 'Family Day Care Services - Mary Ward Child Care Centre',
      ...openData('12256', 'Family Day Care Services', 49),
      neighbourhood: 'Near Agincourt',
      address: '3200 Kennedy Road, Toronto, ON M1V 3S8',
      lat: 43.815753423,
      lng: -79.30394007,
      ageGroups: ['Infant', 'Toddler', 'Preschool'],
      programOptions: ['Full day'],
      languages: ['English'],
      hours: '',
      feeNote: CWELCC,
    },
    {
      docTitle: 'Child Care Centre Licensing Manual',
      sourceUrl: 'https://www.ontario.ca/document/child-care-centre-licensing-manual',
      retrieved: '2026-11-06',
      fallback: 'licensing-manual',
      sourceNote: "The centre's Family Handbook (July 2026) doesn't list admission documents, so this checklist uses the Ontario licensing manual.",
    },
    [
      {
        title: 'Proof of immunization (or a completed standard exemption form)',
        quote:
          "all paperwork around immunization – either proof of immunization or one of the two completed standard forms – must be kept in a child's record and ideally should be on file by the time the child begins attending the licensed program.",
        page: 'PDF p.100',
      },
      {
        title: 'Emergency contact information',
        quote:
          'Section 69 and subsection 70(1) are in place as part of emergency planning/management; having important contact information readily available allows for quick contact with parents and emergency services.',
        page: 'PDF p.239',
      },
    ]
  ),
];

export const REAL_DEMO_CENTRE_IDS = REAL_DEMO_CENTRES.map((c) => c.id);

/** Fictional centre: sample policy, no real address. */
export const CAREQ_DEMO_CENTRE: Centre = {
  id: DEMO_CENTRE_ID,
  demoKind: 'fictional',
  name: DEMO_CENTRE_NAME,
  neighbourhood: 'Riverdale',
  ageGroups: ['Infant', 'Toddler', 'Preschool'],
  hours: '7:30 AM – 6:00 PM',
  feeNote: 'CWELCC Participating ($10/day program)',
  // Approximate point for the fictional centre (no street address)
  lat: 43.6653,
  lng: -79.3528,
  programOptions: ['Full day', 'Before school', 'After school'],
  languages: ['English'],
  requirements: [
    "Child's Birth Certificate",
    'Yellow Immunization Card (ISPA)',
    'Proof of Toronto Residency',
    'Emergency Contact & Medical Consent Form',
  ],
  // Taken from the sample policyNotes below
  requirementSources: {
    "Child's Birth Certificate":
      'Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).',
    'Yellow Immunization Card (ISPA)':
      'Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance).',
    'Proof of Toronto Residency': 'Families residing in Toronto must verify residency with a utility bill or lease agreement.',
    'Emergency Contact & Medical Consent Form':
      'An Emergency Contact & Medical Consent Form signed by both legal guardians is required before queue ranking.',
  },
  policyNotes:
    'Pursuant to the Child Care and Early Years Act (CCEYA), all applicants must provide an official Child’s Birth Certificate and an up-to-date Yellow Immunization Card (ISPA compliance). Families residing in Toronto must verify residency with a utility bill or lease agreement. An Emergency Contact & Medical Consent Form signed by both legal guardians is required before queue ranking.',
};

export const DEMO_CENTRES: Centre[] = [...REAL_DEMO_CENTRES, CAREQ_DEMO_CENTRE];

/** Real centre with a simulated demo portal account (not operated by or affiliated with it). */
export const isRealDemoCentre = (c: Pick<Centre, 'demoKind'> | undefined | null) => c?.demoKind === 'open-data';

/** Name of a real centre's simulated portal account. */
export const simulatedAccountName = (centreName: string) => `${centreName} · simulated demo account`;
