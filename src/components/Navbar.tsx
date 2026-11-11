import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { ParentProfile, Centre, InAppNotification } from "../data/mockData";
import { LogoFull, LogoMark } from "./Logo";
import { NotificationBell } from "./NotificationBell";

interface NavbarProps {
	currentRole: "parent" | "centre";
	parentProfile: ParentProfile;
	singleCentre: Centre;
	notifications: InAppNotification[];
	onMarkAsRead: (id: string) => void;
	onMarkAllAsRead: (role: "parent" | "centre") => void;
	onLogout: () => void;
	onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
	currentRole,
	parentProfile,
	singleCentre,
	notifications,
	onMarkAsRead,
	onMarkAllAsRead,
	onLogout,
	onOpenProfile,
}) => {
	// Avatar menu: "Your profile" and "Log out" (menu button pattern: arrows, Home/End, Escape, Tab)
	const [menuOpen, setMenuOpen] = useState(false);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const items = () =>
		Array.from(
			menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
		);
	const focusItem = (i: number) => {
		const list = items();
		list[(i + list.length) % list.length]?.focus();
	};
	const openMenu = (focus: "first" | "last" = "first") => {
		setMenuOpen(true);
		window.requestAnimationFrame(() => focusItem(focus === "first" ? 0 : -1));
	};
	const closeMenu = (returnFocus = true) => {
		setMenuOpen(false);
		if (returnFocus) buttonRef.current?.focus();
	};
	useEffect(() => {
		if (!menuOpen) return;
		const onDown = (e: PointerEvent) => {
			const t = e.target as Node;
			if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t))
				setMenuOpen(false);
		};
		document.addEventListener("pointerdown", onDown);
		return () => document.removeEventListener("pointerdown", onDown);
	}, [menuOpen]);
	const onMenuKey = (e: React.KeyboardEvent) => {
		const list = items();
		const i = list.indexOf(document.activeElement as HTMLElement);
		if (e.key === "ArrowDown") {
			e.preventDefault();
			focusItem(i + 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			focusItem(i - 1);
		} else if (e.key === "Home") {
			e.preventDefault();
			focusItem(0);
		} else if (e.key === "End") {
			e.preventDefault();
			focusItem(-1);
		} else if (e.key === "Escape") {
			e.preventDefault();
			closeMenu();
		} else if (e.key === "Tab") setMenuOpen(false);
	};
	const choose = (fn: () => void) => {
		closeMenu(false);
		fn();
	};

	const parentInitials =
		parentProfile.name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.slice(0, 2)
			.toUpperCase() || "P";

	const centreInitials =
		singleCentre.name
			.split(" ")
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0])
			.join("")
			.toUpperCase() || "C";

	return (
		<header className="bg-white border-b border-cq-line sticky top-0 z-40 h-16 lg:h-[68px] flex items-center">
			<div className="max-w-[1180px] w-full mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between">
				{/* Left: Logo (below lg, where the sidebar is hidden) + portal name */}
				<div className="flex items-center gap-3 min-w-0">
					<div className="flex items-center lg:hidden">
						<LogoFull size={32} className="hidden sm:inline-flex" />
						<LogoMark size={34} className="inline-flex sm:hidden" />
					</div>

					<div className="hidden sm:flex flex-col justify-center min-w-0 sm:pl-3 sm:border-l sm:border-cq-line lg:pl-0 lg:border-0">
						<span className="text-sm font-extrabold text-brand">
							{currentRole === "parent" ? "Parent portal" : "Centre portal"}
						</span>
						<p className="text-xs text-ink-soft hidden md:block truncate">
							Ontario Licensed Child Care Queue &amp; Communication System
						</p>
					</div>
				</div>

				{/* Right side order:
            1. Lock icon + "Prototype"
            2. NotificationBell
            3. 1px divider h-8
            4. Avatar circle w-9 h-9 with initials
            5. Name text-xs font-bold + sub-line
            6. Log out as GhostButton size h-9 text-xs */}
				<div className="flex items-center gap-2 sm:gap-4">
					{/* "Prototype" is already stated in the band above the header */}
					{/* Notification Bell */}
					<NotificationBell
						notifications={notifications}
						currentRole={currentRole}
						onMarkAsRead={onMarkAsRead}
						onMarkAllAsRead={onMarkAllAsRead}
					/>

					<div className="hidden sm:block h-8 w-px bg-cq-line" />

					{/* Avatar and name: opens the account menu */}
					<div className="relative">
						<button
							ref={buttonRef}
							type="button"
							id="account-menu-button"
							aria-haspopup="menu"
							aria-expanded={menuOpen}
							aria-controls="account-menu"
							aria-label={`Account menu for ${
								currentRole === "parent"
									? parentProfile.name
									: singleCentre.name
							}`}
							onClick={() => (menuOpen ? closeMenu(false) : openMenu())}
							onKeyDown={(e) => {
								if (e.key === "ArrowDown") {
									e.preventDefault();
									openMenu("first");
								} else if (e.key === "ArrowUp") {
									e.preventDefault();
									openMenu("last");
								}
							}}
							className="flex items-center gap-2.5 rounded-xl p-1 sm:pr-2 hover:bg-mint-50 transition-colors cursor-pointer">
							<span
								className="w-9 h-9 rounded-full bg-mint text-brand text-sm font-extrabold flex items-center justify-center shrink-0"
								aria-hidden="true">
								{currentRole === "parent" ? parentInitials : centreInitials}
							</span>

							<span
								className="text-left text-xs hidden sm:block"
								aria-hidden="true">
								<span className="block font-bold text-cq-ink leading-tight">
									{currentRole === "parent"
										? parentProfile.name
										: singleCentre.name}
								</span>
								<span className="block text-xs text-cq-soft">
									{currentRole === "parent"
										? `Child - ${parentProfile.childName}`
										: singleCentre.demoKind === "open-data"
										? "Simulated demo account"
										: "Centre demo · Simulated staff account"}
								</span>
							</span>
							<ChevronDown
								className={`w-4 h-4 text-ink-soft hidden sm:block transition-transform ${
									menuOpen ? "rotate-180" : ""
								}`}
								aria-hidden="true"
							/>
						</button>

						{menuOpen && (
							<div
								ref={menuRef}
								id="account-menu"
								role="menu"
								aria-labelledby="account-menu-button"
								onKeyDown={onMenuKey}
								className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-cq-line bg-white shadow-lg p-1.5 z-50 animate-pop">
								<button
									type="button"
									role="menuitem"
									tabIndex={-1}
									onClick={() => choose(onOpenProfile)}
									className="w-full h-11 px-3 rounded-lg text-left text-sm font-bold text-ink hover:bg-mint focus:bg-mint inline-flex items-center gap-2.5 cursor-pointer">
									<UserRound
										className="w-4 h-4 text-brand"
										aria-hidden="true"
									/>{" "}
									Your profile
								</button>
								<button
									type="button"
									role="menuitem"
									tabIndex={-1}
									onClick={() => choose(onLogout)}
									className="w-full h-11 px-3 rounded-lg text-left text-sm font-bold text-ink hover:bg-mint focus:bg-mint inline-flex items-center gap-2.5 cursor-pointer">
									<LogOut className="w-4 h-4 text-brand" aria-hidden="true" />{" "}
									Log out
								</button>
							</div>
						)}
					</div>

					{/* 6. Log out as GhostButton size h-9 text-xs */}
					<button
						type="button"
						onClick={onLogout}
						className="h-10 w-10 sm:w-auto sm:px-3 rounded-xl border border-line-strong bg-white text-sm font-bold text-brand hover:bg-mint transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer lg:hidden"
						title="Log out of session"
						aria-label="Log out">
						<LogOut className="w-4 h-4" />
						<span className="hidden sm:inline">Log out</span>
					</button>
				</div>
			</div>
		</header>
	);
};
