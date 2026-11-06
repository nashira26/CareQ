import React from 'react';
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
      <div className="flex items-center justify-between border-b border-stone-200 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[#0B4A52] hover:text-[#45B5A5] bg-white border border-stone-200 rounded-xl shadow-2xs hover:bg-stone-50 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-stone-500">
          <ShieldCheck className="w-4 h-4 text-[#45B5A5]" />
          <span>CareQ Trust & Governance Framework</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B4A52]/10 text-[#0B4A52] text-xs font-semibold mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-[#45B5A5]" />
          <span>Transparency & Ethical AI Policy</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
          Trust and Transparency
        </h1>
        <p className="mt-2 text-sm sm:text-base text-stone-600 leading-relaxed max-w-2xl">
          CareQ is committed to plain-language openness, verifiable privacy, and responsible AI assistance in Ontario licensed child care intake. Here is how our platform works and our commitments to families and centres.
        </p>
      </div>

      {/* Section 1: Prototype Terms of Use */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0B4A52] text-white font-bold text-sm">
            1
          </span>
          <h2 className="text-xl font-bold text-stone-900">Prototype Terms of Use</h2>
        </div>

        {/* Mandatory callout banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Prototype terms, not legal advice</span>
        </div>

        <div className="text-sm text-stone-700 space-y-2.5 leading-relaxed">
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
      <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0B4A52] text-white font-bold text-sm">
            2
          </span>
          <h2 className="text-xl font-bold text-stone-900">How We Use Your Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#0B4A52]" />
              What is collected
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              We collect essential intake details provided by you: parent contact name and email, child's name, age in months, requested care schedule (e.g., Full-time Toddler), and preferred start date.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
            <h3 className="font-bold text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0B4A52]" />
              Why it is collected
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
              Exclusively to organize your application checklist, communicate status and wait times with licensed providers, and streamline required enrollment documentation without redundant paperwork.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-sm space-y-1.5">
          <h3 className="font-bold text-stone-900">Who can see it</h3>
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
            Only you (the parent) and authorized intake coordinators at the specific centre(s) you choose to apply to. CareQ never sells your data, does not share information between competing centres, and displays no public profiles.
          </p>
        </div>

        {/* Strict requirement: documents shared only after parent approves */}
        <div className="p-4 rounded-xl bg-teal-50 border border-[#45B5A5]/40 text-sm text-[#0B4A52] flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#45B5A5] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Parental Approval Guarantee:</span>
            <span className="text-xs sm:text-sm leading-relaxed text-stone-700">
              Documents are shared with a centre only after the parent approves. You retain complete control over your uploaded files until you explicitly click "Confirm & Submit Application" in the review dialog.
            </span>
          </div>
        </div>
      </section>

      {/* Section 3: How the AI is Used */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0B4A52] text-white font-bold text-sm">
            3
          </span>
          <h2 className="text-xl font-bold text-stone-900">How the AI is Used</h2>
        </div>

        <p className="text-sm text-stone-600 leading-relaxed">
          Artificial intelligence in CareQ serves solely as an administrative productivity and accessibility assistant, bounded by strict human-in-the-loop controls:
        </p>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl border border-stone-200 flex items-start gap-3">
            <Bot className="w-5 h-5 text-[#0B4A52] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-stone-700">
              <span className="font-bold text-stone-900">It reads published policies: </span>
              The model reads centre-published admission handbooks and extracts prerequisite document checklists (e.g. proof of residency, immunization records) to help parents prepare accurate packages.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 flex items-start gap-3">
            <Bot className="w-5 h-5 text-[#0B4A52] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-stone-700">
              <span className="font-bold text-stone-900">It prepares drafts and suggests messages: </span>
              AI drafts preliminary inquiries and updates for busy parents and coordinators, and evaluates tone prior to sending to keep communications calm, constructive, and respectful.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#45B5A5] shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-stone-700">
              <span className="font-bold text-stone-900">People approve everything: </span>
              No message, checklist modification, or policy change is ever sent or published automatically. Human senders and supervisors always make the final choice.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start gap-3">
            <Scale className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-stone-800">
              <span className="font-bold text-rose-900">It never decides who gets a space: </span>
              AI algorithms play zero role in waitlist ranking, spot allocation, priority scoring, or admission decisions. Admissions are decided exclusively by human centre operators.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 flex items-start gap-3">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-stone-200 text-stone-700 shrink-0 mt-0.5">
              Demo Tag
            </span>
            <div className="text-xs sm:text-sm text-stone-700">
              <span className="font-bold text-stone-900">Simulated data is labelled: </span>
              Every simulated waitlist position, queue calculation, and demo profile is visibly marked with a "Simulated data" badge so users are never misled.
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Fairness */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0B4A52] text-white font-bold text-sm">
            4
          </span>
          <h2 className="text-xl font-bold text-stone-900">Fairness</h2>
        </div>

        <div className="space-y-3 text-sm text-stone-700 leading-relaxed">
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <h3 className="font-bold text-stone-900">
              Centres decide admissions under their own published rules
            </h3>
            <p className="text-xs sm:text-sm text-stone-600">
              Each licensed child care centre operates independently under its own community board and published operating guidelines. Factors such as sibling enrollment priority, municipal subsidy eligibility, geographic catchment, and date of application are evaluated directly by centre directors according to their public criteria.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-teal-50/70 border border-[#45B5A5]/40 space-y-2">
            <h3 className="font-bold text-[#0B4A52]">CareQ ranks no one</h3>
            <p className="text-xs sm:text-sm text-stone-700">
              CareQ does not score applicants, rank families, or manipulate queue positions. Waitlist numbers and estimates shown in the portal are entered directly and reported transparently by each centre's administration.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Policies and Regulations */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#0B4A52] text-white font-bold text-sm">
            5
          </span>
          <h2 className="text-xl font-bold text-stone-900">Policies and Regulations</h2>
        </div>

        <p className="text-xs sm:text-sm text-stone-600">
          Official resources for licensed child care in Ontario, and direct links to each participating centre's published admission policy (with no summaries of the law):
        </p>

        {/* Ontario official regulatory links */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Ontario Licensed Child Care Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href="https://www.ontario.ca/page/licensed-child-care-spaces"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-stone-200 hover:border-[#45B5A5] hover:bg-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-[#0B4A52] block">
                  Licensed Child Care Spaces in Ontario
                </span>
                <span className="text-[11px] text-stone-500">Government of Ontario (Ontario.ca)</span>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-[#0B4A52] shrink-0" />
            </a>

            <a
              href="https://www.ontario.ca/laws/statute/14c11"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-stone-200 hover:border-[#45B5A5] hover:bg-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-[#0B4A52] block">
                  Child Care and Early Years Act, 2014 (CCEYA)
                </span>
                <span className="text-[11px] text-stone-500">e-Laws Ontario</span>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-[#0B4A52] shrink-0" />
            </a>

            <a
              href="https://www.ontario.ca/page/find-licensed-child-care"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-stone-200 hover:border-[#45B5A5] hover:bg-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-[#0B4A52] block">
                  Find and Check Licensed Child Care
                </span>
                <span className="text-[11px] text-stone-500">Ontario Licensed Provider Directory</span>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-[#0B4A52] shrink-0" />
            </a>

            <a
              href="https://www.toronto.ca/community-people/children-parenting/children-programs-activities/licensed-child-care/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3 rounded-xl border border-stone-200 hover:border-[#45B5A5] hover:bg-stone-50 transition-all flex items-center justify-between group"
            >
              <div>
                <span className="font-semibold text-xs sm:text-sm text-stone-900 group-hover:text-[#0B4A52] block">
                  City of Toronto Children's Services
                </span>
                <span className="text-[11px] text-stone-500">Municipal Operating Guidelines & Fee Subsidy</span>
              </div>
              <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-[#0B4A52] shrink-0" />
            </a>
          </div>
        </div>

        {/* Data sources for the real licensed centres on the Find page */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Data sources
          </h3>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-700 space-y-2 leading-relaxed">
            <p>
              <span className="font-bold text-stone-900">Source: </span>
              <a href={dataSources.ontario.url} target="_blank" rel="noopener noreferrer" className="text-[#0B4A52] underline">
                {dataSources.ontario.name}
              </a>{' '}
              ({dataSources.ontario.publisher}, {dataSources.ontario.licence}), data as of{' '}
              {formatSourceDate(dataSources.ontario.dataDate)}, downloaded{' '}
              {formatSourceDate(dataSources.ontario.downloadedOn)}.
            </p>
            <p>
              <span className="font-bold text-stone-900">Source: </span>
              <a href={dataSources.toronto.url} target="_blank" rel="noopener noreferrer" className="text-[#0B4A52] underline">
                {dataSources.toronto.name}
              </a>{' '}
              ({dataSources.toronto.publisher}, {dataSources.toronto.licence}), data as of{' '}
              {formatSourceDate(dataSources.toronto.dataDate)}: map locations, age groups served,
              licensed capacity and CWELCC participation.
            </p>
            <p>
              <a href={dataSources.osm.url} target="_blank" rel="noopener noreferrer" className="text-[#0B4A52] underline">
                Geocoding © OpenStreetMap contributors
              </a>{' '}
              (Nominatim), used only for centres without City of Toronto coordinates.
            </p>
            <p>Area locations are approximate centre points used only to sort by distance.</p>
            <p>
              <span className="font-bold text-stone-900">How the datasets were joined: </span>
              {joinStats.namePostal + joinStats.postalDistinctiveWord + joinStats.licence} centres
              matched to City of Toronto data ({joinStats.namePostal} exact,{' '}
              {joinStats.postalDistinctiveWord} by postal code and name); {joinStats.geocoded} located
              with OpenStreetMap; {joinStats.withoutMapLocation} without a map location.
            </p>
            <p className="text-stone-500">
              CareQ shows no availability, waitlist or fee information for these real centres
              ("Not on CareQ yet · Ontario open data").
            </p>
            <p className="font-semibold text-stone-900">
              Partner centres, their waitlists, offers and messages are simulated for this demo.
            </p>
          </div>
        </div>

        {/* Direct links to each centre's published policy */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Centres' Published Admission Policies
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {centres.map((c) => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-xs sm:text-sm text-stone-900 block">
                    {c.name}
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {c.neighbourhood} • Simulated demo centre • Sample admission policy
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0B4A52] bg-white border border-stone-200 px-2 py-1 rounded-lg">
                  <FileText className="w-3 h-3 text-[#45B5A5]" />
                  <span>Policy Document</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Back Button */}
      <div className="pt-2 text-center pb-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0B4A52] hover:bg-[#08383e] rounded-xl shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    </div>
  );
};
