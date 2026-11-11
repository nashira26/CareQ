import React from "react";
import { ParentProfile, Application, Centre } from "../../data/mockData";
import { ageInMonths, formatAge } from "../../lib/family";
import {
	ParentUpdate,
	applicationCounts,
	attentionItems,
} from "../../lib/parentUpdates";
import { PrimaryButton, GhostButton, GreetingBand } from "../ui/CareUI";
import { ArrowRight, FileEdit, Gift, Send } from "lucide-react";

/** Parent tabs other pages can link to. */
export type ParentTabId = "home" | "find" | "apply" | "track" | "updates" | "help";

export interface ParentOverviewProps {
	parentProfile: ParentProfile;
	applications: Application[];
	centres: Centre[];
	updates: ParentUpdate[];
	onNavigate: (tab: ParentTabId) => void;
	/** Opens one sent application in My applications. */
	onOpenApplication: (applicationId: string) => void;
}

/** Home: only what needs the parent (at most 3 items) and simple counts. No application lists. */
export const ParentOverview: React.FC<ParentOverviewProps> = ({
	parentProfile,
	applications,
	centres,
	updates,
	onNavigate,
	onOpenApplication,
}) => {
	const items = attentionItems({ applications, centres, updates });
	const counts = applicationCounts(applications);
	const firstName = parentProfile.name.split(" ")[0] || parentProfile.name;

	// Like the centre's overview boxes: an icon in the status colour (as on the status badges),
	// a plain label, an arrow, and a coral edge when something is waiting on the parent
	const offers = applications.filter((a) => a.status === "Offer");
	const countTiles: {
		label: string;
		value: number;
		Icon: typeof Gift;
		tone: string;
		urgent: boolean;
		open: () => void;
	}[] = [
		{
			label: counts.preparing === 1 ? "Draft being prepared" : "Drafts being prepared",
			value: counts.preparing,
			Icon: FileEdit,
			tone: "bg-stone text-status-draft",
			urgent: false,
			open: () => onNavigate("apply"),
		},
		{
			label: counts.sent === 1 ? "Application sent" : "Applications sent",
			value: counts.sent,
			Icon: Send,
			tone: "bg-info-bg text-info",
			urgent: false,
			open: () => onNavigate("track"),
		},
		{
			label: counts.offers === 1 ? "Offer to respond to" : "Offers to respond to",
			value: counts.offers,
			Icon: Gift,
			tone: "bg-sun text-status-offer",
			urgent: counts.offers > 0,
			// One offer: straight to it
			open: () =>
				offers.length === 1 ? onOpenApplication(offers[0].id) : onNavigate("track"),
		},
	];

	return (
		<div className="space-y-8 animate-fadeIn">
			<GreetingBand
				tone="butter"
				photo="parent"
				note={{
					title: "A little more clarity",
					detail: "for your family’s next step",
				}}>
				<h1 className="text-2xl sm:text-[30px] sm:leading-[38px] font-extrabold text-brand">
					Hello, {firstName}
				</h1>
				<p className="mt-1 text-base text-ink">
					What needs your attention today.
				</p>
				{parentProfile.children.length > 0 && (
					<p className="mt-3 text-sm text-cq-sand-ink">
						<span className="font-bold">Your family:</span>{" "}
						{parentProfile.children
							.map(
								(c) =>
									`${c.firstName}, ${formatAge(ageInMonths(c.dateOfBirth))}`
							)
							.join(" · ")}
					</p>
				)}
				<div className="mt-5">
					<GhostButton onClick={() => onNavigate("find")}>
						Explore centres
						<ArrowRight className="w-4 h-4" aria-hidden="true" />
					</GhostButton>
				</div>
			</GreetingBand>

			<section aria-labelledby="needs-heading" className="space-y-3">
				<h2 id="needs-heading" className="text-xl font-extrabold text-brand">
					Needs your attention
				</h2>
				{items.length === 0 ? (
					<div className="rounded-2xl bg-white border border-cq-line p-5">
						<h3 className="text-lg font-extrabold text-ink">
							You’re all caught up
						</h3>
						<p className="mt-0.5 text-[15px] text-ink-muted">
							Nothing needs your attention today.
						</p>
					</div>
				) : (
					<ul className="grid gap-3 lg:grid-cols-3">
						{items.map((item, i) => (
							<li
								key={item.id}
								className={`rounded-2xl bg-white border border-cq-line p-5 flex flex-col ${
									i === 0 ? "border-l-4 border-l-coral shadow-sm" : ""
								}`}>
								<h3 className="text-lg font-extrabold text-ink">
									{item.title}
								</h3>
								<p className="mt-0.5 text-[15px] text-ink-muted flex-1">
									{item.detail}
								</p>
								{i === 0 ? (
									<PrimaryButton
										arrow
										className="mt-4 w-full sm:w-auto self-start"
										onClick={() =>
											item.tab === "track" && item.applicationId
												? onOpenApplication(item.applicationId)
												: onNavigate(item.tab)
										}>
										{item.cta}
									</PrimaryButton>
								) : (
									<GhostButton
										className="mt-4 w-full sm:w-auto self-start"
										onClick={() =>
											item.tab === "track" && item.applicationId
												? onOpenApplication(item.applicationId)
												: onNavigate(item.tab)
										}>
										{item.cta}
										<ArrowRight className="w-4 h-4" aria-hidden="true" />
									</GhostButton>
								)}
							</li>
						))}
					</ul>
				)}
			</section>

			<section aria-labelledby="counts-heading" className="space-y-3">
				<h2 id="counts-heading" className="text-xl font-extrabold text-brand">
					Your applications
				</h2>
				<ul className="grid sm:grid-cols-3 gap-3">
					{countTiles.map(({ label, value, Icon, tone, urgent, open }) => (
						<li key={label}>
							<button
								type="button"
								onClick={open}
								className={`group w-full h-full rounded-2xl bg-white border border-cq-line p-4 flex items-center gap-3.5 text-left hover:bg-mint-50 transition-colors cursor-pointer ${
									urgent ? "border-l-4 border-l-coral" : ""
								}`}>
								<span
									className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
									<Icon className="w-5 h-5" aria-hidden="true" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-2xl font-extrabold text-ink leading-none">
										{value}
									</span>
									<span className="block text-sm text-ink-muted mt-1">
										{label}
									</span>
								</span>
								<ArrowRight
									className="w-4 h-4 text-ink-faint group-hover:translate-x-0.5 transition-transform shrink-0"
									aria-hidden="true"
								/>
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
};
