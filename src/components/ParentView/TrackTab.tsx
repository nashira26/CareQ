import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { shortRef } from "../../lib/centreQueue";
import { Centre, Application, ParentProfile } from "../../data/mockData";
import { StatusBadge } from "../StatusBadge";
import { ApplicationDetailsModal } from "../ApplicationDetailsModal";
import { AskAboutCentre } from "../AskAboutCentre";
import {
	PageHeader,
	Card,
	PrimaryButton,
	GhostButton,
	TertiaryButton,
	SimNote,
	SimTag,
	CentreAvatar,
	ProgressStrip,
} from "../ui/CareUI";
import { EmptyState, SpotChecklist } from "../ui/Illustrations";
import {
	estimateLine,
	reportedLine,
	reportedLineOnCard,
} from "../../lib/simulated";
import { AlertTriangle, ArrowRight, Check, Gift, MessageSquare, X } from "lucide-react";
import { otherOpenApplications, withdrawalLabel } from "../../lib/offers";

interface TrackTabProps {
	centres: Centre[];
	applications: Application[];
	parentProfile: ParentProfile;
	/** Accepts, and withdraws the child's other applications (their drafts are deleted). */
	onAcceptOffer: (applicationId: string) => void;
	/** Declines: only that application becomes Withdrawn. */
	onDeclineOffer: (applicationId: string) => void;
	onWithdrawApplication: (applicationId: string) => void;
	onNavigateToFind: () => void;
	onOpenConversation: (centreId: string) => void;
	/** Demo accounts: one small "Simulated" tag next to each waitlist position and the offer (nowhere else). */
	isDemoAccount?: boolean;
	/** Opened from Home or Updates: scroll to this application and highlight it. */
	focusApplicationId?: string | null;
}

/** My applications: only applications that were sent (drafts live in Drafts). */
export const TrackTab: React.FC<TrackTabProps> = ({
	centres,
	applications: allApplications,
	parentProfile,
	isDemoAccount = false,
	onAcceptOffer,
	onDeclineOffer,
	onWithdrawApplication,
	onNavigateToFind,
	onOpenConversation,
	focusApplicationId,
}) => {
	const applications = allApplications.filter((a) => a.status !== "Draft");

	// After the page has scrolled to the top (App does that on every page change), bring the focused card into view
	useEffect(() => {
		if (!focusApplicationId) return;
		const t = window.setTimeout(() => {
			document
				.getElementById(`application-${focusApplicationId}`)
				?.scrollIntoView({ block: "center", behavior: "smooth" });
		}, 50);
		return () => window.clearTimeout(t);
	}, [focusApplicationId]);

	// Offer acceptance confirmation dialog state
	const [selectedOfferAppId, setSelectedOfferAppId] = useState<string | null>(
		null
	);

	// Waitlist position history popup modal state
	const [historyModalAppId, setHistoryModalAppId] = useState<string | null>(
		null
	);
	const historyModalApp = applications.find((a) => a.id === historyModalAppId);
	const historyModalCentre = historyModalApp
		? centres.find((c) => c.id === historyModalApp.centreId)
		: null;

	const selectedOfferApp = applications.find(
		(a) => a.id === selectedOfferAppId
	);
	const selectedOfferCentre = selectedOfferApp
		? centres.find((c) => c.id === selectedOfferApp.centreId)
		: null;

	// The same child's other open applications (sent, offers, drafts): accepting closes all of them
	const otherActiveApps = selectedOfferApp
		? otherOpenApplications(allApplications, selectedOfferApp)
		: [];
	const childName = selectedOfferApp?.childName || parentProfile.childName;

	// Offer dialogs render on <body>: <main> is animated (a transform), which would trap position: fixed
	const overlay = (node: React.ReactNode) =>
		typeof document !== "undefined" ? createPortal(node, document.body) : node;

	// The documents sent with an application (opens the same viewer the centre uses)
	const [docsAppId, setDocsAppId] = useState<string | null>(null);
	const docsApp = applications.find((a) => a.id === docsAppId);
	const docsCentre = docsApp ? centres.find((c) => c.id === docsApp.centreId) : null;

	// Decline confirmation dialog state
	const [declineAppId, setDeclineAppId] = useState<string | null>(null);
	const declineApp = applications.find((a) => a.id === declineAppId);
	const declineCentre = declineApp
		? centres.find((c) => c.id === declineApp.centreId)
		: null;

	return (
		<div className="space-y-6">
			{/* Page Header */}
			<PageHeader
				title="My applications"
				subtitle="Applications you've sent, with each centre's latest update."
				action={
					<GhostButton onClick={onNavigateToFind}>
						Find centres
						<ArrowRight className="w-4 h-4" aria-hidden="true" />
					</GhostButton>
				}
			/>

			{/* Offer Received Spotlight Card (if any active offer) */}
			{applications.some((a) => a.status === "Offer") && (
				<div className="rounded-2xl bg-white border border-cq-line border-l-4 border-l-coral shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div className="flex items-start gap-3.5">
						<div className="w-11 h-11 rounded-xl bg-sun text-status-offer flex items-center justify-center shrink-0">
							<Gift className="w-5 h-5" aria-hidden="true" />
						</div>
						<div>
							<h2 className="text-lg font-extrabold text-ink flex flex-wrap items-center gap-2">
								Placement offer received!
								{/* {isDemoAccount && <SimTag />} */}
							</h2>
							<p className="text-[15px] text-ink-muted mt-0.5">
								A spot is available for {parentProfile.childName}. Review and
								accept below to secure enrolment.
							</p>
						</div>
					</div>
					<PrimaryButton
						onClick={() => {
							const offerApp = applications.find((a) => a.status === "Offer");
							if (offerApp) setSelectedOfferAppId(offerApp.id);
						}}
						className="shrink-0 w-full sm:w-auto">
						Review offer
					</PrimaryButton>
				</div>
			)}

			{/* Section Header */}
			<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-2">
				<h2 className="text-xl font-extrabold text-brand flex items-center gap-2">
					Applications
					<span className="rounded-full bg-mint text-brand text-xs px-2 py-0.5 font-bold">
						{applications.length}
					</span>
				</h2>
				<p className="text-sm text-ink-muted">
					{parentProfile.name} &amp; {parentProfile.childName} · Demo family
				</p>
			</div>

			{/* Applications: one card layout for every screen size */}
			{applications.length > 0 ? (
				<ul className="grid lg:grid-cols-2 gap-4">
					{applications.map((app) => {
						const centre = centres.find((c) => c.id === app.centreId);
						const centreName = centre?.name || "Child Care Centre";
						const hasPosition =
							typeof app.waitlistPosition === "number" &&
							app.waitlistPosition > 0;
						const isOffer = app.status === "Offer";
						const isAccepted = app.status === "Accepted";
						const isWithdrawn = app.status === "Withdrawn";
						const isFocused = app.id === focusApplicationId;

						return (
							<li
								key={app.id}
								id={`application-${app.id}`}
								className={`rounded-2xl bg-white border border-cq-line p-4 sm:p-5 flex flex-col gap-4 scroll-mt-24 ${
									isOffer ? "border-l-4 border-l-coral shadow-sm" : ""
								} ${isWithdrawn ? "opacity-75" : ""} ${
									isFocused ? "ring-2 ring-brand ring-offset-2" : ""
								}`}>
								<div className="flex items-start gap-3">
									<CentreAvatar centreId={app.centreId} />
									<div className="min-w-0 flex-1">
										<h3 className="text-[17px] font-extrabold text-ink leading-snug">
											{centreName}
										</h3>
										<p className="text-xs text-ink-muted mt-0.5">
											{centre?.neighbourhood || "Toronto"} · {shortRef(app.id)}
										</p>
										{app.submittedAt && (
											<p className="text-xs text-ink-muted">
												Submitted {app.submittedAt}
											</p>
										)}
									</div>
								</div>

								<div className="space-y-3">
									<StatusBadge
										status={app.status}
										waitlistPosition={app.waitlistPosition}
										size="sm"
									/>
									<ProgressStrip status={app.status} />
									{isWithdrawn && app.withdrawal && (
										<p className="text-xs text-ink-muted">
											{withdrawalLabel(app, "parent", {
												applications: allApplications,
												centres,
											})}
										</p>
									)}
								</div>

								<dl className="grid grid-cols-2 gap-3 pt-3 border-t border-cq-line text-sm">
									<div>
										<dt className="text-xs font-bold text-ink-muted">
											Program
										</dt>
										<dd className="font-bold text-ink">
											{app.careType || parentProfile.careType}
										</dd>
										<dd className="text-xs text-ink-muted">
											Start{" "}
											{app.preferredStartDate ||
												parentProfile.preferredStartDate}
										</dd>
									</div>
									<div>
										<dt className="text-xs font-bold text-ink-muted">Queue</dt>
										{hasPosition ? (
											<>
												<dd className="text-2xl font-extrabold text-brand leading-tight inline-flex items-center gap-1.5">
													#{app.waitlistPosition}
													{/* {isDemoAccount && <SimTag />} */}
												</dd>
												<dd className="text-xs text-ink-muted mt-0.5">
													{reportedLineOnCard(
														app.waitlistReportedBy,
														centre?.name,
														app.waitlistReportedDate || "recently"
													)}
												</dd>
											</>
										) : (
											<dd className="text-ink-muted">Not reported</dd>
										)}
									</div>
								</dl>

								{app.waitlistEstimate && (
									<p className="text-xs text-cq-sand-ink bg-butter px-3 py-2 rounded-lg">
										{estimateLine(app.waitlistEstimate)}
									</p>
								)}

								<AskAboutCentre
									centreId={app.centreId}
									centreName={centre?.name || "this centre"}
									hideWhenUncovered
								/>

								{isOffer && (
									<button
										type="button"
										onClick={() => onOpenConversation(app.centreId)}
										className="self-start text-left text-sm font-semibold text-brand hover:underline inline-flex items-start gap-1.5 cursor-pointer">
										<MessageSquare className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
										Have a question about this offer? Message the centre
									</button>
								)}

								<div className="mt-auto pt-3 border-t border-cq-line flex flex-wrap items-center gap-2">
									{isOffer && (
										<>
											<PrimaryButton
												onClick={() => setSelectedOfferAppId(app.id)}
												className="h-10">
												Accept offer
											</PrimaryButton>
											<GhostButton
												onClick={() => setDeclineAppId(app.id)}
												className="h-10">
												Decline offer
											</GhostButton>
										</>
									)}
									<GhostButton
										onClick={() => onOpenConversation(app.centreId)}
										className="h-10">
										View &amp; message
									</GhostButton>
									<div className="ml-auto flex items-center gap-1">
										{Object.keys(app.uploadedDocuments ?? {}).length > 0 && (
											<TertiaryButton
												onClick={() => setDocsAppId(app.id)}
												aria-label={`Documents sent to ${centreName}`}>
												Documents ({Object.keys(app.uploadedDocuments ?? {}).length})
											</TertiaryButton>
										)}
										{hasPosition && (
											<TertiaryButton
												onClick={() => setHistoryModalAppId(app.id)}>
												History
											</TertiaryButton>
										)}
										{!isOffer && !isAccepted && !isWithdrawn && (
											<TertiaryButton
												onClick={() => onWithdrawApplication(app.id)}
												className="text-ink-muted decoration-ink-muted/40 hover:text-error">
												Withdraw
											</TertiaryButton>
										)}
										{isAccepted && (
											<span className="inline-flex items-center gap-1 text-sm font-bold text-leaf-ink">
												<Check className="w-4 h-4" aria-hidden="true" />{" "}
												Confirmed
											</span>
										)}
										{isWithdrawn && (
											<span className="text-sm text-ink-muted italic">
												Withdrawn
											</span>
										)}
									</div>
								</div>
							</li>
						);
					})}
				</ul>
			) : (
				<Card>
					<EmptyState
						title="No applications sent yet."
						spot={<SpotChecklist />}
						actions={
							<PrimaryButton arrow onClick={onNavigateToFind}>
								Find centres
							</PrimaryButton>
						}
					/>
				</Card>
			)}

			{/* Footer Row */}
			<div className="rounded-2xl bg-page border border-cq-line p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
				<div>
					<p className="text-[15px] font-bold text-ink">
						Queues are shown only when the centre records one.
					</p>
					<p className="text-sm text-ink-muted mt-0.5">
						Centres manage their own admissions policies and waitlist updates.
					</p>
				</div>
				<SimNote>CareQ never calculates or predicts a queue position.</SimNote>
			</div>

			{/* Accept: one choice. Accepting withdraws this child's other applications (drafts are deleted). */}
			{selectedOfferApp && selectedOfferCentre && overlay(
				<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-ink/45">
					<Card
						role="dialog"
						aria-modal="true"
						aria-labelledby="accept-offer-title"
						className="max-w-lg w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-2xl space-y-4 animate-pop">
						<div className="flex items-start gap-3">
							<span className="w-11 h-11 rounded-xl bg-sun text-status-offer flex items-center justify-center shrink-0">
								<Gift className="w-5 h-5" aria-hidden="true" />
							</span>
							<div>
								<h3 id="accept-offer-title" className="text-lg font-bold text-cq-ink">
									Accept the offer from {selectedOfferCentre.name} for {childName}?
								</h3>
								<p className="text-xs text-cq-muted mt-0.5">
									Start{" "}
									{selectedOfferApp.preferredStartDate ||
										parentProfile.preferredStartDate}
									{selectedOfferCentre.hours ? ` · ${selectedOfferCentre.hours}` : ""}
								</p>
							</div>
						</div>

						{otherActiveApps.length > 0 && (
							<div className="bg-cq-input border border-cq-line rounded-xl p-4 space-y-3">
								<p className="text-sm text-cq-ink flex items-start gap-2">
									<AlertTriangle className="w-4 h-4 text-cq-peach-ink shrink-0 mt-0.5" aria-hidden="true" />
									<span>
										Accepting will also withdraw your other applications for {childName}, so those places can go
										to other families. This can't be undone.
									</span>
								</p>
								<ul aria-label={`Your other applications for ${childName}`} className="max-h-40 overflow-y-auto space-y-1.5 text-sm">
									{otherActiveApps.map((oa) => (
										<li key={oa.id} className="flex justify-between items-center gap-3">
											<span className="font-medium text-cq-ink min-w-0 leading-snug">
												{centres.find((c) => c.id === oa.centreId)?.name ?? "Child care centre"}
											</span>
											<span className="shrink-0">
												<StatusBadge status={oa.status} waitlistPosition={oa.waitlistPosition} size="sm" />
											</span>
										</li>
									))}
								</ul>
							</div>
						)}

						<div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
							<PrimaryButton
								noArrow
								onClick={() => {
									onAcceptOffer(selectedOfferApp.id);
									setSelectedOfferAppId(null);
								}}
								className="sm:order-1">
								<Check className="w-4 h-4 mr-1.5" aria-hidden="true" />
								{otherActiveApps.length > 0 ? "Accept and withdraw others" : "Accept offer"}
							</PrimaryButton>
							<GhostButton onClick={() => setSelectedOfferAppId(null)} className="sm:order-2">
								Cancel
							</GhostButton>
						</div>
					</Card>
				</div>
			)}

			{/* Decline: only this application is withdrawn */}
			{declineApp && declineCentre && overlay(
				<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-ink/45">
					<Card
						role="dialog"
						aria-modal="true"
						aria-labelledby="decline-offer-title"
						className="max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 shadow-2xl space-y-4 animate-pop">
						<h3 id="decline-offer-title" className="text-lg font-bold text-cq-ink">
							Decline the offer from {declineCentre.name}?
						</h3>
						<p className="text-sm text-cq-muted">The centre can then offer this place to another family.</p>
						<div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
							<PrimaryButton
								noArrow
								onClick={() => {
									onDeclineOffer(declineApp.id);
									setDeclineAppId(null);
								}}
								className="sm:order-1">
								Decline offer
							</PrimaryButton>
							<GhostButton onClick={() => setDeclineAppId(null)} className="sm:order-2">
								Cancel
							</GhostButton>
						</div>
					</Card>
				</div>
			)}

			{/* Documents sent with this application */}
			{docsApp && docsCentre && overlay(
				<ApplicationDetailsModal
					isOpen
					onClose={() => setDocsAppId(null)}
					application={docsApp}
					centre={docsCentre}
					onOpenConversation={() => onOpenConversation(docsApp.centreId)}
				/>
			)}

			{/* Waitlist Position History Modal */}
			{historyModalApp && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/45">
					<Card className="max-w-md w-full p-6 shadow-xl space-y-4">
						<div className="flex items-start justify-between gap-3">
							<div>
								<h3 className="text-base font-bold text-cq-ink">
									Waitlist position history
								</h3>
								<p className="text-xs text-cq-muted mt-0.5">
									{historyModalCentre?.name ||
										historyModalApp.waitlistReportedBy ||
										"Child Care Centre"}{" "}
									· {historyModalApp.childName}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setHistoryModalAppId(null)}
								className="text-cq-soft hover:text-cq-ink p-1 rounded-lg transition-colors cursor-pointer"
								aria-label="Close">
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="bg-cq-page border border-cq-line rounded-xl p-4">
							{(() => {
								const historyReporter =
									historyModalCentre?.name ||
									historyModalApp.waitlistReportedBy ||
									"the centre";
								const history =
									historyModalApp.positionHistory &&
									historyModalApp.positionHistory.length > 0
										? [...historyModalApp.positionHistory]
										: typeof historyModalApp.waitlistPosition === "number" &&
										  historyModalApp.waitlistPosition > 0
										? [
												{
													position: historyModalApp.waitlistPosition,
													date:
														historyModalApp.waitlistReportedDate || "Initial",
												},
										  ]
										: [];

								if (history.length <= 1) {
									return (
										<div className="space-y-2 py-1">
											{history.length === 1 && (
												<div className="text-sm text-cq-ink">
													- Position {history[0].position} (joined the waitlist)
													<span className="block pl-3 text-xs text-cq-soft">
														{reportedLine(historyReporter, history[0].date)}
													</span>
												</div>
											)}
											<p className="text-xs text-cq-soft italic">
												No changes recorded yet.
											</p>
										</div>
									);
								}

								const newestFirst = [...history].reverse();

								return (
									<ul className="space-y-2.5 text-xs text-cq-ink">
										{newestFirst.map((item, idx) => {
											const isOldest = idx === newestFirst.length - 1;
											return (
												<li key={idx} className="flex items-start gap-2">
													<span className="text-cq-soft select-none">-</span>
													<span>
														Position {item.position}
														{isOldest ? " (joined the waitlist)" : ""}
														<span className="block text-xs text-cq-soft">
															{reportedLine(historyReporter, item.date)}
														</span>
													</span>
												</li>
											);
										})}
									</ul>
								);
							})()}
						</div>

						<div className="flex justify-end pt-2">
							<GhostButton
								onClick={() => setHistoryModalAppId(null)}
								className="text-xs h-9">
								Close
							</GhostButton>
						</div>
					</Card>
				</div>
			)}
		</div>
	);
};
