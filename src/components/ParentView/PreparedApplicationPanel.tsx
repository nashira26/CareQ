import React, { useState } from 'react';
import { Sparkles, Loader2, Quote, FileCheck2, AlertTriangle } from 'lucide-react';
import { Application, Centre, ParentProfile } from '../../data/mockData';
import { AiFallbackNote, AiNotice } from '../ui/CareUI';
import { aiPost, isUserFacingAiError } from '../../lib/aiFetch';
import {
  CHECKLIST_STATUSES,
  ChecklistStatus,
  PrepareInput,
  PreparedDraft,
  computeMissingItems,
  mergePrepared,
  prepareFallback,
  sanitizePrepareInput,
} from '../../lib/prepareApplication';

const STATUS_STYLE: Record<ChecklistStatus, string> = {
  ready: 'bg-[#E4ECE1] text-[#4E7A5A] border-[#CBD9C6]',
  missing: 'bg-[#FDF3DD] text-[#8A6411] border-[#EADBB8]',
  'needs parent check': 'bg-[#ECE8F5] text-[#5A4A85] border-[#D6CFE8]',
};
const STATUS_LABEL: Record<ChecklistStatus, string> = {
  ready: 'Ready',
  missing: 'Missing',
  'needs parent check': 'Needs parent check',
};

/** Only these fields are sent to the server (no email, no date of birth). */
export function buildPrepareInput(app: Application, centre: Centre, profile: ParentProfile): PrepareInput {
  return sanitizePrepareInput({
    centreName: centre.name,
    parentFirstName: profile.name.split(/\s+/)[0],
    childFirstName: app.childName.split(/\s+/)[0],
    childAgeMonths: app.childAgeMonths,
    careType: app.careType,
    preferredStartDate: app.preferredStartDate,
    parentNotes: app.parentNotes ?? '',
    documents: Object.entries(app.uploadedDocuments ?? {}).map(([attachedTo, d]) => ({ fileName: d.fileName, attachedTo })),
    requirements: centre.requirements.map((requirement) => ({
      requirement,
      sourceSentence: centre.requirementSources?.[requirement] ?? 'No source sentence recorded by the centre.',
    })),
  })!;
}

interface Props {
  app: Application;
  centre: Centre;
  parentProfile: ParentProfile;
  draft: PreparedDraft | undefined;
  onChange: (draft: PreparedDraft) => void;
}

export const PreparedApplicationPanel: React.FC<Props> = ({ app, centre, parentProfile, draft, onChange }) => {
  const [loading, setLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const handlePrepare = async () => {
    const input = buildPrepareInput(app, centre, parentProfile);
    setLoading(true);
    let next: PreparedDraft;
    setAiNotice(null);
    const result = await aiPost<Omit<PreparedDraft, 'noteEditedByParent'>>('/api/prepare-application', input);
    if (result.ok && Array.isArray(result.data.checklist)) {
      const data = result.data;
      next = {
        fields: data.fields,
        checklist: data.checklist,
        missingItems: data.missingItems,
        noteToCentre: data.noteToCentre ?? '',
        aiMode: data.aiMode,
        modelUsed: data.modelUsed ?? null,
      };
    } else {
      // Rate-limited, signed out or unreachable: the same rules, in the browser
      next = { ...prepareFallback(input), aiMode: 'fallback', modelUsed: null };
      if (!result.ok && isUserFacingAiError(result.status)) setAiNotice(result.message);
    }
    setLoading(false);
    // Re-running never overwrites what the parent typed or chose
    onChange(mergePrepared(draft, next));
  };

  const update = (patch: Partial<PreparedDraft>) => {
    if (!draft) return;
    const merged = { ...draft, ...patch };
    onChange({ ...merged, missingItems: computeMissingItems(merged.fields, merged.checklist) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePrepare}
          disabled={loading}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#0B4A52] text-[#0B4A52] bg-white hover:bg-[#0B4A52]/5 text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {draft ? 'Prepare again with AI' : 'Prepare with AI'}
        </button>
        {loading ? (
          <span className="text-xs text-[#5B6B66]">Reading {centre.name}&apos;s requirements…</span>
        ) : (
          !draft && (
            <span className="text-xs text-[#7A8A84]">
              Fills in what CareQ already knows and checks your documents against {centre.name}&apos;s requirements.
            </span>
          )
        )}
      </div>

      {draft && (
        <section aria-label="AI draft" className="rounded-2xl border border-[#E7D6A8] bg-[#FFFCF4] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h5 className="text-sm font-bold text-[#173F42] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#8A6A3B]" /> AI draft — review before sending
            </h5>
            <span className="rounded px-1.5 py-0.5 bg-[#F3EBDD] text-[#5B4A2E] text-[10px] font-semibold">
              {centre.demoKind === 'open-data' ? 'Simulated application' : 'Simulated centre'}
            </span>
          </div>
          <AiFallbackNote aiMode={draft.aiMode} />
          <AiNotice message={aiNotice} />

          {/* Fields */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6B66] mb-2">Application details</p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
              {draft.fields.map((f, i) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <dt className="text-[11px] text-[#7A8A84]">
                    {f.label}
                    <span className="ml-1 text-[10px]">· {f.source}</span>
                  </dt>
                  <dd>
                    {f.source === 'parent to provide' ? (
                      <input
                        type="text"
                        value={f.value}
                        aria-label={f.label}
                        placeholder="Parent to provide"
                        onChange={(e) =>
                          update({
                            fields: draft.fields.map((x, j) => (j === i ? { ...x, value: e.target.value, editedByParent: true } : x)),
                          })
                        }
                        className="w-full rounded-lg border border-[#EADBB8] bg-[#FDF3DD] px-2.5 py-1.5 text-sm text-[#173F42] placeholder-[#B38F3F] focus:outline-hidden focus:ring-2 focus:ring-[#E7D6A8]"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#173F42]">{f.value}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Checklist */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6B66] mb-2">
              Checklist from {centre.name}&apos;s policy
            </p>
            <ul className="space-y-2.5">
              {draft.checklist.map((c, i) => (
                <li key={c.requirement} className="rounded-xl border border-[#E7E4DA] bg-white p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#173F42]">{c.requirement}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold border px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                        {c.setBy === 'parent' ? ' · your choice' : ''}
                      </span>
                      <select
                        aria-label={`Change status for ${c.requirement}`}
                        value={c.status}
                        onChange={(e) =>
                          update({
                            checklist: draft.checklist.map((x, j) =>
                              j === i ? { ...x, status: e.target.value as ChecklistStatus, setBy: 'parent' } : x
                            ),
                          })
                        }
                        className="rounded-md border border-[#E7E4DA] bg-white px-1.5 py-0.5 text-[11px] text-[#5B6B66]"
                      >
                        {CHECKLIST_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {c.matchedDocument && (
                    <p className="text-[11px] text-[#4E7A5A] flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5" /> Matched document: {c.matchedDocument}
                    </p>
                  )}
                  {c.status === 'needs parent check' && (
                    <label className="flex items-center gap-2 text-xs text-[#5A4A85] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(c.parentConfirmed)}
                        onChange={(e) =>
                          update({
                            checklist: draft.checklist.map((x, j) => (j === i ? { ...x, parentConfirmed: e.target.checked } : x)),
                          })
                        }
                      />
                      I confirm this applies to us (CareQ can&apos;t check this)
                    </label>
                  )}
                  <blockquote className="flex gap-2 border-l-2 border-[#D9E4D3] pl-2.5 text-[11px] italic text-[#5B6B66]">
                    <Quote className="w-3 h-3 shrink-0 mt-0.5 text-[#9DBB86]" />
                    <span>
                      {c.sourceSentence}
                      {centre.requirementCitations?.[c.requirement] && (
                        <span className="not-italic text-[#7A8A84]"> ({centre.requirementCitations[c.requirement]})</span>
                      )}
                    </span>
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>

          {draft.missingItems.length > 0 && (
            <div className="rounded-xl bg-[#FDF3DD]/60 border border-[#EADBB8] p-3">
              <p className="text-xs font-semibold text-[#8A6411] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Still to do
              </p>
              <ul className="mt-1 text-xs text-[#5B4A2E] list-disc pl-5 space-y-0.5">
                {draft.missingItems.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Note */}
          <div>
            <label htmlFor={`note-${app.id}`} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6B66]">
              Note to {centre.name} (optional)
            </label>
            <textarea
              id={`note-${app.id}`}
              rows={3}
              value={draft.noteToCentre}
              onChange={(e) => update({ noteToCentre: e.target.value, noteEditedByParent: true })}
              className="mt-1 w-full rounded-xl border border-[#E7E4DA] bg-white p-2.5 text-sm text-[#173F42] focus:outline-hidden focus:ring-2 focus:ring-[#CBD9C6]"
            />
          </div>
          <p className="text-[11px] text-[#7A8A84]">Nothing is sent until you press “Approve and send” and confirm.</p>
        </section>
      )}
    </div>
  );
};
