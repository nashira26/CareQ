import React from 'react';
import { HeroPhoto, PHOTOS } from './ui/HeroPhoto';
import { ArrowLeft, ShieldCheck, Scale, Bot, Lock, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { Centre } from '../data/mockData';
import ontarioMeta from '../data/ontarioCentres.meta.json';
import { OntarioCentresFile, formatSourceDate } from '../data/ontarioTypes';

const dataSources = (ontarioMeta as OntarioCentresFile['metadata']).sources;
const joinStats = (ontarioMeta as OntarioCentresFile['metadata']).joinStats;

interface TrustTransparencyPageProps {
  onBack: () => void;
  centres: Centre[];
  onOpenPolicyModal?: (centre: Centre) => void;
}

export const TrustTransparencyPage: React.FC<TrustTransparencyPageProps> = ({
  onBack,
  centres,
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-2">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between border-b border-cq-stone-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 h-10 px-4 text-sm font-bold text-brand bg-white border border-line-strong rounded-xl hover:bg-mint active:scale-[0.98] transition-[background-color,transform] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-cq-stone-500">
          <ShieldCheck className="w-4 h-4 text-cq-secondary" />
          <span>CareQ Trust & Governance Framework</span>
        </div>
      </div>

      {/* Hero Header */}
      {/* Photo beside the text from md up, above it on phones */}
      <div className="bg-butter rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 md:gap-8"><div className="order-2 md:order-1 min-w-0">
        <p className="text-sm font-bold text-coral-ink mb-1">Transparency & Ethical AI Policy</p>
        <h1 className="text-2xl sm:text-[30px] sm:leading-[38px] font-extrabold text-brand">
          Trust and Transparency
        </h1>
        <p className="mt-2 text-sm sm:text-base text-cq-stone-600 leading-relaxed max-w-2xl">
          CareQ is committed to plain-language openness, verifiable privacy, and responsible AI assistance in Ontario licensed child care intake. Here is how our platform works and our commitments to families and centres.
        </p>
        </div>
        <HeroPhoto photo={PHOTOS.sensory} className="order-1 md:order-2 md:w-[300px] shrink-0" frameClassName="h-[180px] sm:h-[220px] md:h-[200px]" />
      </div>

      {/* Section 1: Prototype Terms of Use */}
      <section className="bg-white rounded-2xl border border-cq-line p-5 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cq-brand text-white font-bold text-sm">
            1
          </span>
          <h2 className="text-xl font-extrabold text-brand">Prototype Terms of Use</h2>
        </div>

        {/* Mandatory callout banner */}
        <div className="p-3.5 rounded-xl bg-cq-amber-50 border border-cq-amber-300 text-cq-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cq-amber-500"></span>
          <span>Prototype terms, not legal advice</span>
        </div>

        <div className="text-sm text-cq-stone-700 space-y-2.5 leading-relaxed">
          <p>
            CareQ is an interactive software demonstration designed to explore modern, dignified waitlist coordination and transparent intake for families and child care providers across Ontario.
          </p>
          <p>
            By using this prototype, you acknowledge that all platform features, sample data, and simulated queue communications are provided for demonstration, research, and evaluation purposes only. Use of this application does not create a binding legal contract or formal tenancy/placement agreement between you, CareQ, or any participating licensed child care operator.
          </p>
          <p>
            For actual licensed enrollment, parents and operators must follow direct intake protocols established under municipal guidelines and the Child Care and Early Years Act, 2014.
          </p>
        </div>
      </section>

      {/* Section 2: How We Use Your Information */}
      <section className="bg-white rounded-2xl border border-cq-line p-5 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cq-brand text-white font-bold text-sm">
            2
          </span>
          <h2 className="text-xl font-extrabold text-brand">How We Use Your Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-cq-stone-50 border border-cq-stone-200/80 space-y-1.5">
            <h3 className="font-bold text-cq-stone-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cq-brand" />
              What is collected
            </h3>
            <p className="text-cq-stone-600 text-xs sm:text-sm leading-relaxed">
              We collect essential intake details provided by you: parent contact name and email, child's name, age in months, requested care schedule (e.g., Full-time Toddler), and preferred start date.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cq-stone-50 border border-cq-stone-200/80 space-y-1.5">
            <h3 className="font-bold text-cq-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cq-brand" />
              Why it is collected
            </h3>
            <p className="text-cq-stone-600 text-xs sm:text-sm leading-relaxed">
              Exclusively to organize your application checklist, communicate status and wait times with licensed providers, and streamline required enrollment documentation without redundant paperwork.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-cq-stone-50 border border-cq-stone-200/80 text-sm space-y-1.5">
          <h3 className="font-bold text-cq-stone-900">Who can see it</h3>
          <p className="text-cq-stone-600 text-xs sm:text-sm leading-relaxed">
            Only you (the parent) and authorized intake coordinators at the specific centre(s) you choose to apply to. CareQ never sells your data, does not share information between competing centres, and displays no public profiles.
          </p>
        </div>

        {/* Strict requirement: documents shared only after parent approves */}
        <div className="p-4 rounded-xl bg-cq-teal-50 border border-cq-secondary/40 text-sm text-cq-brand flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-cq-secondary shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Parental Approval Guarantee:</span>
            <span className="text-xs sm:text-sm leading-relaxed text-cq-stone-700">
              Documents are shared with a centre only after the parent approves. You retain complete control over your uploaded files until you explicitly click "Confirm & Submit Application" in the review dialog.
            </span>
          </div>
        </div>
      </section>

      {/* Section 3: How the AI is Used */}
      <section className="bg-white rounded-2xl border border-cq-line p-5 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cq-brand text-white font-bold text-sm">
            3
          </span>
          <h2 className="text-xl font-extrabold text-brand">How the AI is Used</h2>
        </div>

        <p className="text-sm text-cq-stone-600 leading-relaxed">
          Artificial intelligence in CareQ serves solely as an administrative productivity and accessibility assistant, bounded by strict human-in-the-loop controls:
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-cq-stone-200 flex items-start gap-3">
            <Bot className="w-5 h-5 text-cq-brand shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-cq-stone-700">
              <span className="font-bold text-cq-stone-900">It reads published policies: </span>
              The model reads centre-published admission handbooks and extracts prerequisite document checklists (e.g. proof of residency, immunization records) to help parents prepare accurate packages.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-cq-stone-200 flex items-start gap-3">
            <Bot className="w-5 h-5 text-cq-brand shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-cq-stone-700">
              <span className="font-bold text-cq-stone-900">It prepares drafts and suggests messages: </span>
              AI drafts preliminary inquiries and updates for busy parents and coordinators, and evaluates tone prior to sending to keep communications calm, constructive, and respectful.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-cq-stone-200 bg-cq-stone-50 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-cq-secondary shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-cq-stone-700">
              <span className="font-bold text-cq-stone-900">People approve everything: </span>
              No message, checklist modification, or policy change is ever sent or published automatically. Human senders and supervisors always make the final choice.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-cq-rose-200 bg-cq-rose-50/60 flex items-start gap-3">
            <Scale className="w-5 h-5 text-cq-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-cq-stone-800">
              <span className="font-bold text-cq-rose-900">It never decides who gets a space: </span>
              AI algorithms play zero role in waitlist ranking, spot allocation, priority scoring, or admission decisions. Admissions are decided exclusively by human centre operators.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-cq-stone-200 flex items-start gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cq-stone-200 text-cq-stone-700 shrink-0 mt-0.5">
              Demo Tag
            </span>
            <div className="text-xs sm:text-sm text-cq-stone-700">
              <span className="font-bold text-cq-stone-900">Simulated data is labelled: </span>
              Demo accounts see a banner at the top of every screen saying their applications, waitlist positions, offers and messages are simulated.
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Fairness */}
      <section className="bg-white rounded-2xl border border-cq-line p-5 sm:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cq-brand text-white font-bold text-sm">
            4
          </span>
          <h2 className="text-xl font-extrabold text-brand">Fairness</h2>
        </div>

        <div className="space-y-3 text-sm text-cq-stone-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-cq-stone-50 border border-cq-stone-200 space-y-2">
            <h3 className="font-bold text-cq-stone-900">
              Centres decide admissions under their own published rules
            </h3>
            <p className="text-xs sm:text-sm text-cq-stone-600">
              Each licensed child care centre operates independently under its own community board and published operating guidelines. Factors such as sibling enrollment priority, municipal subsidy eligibility, geographic catchment, and date of application are evaluated directly by centre directors according to their public criteria.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-cq-teal-50/70 border border-cq-secondary/40 space-y-2">
            <h3 className="font-bold text-cq-brand">CareQ ranks no one</h3>
            <p className="text-xs sm:text-sm text-cq-stone-700">
              CareQ does not score applicants, rank families, or manipulate queue positions. Waitlist numbers and estimates shown in the portal are entered directly and reported transparently by each centre's administration.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Policies and Regulations */}
      <section className="bg-white rounded-2xl border border-cq-line p-5 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-cq-brand text-white font-bold text-sm">
            5
          </span>
          <h2 className="text-xl font-extrabold text-brand">Policies and Regulations</h2>
        </div>

        <p className="text-xs sm:text-sm text-cq-stone-600">
          Official resources for licensed child care in Ontario, and direct links to each participating centre's published admission policy (with no summaries of the law):
        </p>

        {/* Ontario official regulatory links */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-cq-stone-500">
            Ontario Licensed Child Care Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href="https://www.ontario.ca/page/licensed-child-care-spaces"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-cq-stone-200 hover:border-cq-secondary hover:bg-cq-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-cq-stone-900 group-hover:text-cq-brand block">
                  Licensed Child Care Spaces in Ontario
                </span>
                <span className="text-xs text-cq-stone-500">Government of Ontario (Ontario.ca)</span>
              </div>
              <ExternalLink className="w-4 h-4 text-cq-stone-400 group-hover:text-cq-brand shrink-0" />
            </a>

            <a
              href="https://www.ontario.ca/laws/statute/14c11"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-cq-stone-200 hover:border-cq-secondary hover:bg-cq-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-cq-stone-900 group-hover:text-cq-brand block">
                  Child Care and Early Years Act, 2014 (CCEYA)
                </span>
                <span className="text-xs text-cq-stone-500">e-Laws Ontario</span>
              </div>
              <ExternalLink className="w-4 h-4 text-cq-stone-400 group-hover:text-cq-brand shrink-0" />
            </a>

            <a
              href="https://www.ontario.ca/page/find-licensed-child-care"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-cq-stone-200 hover:border-cq-secondary hover:bg-cq-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-cq-stone-900 group-hover:text-cq-brand block">
                  Find and Check Licensed Child Care
                </span>
                <span className="text-xs text-cq-stone-500">Ontario Licensed Provider Directory</span>
              </div>
              <ExternalLink className="w-4 h-4 text-cq-stone-400 group-hover:text-cq-brand shrink-0" />
            </a>

            <a
              href="https://www.toronto.ca/community-people/children-parenting/children-programs-activities/licensed-child-care/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-cq-stone-200 hover:border-cq-secondary hover:bg-cq-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-cq-stone-900 group-hover:text-cq-brand block">
                  City of Toronto Children's Services
                </span>
                <span className="text-xs text-cq-stone-500">Municipal Operating Guidelines & Fee Subsidy</span>
              </div>
              <ExternalLink className="w-4 h-4 text-cq-stone-400 group-hover:text-cq-brand shrink-0" />
            </a>
          </div>
        </div>

        {/* Data sources for the real licensed centres on the Find page */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-cq-stone-500">
            Data sources
          </h3>
          <div className="p-4 rounded-xl bg-cq-stone-50 border border-cq-stone-200 text-xs sm:text-sm text-cq-stone-700 space-y-2 leading-relaxed">
            <p>
              <span className="font-bold text-cq-stone-900">Source: </span>
              <a href={dataSources.ontario.url} target="_blank" rel="noopener noreferrer" className="text-cq-brand underline">
                {dataSources.ontario.name}
              </a>{' '}
              ({dataSources.ontario.publisher}, {dataSources.ontario.licence}), data as of{' '}
              {formatSourceDate(dataSources.ontario.dataDate)}, downloaded{' '}
              {formatSourceDate(dataSources.ontario.downloadedOn)}.
            </p>
            <p>
              <span className="font-bold text-cq-stone-900">Source: </span>
              <a href={dataSources.toronto.url} target="_blank" rel="noopener noreferrer" className="text-cq-brand underline">
                {dataSources.toronto.name}
              </a>{' '}
              ({dataSources.toronto.publisher}, {dataSources.toronto.licence}), data as of{' '}
              {formatSourceDate(dataSources.toronto.dataDate)}: map locations, age groups served,
              licensed capacity and CWELCC participation.
            </p>
            <p>
              <a href={dataSources.osm.url} target="_blank" rel="noopener noreferrer" className="text-cq-brand underline">
                Geocoding © OpenStreetMap contributors
              </a>{' '}
              (Nominatim), used only for centres without City of Toronto coordinates.
            </p>
            <p>Area locations are approximate centre points used only to sort by distance.</p>
            <p>
              <span className="font-bold text-cq-stone-900">How the datasets were joined: </span>
              {joinStats.namePostal + joinStats.postalDistinctiveWord + joinStats.licence} centres
              matched to City of Toronto data ({joinStats.namePostal} exact,{' '}
              {joinStats.postalDistinctiveWord} by postal code and name); {joinStats.geocoded} located
              with OpenStreetMap; {joinStats.withoutMapLocation} without a map location.
            </p>
            <p className="text-cq-stone-500">
              Apart from the demo centres below, CareQ shows no application, waitlist or fee information for these real centres
              ("Not on CareQ yet · Ontario open data").
            </p>
            <p className="font-semibold text-cq-stone-900">
              Real centres' published documents and open data are used for information. Applications, positions,
              offers and messages involving them are simulated; these centres have not partnered with CareQ.
            </p>
            <p>
              CareQ Demo Centre is fictional. The demo portal accounts for real centres are simulated demo accounts,
              not operated by or affiliated with those centres.
            </p>
            <p>
              Accounts and centres created on this device are demo data saved only in this browser and removed by
              Reset demo. Centres registered by their own staff are labelled “Self-registered · not verified”; their
              licence number is self-reported and their map location is approximate.
            </p>
          </div>
        </div>

        {/* Direct links to each centre's published policy */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-cq-stone-500">
            Demo centres and where their requirements come from
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {centres
              .filter((c) => c.demoKind)
              .map((c) => {
                const doc = c.requirementsExtractedFrom;
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-cq-stone-200 bg-cq-stone-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-xs sm:text-sm text-cq-stone-900 block">{c.name}</span>
                      <span className="text-xs text-cq-stone-500 block">
                        {c.demoKind === 'open-data'
                          ? `Ontario open data${c.licenceNumber ? ` • Licence #${c.licenceNumber}` : ''} • Simulated demo account`
                          : 'Fictional demo centre • Sample admission policy'}
                      </span>
                      {doc && (
                        <span className="text-xs text-cq-stone-500 block">
                          Requirements extracted from {doc.docTitle}
                          {doc.sourceUrl ? '' : ' (source link not found)'} • retrieved {formatSourceDate(doc.retrieved)}
                          {doc.fallback === 'licensing-manual' && doc.sourceNote ? ` • ${doc.sourceNote}` : ''}
                        </span>
                      )}
                    </div>
                    {doc?.sourceUrl ? (
                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-cq-brand bg-white border border-cq-stone-200 px-2 py-1 rounded-lg hover:underline"
                      >
                        <FileText className="w-3 h-3 text-cq-secondary" />
                        <span>Source</span>
                      </a>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* Bottom Back Button */}
      <div className="pt-2 text-center pb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-cq-brand hover:bg-cq-brand-hover rounded-xl shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
