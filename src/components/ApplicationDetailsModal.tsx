import React, { useState } from 'react';
import { Application, Centre, UploadedDocument } from '../data/mockData';
import { StatusBadge } from './StatusBadge';
import { NOT_PROVIDED, centreStatusLabel } from '../lib/prepareApplication';
import { X, FileText, FileCheck2, Eye, CheckCircle2, AlertCircle, Download, Printer, ZoomIn, ZoomOut, Calendar, Baby, User, MapPin, ShieldCheck, Building2, ExternalLink, MessageSquare, ArrowLeft, Stamp, PenLine } from 'lucide-react';

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: Application;
  centre: Centre;
  onOpenConversation: (app: Application) => void;
  onUpdateStatus?: (status: any, waitlistPos?: number) => void;
  /** Who is looking (status wording): defaults to the parent. */
  viewer?: 'parent' | 'centre';
}

export const ApplicationDetailsModal: React.FC<ApplicationDetailsModalProps> = ({
  isOpen,
  onClose,
  application,
  centre,
  onOpenConversation,
  onUpdateStatus,
  viewer = 'parent',
}) => {
  // Document preview state: null if viewing application overview, or document object if opened
  const [selectedDocReq, setSelectedDocReq] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const uploadedDocs = application.uploadedDocuments || {};
  const currentViewedDoc = selectedDocReq ? uploadedDocs[selectedDocReq] : null;

  // Toggle verification checkbox for centre staff
  const handleToggleVerify = (reqName: string) => {
    setVerifiedDocs((prev) => ({
      ...prev,
      [reqName]: !prev[reqName],
    }));
  };

  // Helper to determine document type for realistic rendering
  const getDocType = (reqName: string) => {
    const lower = reqName.toLowerCase();
    if (lower.includes('birth') || lower.includes('age') || lower.includes('passport')) return 'birth_cert';
    if (lower.includes('immuniz') || lower.includes('yellow') || lower.includes('ispa') || lower.includes('vaccin'))
      return 'immunization';
    if (lower.includes('residency') || lower.includes('address')) return 'residency';
    if (lower.includes('emergency') || lower.includes('consent')) return 'emergency_consent';
    if (lower.includes('health') || lower.includes('physician') || lower.includes('medical') || lower.includes('allergy'))
      return 'medical';
    return 'general';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-ink/45">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[92vh] max-h-[820px] flex flex-col shadow-2xl border border-cq-stone-200 overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-cq-stone-200 bg-cq-stone-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cq-teal-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Baby className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-cq-stone-900">
                  Application File: {application.childName} ({application.childAgeMonths} months)
                </h2>
                <StatusBadge
                  status={application.status}
                  waitlistPosition={application.waitlistPosition}
                  size="sm"
                  viewer={viewer}
                />
              </div>
              <p className="text-xs text-cq-stone-500 mt-0.5">
                Parent: <strong>{application.parentName}</strong> • Submitted to {centre.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenConversation(application)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-cq-teal-300 bg-cq-teal-50 text-cq-teal-800 hover:bg-cq-teal-100 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cq-teal-700" />
              <span>Message Parent</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-cq-stone-400 hover:text-cq-stone-700 hover:bg-cq-stone-200/60 rounded-lg transition-colors ml-1"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Either Document Viewer Viewport or Application Overview */}
        {selectedDocReq && currentViewedDoc ? (
          /* =======================================================
             DOCUMENT VIEWER VIEWPORT (Open and inspect document)
             ======================================================= */
          <div className="flex-1 flex flex-col bg-cq-stone-100 overflow-hidden">
            {/* Document inspection toolbar */}
            <div className="bg-white border-b border-cq-stone-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDocReq(null)}
                  className="px-2.5 py-1 text-xs font-semibold text-cq-stone-700 hover:bg-cq-stone-100 rounded-md border border-cq-stone-200 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Documents List</span>
                </button>
                <div className="h-4 w-px bg-cq-stone-200 mx-1"></div>
                <div className="text-xs">
                  <span className="font-bold text-cq-stone-900">{selectedDocReq}</span>
                  <span className="text-cq-stone-400 ml-2">({currentViewedDoc.fileName})</span>
                </div>
              </div>

              {/* Viewport controls */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-cq-stone-100 border border-cq-stone-200 rounded-lg px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                    className="p-1 hover:text-cq-stone-900 text-cq-stone-600"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-xs px-1 text-cq-stone-700">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                    className="p-1 hover:text-cq-stone-900 text-cq-stone-600"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleVerify(selectedDocReq)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    verifiedDocs[selectedDocReq]
                      ? 'bg-cq-emerald-100 text-cq-emerald-900 border-cq-emerald-300'
                      : 'bg-white hover:bg-cq-stone-50 text-cq-stone-700 border-cq-stone-300'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${verifiedDocs[selectedDocReq] ? 'text-cq-emerald-700' : 'text-cq-stone-400'}`} />
                  <span>{verifiedDocs[selectedDocReq] ? 'Verified by Staff' : 'Mark as Verified'}</span>
                </button>
              </div>
            </div>

            {/* Document Content Sheet */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start">
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                className="w-full max-w-2xl bg-white rounded-xl shadow-lg border border-cq-stone-300 p-8 sm:p-10 transition-transform duration-150 space-y-6 text-cq-stone-800"
              >
                {/* Every document opens as a sample: no real file contents or personal data are stored */}
                <p className="text-xs font-semibold text-cq-stone-500 text-center">
                  Sample document preview • fictional details
                </p>
                {/* 1. BIRTH CERTIFICATE TEMPLATE */}
                {getDocType(selectedDocReq) === 'birth_cert' && (
                  <div className="space-y-6 font-serif border-4 border-double border-cq-stone-300 p-6 sm:p-8 bg-cq-amber-50/15">
                    {/* Header */}
                    <div className="text-center border-b pb-4 border-cq-stone-300 space-y-1">
                      <div className="flex justify-center mb-1">
                        <div className="w-12 h-12 rounded-full border-2 border-cq-stone-800 flex items-center justify-center font-bold text-xs">
                          ONTARIO
                        </div>
                      </div>
                      <h3 className="text-xs font-sans font-semibold text-cq-stone-500">
                        Province of Ontario • Canada
                      </h3>
                      <h4 className="text-lg font-bold text-cq-stone-900">
                        Certificate of Birth / Certificat de Naissance
                      </h4>
                      <p className="text-xs font-sans text-cq-stone-400">
                        Issued under the Vital Statistics Act • Office of the Registrar General
                      </p>
                    </div>

                    {/* Registration details */}
                    <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Child's Full Name:
                        </span>
                        <span className="font-bold text-cq-stone-900 text-sm">
                          {application.childName.toUpperCase()} PATEL
                        </span>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Registration Number:
                        </span>
                        <span className="font-mono text-cq-stone-800">2025-05-081944</span>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Date of Birth:
                        </span>
                        <span className="font-semibold text-cq-stone-900">
                          January 14, 2025 (22 months)
                        </span>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Place of Birth:
                        </span>
                        <span className="font-semibold text-cq-stone-800">
                          Toronto, Ontario, Canada
                        </span>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Parent / Legal Guardian:
                        </span>
                        <span className="font-semibold text-cq-stone-900">
                          {application.parentName} Patel
                        </span>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block font-semibold">
                          Date Registered:
                        </span>
                        <span className="font-semibold text-cq-stone-800">
                          January 20, 2025
                        </span>
                      </div>
                    </div>

                    {/* Official Seal Stamp */}
                    <div className="pt-6 border-t border-cq-stone-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-cq-teal-800 flex items-center justify-center p-1 text-center rotate-[-12deg]">
                          <span className="text-xs font-sans font-bold text-cq-teal-900 leading-none">
                            OFFICIAL SEAL • REGISTRAR GENERAL ONTARIO
                          </span>
                        </div>
                        <div className="text-xs font-sans text-cq-stone-500">
                          Authenticity Verified for Child Care Intake
                        </div>
                      </div>
                      <div className="text-right text-xs font-sans">
                        <span className="border-b border-cq-stone-400 inline-block w-32 pb-1 font-signature text-cq-stone-700">
                          M. Richardson
                        </span>
                        <div className="text-xs text-cq-stone-400">Deputy Registrar General</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. YELLOW IMMUNIZATION CARD TEMPLATE (ISPA) */}
                {getDocType(selectedDocReq) === 'immunization' && (
                  <div className="space-y-5 border-4 border-cq-amber-300 p-6 sm:p-8 bg-cq-amber-50/40 rounded-lg">
                    {/* Header */}
                    <div className="border-b-2 border-cq-amber-400 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-cq-amber-900">
                          Ministry of Health • Ontario
                        </h3>
                        <h4 className="text-base font-bold text-cq-stone-900">
                          Record of Protection / Immunization Record (Yellow Card)
                        </h4>
                        <p className="text-xs text-cq-stone-600">
                          Immunization of School Pupils Act (ISPA) & Child Care and Early Years Act (CCEYA) Compliance
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-cq-amber-200 text-cq-amber-900 flex items-center justify-center font-bold text-xs">
                        ISPA
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-cq-amber-200">
                      <div>
                        <span className="text-cq-stone-400 text-xs block">Child's Name:</span>
                        <strong className="text-cq-stone-900">{application.childName} Patel</strong>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block">Date of Birth:</span>
                        <strong className="text-cq-stone-900">Jan 14, 2025</strong>
                      </div>
                      <div>
                        <span className="text-cq-stone-400 text-xs block">Ontario Health (OHIP):</span>
                        <span className="font-mono text-cq-stone-800">9841-029-411-YX</span>
                      </div>
                    </div>

                    {/* Vaccine Dose Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-cq-amber-200">
                        <thead className="bg-cq-amber-100 text-cq-amber-950 text-xs font-bold">
                          <tr>
                            <th className="p-2 border border-cq-amber-200">Vaccine Designation</th>
                            <th className="p-2 border border-cq-amber-200">Dose 1</th>
                            <th className="p-2 border border-cq-amber-200">Dose 2</th>
                            <th className="p-2 border border-cq-amber-200">Dose 3 / Booster</th>
                            <th className="p-2 border border-cq-amber-200">Provider Stamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-cq-amber-100 bg-white">
                          <tr>
                            <td className="p-2 font-medium">DTaP-IPV-Hib (5-in-1)</td>
                            <td className="p-2 font-mono text-xs">Mar 15, 2025</td>
                            <td className="p-2 font-mono text-xs">May 18, 2025</td>
                            <td className="p-2 font-mono text-xs">Jul 20, 2025 (D3)</td>
                            <td className="p-2 text-cq-teal-800 font-semibold text-xs">✓ Dr. Lin, MD</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium">MMR (Measles, Mumps, Rubella)</td>
                            <td className="p-2 font-mono text-xs">Jan 16, 2026</td>
                            <td className="p-2 text-cq-stone-400 text-xs">Due at 4 yrs</td>
                            <td className="p-2 text-cq-stone-400 text-xs">—</td>
                            <td className="p-2 text-cq-teal-800 font-semibold text-xs">✓ Toronto Public Health</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium">Varicella (Chickenpox)</td>
                            <td className="p-2 font-mono text-xs">Apr 12, 2026</td>
                            <td className="p-2 text-cq-stone-400 text-xs">Due at 4 yrs</td>
                            <td className="p-2 text-cq-stone-400 text-xs">—</td>
                            <td className="p-2 text-cq-teal-800 font-semibold text-xs">✓ East York Clinic</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-medium">Pneumococcal (Pneu-C-13)</td>
                            <td className="p-2 font-mono text-xs">Mar 15, 2025</td>
                            <td className="p-2 font-mono text-xs">May 18, 2025</td>
                            <td className="p-2 font-mono text-xs">Jan 16, 2026</td>
                            <td className="p-2 text-cq-teal-800 font-semibold text-xs">✓ Dr. Lin, MD</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="p-2.5 bg-cq-emerald-50 border border-cq-emerald-200 rounded text-xs text-cq-emerald-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-cq-emerald-700 shrink-0" />
                      <span>All age-mandatory immunizations up to 22 months are fully completed and verified for daycare admission.</span>
                    </div>
                  </div>
                )}

                {/* 3. PROOF OF TORONTO RESIDENCY TEMPLATE */}
                {getDocType(selectedDocReq) === 'residency' && (
                  <div className="space-y-5 border border-cq-stone-300 p-6 sm:p-8 bg-white shadow-2xs">
                    <div className="flex items-start justify-between border-b pb-4 border-cq-stone-200">
                      <div>
                        <div className="text-lg font-black text-cq-teal-900">
                          TORONTO HYDRO-ELECTRIC SYSTEM
                        </div>
                        <div className="text-xs text-cq-stone-500">
                          City of Toronto Municipal Services Utility Statement
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="font-bold text-cq-stone-900">STATEMENT OF SERVICE</div>
                        <div className="text-cq-stone-500">Date: September 28, 2026</div>
                      </div>
                    </div>

                    <div className="bg-cq-stone-50 p-4 rounded-lg border border-cq-stone-200 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-xs text-cq-stone-400 font-semibold block">Customer Name:</span>
                        <span className="font-bold text-cq-stone-900 text-sm">{application.parentName} Patel</span>
                      </div>
                      <div>
                        <span className="text-xs text-cq-stone-400 font-semibold block">Account Status:</span>
                        <span className="text-cq-emerald-700 font-bold">Active • Good Standing</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-cq-stone-400 font-semibold block">Service & Residential Address:</span>
                        <span className="font-bold text-cq-stone-900 text-sm block">
                          123 Sample Street, Toronto, ON (fictional)
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-cq-teal-50/50 border border-cq-teal-200 rounded text-xs text-cq-teal-900">
                      <strong>Residency Validation:</strong> Address verified within the priority intake zone for {centre.name}.
                    </div>
                  </div>
                )}

                {/* 4. EMERGENCY CONSENT FORM TEMPLATE */}
                {getDocType(selectedDocReq) === 'emergency_consent' && (
                  <div className="space-y-5 border border-cq-stone-300 p-6 sm:p-8 bg-white">
                    <div className="text-center border-b pb-3 border-cq-stone-200">
                      <h3 className="text-sm font-bold text-cq-stone-700">
                        {centre.name}
                      </h3>
                      <h4 className="text-base font-bold text-cq-stone-900">
                        Emergency Medical Authorization & Treatment Release
                      </h4>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-cq-stone-50 rounded border border-cq-stone-200 grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-cq-stone-400 block text-xs">Child Enrolled:</span>
                          <strong>{application.childName} Patel</strong> (22 mos)
                        </div>
                        <div>
                          <span className="text-cq-stone-400 block text-xs">Program:</span>
                          <strong>Toddler Full-Time</strong>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="font-bold text-cq-stone-800 text-xs">
                          Designated Emergency Contacts:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="p-2.5 bg-cq-stone-50 rounded border border-cq-stone-200">
                            <strong>1. {application.parentName} Patel (Mother)</strong>
                            <div className="text-cq-stone-500 text-xs">(416) 555-0182 • Mobile</div>
                          </div>
                          <div className="p-2.5 bg-cq-stone-50 rounded border border-cq-stone-200">
                            <strong>2. Vikram Patel (Father)</strong>
                            <div className="text-cq-stone-500 text-xs">(416) 555-0199 • Work/Mobile</div>
                          </div>
                        </div>
                      </div>

                      <p className="text-cq-stone-600 leading-relaxed text-xs pt-2">
                        In the event of an emergency requiring immediate medical attention, I hereby authorize {centre.name} staff to seek emergency medical treatment at Michael Garron Hospital or The Hospital for Sick Children (SickKids).
                      </p>

                      <div className="pt-4 border-t border-cq-stone-200 flex justify-between items-end">
                        <div>
                          <div className="font-signature text-base text-cq-stone-800">{application.parentName} Patel</div>
                          <div className="text-xs text-cq-stone-400">Signed Electronically via CareQ Portal</div>
                        </div>
                        <div className="text-right text-xs text-cq-stone-500">
                          Date: {currentViewedDoc.uploadedAt}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. GENERAL / MEDICAL TEMPLATE */}
                {getDocType(selectedDocReq) === 'medical' || getDocType(selectedDocReq) === 'general' ? (
                  <div className="space-y-5 border border-cq-stone-300 p-6 sm:p-8 bg-white">
                    <div className="border-b pb-3 border-cq-stone-200">
                      <h4 className="text-base font-bold text-cq-stone-900">{selectedDocReq}</h4>
                      <p className="text-xs text-cq-stone-500">Intake Document for {application.childName}</p>
                    </div>
                    <div className="p-4 bg-cq-stone-50 rounded-lg border border-cq-stone-200 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-cq-stone-500">File Name:</span>
                        <span className="font-mono font-medium text-cq-stone-800">{currentViewedDoc.fileName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cq-stone-500">Size:</span>
                        <span>{currentViewedDoc.fileSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cq-stone-500">Submission Date:</span>
                        <span>{currentViewedDoc.uploadedAt}</span>
                      </div>
                    </div>
                    <p className="text-xs text-cq-stone-600 leading-relaxed">
                      Official document verified for child care intake purposes. All required signatures and medical certifications are attached and archived.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* =======================================================
             APPLICATION OVERVIEW & DOCUMENTS CHECKLIST
             ======================================================= */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Child and Family Overview Card */}
            <div className="bg-cq-stone-50 border border-cq-stone-200 rounded-xl p-4 sm:p-5">
              <h3 className="text-xs font-bold text-cq-stone-500 mb-3">
                Intake Profile & Applicant Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-cq-stone-400 block font-medium">Child Full Name:</span>
                  <span className="font-bold text-cq-stone-900 text-sm">{application.childName}</span>
                </div>
                <div>
                  <span className="text-cq-stone-400 block font-medium">Age & Program:</span>
                  <span className="font-semibold text-cq-stone-800">
                    {application.childAgeMonths} months ({application.childAgeMonths < 18 ? 'Infant' : application.childAgeMonths < 30 ? 'Toddler' : 'Preschool'})
                  </span>
                </div>
                <div>
                  <span className="text-cq-stone-400 block font-medium">Intake Target Start:</span>
                  <span className="font-semibold text-cq-stone-800">
                    {application.preferredStartDate} ({application.careType})
                  </span>
                </div>
                <div>
                  <span className="text-cq-stone-400 block font-medium">Primary Parent:</span>
                  <span className="font-semibold text-cq-stone-800">{application.parentName}</span>
                </div>
              </div>

              {application.parentNotes && (
                <div className="mt-3 pt-3 border-t border-cq-stone-200 text-xs text-cq-stone-600">
                  <span className="font-semibold text-cq-stone-700">Parent Notes / Special Requests:</span>
                  <p className="mt-0.5 italic text-cq-stone-500">"{application.parentNotes}"</p>
                </div>
              )}
            </div>

            {!application.preparedWithAi && application.noteToCentre && application.status !== 'Draft' && (
              <div className="rounded-xl border border-cq-stone-200 bg-white p-4 text-xs text-cq-stone-700">
                <span className="font-semibold">Note from the parent:</span>
                <p className="mt-1 italic text-cq-stone-600">&ldquo;{application.noteToCentre}&rdquo;</p>
              </div>
            )}

            {/* AI-prepared application, as approved and sent by the parent */}
            {application.preparedWithAi && application.status !== 'Draft' && (
              <div className="rounded-xl border border-cq-sand-line bg-cq-surface-cream p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-cq-stone-600">Application details from the parent</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-cq-band px-2 py-0.5 text-xs font-semibold text-cq-sand-ink">
                    <PenLine className="w-3.5 h-3.5" aria-hidden="true" /> Prepared with AI · approved by parent
                  </span>
                </div>

                {application.noteToCentre && (
                  <div className="text-xs text-cq-stone-700">
                    <span className="font-semibold">Note to the centre:</span>
                    <p className="mt-1 rounded-lg bg-white border border-cq-stone-200 p-2.5 italic text-cq-stone-600">
                      &ldquo;{application.noteToCentre}&rdquo;
                    </p>
                  </div>
                )}

                {application.preparedFields && application.preparedFields.length > 0 && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                    {application.preparedFields.map((f) => (
                      <div key={f.label}>
                        <dt className="text-cq-stone-400">{f.label}</dt>
                        <dd className={f.value === NOT_PROVIDED ? 'italic text-cq-stone-400' : 'font-semibold text-cq-stone-800'}>
                          {f.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {application.preparedChecklist && application.preparedChecklist.length > 0 && (
                  <ul className="space-y-1.5 text-xs">
                    {application.preparedChecklist.map((c) => (
                      <li
                        key={c.requirement}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-cq-stone-200 px-3 py-2"
                      >
                        <span className="font-medium text-cq-stone-800">{c.requirement}</span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            c.status === 'ready'
                              ? 'bg-cq-sage text-cq-sage-ink border-cq-sage-line'
                              : c.status === 'missing'
                              ? 'bg-cq-cream-amber text-cq-amber-ink border-cq-sand-line-2'
                              : 'bg-cq-lilac text-cq-lilac-ink-2 border-cq-lilac-line-2'
                          }`}
                        >
                          {centreStatusLabel(c)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Submitted Documents Section (Prompt: "centre should be able to view the application with the documents they submitted. and to be able to open and see it.") */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-cq-stone-800">
                    Submitted Intake Documentation ({Object.keys(uploadedDocs).length} / {centre.requirements.length})
                  </h3>
                  <p className="text-xs text-cq-stone-500 mt-0.5">
                    Click "Open & Inspect Document" on any submitted file to view the verified certificate or form.
                  </p>
                </div>

                <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cq-teal-50 text-cq-teal-800 border border-cq-teal-200">
                  {Object.keys(uploadedDocs).length === centre.requirements.length
                    ? 'All Requirements Provided'
                    : `${centre.requirements.length - Object.keys(uploadedDocs).length} Missing`}
                </div>
              </div>

              {/* Requirements Documents Cards */}
              <div className="space-y-2.5">
                {centre.requirements.map((req) => {
                  const doc = uploadedDocs[req];
                  const isVerified = verifiedDocs[req];

                  return (
                    <div
                      key={req}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        doc
                          ? 'bg-white border-cq-stone-200 shadow-2xs hover:border-cq-teal-300'
                          : 'bg-cq-stone-50/60 border-cq-stone-200 text-cq-stone-500'
                      }`}
                    >
                      {/* Document info */}
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg mt-0.5 ${doc ? 'bg-cq-teal-100/80 text-cq-teal-800' : 'bg-cq-stone-100 text-cq-stone-400'}`}>
                          {doc ? <FileCheck2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-cq-stone-900 text-sm">
                              {req}
                            </span>
                            {doc ? (
                              <span className="text-xs font-bold text-cq-emerald-800 bg-cq-emerald-100 border border-cq-emerald-300 px-2 py-0.5 rounded-full">
                                Submitted
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-cq-rose-700 bg-cq-rose-50 border border-cq-rose-200 px-2 py-0.5 rounded-full">
                                Not Submitted
                              </span>
                            )}

                            {isVerified && (
                              <span className="text-xs font-semibold text-cq-teal-800 bg-cq-teal-100 border border-cq-teal-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-cq-teal-700" /> Staff Verified
                              </span>
                            )}
                          </div>

                          {doc ? (
                            <p className="text-xs text-cq-stone-500 mt-0.5">
                              File: <span className="font-mono text-cq-stone-700">{doc.fileName}</span> • {doc.fileSize} • Uploaded {doc.uploadedAt}
                            </p>
                          ) : (
                            <p className="text-xs text-cq-stone-400 mt-0.5">
                              Waiting for parent upload via portal.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action to Open & View */}
                      <div className="shrink-0 flex items-center gap-2 self-start sm:self-auto">
                        {doc ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDocReq(req)}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-cq-brand hover:bg-cq-brand-hover text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                            title="Open document in full inspection viewer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open & View Document</span>
                          </button>
                        ) : (
                          <span className="text-xs text-cq-stone-400 italic px-2">
                            No file available
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Bar */}
        <div className="p-4 border-t border-cq-stone-200 bg-cq-stone-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-cq-stone-500">
            {selectedDocReq ? (
              <span>Viewing document for <strong>{application.childName} Patel</strong>.</span>
            ) : (
              <span>Managing application file for <strong>{centre.name}</strong>.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-cq-stone-700 hover:bg-cq-stone-200/70 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
