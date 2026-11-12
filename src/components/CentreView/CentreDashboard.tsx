import { checklistSummary } from "../../lib/checklist";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shortRef } from "../../lib/centreQueue";
import { withdrawalLabel } from "../../lib/offers";
import { EmptyState, SpotChecklist } from "../ui/Illustrations";
import { Centre, Application, ApplicationStatus } from "../../data/mockData";
import { StatusBadge } from "../StatusBadge";
import { ApplicationDetailsModal } from "../ApplicationDetailsModal";
import { HelpTab } from "../HelpTab";
import { SupportRequest } from "../../data/helpData";
import {
	PageHeader,
	Card,
	PrimaryButton,
	GhostButton,
	IconTile,
	Eyebrow,
	SimNote,
	AiFallbackNote,
	AiMode,
	AiNotice,
} from "../ui/CareUI";
import {
	AI_OFFLINE_STATUS,
	aiPost,
	isUserFacingAiError,
} from "../../lib/aiFetch";
import {
	CheckCircle2,
	Calendar,
	User,
	Plus,
	Trash2,
	Edit2,
	Check,
	Quote,
	Loader2,
	MessageSquare,
	FileCheck2,
	Eye,
	Heart,
	X,
	PenLine,
	Gift,
	ArrowRight,
	ChevronDown,
} from "lucide-react";

interface ExtractedRequirement {
	requirement: string;
	sourceSentence: string;
	/** Set when the requirement comes from a published document (verified verbatim quote). */
	docKey?: string;
	docTitle?: string;
	page?: string;
	sourceUrl?: string | null;
	sourceNote?: string | null;
}

/** A document indexed for this centre (GET /api/centres/:id/documents). */
interface CentreDocument {
	docKey: string;
	docTitle: string;
	operatorName: string;
	sourceUrl: string | null;
	sourceNote: string | null;
	pages: number;
	chunks: number;
	uploaded: boolean;
}

interface CentreDashboardProps {
	singleCentre: Centre;
	applications: Application[];
	onUpdateStatus: (
		applicationId: string,
		newStatus: ApplicationStatus,
		waitlistPosition?: number,
		waitlistEstimate?: string
	) => void;
	/** Waitlisted only: change just the wait estimate (blank clears it). */
	onUpdateEstimate: (applicationId: string, estimate: string) => void;
	onUpdateCentreRequirements: (
		centreId: string,
		newRequirements: string[],
		requirementSources?: Record<string, string>,
		citations?: Record<string, { citation: string; sourceUrl?: string | null }>,
		extractedFrom?: {
			docTitle: string;
			sourceUrl?: string | null;
			sourceNote?: string | null;
		}
	) => void;
	onOpenConversation: (application: Application) => void;
	requests: SupportRequest[];
	onSubmitRequest: (
		newReq: Omit<SupportRequest, "id" | "referenceNumber" | "submittedAt">
	) => void;
	onAdvanceConcernStep: (requestId: string) => void;
	activeTab?: "applications" | "policy" | "help";
	onTabChange?: (t: "applications" | "policy" | "help") => void;
	/** Policy text to read with AI as soon as the policy tab opens (after centre registration). */
	autoReadPolicyText?: string | null;
	onAutoReadPolicyStarted?: () => void;
	/** A document to read with AI as soon as the policy tab opens (after a centre uploads one at sign-up). */
	autoReadDocKey?: string | null;
	onAutoReadDocStarted?: () => void;
}

export const CentreDashboard: React.FC<CentreDashboardProps> = ({
	singleCentre,
	applications,
	onUpdateStatus,
	onUpdateEstimate,
	onUpdateCentreRequirements,
	onOpenConversation,
	requests,
	onSubmitRequest,
	onAdvanceConcernStep,
	activeTab,
	onTabChange,
	autoReadPolicyText,
	onAutoReadPolicyStarted,
	autoReadDocKey,
	onAutoReadDocStarted,
}) => {
	// Centre View internal tabs: 'applications' | 'policy' | 'help'
	const [internalCentreTab, setInternalCentreTab] = useState<
		"applications" | "policy" | "help"
	>("applications");
	const centreTab = activeTab ?? internalCentreTab;
	const setCentreTab = onTabChange ?? setInternalCentreTab;

	// Application sub-filter tab
	const [appSubFilter, setAppSubFilter] = useState<
		"all" | "review" | "waitlist" | "offers"
	>("all");

	// Single expanded row in the applications table
	const [expandedAppId, setExpandedAppId] = useState<string | null>(null);

	// Waitlist position modal state
	const [waitlistModalAppId, setWaitlistModalAppId] = useState<string | null>(
		null
	);
	const [positionInput, setPositionInput] = useState<number>(14);
	const [waitEstimateInput, setWaitEstimateInput] =
		useState<string>("8–12 months");
	// "Edit estimate" dialog: only the estimate, for a waitlisted application
	const [estimateModalAppId, setEstimateModalAppId] = useState<string | null>(
		null
	);
	const [estimateInput, setEstimateInput] = useState<string>("");
	const [lastActionMessage, setLastActionMessage] = useState<string | null>(
		null
	);

	// Application & Document Viewer modal state
	const [selectedAppForDetails, setSelectedAppForDetails] =
		useState<Application | null>(null);

	// Policy text and AI extraction state
	const [policyInputText, setPolicyInputText] = useState<string>(() =>
		// A self-registered centre starts from its own policy text; demo centres keep the sample policy
		singleCentre.registration
			? singleCentre.registration.policyText ?? ""
			: `${singleCentre.name} - 2026/2027 CWELCC Intake & Admission Policy.
Pursuant to the Ontario Child Care and Early Years Act (CCEYA), every child admitted into the toddler or preschool program must submit an official Birth Certificate or Canadian passport verifying age.
Parents must present a verified Yellow Immunization Card in compliance with Immunization of School Pupils Act (ISPA) prior to the first day of care.
To qualify for Toronto municipal operating guidelines, parents must provide Proof of Ontario Residency via a recent residential utility bill or lease agreement.
All families must complete and execute the signed Emergency Contact & Medical Release Form with two local emergency contacts.
For children with known anaphylactic allergies or dietary requirements, a Physician's Anaphylaxis Emergency Protocol must be provided.
A signed Photography & Media Consent Form is required for classroom developmental documentation.`
	);
	const [isExtracting, setIsExtracting] = useState<boolean>(false);
	const [extractedRequirements, setExtractedRequirements] = useState<
		ExtractedRequirement[] | null
	>(null);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);
	const [editingText, setEditingText] = useState<string>("");
	const [policyUpdateSuccess, setPolicyUpdateSuccess] =
		useState<boolean>(false);
	const [extractAiMode, setExtractAiMode] = useState<AiMode | null>(null);
	const [aiNotice, setAiNotice] = useState<string | null>(null);

	// "Load a published document": documents indexed for this centre (shared database only; null = unavailable)
	const [centreDocs, setCentreDocs] = useState<CentreDocument[] | null>(null);
	const [selectedDocKey, setSelectedDocKey] = useState<string>("");
	const [docsReloadKey, setDocsReloadKey] = useState(0);
	useEffect(() => {
		if (centreTab !== "policy") return;
		let cancelled = false;
		fetch(`/api/centres/${encodeURIComponent(singleCentre.id)}/documents`, {
			credentials: "same-origin",
		})
			.then((r) => (r.ok ? r.json() : null))
			.then((data: { documents?: CentreDocument[] } | null) => {
				if (cancelled) return;
				const docs = data?.documents ?? null;
				setCentreDocs(docs);
				if (docs?.length)
					setSelectedDocKey((k) =>
						docs.some((d) => d.docKey === k) ? k : docs[0].docKey
					);
			})
			.catch(() => !cancelled && setCentreDocs(null));
		return () => {
			cancelled = true;
		};
	}, [centreTab, singleCentre.id, docsReloadKey]);

	// Applications specifically for this single centre
	// Only applications the parent has sent: drafts are never visible to the centre
	const centreApplications = applications.filter(
		(app) => app.centreId === singleCentre.id && app.status !== "Draft"
	);

	// Filtered applications by sub-filter
	const filteredApps = centreApplications.filter((app) => {
		if (appSubFilter === "review") {
			return app.status === "Submitted" || app.status === "Under review";
		}
		if (appSubFilter === "waitlist") {
			return app.status === "Waitlisted";
		}
		if (appSubFilter === "offers") {
			return app.status === "Offer" || app.status === "Accepted";
		}
		return true;
	});

	const handleSetStatus = (
		appId: string,
		status: ApplicationStatus,
		childName: string,
		pos?: number,
		estimate?: string
	) => {
		onUpdateStatus(appId, status, pos, estimate);
		const posStr = pos
			? ` (Waitlist position #${pos}${
					estimate ? `, estimate: ${estimate}` : ""
			  })`
			: "";
		setLastActionMessage(
			`Updated ${childName}'s application to "${status}"${posStr}. Changes are active in the portal.`
		);
	};

	// Call Gemini to extract policy requirements (text can be passed in, e.g. right after registration)
	const handleExtractRequirements = async (textOverride?: unknown) => {
		const text =
			typeof textOverride === "string" ? textOverride : policyInputText;
		if (!text.trim()) return;

		setIsExtracting(true);
		setPolicyUpdateSuccess(false);

		setAiNotice(null);
		const result = await aiPost<{
			success?: boolean;
			requirements?: ExtractedRequirement[];
			aiMode?: AiMode;
		}>("/api/extract-policy-requirements", { policyText: text });
		if (result.ok && result.data.success && result.data.requirements) {
			setExtractedRequirements(result.data.requirements);
			setExtractAiMode(result.data.aiMode ?? null);
		} else if (!result.ok && result.status === AI_OFFLINE_STATUS) {
			setAiNotice(
				"Offline demo: the AI policy reader is unavailable (basic mode). You can add requirements yourself."
			);
		} else if (!result.ok && isUserFacingAiError(result.status)) {
			setAiNotice(
				`${result.message} You can still add requirements yourself later.`
			);
		}
		setIsExtracting(false);
	};

	// Requirements from a published document: retrieved passages, each with a verified quote, page and title
	const handleExtractFromDocument = async (docKey: string) => {
		if (!docKey) return;
		setIsExtracting(true);
		setPolicyUpdateSuccess(false);
		setAiNotice(null);
		const result = await aiPost<{
			success?: boolean;
			aiMode?: AiMode;
			notice?: string;
			requirements?: {
				requirement: string;
				quote: string;
				docKey: string;
				docTitle: string;
				page: string;
				sourceUrl: string | null;
				sourceNote: string | null;
			}[];
		}>(
			`/api/centres/${encodeURIComponent(
				singleCentre.id
			)}/extract-from-documents`,
			{ docKey }
		);
		if (result.ok && result.data.success) {
			const reqs = result.data.requirements ?? [];
			setExtractedRequirements(
				reqs.map((r) => ({
					requirement: r.requirement,
					sourceSentence: r.quote,
					docKey: r.docKey,
					docTitle: r.docTitle,
					page: r.page,
					sourceUrl: r.sourceUrl,
					sourceNote: r.sourceNote,
				}))
			);
			setExtractAiMode(result.data.aiMode ?? null);
			if (!reqs.length)
				setAiNotice(
					result.data.notice ??
						"No requirements with a quote were found in this document. You can paste your policy instead."
				);
		} else if (!result.ok) {
			setAiNotice(
				isUserFacingAiError(result.status)
					? result.message
					: "Could not read this document right now."
			);
		}
		setIsExtracting(false);
	};

	// After a document upload at sign-up: read it with AI once (the centre still confirms)
	useEffect(() => {
		if (!autoReadDocKey) return;
		setSelectedDocKey(autoReadDocKey);
		setDocsReloadKey((n) => n + 1);
		onAutoReadDocStarted?.();
		handleExtractFromDocument(autoReadDocKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoReadDocKey]);

	// After registration: fill in the centre's own policy and read it with AI once (the centre still confirms)
	useEffect(() => {
		if (!autoReadPolicyText) return;
		setPolicyInputText(autoReadPolicyText);
		setExtractedRequirements(null);
		onAutoReadPolicyStarted?.();
		handleExtractRequirements(autoReadPolicyText);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [autoReadPolicyText]);

	// Confirm and replace centre requirements
	const handleConfirmReplaceRequirements = () => {
		if (!extractedRequirements || extractedRequirements.length === 0) return;
		const requirementTitles = extractedRequirements
			.map((r) => r.requirement.trim())
			.filter(Boolean);
		// Keep each requirement's source sentence so parents (and the application helper) can see where it came from
		const requirementSources = Object.fromEntries(
			extractedRequirements
				.filter((r) => r.requirement.trim())
				.map((r) => [r.requirement.trim(), r.sourceSentence.trim()])
		);
		// Requirements from a published document keep their page, document title and link
		const cited = extractedRequirements.filter(
			(r) => r.requirement.trim() && r.docTitle
		);
		const citations = Object.fromEntries(
			cited.map((r) => [
				r.requirement.trim(),
				{
					citation: `${r.docTitle}, ${r.page}`,
					sourceUrl: r.sourceUrl ?? null,
				},
			])
		);
		const extractedFrom = cited[0]
			? {
					docTitle: cited[0].docTitle!,
					sourceUrl: cited[0].sourceUrl ?? null,
					sourceNote: cited[0].sourceNote ?? null,
			  }
			: undefined;
		onUpdateCentreRequirements(
			singleCentre.id,
			requirementTitles,
			requirementSources,
			citations,
			extractedFrom
		);
		setPolicyUpdateSuccess(true);
		setLastActionMessage(
			`Successfully updated ${singleCentre.name}'s active requirements to ${requirementTitles.length} items.`
		);
	};

	// Edit single extracted requirement
	const handleStartEdit = (index: number, current: string) => {
		setEditingIndex(index);
		setEditingText(current);
	};

	const handleSaveEdit = (index: number) => {
		if (!extractedRequirements) return;
		const updated = [...extractedRequirements];
		updated[index] = { ...updated[index], requirement: editingText };
		setExtractedRequirements(updated);
		setEditingIndex(null);
	};

	const handleDeleteExtracted = (index: number) => {
		if (!extractedRequirements) return;
		const updated = extractedRequirements.filter((_, i) => i !== index);
		setExtractedRequirements(updated);
	};

	const handleAddCustomExtracted = () => {
		if (!extractedRequirements) return;
		setExtractedRequirements([
			...extractedRequirements,
			{
				requirement: "New Custom Prerequisite Document",
				sourceSentence: "Manually specified by centre administrator.",
			},
		]);
	};

	const getAgeGroup = (months: number) => {
		if (months < 18) return "Infant";
		if (months < 30) return "Toddler";
		return "Preschool";
	};

	const activeWaitlistApp = centreApplications.find(
		(a) => a.id === waitlistModalAppId
	);
	const activeEstimateApp = centreApplications.find(
		(a) => a.id === estimateModalAppId && a.status === "Waitlisted"
	);
	const openEstimate = (app: Application) => {
		setEstimateInput(app.waitlistEstimate ?? "");
		setEstimateModalAppId(app.id);
	};
	const saveEstimate = (app: Application) => {
		const next = estimateInput.trim();
		if (next !== (app.waitlistEstimate ?? "").trim()) {
			onUpdateEstimate(app.id, next);
			setLastActionMessage(
				next
					? `Updated ${app.childName}'s wait estimate to ${next}.`
					: `Removed ${app.childName}'s wait estimate.`
			);
		}
		setEstimateModalAppId(null);
	};
	// "Edit estimate" / "Add estimate", under the queue number of a waitlisted application
	const estimateLink = (app: Application) =>
		app.status === "Waitlisted" && (
			<button
				type="button"
				onClick={() => openEstimate(app)}
				aria-label={`${app.waitlistEstimate ? "Edit" : "Add"} wait estimate for ${app.childName}`}
				className="mt-1 flex w-fit items-center gap-1 text-xs font-semibold text-cq-secondary hover:underline cursor-pointer">
				<PenLine className="w-3 h-3" aria-hidden="true" />
				{app.waitlistEstimate ? "Edit estimate" : "Add estimate"}
			</button>
		);

	return (
		<div className="space-y-6 animate-fadeIn">
			{/* If activeTab is given, render lastActionMessage banner at the top if set */}
			{lastActionMessage && (
				<div className="rounded-2xl bg-cq-sage-75 border border-cq-sage-line px-5 py-4 text-sm text-cq-ink flex items-center justify-between gap-3 animate-fade-in shadow-2xs">
					<div className="flex items-center gap-2.5">
						<CheckCircle2 className="w-4 h-4 text-cq-sage-ink shrink-0" />
						<span className="font-semibold">{lastActionMessage}</span>
					</div>
					<button
						type="button"
						onClick={() => setLastActionMessage(null)}
						className="text-cq-soft hover:text-cq-ink text-xs p-1 cursor-pointer"
						aria-label="Dismiss message">
						✕
					</button>
				</div>
			)}

			{/* TAB 1: APPLICATIONS & QUEUE */}
			{centreTab === "applications" && (
				<div className="space-y-6">
					{/* 1. PageHeader */}
					<PageHeader
						title="Applications & queue"
						subtitle="Review applications, update statuses and record positions. Families see each update with your name and the date."
					/>

					{/* 3. Toolbar Row */}
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
						<div className="text-sm text-cq-ink-2">
							<span className="font-bold">
								{centreApplications.length} applications
							</span>
							{" · "}
							<span className="text-cq-sage-ink font-semibold">
								{singleCentre.name}
							</span>
						</div>

						<div className="flex items-center gap-2 self-start sm:self-auto">
							<span className="text-xs text-cq-muted font-medium">Status</span>
							<select
								value={appSubFilter}
								onChange={(e) => setAppSubFilter(e.target.value as any)}
								aria-label="Filter applications by status"
								className="h-10 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink cursor-pointer">
								<option value="all">All statuses</option>
								<option value="review">Needs review</option>
								<option value="waitlist">Waitlist</option>
								<option value="offers">Offers</option>
							</select>
						</div>
					</div>

					{/* 4. Table in Card p-0 overflow-hidden */}
					{centreApplications.length === 0 ? (
						<Card>
							<EmptyState title="No applications yet" spot={<SpotChecklist />}>
								When families apply to {singleCentre.name} through CareQ, their
								applications will appear here.
							</EmptyState>
						</Card>
					) : filteredApps.length === 0 ? (
						<Card className="py-10 text-center text-sm text-ink-muted">
							No applications match this status filter.
						</Card>
					) : (
						<div className="space-y-4">
							{/* Desktop Table (md+) */}
							<div className="hidden md:block">
								<Card className="p-0 overflow-hidden shadow-2xs">
									{/* Table Header Row */}
									<div className="grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center bg-page border-b border-cq-line px-6 py-3">
										<Eyebrow className="text-xs">Child / family</Eyebrow>
										<Eyebrow className="text-xs">Program / start</Eyebrow>
										<Eyebrow className="text-xs">Status</Eyebrow>
										<Eyebrow className="text-xs">Queue</Eyebrow>
										<Eyebrow className="text-xs text-right">Actions</Eyebrow>
									</div>

									{/* Rows */}
									<div className="divide-y divide-cq-line">
										{filteredApps.map((app) => {
											const isExpanded = expandedAppId === app.id;
											const hasPosition =
												typeof app.waitlistPosition === "number" &&
												app.waitlistPosition > 0;
											const isOffer = app.status === "Offer";
											const isAccepted = app.status === "Accepted";
											const isWithdrawn = app.status === "Withdrawn";
											const isUnderReview = app.status === "Under review";
											const isWaitlisted = app.status === "Waitlisted";

											return (
												<div key={app.id}>
													{/* Main Row */}
													<div
														className={`grid grid-cols-[2fr_1.4fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 transition-colors ${
															isExpanded ? "bg-mint-50" : "hover:bg-page"
														}`}>
														{/* Child / Family */}
														<div className="min-w-0 pr-2">
															<div className="text-sm font-bold text-cq-ink truncate">
																{app.childName}
															</div>
															<div className="text-xs text-ink-muted mt-0.5 truncate">
																{app.parentName} · {shortRef(app.id)}
															</div>
															{app.submittedAt && (
																<div className="text-xs text-cq-soft mt-0.5">
																	Received {app.submittedAt}
																</div>
															)}
														</div>

														{/* Program / Start */}
														<div>
															<div className="text-xs font-semibold text-cq-ink-2">
																{getAgeGroup(app.childAgeMonths)}
															</div>
															<div className="text-xs text-cq-soft mt-0.5">
																{app.careType} · {app.preferredStartDate}
															</div>
														</div>

														{/* Status */}
														<div>
															<StatusBadge
																status={app.status}
																size="sm"
																viewer="centre"
															/>
															{withdrawalLabel(app, "centre") && (
																<div className="text-xs text-cq-soft mt-1">
																	{withdrawalLabel(app, "centre")}
																</div>
															)}
														</div>

														{/* Queue */}
														<div>
															{hasPosition ? (
																<div>
																	<div className="text-2xl font-bold text-cq-sage-ink leading-tight">
																		#{app.waitlistPosition}
																	</div>
																	{app.waitlistEstimate && (
																		<div className="text-xs text-cq-soft mt-0.5 leading-tight">
																			Your estimate: {app.waitlistEstimate}
																		</div>
																	)}
																	{estimateLink(app)}
																</div>
															) : (
																<div className="text-xs text-cq-soft">
																	Not reported
																</div>
															)}
														</div>

														{/* Actions */}
														<div className="text-right">
															<GhostButton
																onClick={() =>
																	setExpandedAppId(isExpanded ? null : app.id)
																}
																className="h-9 px-4 text-xs">
																<>
																	{isExpanded ? "Close" : "Review"}
																	<ChevronDown
																		className={`w-4 h-4 transition-transform duration-200 ${
																			isExpanded ? "rotate-180" : ""
																		}`}
																		aria-hidden="true"
																	/>
																</>
															</GhostButton>
														</div>
													</div>

													{/* Expanded Review Panel */}
													{isExpanded && (
														<div className="bg-cq-page border-t border-cq-line px-6 py-5 space-y-4 animate-in fade-in-50 duration-150">
															<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cq-line">
																<div className="text-xs text-cq-muted">
																	<span className="font-bold text-cq-ink">
																		{app.childName} ({app.childAgeMonths} mos)
																	</span>
																	{" · "}
																	<span>Parent: {app.parentName}</span>
																	{" · "}
																	<span>
																		Docs verified:{" "}
																		{checklistSummary(app, singleCentre).ready} of{" "}
																		{checklistSummary(app, singleCentre).needed}
																		{checklistSummary(app, singleCentre).notApplicable > 0 &&
																			` (${checklistSummary(app, singleCentre).notApplicable} N/A)`}
																	</span>
																</div>

																{app.parentNotes && (
																	<p className="text-xs italic text-cq-muted bg-white px-3 py-1.5 rounded-lg border border-cq-line">
																		"{app.parentNotes}"
																	</p>
																)}
															</div>

															{/* Uploaded Documents Chips */}
															{Object.keys(app.uploadedDocuments || {}).length >
																0 && (
																<div className="flex flex-wrap items-center gap-2">
																	<span className="text-xs font-semibold text-cq-muted">
																		Received documents:
																	</span>
																	{Object.entries(
																		app.uploadedDocuments || {}
																	).map(([reqName, doc]) => (
																		<button
																			key={reqName}
																			type="button"
																			onClick={() =>
																				setSelectedAppForDetails(app)
																			}
																			className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-cq-sage text-cq-ink border border-cq-sage-line px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
																			title={`Inspect ${doc.fileName}`}>
																			<FileCheck2 className="w-3.5 h-3.5 text-cq-sage-ink" />
																			<span className="truncate max-w-[140px]">
																				{reqName}
																			</span>
																			<Eye className="w-3 h-3 text-cq-soft" />
																		</button>
																	))}
																</div>
															)}

															{/* Action Buttons Row */}
															<div className="flex flex-wrap items-center gap-2 pt-2">
																<GhostButton
																	onClick={() => setSelectedAppForDetails(app)}
																	className="h-9 text-xs">
																	<Eye className="w-3.5 h-3.5 mr-1 text-cq-brand" />
																	<span>View application &amp; docs</span>
																</GhostButton>

																<GhostButton
																	onClick={() => onOpenConversation(app)}
																	className="h-9 text-xs">
																	<MessageSquare className="w-3.5 h-3.5 mr-1 text-cq-brand" />
																	<span>Message family</span>
																</GhostButton>

																<GhostButton
																	disabled={
																		isUnderReview || isAccepted || isWithdrawn
																	}
																	onClick={() =>
																		handleSetStatus(
																			app.id,
																			"Under review",
																			app.childName
																		)
																	}
																	className="h-9 text-xs">
																	{isUnderReview ? (
																		<>
																			<Check
																				className="w-4 h-4"
																				aria-hidden="true"
																			/>{" "}
																			In review
																		</>
																	) : (
																		"Move to review"
																	)}
																</GhostButton>

																<PrimaryButton
																	noArrow
																	disabled={isAccepted || isWithdrawn}
																	onClick={() => {
																		setPositionInput(app.waitlistPosition || 5);
																		setWaitEstimateInput(
																			app.waitlistEstimate || "8–12 months"
																		);
																		setWaitlistModalAppId(app.id);
																	}}
																	className="h-9 text-xs">
																	{isWaitlisted
																		? `Waitlisted · #${app.waitlistPosition}`
																		: "Set position / estimate…"}
																</PrimaryButton>

																<PrimaryButton
																	noArrow
																	disabled={
																		isOffer || isAccepted || isWithdrawn
																	}
																	onClick={() =>
																		handleSetStatus(
																			app.id,
																			"Offer",
																			app.childName
																		)
																	}
																	className="h-9 text-xs">
																	<Gift
																		className="w-4 h-4"
																		aria-hidden="true"
																	/>
																	{isOffer ? "Offer pending" : "Make offer"}
																</PrimaryButton>
															</div>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</Card>
							</div>

							{/* Mobile Stacked Cards (md:hidden) */}
							<div className="md:hidden space-y-4">
								{filteredApps.map((app) => {
									const isExpanded = expandedAppId === app.id;
									const hasPosition =
										typeof app.waitlistPosition === "number" &&
										app.waitlistPosition > 0;
									const isOffer = app.status === "Offer";
									const isAccepted = app.status === "Accepted";
									const isWithdrawn = app.status === "Withdrawn";
									const isUnderReview = app.status === "Under review";
									const isWaitlisted = app.status === "Waitlisted";

									return (
										<Card key={app.id} className="p-4 space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div>
													<div className="text-sm font-bold text-cq-ink">
														{app.childName}
													</div>
													<div className="text-xs text-ink-muted mt-0.5">
														{app.parentName} · {shortRef(app.id)}
													</div>
													{app.submittedAt && (
														<div className="text-xs text-cq-soft mt-0.5">
															Received {app.submittedAt}
														</div>
													)}
													{withdrawalLabel(app, "centre") && (
														<div className="text-xs text-cq-soft mt-0.5">
															{withdrawalLabel(app, "centre")}
														</div>
													)}
												</div>
												<StatusBadge
													status={app.status}
													size="sm"
													viewer="centre"
												/>
											</div>

											<div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-cq-line">
												<div>
													<span className="text-xs font-semibold text-cq-muted block">
														Program
													</span>
													<span className="font-semibold text-cq-ink">
														{getAgeGroup(app.childAgeMonths)}
													</span>
													<span className="block text-xs text-cq-soft">
														{app.careType}
													</span>
												</div>

												<div>
													<span className="text-xs font-semibold text-cq-muted block">
														Queue
													</span>
													{hasPosition ? (
														<div>
															<span className="text-lg font-bold text-cq-sage-ink">
																#{app.waitlistPosition}
															</span>
															{app.waitlistEstimate && (
																<span className="block text-xs text-cq-soft">
																	Your estimate: {app.waitlistEstimate}
																</span>
															)}
															{estimateLink(app)}
														</div>
													) : (
														<span className="text-xs text-cq-soft">
															Not reported
														</span>
													)}
												</div>
											</div>

											<div className="pt-2 border-t border-cq-line flex justify-end">
												<GhostButton
													onClick={() =>
														setExpandedAppId(isExpanded ? null : app.id)
													}
													className="h-8 px-3 text-xs">
													<>
														{isExpanded ? "Close" : "Review"}
														<ChevronDown
															className={`w-4 h-4 transition-transform duration-200 ${
																isExpanded ? "rotate-180" : ""
															}`}
															aria-hidden="true"
														/>
													</>
												</GhostButton>
											</div>

											{isExpanded && (
												<div className="pt-3 border-t border-cq-line space-y-3">
													<div className="flex flex-wrap items-center gap-2">
														<GhostButton
															onClick={() => setSelectedAppForDetails(app)}
															className="h-8 text-xs">
															<Eye className="w-3 h-3 mr-1" />
															Docs
														</GhostButton>

														<GhostButton
															onClick={() => onOpenConversation(app)}
															className="h-8 text-xs">
															<MessageSquare className="w-3 h-3 mr-1" />
															Message
														</GhostButton>

														<GhostButton
															disabled={
																isUnderReview || isAccepted || isWithdrawn
															}
															onClick={() =>
																handleSetStatus(
																	app.id,
																	"Under review",
																	app.childName
																)
															}
															className="h-8 text-xs">
															Review
														</GhostButton>

														<PrimaryButton
															noArrow
															disabled={isAccepted || isWithdrawn}
															onClick={() => {
																setPositionInput(app.waitlistPosition || 5);
																setWaitEstimateInput(
																	app.waitlistEstimate || "8–12 months"
																);
																setWaitlistModalAppId(app.id);
															}}
															className="h-8 text-xs">
															Waitlist…
														</PrimaryButton>

														<PrimaryButton
															noArrow
															disabled={isOffer || isAccepted || isWithdrawn}
															onClick={() =>
																handleSetStatus(app.id, "Offer", app.childName)
															}
															className="h-8 text-xs">
															Offer
														</PrimaryButton>
													</div>
												</div>
											)}
										</Card>
									);
								})}
							</div>
						</div>
					)}

					{/* 5. Footer Under Table */}
					<div className="rounded-2xl border border-cq-line bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
						<div className="flex items-center gap-3">
							<IconTile icon={Heart} tone="sand" />
							<div>
								<div className="text-sm font-semibold text-cq-ink">
									Positions are only shown to families after you save them.
								</div>
								<div className="text-xs text-cq-soft mt-0.5">
									Centres hold authority over admissions ordering and reporting
									dates.
								</div>
							</div>
						</div>
						<SimNote>
							CareQ never calculates or predicts a family's place.
						</SimNote>
					</div>
				</div>
			)}

			{/* TAB 2: POLICY & REQUIREMENTS MANAGEMENT */}
			{centreTab === "policy" && (
				<div className="space-y-6">
					{/* 1. PageHeader */}
					<PageHeader
						title="Policy & requirements"
						subtitle="Load a published document or paste your admission policy. AI finds each requirement and quotes the sentence it came from. Nothing reaches parents until you confirm."
					/>

					{/* Load a published document (documents indexed for this centre) */}
					{centreDocs && (
						<Card className="p-6 sm:p-7 space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h3 className="text-lg font-bold text-cq-ink">
									Load a published document
								</h3>
								<span className="text-xs text-cq-soft">
									Each requirement keeps its exact quote, page and document
								</span>
							</div>
							{centreDocs.length === 0 ? (
								<p className="text-xs text-cq-soft">
									No published documents for this centre yet.
									{singleCentre.registration
										? " Upload your handbook when you register, or paste your policy below."
										: " Paste your policy below."}
								</p>
							) : (
								<div className="space-y-2">
									{centreDocs.map((d) => (
										<label
											key={d.docKey}
											className="flex items-start gap-2.5 rounded-xl border border-cq-line p-3 cursor-pointer hover:bg-cq-page">
											<input
												type="radio"
												name="centre-doc"
												className="mt-1 accent-cq-brand"
												checked={selectedDocKey === d.docKey}
												onChange={() => setSelectedDocKey(d.docKey)}
											/>
											<span className="min-w-0">
												<span className="block text-sm font-semibold text-cq-ink">
													{d.docTitle}
												</span>
												<span className="block text-xs text-cq-soft">
													{d.operatorName} ·{" "}
													{d.pages ? `${d.pages} pages` : "web page"} ·{" "}
													{d.chunks} passages
													{d.uploaded
														? " · uploaded by your centre, not verified"
														: ""}
													{d.sourceNote &&
													!d.uploaded &&
													d.sourceNote !== "Exact file"
														? ` · ${d.sourceNote}`
														: ""}
												</span>
												{d.sourceUrl && (
													<a
														href={d.sourceUrl}
														target="_blank"
														rel="noreferrer"
														className="text-xs font-semibold text-cq-brand hover:underline">
														Source
													</a>
												)}
											</span>
										</label>
									))}
									<PrimaryButton
										onClick={() => handleExtractFromDocument(selectedDocKey)}
										disabled={isExtracting || !selectedDocKey}
										className="h-11">
										<PenLine className="w-4 h-4" aria-hidden="true" />
										<span>
											{isExtracting
												? "Reading your policy… this can take up to 30 seconds"
												: "Find requirements in this document"}
										</span>
									</PrimaryButton>
								</div>
							)}
						</Card>
					)}

					{/* 2. Grid lg:grid-cols-2 gap-6 */}
					<div className="grid lg:grid-cols-2 gap-6 items-start">
						{/* LEFT Card: Your policy text */}
						<Card className="p-6 sm:p-7 space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-bold text-cq-ink">
									Your policy text
								</h3>
								<button
									type="button"
									onClick={() =>
										setPolicyInputText(
											`Sample 2026 Admissions Policy (fictional).
Applicants must submit a verified Birth Certificate or Passport.
ISPA immunization proof is required 30 days before attendance.
Parents must sign the Outdoor Risk & Nature All-Weather Participation Agreement.
A Developmental History Questionnaire must be submitted for toddler program placement.
Emergency Contacts Authorization with 2 verified guardians is mandatory.`
										)
									}
									className="text-xs font-semibold text-cq-brand hover:underline cursor-pointer">
									Preset: Sample policy
								</button>
							</div>

							<textarea
								rows={10}
								value={policyInputText}
								onChange={(e) => setPolicyInputText(e.target.value)}
								placeholder="Paste centre policy text, handbook, or intake guidelines..."
								className="h-72 rounded-xl border border-cq-line-input bg-cq-input p-4 text-sm leading-relaxed w-full focus:outline-hidden focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 resize-none text-cq-ink"
							/>

							<div className="pt-2">
								<PrimaryButton
									onClick={handleExtractRequirements}
									disabled={isExtracting || !policyInputText.trim()}
									className="h-11">
									<PenLine className="w-4 h-4" aria-hidden="true" />
									<span>
										{isExtracting
											? "Reading your policy… this can take up to 30 seconds"
											: "Find requirements with AI"}
									</span>
								</PrimaryButton>
							</div>
							<AiNotice message={aiNotice} />
						</Card>

						{/* RIGHT Card: Requirements found */}
						<Card className="p-6 sm:p-7 space-y-5">
							<div className="flex items-center justify-between pb-3 border-b border-cq-line">
								<div className="flex items-center gap-2">
									<h3 className="text-lg font-bold text-cq-ink">
										Requirements found
									</h3>
									<span className="rounded-md bg-cq-sage text-cq-sage-ink text-xs px-2 py-0.5 font-semibold">
										{extractedRequirements ? extractedRequirements.length : 0}
									</span>
								</div>

								<GhostButton
									onClick={handleAddCustomExtracted}
									className="h-8 text-xs">
									<Plus className="w-3.5 h-3.5 mr-1" />
									<span>Add custom requirement</span>
								</GhostButton>
							</div>

							{extractedRequirements && extractedRequirements.length > 0 ? (
								<div className="space-y-3">
									<AiFallbackNote aiMode={extractAiMode} />
									<div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
										{extractedRequirements.map((item, index) => {
											const isEditing = editingIndex === index;

											return (
												<div
													key={index}
													className="rounded-xl border border-cq-line p-4 space-y-2">
													<div className="flex items-start justify-between gap-3">
														{/* Requirement title */}
														<div className="flex-1 min-w-0">
															{isEditing ? (
																<div className="flex items-center gap-2">
																	<input
																		type="text"
																		value={editingText}
																		onChange={(e) =>
																			setEditingText(e.target.value)
																		}
																		className="w-full text-sm font-semibold px-2.5 py-1 bg-white border border-cq-brand rounded-lg focus:outline-hidden text-cq-ink"
																		autoFocus
																	/>
																	<GhostButton
																		onClick={() => handleSaveEdit(index)}
																		className="h-8 px-2.5 text-xs font-semibold">
																		Save
																	</GhostButton>
																</div>
															) : (
																<span className="text-sm font-semibold text-cq-ink">
																	{item.requirement}
																</span>
															)}
														</div>

														{/* Edit / Remove actions */}
														<div className="flex items-center gap-1.5 shrink-0">
															{!isEditing && (
																<GhostButton
																	onClick={() =>
																		handleStartEdit(index, item.requirement)
																	}
																	className="h-8 px-2.5 text-xs"
																	title="Edit requirement title">
																	<Edit2 className="w-3.5 h-3.5" />
																	<span>Edit</span>
																</GhostButton>
															)}
															<GhostButton
																onClick={() => handleDeleteExtracted(index)}
																className="h-8 px-2.5 text-xs hover:text-cq-rose-600"
																title="Remove requirement">
																<Trash2 className="w-3.5 h-3.5" />
																<span>Remove</span>
															</GhostButton>
														</div>
													</div>

													{/* Source sentence quote block */}
													<div className="border-l-2 border-cq-sage-200 pl-3 text-xs italic text-cq-muted mt-2">
														<Eyebrow className="text-xs not-italic mb-0.5">
															{item.docTitle
																? `From ${item.docTitle}, ${item.page}`
																: "From your policy"}
														</Eyebrow>
														<span>"{item.sourceSentence}"</span>
														{item.docTitle &&
															(item.sourceUrl || item.sourceNote) && (
																<span className="block not-italic text-xs text-cq-soft mt-0.5">
																	{item.sourceUrl && (
																		<a
																			href={item.sourceUrl}
																			target="_blank"
																			rel="noreferrer"
																			className="font-semibold text-cq-brand hover:underline">
																			Source
																		</a>
																	)}
																	{item.sourceNote &&
																		item.sourceNote !== "Exact file" && (
																			<span>
																				{item.sourceUrl ? " · " : ""}
																				{item.sourceNote}
																			</span>
																		)}
																</span>
															)}
													</div>
												</div>
											);
										})}
									</div>

									{/* Confirmation and publish */}
									<div className="pt-3 border-t border-cq-line space-y-3">
										{policyUpdateSuccess && (
											<div className="rounded-xl bg-cq-sage border border-cq-sage-line p-3 text-xs text-cq-ink flex items-center gap-2 font-semibold">
												<CheckCircle2 className="w-4 h-4 text-cq-sage-ink shrink-0" />
												<span>
													Active requirements updated for {singleCentre.name}!
												</span>
											</div>
										)}

										<PrimaryButton
											onClick={handleConfirmReplaceRequirements}
											className="w-full h-11 justify-center">
											Confirm and publish to parents
										</PrimaryButton>
									</div>
								</div>
							) : (
								<p className="text-xs text-cq-soft py-8 text-center">
									Paste your admission policy on the left and click "Find
									requirements with AI". CareQ will analyze each sentence.
								</p>
							)}
						</Card>
					</div>

					{/* 3. Below, full-width Card: Live for parents now */}
					<Card className="bg-cq-sage p-6 space-y-4">
						<div className="flex items-center justify-between pb-3 border-b border-cq-sage-line">
							<div>
								<Eyebrow className="text-xs">Live for parents now</Eyebrow>
								<h4 className="text-lg font-bold text-cq-ink mt-1">
									Active checklist for {singleCentre.name}
								</h4>
							</div>
							<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white text-cq-sage-ink border border-cq-sage-line">
								{singleCentre.requirements.length} active requirements
							</span>
						</div>

						<div className="grid sm:grid-cols-2 gap-3">
							{singleCentre.requirements.map((req, idx) => (
								<div
									key={idx}
									className="flex items-start gap-2.5 text-xs font-semibold text-cq-ink bg-white/70 p-3 rounded-xl border border-cq-sage-line">
									<Check className="w-4 h-4 text-cq-sage-ink shrink-0 mt-0.5" />
									<span className="leading-snug">{req}</span>
								</div>
							))}
						</div>
					</Card>
				</div>
			)}

			{/* TAB 3: HELP & SUPPORT */}
			{centreTab === "help" && (
				<HelpTab
					role="centre"
					userName={singleCentre.name}
					requests={requests}
					onSubmitRequest={onSubmitRequest}
					onAdvanceConcernStep={onAdvanceConcernStep}
				/>
			)}

			{/* Modal for setting Waitlist position */}
			{activeWaitlistApp && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
					<Card className="max-w-sm w-full p-6 shadow-xl space-y-4">
						<div>
							<h3 className="text-base font-bold text-cq-ink">
								Set waitlist position
							</h3>
							<p className="text-xs text-cq-muted mt-0.5">
								{singleCentre.name} · Applicant: {activeWaitlistApp.childName} (
								{activeWaitlistApp.childAgeMonths} mos)
							</p>
						</div>

						<div className="space-y-3">
							<div>
								<label
									htmlFor="waitlist-pos-input"
									className="text-xs font-semibold text-cq-ink block mb-1">
									Queue position number:
								</label>
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold text-cq-muted">#</span>
									<input
										id="waitlist-pos-input"
										type="number"
										min="1"
										max="200"
										value={positionInput}
										onChange={(e) =>
											setPositionInput(
												Math.max(1, parseInt(e.target.value) || 1)
											)
										}
										className="w-full text-base font-semibold px-3 py-1.5 border border-cq-line bg-cq-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cq-secondary/25 focus:border-cq-secondary text-cq-ink"
									/>
								</div>
							</div>

							<div>
								<label
									htmlFor="waitlist-est-input"
									className="text-xs font-semibold text-cq-ink block mb-1">
									Centre's typical wait estimate:
								</label>
								<EstimateField
									id="waitlist-est-input"
									value={waitEstimateInput}
									onChange={setWaitEstimateInput}
								/>
							</div>

							<p className="text-xs text-cq-soft pt-1">
								Parent {activeWaitlistApp.parentName} will see "Position{" "}
								{positionInput} · reported by {singleCentre.name} on today's
								date".
							</p>
						</div>

						<div className="pt-2 flex justify-end gap-2 border-t border-cq-line">
							<GhostButton
								onClick={() => setWaitlistModalAppId(null)}
								className="h-9 px-3.5 text-xs">
								Cancel
							</GhostButton>
							<PrimaryButton
								noArrow
								onClick={() => {
									handleSetStatus(
										activeWaitlistApp.id,
										"Waitlisted",
										activeWaitlistApp.childName,
										positionInput,
										waitEstimateInput.trim() || undefined
									);
									setWaitlistModalAppId(null);
								}}
								className="h-9 px-4 text-xs font-semibold">
								Save waitlist position
							</PrimaryButton>
						</div>
					</Card>
				</div>
			)}

			{/* Modal for changing only the wait estimate (portaled: <main> has a transform) */}
			{activeEstimateApp &&
				createPortal(
					<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-ink/45">
						<Card
							role="dialog"
							aria-modal="true"
							aria-labelledby="estimate-dialog-title"
							className="max-w-sm w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 shadow-xl space-y-4">
							<div>
								<h3
									id="estimate-dialog-title"
									className="text-base font-bold text-cq-ink">
									{activeEstimateApp.waitlistEstimate
										? "Edit wait estimate"
										: "Add wait estimate"}
								</h3>
								<p className="text-xs text-cq-muted mt-0.5">
									{activeEstimateApp.childName} · Waitlist position #
									{activeEstimateApp.waitlistPosition}
								</p>
							</div>
							<div>
								<label
									htmlFor="estimate-only-input"
									className="text-xs font-semibold text-cq-ink block mb-1">
									Centre's typical wait estimate:
								</label>
								<EstimateField
									id="estimate-only-input"
									value={estimateInput}
									onChange={setEstimateInput}
								/>
							</div>
							<p className="text-xs text-cq-soft">
								Only the estimate changes. The position stays at #
								{activeEstimateApp.waitlistPosition}.{" "}
								{activeEstimateApp.parentName} will be notified.
							</p>
							<div className="pt-2 flex justify-end gap-2 border-t border-cq-line">
								<GhostButton
									onClick={() => setEstimateModalAppId(null)}
									className="h-9 px-3.5 text-xs">
									Cancel
								</GhostButton>
								<PrimaryButton
									noArrow
									onClick={() => saveEstimate(activeEstimateApp)}
									className="h-9 px-4 text-xs font-semibold">
									Save estimate
								</PrimaryButton>
							</div>
						</Card>
					</div>,
					document.body
				)}

			{/* Application & Submitted Documents Viewer Modal */}
			{selectedAppForDetails && (
				<ApplicationDetailsModal
					isOpen={!!selectedAppForDetails}
					onClose={() => setSelectedAppForDetails(null)}
					application={selectedAppForDetails}
					centre={singleCentre}
					onOpenConversation={onOpenConversation}
					viewer="centre"
				/>
			)}
		</div>
	);
};

/** The wait estimate input with presets and "Clear (no estimate)". Used by both waitlist dialogs. */
const EstimateField: React.FC<{
	id: string;
	value: string;
	onChange: (value: string) => void;
}> = ({ id, value, onChange }) => (
	<>
		<input
			id={id}
			type="text"
			maxLength={80}
			placeholder="e.g. 8–12 months (or leave blank if no estimate)"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="w-full text-xs font-medium px-3 py-1.5 border border-cq-line bg-cq-input rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cq-secondary/25 focus:border-cq-secondary text-cq-ink"
		/>
		<div className="flex flex-wrap gap-1 mt-1.5">
			{["8–12 months", "6–9 months", "3–6 months", "12+ months"].map(
				(preset) => (
					<button
						key={preset}
						type="button"
						onClick={() => onChange(preset)}
						className={`text-xs px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
							value === preset
								? "bg-cq-brand text-white border-cq-brand font-semibold"
								: "bg-white text-cq-muted hover:bg-cq-page border-cq-line"
						}`}>
						{preset}
					</button>
				)
			)}
			<button
				type="button"
				onClick={() => onChange("")}
				className="text-xs px-2 py-0.5 rounded-lg border text-cq-soft hover:text-cq-ink hover:bg-cq-page border-cq-line cursor-pointer">
				Clear (no estimate)
			</button>
		</div>
	</>
);
