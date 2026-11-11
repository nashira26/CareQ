import React from "react";
import { ParentProfile, Application, Centre } from "../../data/mockData";
import { ageInMonths, formatAge } from "../../lib/family";
import {
	ParentUpdate,
	applicationCounts,
	attentionItems,
} from "../../lib/parentUpdates";
import { PrimaryButton, GhostButton, GreetingBand } from "../ui/CareUI";
import { ArrowRight, ChevronRight } from "lucide-react";

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

	const countTiles: { label: string; value: number; tab: ParentTabId }[] = [
		{ label: "Preparing", value: counts.preparing, tab: "apply" },
		{ label: "Sent", value: counts.sent, tab: "track" },
		{ label: "Offers", value: counts.offers, tab: "track" },
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

			<section aria-labelledby="counts-heading">
				<h2 id="counts-heading" className="sr-only">
					Your applications at a glance
				</h2>
				<ul className="grid grid-cols-3 gap-3">
					{countTiles.map((t) => (
						<li key={t.label}>
							<button
								type="button"
								onClick={() => onNavigate(t.tab)}
								className="w-full rounded-2xl bg-white border border-cq-line px-4 py-3.5 text-left hover:bg-mint-50 transition-colors cursor-pointer flex items-center gap-2">
								<span className="flex-1 min-w-0">
									<span className="block text-2xl font-extrabold text-brand leading-tight">
										{t.value}
									</span>
									<span className="block text-sm text-ink-muted">{t.label}</span>
								</span>
								<ChevronRight
									className="hidden sm:block w-5 h-5 text-ink-faint shrink-0"
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
