import React, { useEffect, useRef, useState } from "react";
import { CentreCounts } from "./CentreCounts";
import {
	ArrowRight,
	ShieldCheck,
	FileText,
	CheckCheck,
	Lock,
	Check,
	CalendarClock,
	ClipboardList,
	MessagesSquare,
} from "lucide-react";
import {
	SpotNeighbourhood,
	SpotChecklist,
	SpotJourney,
	SpotCentre,
	SpotMessages,
} from "./ui/Illustrations";
import { LogoFull } from "./Logo";
import { HeroPhoto, AiCaption, PHOTOS, preloadHeroPhoto } from "./ui/HeroPhoto";

export interface LandingPageProps {
	onGetStarted: () => void;
	onLogIn: () => void;
	onOpenTrust: () => void;
	onRegisterCentre?: () => void;
}

type Audience = "parents" | "centres";

/** `?view=centres` opens the centre tab; anything else shows the parent tab. */
const audienceFromUrl = (): Audience => {
	try {
		return new URLSearchParams(window.location.search).get("view") === "centres"
			? "centres"
			: "parents";
	} catch {
		return "parents";
	}
};

/** Keep the address bar in step with the tab, without adding history entries. */
const writeAudienceToUrl = (audience: Audience) => {
	try {
		const url = new URL(window.location.href);
		if (audience === "centres") url.searchParams.set("view", "centres");
		else url.searchParams.delete("view");
		window.history.replaceState(window.history.state, "", url.toString());
	} catch {
		/* the tab still works without the URL */
	}
};

const STEPS: Record<
	Audience,
	{ title: string; text: string; Spot: React.FC<{ className?: string }> }[]
> = {
	parents: [
		{
			title: "Find centres",
			text: "Describe what you need and see nearby centres that match.",
			Spot: SpotNeighbourhood,
		},
		{
			title: "Prepare your application",
			text: "Get a checklist from the centre's own handbook.",
			Spot: SpotChecklist,
		},
		{
			title: "Get updates",
			text: "See your status and position as the centre reports them.",
			Spot: SpotJourney,
		},
		{
			title: "Accept a spot",
			text: "Accept an offer and leave your other waitlists in one step.",
			Spot: SpotCentre,
		},
	],
	centres: [
		{
			title: "Add your handbook",
			text: "CareQ turns it into a checklist. You confirm it.",
			Spot: SpotChecklist,
		},
		{
			title: "Review applications",
			text: "See what each family sent and what is missing.",
			Spot: SpotNeighbourhood,
		},
		{
			title: "Update positions and offers",
			text: "Families see each update with the date.",
			Spot: SpotCentre,
		},
		{
			title: "Keep families informed",
			text: "Answer questions and request documents. AI can draft replies.",
			Spot: SpotMessages,
		},
	],
};

const TABS: { id: Audience; label: string }[] = [
	{ id: "parents", label: "For parents" },
	{ id: "centres", label: "For centres" },
];

export const LandingPage: React.FC<LandingPageProps> = ({
	onGetStarted,
	onLogIn,
	onOpenTrust,
	onRegisterCentre,
}) => {
	preloadHeroPhoto(); // the hero photo is the largest thing above the fold
	const [audience, setAudience] = useState<Audience>(audienceFromUrl);
	const tabRefs = useRef<Record<Audience, HTMLButtonElement | null>>({
		parents: null,
		centres: null,
	});

	const scrollToHowItWorks = () => {
		const el = document.getElementById("how-it-works");
		if (el) {
			el.scrollIntoView({ behavior: "smooth" });
		}
	};

	const selectAudience = (next: Audience) => {
		setAudience(next);
		writeAudienceToUrl(next);
	};

	const showCentres = () => {
		selectAudience("centres");
		scrollToHowItWorks();
	};

	// A shared link with ?view=centres lands on the centre steps
	useEffect(() => {
		if (audienceFromUrl() !== "centres") return;
		const id = requestAnimationFrame(() =>
			document.getElementById("how-it-works")?.scrollIntoView()
		);
		return () => cancelAnimationFrame(id);
	}, []);

	// Arrow keys, Home and End move between tabs (and select them)
	const onTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		const i = TABS.findIndex((t) => t.id === audience);
		let next: number | null = null;
		if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
		else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
		else if (e.key === "Home") next = 0;
		else if (e.key === "End") next = TABS.length - 1;
		if (next === null) return;
		e.preventDefault();
		const id = TABS[next].id;
		selectAudience(id);
		tabRefs.current[id]?.focus();
	};

	// No centre sign-up handler means no centre button (never fall back to the login screen)
	const centreButton = (className: string, label = "I run a centre") =>
		onRegisterCentre ? (
			<button type="button" onClick={onRegisterCentre} className={className}>
				<span>{label}</span>
				<ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
			</button>
		) : null;

	const primaryBtn =
		"h-12 px-6 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white font-bold text-base active:scale-[0.98] transition-[background-color,transform] inline-flex items-center gap-2 cursor-pointer";
	const secondaryBtn =
		"h-12 px-6 rounded-xl border border-line-strong bg-white text-base font-bold text-brand hover:bg-mint active:scale-[0.98] transition-[background-color,transform] inline-flex items-center gap-2 cursor-pointer";
	const cardBtn =
		"h-11 px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white font-semibold text-sm shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer";
	const h2Class =
		"text-[28px] sm:text-4xl font-extrabold text-brand leading-tight";

	return (
		<div className="min-h-screen bg-cq-page text-cq-ink-body font-brand-page flex flex-col antialiased selection:bg-cq-sage selection:text-cq-ink">
			{/* ---------------- Navigation Header ---------------- */}
			<header className="sticky top-0 z-40 w-full bg-white border-b border-cq-line">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<LogoFull size={34} />
					</div>

					<nav className="flex items-center gap-2 sm:gap-6">
						<button
							type="button"
							onClick={scrollToHowItWorks}
							className="text-sm font-bold text-ink-muted hover:text-brand transition-colors cursor-pointer hidden md:inline-flex">
							See how it works
						</button>
						<button
							type="button"
							onClick={showCentres}
							className="text-sm font-bold text-ink-muted hover:text-brand transition-colors cursor-pointer hidden sm:inline-flex">
							For centres
						</button>
						<button
							type="button"
							onClick={onOpenTrust}
							className="text-sm font-bold text-ink-muted hover:text-brand transition-colors cursor-pointer hidden sm:inline-flex">
							Trust &amp; AI
						</button>
						<button
							type="button"
							onClick={onLogIn}
							className="h-10 px-4 rounded-xl border border-line-strong bg-white text-sm font-bold text-brand hover:bg-mint active:scale-[0.98] transition-[background-color,transform] cursor-pointer">
							Log in
						</button>
						<button
							type="button"
							onClick={onGetStarted}
							className="h-10 px-4 sm:px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white text-sm font-bold active:scale-[0.98] transition-[background-color,transform] inline-flex items-center gap-2 cursor-pointer">
							<span>Get started</span>
							<ArrowRight className="w-4 h-4 shrink-0" />
						</button>
					</nav>
				</div>
			</header>

			{/* ---------------- Main Content ---------------- */}
			<main className="flex-1 flex flex-col">
				{/* 1. HERO */}
				<section className="max-w-6xl w-full mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
					<div>
						<p className="text-sm font-bold text-coral-ink mb-4">
							Ontario child care
						</p>

						<h1 className="text-[34px] sm:text-5xl lg:text-[52px] font-extrabold text-brand leading-[1.1]">
							Child-care applications and waitlist updates, in one place
						</h1>

						<p className="mt-5 text-lg leading-relaxed text-ink-muted max-w-xl">
							Parents apply to centres and see every update. Centres manage
							applications and keep families informed. Both work from the same
							record.
						</p>

						<div className="mt-8 flex flex-wrap items-center gap-4">
							<button
								type="button"
								onClick={onGetStarted}
								className={primaryBtn}>
								<span>I'm a parent</span>
								<ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
							</button>
							{centreButton(secondaryBtn)}
						</div>

						<button
							type="button"
							onClick={scrollToHowItWorks}
							className="mt-4 inline-flex items-center gap-2 h-10 text-sm font-bold text-brand underline decoration-brand/35 underline-offset-4 hover:decoration-brand cursor-pointer">
							See how it works
						</button>

						<ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
							{[
								"Free for parents",
								"Dated updates from each centre",
								"Nothing is sent without your approval",
							].map((t) => (
								<li key={t} className="flex items-center gap-1.5">
									<Check
										className="w-4 h-4 text-leaf-ink shrink-0"
										aria-hidden="true"
									/>
									{t}
								</li>
							))}
						</ul>

						<CentreCounts className="mt-8" compact />
					</div>

					{/* Hero photo: above the text on phones */}
					<HeroPhoto
						priority
						className="w-full max-w-[540px] mx-auto lg:max-w-none order-first sm:order-none"
					/>
				</section>

				{/* 2. THE PROBLEM (with sourced stats) */}
				<section className="bg-white border-y border-cq-line py-16 lg:py-24">
					<div className="max-w-6xl w-full mx-auto px-6">
						<div className="max-w-2xl mb-10 sm:mb-12">
							<p className="text-sm font-bold text-coral-ink mb-2">
								The problem
							</p>
							<h2 className={h2Class}>
								Applying for child care is hard for parents and for centres
							</h2>
						</div>

						<div className="grid md:grid-cols-3 gap-6 mb-12">
							{[
								{
									text: "Parents rarely hear when their waitlist position changes.",
									tone: "bg-cq-peach text-cq-peach-ink",
								},
								{
									text: "Without updates, families wait too long to consider other centres.",
									tone: "bg-cq-lilac text-cq-lilac-ink",
								},
								{
									text: "Centres juggle calls, emails and separate records.",
									tone: "bg-cq-sand text-cq-sand-ink-2",
								},
							].map((p, i) => (
								<div
									key={p.text}
									className="rounded-2xl border border-cq-line bg-cq-page p-7">
									<div
										className={`w-10 h-10 rounded-xl ${p.tone} flex items-center justify-center font-bold text-base mb-5`}>
										{i + 1}
									</div>
									<h3 className="text-lg font-bold text-cq-ink leading-snug">
										{p.text}
									</h3>
								</div>
							))}
						</div>

						<div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-cq-line">
							<div className="rounded-2xl border border-cq-line bg-white p-6">
								<p className="text-2xl sm:text-3xl font-extrabold text-cq-brand">
									~15,000
								</p>
								<p className="mt-2 text-sm font-semibold text-cq-ink">
									children waiting in Region of Waterloo
								</p>
								<p className="mt-2 text-xs text-cq-soft">(CP24, Sept 2026)</p>
							</div>

							<div className="rounded-2xl border border-cq-line bg-white p-6">
								<p className="text-2xl sm:text-3xl font-extrabold text-cq-brand">
									~8,500
								</p>
								<p className="mt-2 text-sm font-semibold text-cq-ink">
									on Ottawa's central waitlist
								</p>
								<p className="mt-2 text-xs text-cq-soft">(CP24, Sept 2026)</p>
							</div>

							<div className="rounded-2xl border border-cq-line bg-white p-6">
								<p className="text-2xl sm:text-3xl font-extrabold text-cq-brand">
									47
								</p>
								<p className="mt-2 text-sm font-semibold text-cq-ink">
									local service system managers run child care in Ontario
								</p>
								<p className="mt-2 text-xs text-cq-soft">
									(Government of Ontario)
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* 3. WHAT YOU GET */}
				<section className="py-16 lg:py-24">
					<div className="max-w-6xl w-full mx-auto px-6">
						<h2 className={`${h2Class} max-w-2xl mb-10 sm:mb-12`}>
							What CareQ gives you
						</h2>

						<div className="grid md:grid-cols-3 gap-6">
							{[
								{
									title: "Dated waitlist updates",
									text: "See the latest position and when the centre reported it.",
									Icon: CalendarClock,
									tone: "bg-cq-sage text-cq-sage-ink",
								},
								{
									title: "Every application on one page",
									text: "See each application's status, position and any offer.",
									Icon: ClipboardList,
									tone: "bg-cq-sand text-cq-sand-ink-2",
								},
								{
									title: "Messages kept together",
									text: "No more searching through calls and emails.",
									Icon: MessagesSquare,
									tone: "bg-cq-lilac text-cq-lilac-ink",
								},
							].map(({ title, text, Icon, tone }) => (
								<div
									key={title}
									className="rounded-2xl border border-cq-line bg-white p-6">
									<div
										className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center mb-4`}>
										<Icon className="w-5 h-5" aria-hidden="true" />
									</div>
									<h3 className="text-lg font-bold text-cq-ink leading-snug">
										{title}
									</h3>
									<p className="mt-2 text-sm text-cq-muted leading-relaxed">
										{text}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* 4. HOW CAREQ WORKS (parents / centres tabs) */}
				<section
					id="how-it-works"
					className="bg-white border-y border-cq-line py-16 lg:py-24 scroll-mt-24">
					<div className="max-w-6xl w-full mx-auto px-6">
						<h2 id="how-it-works-heading" className={`${h2Class} mb-8`}>
							How CareQ works
						</h2>

						<div
							role="tablist"
							aria-labelledby="how-it-works-heading"
							className="inline-flex w-full sm:w-auto rounded-xl border border-cq-line bg-cq-page p-1 mb-8">
							{TABS.map((t) => {
								const selected = audience === t.id;
								return (
									<button
										key={t.id}
										ref={(el) => {
											tabRefs.current[t.id] = el;
										}}
										type="button"
										role="tab"
										id={`tab-${t.id}`}
										aria-selected={selected}
										aria-controls={`panel-${t.id}`}
										tabIndex={selected ? 0 : -1}
										onClick={() => selectAudience(t.id)}
										onKeyDown={onTabKeyDown}
										className={`flex-1 sm:flex-none h-11 px-5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
											selected
												? "bg-cq-brand text-white"
												: "text-ink-muted hover:text-brand hover:bg-mint"
										}`}>
										{t.label}
									</button>
								);
							})}
						</div>

						{TABS.map((t) => (
							<div
								key={t.id}
								role="tabpanel"
								id={`panel-${t.id}`}
								aria-labelledby={`tab-${t.id}`}
								hidden={audience !== t.id}
								tabIndex={0}>
								<ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
									{STEPS[t.id].map(({ title, text, Spot }, i) => (
										<li
											key={title}
											className="rounded-2xl border border-cq-line bg-cq-page p-6">
											<Spot className="w-28 mb-4" />
											<p className="text-sm font-bold text-coral-ink mb-1">
												Step {i + 1}
											</p>
											<h3 className="text-lg font-bold text-cq-ink mb-2">
												{title}
											</h3>
											<p className="text-sm text-cq-muted leading-relaxed">
												{text}
											</p>
										</li>
									))}
								</ol>
							</div>
						))}
					</div>
				</section>

				{/* 5. WHO CAREQ IS FOR */}
				<section className="py-16 lg:py-24">
					<div className="max-w-6xl w-full mx-auto px-6">
						<h2 className={`${h2Class} max-w-2xl mb-10 sm:mb-12`}>
							Who CareQ is for
						</h2>

						<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
							{/* For parents (photo on top, lazy; the card's corners round it) */}
							<div className="rounded-2xl border border-cq-line bg-white overflow-hidden flex flex-col">
								<HeroPhoto
									photo={PHOTOS.parent}
									caption={false}
									roundedClassName="rounded-none"
									frameClassName="h-[180px] sm:h-[220px]"
								/>
								<div className="p-8 flex-1 flex flex-col justify-between gap-6">
									<div>
										<div className="inline-flex items-center gap-2 rounded-full border border-cq-sage-250 bg-cq-sage-50 px-3.5 py-1 text-xs font-semibold text-cq-sage-ink mb-5">
											<span>Families</span>
										</div>
										<h3 className="text-2xl font-bold text-cq-ink mb-3">
											For parents
										</h3>
										<p className="text-base text-cq-muted leading-relaxed">
											All your applications, updates and messages in one place.
										</p>
									</div>
									<div>
										<button
											type="button"
											onClick={onGetStarted}
											className={cardBtn}>
											<span>Get started as a parent</span>
											<ArrowRight
												className="w-4 h-4 shrink-0"
												aria-hidden="true"
											/>
										</button>
									</div>
								</div>
							</div>

							{/* For centres */}
							<div className="rounded-2xl border border-cq-line bg-white overflow-hidden flex flex-col">
								<HeroPhoto
									photo={PHOTOS.centre}
									caption={false}
									roundedClassName="rounded-none"
									frameClassName="h-[180px] sm:h-[220px]"
								/>
								<div className="p-8 flex-1 flex flex-col justify-between gap-6">
									<div>
										<div className="inline-flex items-center gap-2 rounded-full border border-cq-lilac-line-3 bg-cq-lilac px-3.5 py-1 text-xs font-semibold text-cq-lilac-ink mb-5">
											<span>Child-care centres</span>
										</div>
										<h3 className="text-2xl font-bold text-cq-ink mb-3">
											For centres
										</h3>
										<p className="text-base text-cq-muted leading-relaxed">
											Applications, waitlists and family messages in one place.
										</p>
									</div>
									<div>{centreButton(cardBtn, "Register your centre")}</div>
								</div>
							</div>
						</div>
						<AiCaption className="mt-4 max-w-4xl mx-auto" />
					</div>
				</section>

				{/* 6. HOW WE USE AI */}
				<section className="bg-white border-y border-cq-line py-16 lg:py-24">
					<div className="max-w-6xl w-full mx-auto px-6">
						<div className="max-w-2xl mb-10">
							<p className="text-sm font-bold text-coral-ink mb-2">
								How we use AI
							</p>
							<h2 className={h2Class}>The AI helps; people decide</h2>
						</div>

						<div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
							{[
								{
									title: "You approve everything",
									text: "Applications, messages and withdrawals go out only when you confirm.",
									Icon: CheckCheck,
									tone: "bg-cq-sage text-cq-sage-ink",
								},
								{
									title: "No estimated positions",
									text: "Positions come only from the centre, with the date.",
									Icon: FileText,
									tone: "bg-cq-sand text-cq-sand-ink-2",
								},
								{
									title: "No ranking of families",
									text: "CareQ never scores families or suggests who gets a spot.",
									Icon: ShieldCheck,
									tone: "bg-cq-lilac text-cq-lilac-ink",
								},
								{
									title: "Minimal data to the AI",
									text: "For example, drafts use your child's first name only.",
									Icon: Lock,
									tone: "bg-cq-peach text-cq-peach-ink",
								},
							].map(({ title, text, Icon, tone }) => (
								<div
									key={title}
									className="rounded-2xl border border-cq-line bg-cq-page p-6 text-center sm:text-left flex flex-col items-center sm:items-start">
									<div
										className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center mb-4`}>
										<Icon className="w-5 h-5" aria-hidden="true" />
									</div>
									<h3 className="text-base font-bold text-cq-ink leading-snug">
										{title}
									</h3>
									<p className="mt-2 text-sm text-cq-muted leading-relaxed">
										{text}
									</p>
								</div>
							))}
						</div>

						<div className="mt-8">
							<button
								type="button"
								onClick={onOpenTrust}
								className="inline-flex items-center gap-2 h-10 text-sm font-bold text-brand underline decoration-brand/35 underline-offset-4 hover:decoration-brand cursor-pointer">
								<span>Read how we use AI</span>
								<ArrowRight className="w-4 h-4" aria-hidden="true" />
							</button>
						</div>
					</div>
				</section>

				{/* 7. COMMON QUESTIONS */}
				<section className="py-16 lg:py-24">
					<div className="max-w-4xl w-full mx-auto px-6">
						<h2 className={`${h2Class} mb-10`}>Common questions</h2>

						<div className="space-y-4">
							{[
								{
									q: "Does CareQ guarantee a spot?",
									a: "No. Each centre makes its own admission decisions.",
								},
								{
									q: "Will I see when my position changes?",
									a: "Yes. Each update from the centre appears with its date.",
								},
								{
									q: "Can I see past messages with a centre?",
									a: "Yes. They stay with the application.",
								},
								{
									q: "Where does centre information come from?",
									a: "Ontario and City of Toronto open data, and each centre's own handbook.",
								},
								{
									q: "Does my centre need new systems?",
									a: "No. Upload or paste your handbook and use CareQ in a web browser.",
								},
							].map(({ q, a }) => (
								<div
									key={q}
									className="rounded-2xl border border-cq-line bg-white p-6 sm:p-7">
									<h3 className="text-base sm:text-lg font-bold text-cq-ink">
										{q}
									</h3>
									<p className="mt-2 text-sm sm:text-base text-cq-muted leading-relaxed">
										{a}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>

				{/* 8. WHO WE ARE */}
				<section className="bg-white border-y border-cq-line py-16 lg:py-20">
					<div className="max-w-4xl w-full mx-auto px-6">
						<p className="text-sm font-bold text-coral-ink mb-2">
							About the project
						</p>
						<h2 className="text-[28px] sm:text-3xl font-extrabold text-brand mb-3">
							Who we are
						</h2>
						<p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">
							CareQ is a prototype by a women-led team. It makes child-care
							applications and waitlists easier for Ontario families and
							centres.
						</p>
						<div className="mt-6 inline-flex flex-col rounded-2xl bg-cq-page border border-cq-line px-5 py-4">
							<span className="text-xs font-bold text-cq-brand">
								Team 38 – Coalesce
							</span>
							<span className="text-sm text-cq-soft mt-1">
								Team: Nashira, Indhu, Fiza
							</span>
						</div>
					</div>
				</section>

				{/* 9. FINAL CALL TO ACTION */}
				<section className="py-12 lg:py-20">
					<div className="max-w-4xl w-full mx-auto px-6">
						{/* Photo beside the text from md up, above it on phones */}
						<div className="rounded-3xl bg-butter p-5 sm:p-8 md:p-10 grid md:grid-cols-2 gap-6 md:gap-10 items-center">
							<HeroPhoto
								photo={PHOTOS.painting}
								frameClassName="h-[200px] sm:h-[260px] md:h-[300px]"
							/>
							<div className="text-center md:text-left px-3 pb-3 sm:px-0 sm:pb-0">
								<h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand leading-tight">
									Start with CareQ today
								</h2>
								<div className="mt-8 flex flex-wrap justify-center md:justify-start gap-3">
									<button
										type="button"
										onClick={onGetStarted}
										className={primaryBtn}>
										<span>I'm a parent</span>
										<ArrowRight
											className="w-4 h-4 shrink-0"
											aria-hidden="true"
										/>
									</button>
									{centreButton(secondaryBtn)}
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* ---------------- Footer ---------------- */}
			<footer className="border-t border-cq-line bg-white py-10 text-xs text-cq-muted">
				<div className="max-w-6xl w-full mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
					<div>
						<p className="font-bold text-cq-ink text-sm mb-1">
							CareQ: child-care applications for parents and centres.
						</p>
						<p className="max-w-2xl leading-relaxed text-cq-soft">
							Prototype built by Team 38 – Coalesce for the Women in AI Canada
							Hackathon 2026. Centre listings come from Ontario open data; all
							families, waitlists and messages shown are simulated. © 2026 CareQ
						</p>
					</div>

					<div className="flex items-center gap-4 text-xs font-semibold shrink-0">
						<button
							type="button"
							onClick={onOpenTrust}
							className="text-cq-brand hover:underline cursor-pointer">
							Trust &amp; AI
						</button>
						<span className="text-cq-stone-300">|</span>
						<button
							type="button"
							onClick={onLogIn}
							className="text-cq-muted hover:text-cq-ink cursor-pointer">
							Log in
						</button>
						<span className="text-cq-stone-300">|</span>
						<button
							type="button"
							onClick={onGetStarted}
							className="text-cq-brand hover:underline cursor-pointer">
							Get started
						</button>
					</div>
				</div>
			</footer>
		</div>
	);
};
