import React, { useState } from "react";
import {
	User,
	Building2,
	Lock,
	Mail,
	ArrowRight,
	Check,
	Info,
	ArrowLeft,
	ExternalLink,
	Heart,
} from "lucide-react";
import { LogoFull } from "./Logo";
import { ResetDemo } from "./ResetDemo";
import { HeroPhoto, PHOTOS } from "./ui/HeroPhoto";
import { CentreCounts } from "./CentreCounts";
import { isValidEmail, MIN_PASSWORD_LENGTH, Child } from "../lib/family";

export interface MockAccount {
	id: string;
	role: "parent" | "centre";
	email: string;
	name: string;
	password?: string; // only on the built-in demo accounts (in code); never saved to storage
	passwordHash?: string; // SHA-256 for accounts created by sign-up
	childName?: string;
	childAgeMonths?: number;
	centreName?: string;
	/** Centre staff: the centre this account manages (set when the centre is registered). */
	centreId?: string;
	/** Parents: children added during onboarding (the first is the active child). */
	children?: Child[];
	/** Parents: false until onboarding is finished. */
	onboarded?: boolean;
}

interface AuthPageProps {
	/** Resolves to an error message, or null when signed in. */
	onLogIn: (input: {
		role: "parent" | "centre";
		email: string;
		password: string;
	}) => Promise<string | null>;
	onSignUp: (input: {
		role: "parent" | "centre";
		name: string;
		email: string;
		password: string;
	}) => Promise<string | null>;
	onOpenTrustPage: () => void;
	initialMode?: "login" | "signup";
	initialRole?: "parent" | "centre";
	onBackToLanding?: () => void;
}

const DEMO_PASSWORD = "password";
const PARENT_DEMO_EMAIL = "priya@example.ca";
// The one centre demo login: Priya's waitlist application (position updates) is here.
// Other centre accounts (e.g. the fictional CareQ Demo Centre) are testing accounts listed in the README.
const CENTRE_DEMOS = [
	{
		label: "Jesse Ketchum Early Learning & Child Care Centre",
		email: "jesse-ketchum.demo@careq.example",
		note: "Simulated demo account",
	},
];

export const AuthPage: React.FC<AuthPageProps> = ({
	onLogIn,
	onSignUp,
	onOpenTrustPage,
	initialMode = "login",
	initialRole = "parent",
	onBackToLanding,
}) => {
	const [busy, setBusy] = useState(false);
	// Selected Portal: "parent" | "centre"
	const [targetRole, setTargetRole] = useState<"parent" | "centre">(
		initialRole
	);

	// Selected Mode: "login" | "signup"
	const [authMode, setAuthMode] = useState<"login" | "signup">(initialMode);

	// Login form state
	const [loginEmail, setLoginEmail] = useState<string>("priya@example.ca");
	const [loginPassword, setLoginPassword] = useState<string>("password");
	const [loginError, setLoginError] = useState<string | null>(null);

	// Sign up form state
	const [signupName, setSignupName] = useState<string>("");
	const [signupEmail, setSignupEmail] = useState<string>("");
	const [signupPassword, setSignupPassword] = useState<string>("");
	const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
	const [signupError, setSignupError] = useState<string | null>(null);

	// Handle switching role
	const handleRoleSwitch = (role: "parent" | "centre") => {
		setTargetRole(role);
		setLoginError(null);
		setSignupError(null);
		setLoginEmail(
			role === "parent" ? PARENT_DEMO_EMAIL : CENTRE_DEMOS[0].email
		);
	};

	// Handle Login submission (checked by the server in mongo mode)
	const handleLoginSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoginError(null);
		setBusy(true);
		const error = await onLogIn({
			role: targetRole,
			email: loginEmail.trim(),
			password: loginPassword,
		});
		setBusy(false);
		if (error) setLoginError(error);
	};

	// One-click demo login: the demo accounts' published password
	const handleQuickDemoLogin = async (
		role: "parent" | "centre",
		email = PARENT_DEMO_EMAIL
	) => {
		setLoginError(null);
		setBusy(true);
		const error = await onLogIn({ role, email, password: DEMO_PASSWORD });
		setBusy(false);
		if (error) setLoginError(error);
	};

	// Handle Sign-Up submission (demo account; no email is ever sent)
	const handleSignupSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSignupError(null);
		const email = signupEmail.trim();
		// Quick checks here for instant feedback; the server checks again
		if (!signupName.trim()) return setSignupError("Please enter your name.");
		if (!isValidEmail(email))
			return setSignupError(
				"Please enter a valid email address, like name@example.ca."
			);
		if (signupPassword.length < MIN_PASSWORD_LENGTH) {
			return setSignupError(
				`Please use a password with at least ${MIN_PASSWORD_LENGTH} characters.`
			);
		}
		if (!termsAccepted)
			return setSignupError(
				"Please confirm you have read the terms and how CareQ uses AI."
			);
		setBusy(true);
		const error = await onSignUp({
			role: targetRole,
			name: signupName.trim(),
			email,
			password: signupPassword,
		});
		setBusy(false);
		if (error) setSignupError(error);
		else setSignupPassword("");
	};

	return (
		<div className="min-h-screen bg-cq-page text-cq-ink-body font-brand-page flex flex-col justify-between antialiased">
			{/* Top Row: Logo on left, Trust & Support link on right */}
			<header className="w-full">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 flex justify-between items-center gap-3">
					<div className="flex items-center gap-4">
						{onBackToLanding && (
							<button
								type="button"
								onClick={onBackToLanding}
								className="inline-flex items-center gap-1.5 text-sm font-semibold text-cq-brand-ink hover:underline cursor-pointer">
								<ArrowLeft className="w-4 h-4" aria-hidden="true" />
								<span>Back</span>
							</button>
						)}
						<LogoFull size={36} />
					</div>
					<button
						type="button"
						onClick={onOpenTrustPage}
						className="inline-flex items-center gap-1.5 text-sm font-semibold text-cq-brand-ink hover:underline cursor-pointer">
						<span className="hidden sm:inline">
							Need a hand? Trust &amp; support
						</span>
						<span className="sm:hidden">Trust &amp; support</span>
						<ArrowRight className="w-4 h-4" />
					</button>
				</div>
			</header>

			{/* Main Grid: Left hero column, Right login card */}
			<main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-14 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start flex-1">
				{/* LEFT COLUMN (hero) */}
				<div className="lg:pt-6 flex flex-col">
					{/* 1. Pill */}
					<p className="text-sm font-bold text-coral-ink">
						For families &amp; the people who care
					</p>

					{/* 2. Headline h1 on two lines */}
					<h1 className="text-[34px] sm:text-5xl lg:text-[56px] font-extrabold leading-[1.08] text-brand mt-3">
						A little less admin.
						<br />A lot more connection.
					</h1>

					{/* 3. Paragraph */}
					<p className="mt-5 max-w-md text-lg leading-8 text-ink-muted">
						One shared place to find child care, follow applications, and keep
						the conversation going.
					</p>

					{/* 4. Welcome photo (lazy). Above the text on phones. */}
					<HeroPhoto
						photo={PHOTOS.login}
						className="mb-6 sm:mb-0 sm:mt-8 w-full lg:max-w-[520px] order-first sm:order-none">
						<div className="absolute left-4 bottom-4 bg-white rounded-xl shadow-md px-4 py-2.5 text-sm text-ink items-center gap-2 -rotate-2 hidden sm:flex">
							<Check
								className="w-4 h-4 text-leaf-ink shrink-0"
								aria-hidden="true"
							/>
							<span className="font-semibold">
								Parents &amp; centres, on the same page.
							</span>
						</div>
					</HeroPhoto>

					{/* 5. Stat Row: Ontario and the Toronto centres in CareQ */}
					{/* <CentreCounts className="mt-8" compact /> */}
				</div>

				{/* RIGHT COLUMN (the existing login card, restyled) */}
				<div className="w-full">
					<div className="bg-white rounded-3xl border border-cq-line shadow-lg p-5 sm:p-10 w-full space-y-6">
						{/* Parent / Centre role switch: two side-by-side selectable cards */}
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => handleRoleSwitch("parent")}
								className={`rounded-2xl border p-4 text-left relative transition-all cursor-pointer ${
									targetRole === "parent"
										? "border-brand bg-mint"
										: "border-cq-line bg-white hover:bg-mint-50"
								}`}>
								{targetRole === "parent" && (
									<div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-cq-brand flex items-center justify-center text-white">
										<Check className="w-3 h-3 stroke-[2.5]" />
									</div>
								)}
								<User className="w-5 h-5 text-cq-sage-ink mb-3" />
								<span className="block text-sm font-semibold text-cq-ink">
									Parent Portal
								</span>
							</button>

							<button
								type="button"
								onClick={() => handleRoleSwitch("centre")}
								className={`rounded-2xl border p-4 text-left relative transition-all cursor-pointer ${
									targetRole === "centre"
										? "border-brand bg-mint"
										: "border-cq-line bg-white hover:bg-mint-50"
								}`}>
								{targetRole === "centre" && (
									<div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-cq-brand flex items-center justify-center text-white">
										<Check className="w-3 h-3 stroke-[2.5]" />
									</div>
								)}
								<Building2 className="w-5 h-5 text-cq-sage-ink mb-3" />
								<span className="block text-sm font-semibold text-cq-ink">
									Centre Portal
								</span>
							</button>
						</div>

						{/* Title & Mode Switcher */}
						<div>
							<div className="flex items-center justify-between gap-2 flex-wrap">
								<h1 className="text-3xl font-bold text-cq-ink">
									{targetRole === "parent"
										? authMode === "login"
											? "Parent login"
											: "Create a parent account"
										: authMode === "login"
										? "Centre staff login"
										: "Create a centre account"}
								</h1>

								{/* Sub-toggle: Log In vs Sign Up as a small pill segmented control */}
								<div className="flex items-center rounded-full bg-cq-surface-stone-2 p-1 text-xs">
									<button
										type="button"
										onClick={() => {
											setAuthMode("login");
											setLoginError(null);
										}}
										className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
											authMode === "login"
												? "bg-white shadow-sm text-cq-brand font-bold"
												: "text-cq-muted hover:text-cq-ink font-medium"
										}`}>
										Log in
									</button>
									<button
										type="button"
										onClick={() => {
											setAuthMode("signup");
											setSignupError(null);
										}}
										className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
											authMode === "signup"
												? "bg-white shadow-sm text-cq-brand font-bold"
												: "text-cq-muted hover:text-cq-ink font-medium"
										}`}>
										Create an account
									</button>
								</div>
							</div>

							<p className="text-sm text-cq-muted mt-2">
								{targetRole === "parent"
									? authMode === "login"
										? "Access your child care applications, checklists, and waitlist tracking."
										: "Next you'll tell us about your child. Demo account, saved only in this browser."
									: authMode === "login"
									? "Sign in to manage intake applications, verify documents, and report queue positions."
									: "Next you'll register your centre. Demo account, saved only in this browser."}
							</p>
						</div>

						{/* Error alerts */}
						{loginError && (
							<div
								role="alert"
								className="p-3.5 rounded-xl bg-cq-rose-50 border border-cq-rose-200 text-cq-rose-700 text-xs">
								{loginError}
							</div>
						)}
						{signupError && (
							<div
								role="alert"
								className="p-3.5 rounded-xl bg-cq-rose-50 border border-cq-rose-200 text-cq-rose-700 text-xs">
								{signupError}
							</div>
						)}

						{/* LOGIN FORM */}
						{authMode === "login" ? (
							<form onSubmit={handleLoginSubmit} className="space-y-5">
								<div>
									<label className="block text-sm font-medium text-cq-ink-2 mb-2">
										{targetRole === "parent"
											? "Parent Email"
											: "Centre Administrator Email"}
									</label>
									<div className="relative">
										<Mail className="w-4 h-4 text-cq-faint absolute left-4 top-4" />
										<input
											type="email"
											required
											value={loginEmail}
											onChange={(e) => setLoginEmail(e.target.value)}
											className="h-12 w-full rounded-xl border border-cq-line-input bg-cq-input pl-11 pr-4 text-sm text-cq-ink-body placeholder:text-cq-faint focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 outline-none transition-all"
											placeholder={
												targetRole === "parent"
													? PARENT_DEMO_EMAIL
													: CENTRE_DEMOS[0].email
											}
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-cq-ink-2 mb-2">
										Password
									</label>
									<div className="relative">
										<Lock className="w-4 h-4 text-cq-faint absolute left-4 top-4" />
										<input
											type="password"
											required
											value={loginPassword}
											onChange={(e) => setLoginPassword(e.target.value)}
											className="h-12 w-full rounded-xl border border-cq-line-input bg-cq-input pl-11 pr-4 text-sm text-cq-ink-body placeholder:text-cq-faint focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 outline-none transition-all"
											placeholder="••••••••"
										/>
									</div>
								</div>

								<button
									type="submit"
									disabled={busy}
									className="h-14 w-full rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white text-base font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
									<span>
										Log In as{" "}
										{targetRole === "parent" ? "Parent" : "Child-Care Centre"}
									</span>
									<ArrowRight className="w-4 h-4" />
								</button>
							</form>
						) : (
							/* SIGN-UP FORM */
							<form
								onSubmit={handleSignupSubmit}
								className="space-y-5"
								noValidate>
								<div>
									<label
										htmlFor="signup-name"
										className="block text-sm font-medium text-cq-ink-2 mb-2">
										{targetRole === "parent"
											? "Your name"
											: "Your name (centre staff)"}
									</label>
									<input
										id="signup-name"
										type="text"
										autoComplete="name"
										value={signupName}
										onChange={(e) => setSignupName(e.target.value)}
										placeholder={
											targetRole === "parent"
												? "e.g. Alex Morgan"
												: "e.g. Jordan Lee"
										}
										className="h-12 w-full rounded-xl border border-cq-line-input bg-cq-input px-4 text-sm text-cq-ink-body placeholder:text-cq-faint focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 outline-none transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="signup-email"
										className="block text-sm font-medium text-cq-ink-2 mb-2">
										Email address
									</label>
									<input
										id="signup-email"
										type="email"
										autoComplete="email"
										value={signupEmail}
										onChange={(e) => setSignupEmail(e.target.value)}
										placeholder={
											targetRole === "parent"
												? "you@example.ca"
												: "you@yourcentre.ca"
										}
										className="h-12 w-full rounded-xl border border-cq-line-input bg-cq-input px-4 text-sm text-cq-ink-body placeholder:text-cq-faint focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 outline-none transition-all"
									/>
								</div>

								<div>
									<label
										htmlFor="signup-password"
										className="block text-sm font-medium text-cq-ink-2 mb-2">
										Create a password
									</label>
									<input
										id="signup-password"
										type="password"
										autoComplete="new-password"
										aria-describedby="signup-password-hint"
										value={signupPassword}
										onChange={(e) => setSignupPassword(e.target.value)}
										placeholder="••••••••"
										className="h-12 w-full rounded-xl border border-cq-line-input bg-cq-input px-4 text-sm text-cq-ink-body placeholder:text-cq-faint focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25 outline-none transition-all"
									/>
									<p
										id="signup-password-hint"
										className="mt-1.5 text-xs text-cq-soft">
										At least {MIN_PASSWORD_LENGTH} characters. Demo only: stored
										as a hash in this browser and never shown again.
									</p>
								</div>

								{/* Mandatory one-time terms and AI checkbox */}
								<div className="rounded-xl bg-cq-input border border-cq-line-input p-4 space-y-1.5 mt-2">
									<label className="flex items-start gap-2.5 cursor-pointer">
										<input
											type="checkbox"
											required
											checked={termsAccepted}
											onChange={(e) => setTermsAccepted(e.target.checked)}
											className="mt-0.5 w-4 h-4 rounded text-cq-brand focus:ring-cq-secondary border-cq-stone-300 shrink-0 cursor-pointer"
										/>
										<span className="text-xs text-cq-stone-800 leading-snug font-medium select-none">
											I have read the terms and how CareQ uses AI.
										</span>
									</label>
									<div className="pl-6.5 text-xs text-cq-stone-500">
										<button
											type="button"
											onClick={onOpenTrustPage}
											className="text-cq-brand hover:text-cq-secondary font-semibold underline inline-flex items-center gap-0.5 cursor-pointer">
											<span>Read Trust and transparency terms</span>
											<ExternalLink className="w-3 h-3" />
										</button>
									</div>
								</div>

								<button
									type="submit"
									disabled={!termsAccepted || busy}
									className={`h-14 w-full rounded-xl text-base font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 ${
										termsAccepted
											? "bg-cq-brand hover:bg-cq-brand-hover text-white cursor-pointer"
											: "bg-cq-stone-200 text-cq-stone-400 cursor-not-allowed"
									}`}>
									<Check className="w-4 h-4" />
									<span>
										Create {targetRole === "parent" ? "parent" : "centre"}{" "}
										account
									</span>
								</button>
							</form>
						)}

						{/* DEMO ACCOUNTS NOTE ON LOGIN PAGE */}
						<div className="pt-2 border-t border-cq-line">
							<div className="rounded-2xl bg-cq-sand-25 border border-cq-sand-200 p-5 space-y-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-1.5 text-xs font-bold text-cq-sand-ink">
										<Info className="w-4 h-4" aria-hidden="true" />
										<span>Simulated Demo Accounts</span>
									</div>
									{/* <span className="text-xs font-semibold text-cq-sand-ink/80 bg-white px-2 py-0.5 rounded-full border border-cq-sand-200">
										Prototype Data
									</span> */}
								</div>

								<div className="space-y-2 text-xs">
									{/* Test Parent */}
									<div className="bg-white p-3 rounded-xl border border-cq-sand-200 flex items-center justify-between gap-2 shadow-2xs">
										<div>
											<div className="font-semibold text-cq-stone-900 flex items-center gap-1.5">
												<User className="w-3.5 h-3.5 text-cq-brand" />
												<span>Test Parent: Priya Patel</span>
											</div>
											<div className="text-xs text-cq-stone-500 mt-0.5">
												{/* Email:{" "}
												<code className="text-cq-brand font-semibold">
													priya@example.ca
												</code>{" "}
												• Password:{" "}
												<code className="text-cq-brand font-semibold">
													password
												</code>{" "} */}
												Child: Anya
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleQuickDemoLogin("parent")}
											className="shrink-0 px-3 py-1.5 text-xs font-bold text-cq-brand bg-cq-secondary/15 hover:bg-cq-secondary/25 rounded-lg transition-colors cursor-pointer"
											title="Log in directly as test parent">
											Log in
										</button>
									</div>

									{/* Test centre: one real centre's simulated demo account */}
									{CENTRE_DEMOS.map((d) => (
										<div
											key={d.email}
											className="bg-white p-3 rounded-xl border border-cq-sand-200 flex items-center justify-between gap-2 shadow-2xs">
											<div>
												<div className="font-semibold text-cq-stone-900 flex items-center gap-1.5">
													<Building2 className="w-3.5 h-3.5 text-cq-brand shrink-0" />
													<span>Test Centre: {d.label}</span>
												</div>
												<div className="text-xs text-cq-stone-500 mt-0.5">
													{/* Email:{" "}
													<code className="text-cq-brand font-semibold">
														{d.email}
													</code>{" "}
													• Password:{" "}
													<code className="text-cq-brand font-semibold">
														password
													</code> */}
												</div>
												{/* <div className="text-xs text-cq-stone-500 mt-0.5">
													{d.note}
												</div> */}
											</div>
											<button
												type="button"
												onClick={() => handleQuickDemoLogin("centre", d.email)}
												className="shrink-0 px-3 py-1.5 text-xs font-bold text-cq-brand bg-cq-secondary/15 hover:bg-cq-secondary/25 rounded-lg transition-colors cursor-pointer"
												title={`Log in directly as ${d.label}`}>
												Log in
											</button>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="w-full">
				<div className="max-w-6xl mx-auto px-6 border-t border-cq-line py-6 text-xs text-cq-muted-2 bg-transparent flex flex-col sm:flex-row items-center justify-between gap-2">
					{/* <p>CareQ • Simplified Ontario Child Care Intake &amp; Central Waitlist Management</p> */}
					<div className="flex items-start gap-5">
						<ResetDemo variant="link" />
						<button
							type="button"
							onClick={onOpenTrustPage}
							className="text-cq-brand hover:text-cq-secondary font-semibold underline transition-colors cursor-pointer">
							Trust and transparency
						</button>
					</div>
				</div>
			</footer>
		</div>
	);
};
