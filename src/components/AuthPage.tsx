import React, { useState } from 'react';
import {
  User,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  Check,
  Sparkles,
  ExternalLink,
  Heart,
} from 'lucide-react';
import { LogoFull } from './Logo';
import { ResetDemo } from './ResetDemo';
import { isValidEmail, MIN_PASSWORD_LENGTH, Child } from '../lib/family';

export interface MockAccount {
  id: string;
  role: 'parent' | 'centre';
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
  onLogIn: (input: { role: 'parent' | 'centre'; email: string; password: string }) => Promise<string | null>;
  onSignUp: (input: { role: 'parent' | 'centre'; name: string; email: string; password: string }) => Promise<string | null>;
  onOpenTrustPage: () => void;
}

const DEMO_PASSWORD = 'password';
const PARENT_DEMO_EMAIL = 'priya@example.ca';
const CENTRE_DEMOS = [
  {
    label: 'CareQ Demo Centre (fictional)',
    email: 'centre@careq-demo.example',
    note: 'Fictional centre with sample families.',
  },
  {
    label: 'Jesse Ketchum Early Learning & Child Care Centre · simulated demo account',
    email: 'jesse-ketchum.demo@careq.example',
    note: 'Real centre (Ontario open data). Simulated demo account, not operated by or affiliated with the centre.',
  },
];

export const AuthPage: React.FC<AuthPageProps> = ({ onLogIn, onSignUp, onOpenTrustPage }) => {
  const [busy, setBusy] = useState(false);
  // Selected Portal: "parent" | "centre"
  const [targetRole, setTargetRole] = useState<'parent' | 'centre'>('parent');

  // Selected Mode: "login" | "signup"
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState<string>('priya@example.ca');
  const [loginPassword, setLoginPassword] = useState<string>('password');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sign up form state
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Handle switching role
  const handleRoleSwitch = (role: 'parent' | 'centre') => {
    setTargetRole(role);
    setLoginError(null);
    setSignupError(null);
    setLoginEmail(role === 'parent' ? PARENT_DEMO_EMAIL : CENTRE_DEMOS[0].email);
  };

  // Handle Login submission (checked by the server in mongo mode)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setBusy(true);
    const error = await onLogIn({ role: targetRole, email: loginEmail.trim(), password: loginPassword });
    setBusy(false);
    if (error) setLoginError(error);
  };

  // One-click demo login: the demo accounts' published password
  const handleQuickDemoLogin = async (role: 'parent' | 'centre', email = PARENT_DEMO_EMAIL) => {
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
    if (!signupName.trim()) return setSignupError('Please enter your name.');
    if (!isValidEmail(email)) return setSignupError('Please enter a valid email address, like name@example.ca.');
    if (signupPassword.length < MIN_PASSWORD_LENGTH) {
      return setSignupError(`Please use a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (!termsAccepted) return setSignupError('Please confirm you have read the terms and how CareQ uses AI.');
    setBusy(true);
    const error = await onSignUp({ role: targetRole, name: signupName.trim(), email, password: signupPassword });
    setBusy(false);
    if (error) setSignupError(error);
    else setSignupPassword('');
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F4] text-[#1E3F42] flex flex-col justify-between antialiased"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      {/* Top Row: Logo on left, Trust & Support link on right */}
      <header className="w-full">
        <div className="max-w-6xl mx-auto px-6 pt-6 flex justify-between items-center">
          <LogoFull size={44} />
          <button
            type="button"
            onClick={onOpenTrustPage}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E4A4E] hover:underline cursor-pointer"
          >
            <span>Need a hand? Trust &amp; support</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Grid: Left hero column, Right login card */}
      <main className="max-w-6xl w-full mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start flex-1">
        {/* LEFT COLUMN (hero) */}
        <div className="lg:pt-6">
          {/* 1. Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#CFE0C9] bg-[#F1F6EE] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#4E7A5A]">
            <Heart className="w-3.5 h-3.5 fill-[#4E7A5A]/20" />
            <span>For families &amp; the people who care</span>
          </div>

          {/* 2. Headline h1 on two lines */}
          <h1 className="text-4xl lg:text-[64px] font-bold leading-[1.08] tracking-[-0.03em] text-[#173F42] mt-7">
            A little less admin.
            <br />
            A lot more connection.
          </h1>

          {/* 3. Paragraph */}
          <p className="mt-7 max-w-md text-lg leading-8 text-[#5B6B66]">
            One shared place to find child care, follow applications, and keep the conversation going.
          </p>

          {/* 4. Illustration Card */}
          <div className="mt-10 w-full max-w-full lg:max-w-[520px] rounded-[28px] bg-[#E6EEE3] p-3 shadow-xs">
            <div className="rounded-[22px] bg-[#DCE7DA] overflow-hidden relative h-[280px]">
              <svg
                viewBox="0 0 520 280"
                className="w-full h-full select-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Background base */}
                <rect width="520" height="280" fill="#DCE7DA" />

                {/* Sun top-right r=28 #FBF3C4 */}
                <circle cx="430" cy="62" r="28" fill="#FBF3C4" />

                {/* 4-point sparkle top-left #8FAE97 */}
                <path
                  d="M 68 40 Q 68 54 54 54 Q 68 54 68 68 Q 68 54 82 54 Q 68 54 68 40 Z"
                  fill="#8FAE97"
                />

                {/* Small birds "︶︶" stroke #4A7A62 top-right below the sun */}
                <path
                  d="M 364 96 Q 370 88 376 96 Q 382 88 388 96"
                  fill="none"
                  stroke="#4A7A62"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 396 108 Q 401 101 406 108 Q 411 101 416 108"
                  fill="none"
                  stroke="#4A7A62"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />

                {/* Two soft hills along the bottom: #C9DCC2 and #BFD4B7 */}
                <path
                  d="M 0 195 Q 160 145 320 180 T 520 165 L 520 280 L 0 280 Z"
                  fill="#BFD4B7"
                />
                <path
                  d="M 0 230 Q 180 170 360 200 T 520 195 L 520 280 L 0 280 Z"
                  fill="#C9DCC2"
                />

                {/* Thin path line #4A7A62 from the door to the right */}
                <path
                  d="M 265 255 Q 315 258 370 264 T 520 268"
                  fill="none"
                  stroke="#4A7A62"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Round sage tree on the left: two overlapping circles #9DBB86 on a thin trunk #4A7A62 */}
                <rect x="98" y="168" width="6" height="74" rx="2" fill="#4A7A62" />
                <circle cx="88" cy="158" r="32" fill="#9DBB86" />
                <circle cx="112" cy="146" r="28" fill="#9DBB86" />

                {/* House in the centre: cream body #FBF8EC (~190x130), dark green roof #4A7A62, arched door #3F6E55, windows #9DBB86 with cream cross */}
                <rect x="175" y="132" width="180" height="123" rx="3" fill="#FBF8EC" />
                <polygon points="158,132 265,70 372,132" fill="#4A7A62" />

                {/* Left window */}
                <rect x="198" y="152" width="30" height="30" rx="3" fill="#9DBB86" />
                <line x1="213" y1="152" x2="213" y2="182" stroke="#FBF8EC" strokeWidth="2.5" />
                <line x1="198" y1="167" x2="228" y2="167" stroke="#FBF8EC" strokeWidth="2.5" />

                {/* Right window */}
                <rect x="302" y="152" width="30" height="30" rx="3" fill="#9DBB86" />
                <line x1="317" y1="152" x2="317" y2="182" stroke="#FBF8EC" strokeWidth="2.5" />
                <line x1="302" y1="167" x2="332" y2="167" stroke="#FBF8EC" strokeWidth="2.5" />

                {/* Arched door #3F6E55 */}
                <path
                  d="M 248 255 L 248 214 A 17 17 0 0 1 282 214 L 282 255 Z"
                  fill="#3F6E55"
                />
                <circle cx="276" cy="235" r="2" fill="#FBF8EC" />

                {/* Two tiny flowers near the door: circles #E9A27A and #F2C14E on thin stems */}
                <line x1="238" y1="255" x2="238" y2="242" stroke="#4A7A62" strokeWidth="1.5" />
                <circle cx="238" cy="240" r="4.5" fill="#E9A27A" />

                <line x1="292" y1="255" x2="292" y2="244" stroke="#4A7A62" strokeWidth="1.5" />
                <circle cx="292" cy="242" r="4" fill="#F2C14E" />

                {/* Pine tree on the right: stacked triangles #3F6E55 with trunk */}
                <rect x="424" y="196" width="7" height="46" rx="2" fill="#4A7A62" />
                <polygon points="400,212 427.5,172 455,212" fill="#3F6E55" />
                <polygon points="405,188 427.5,152 450,188" fill="#3F6E55" />
                <polygon points="410,164 427.5,134 445,164" fill="#3F6E55" />
              </svg>

              {/* Floating label over the bottom-left of the illustration */}
              <div className="absolute left-6 bottom-6 bg-white rounded-xl shadow-md px-5 py-3 text-sm text-[#1E3F42] -rotate-2 flex items-center gap-2.5 border border-stone-100">
                <Check className="w-4 h-4 text-[#4E7A5A] shrink-0 stroke-[2.5]" />
                <span className="font-medium">Parents &amp; centres, on the same page.</span>
              </div>
            </div>
          </div>

          {/* 5. Stat Row */}
          <div className="mt-8 flex items-center gap-5">
            <span className="text-4xl font-semibold text-[#4F7A5E]">5,989</span>
            <div className="h-12 w-px bg-stone-300 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#3F5250]">
                Licensed child care centres in Ontario
              </p>
              <p className="text-xs text-[#6E8C7E] mt-0.5">
                Ontario Early Years and Child Care Annual Report 2025 · as of Mar 31, 2025
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (the existing login card, restyled) */}
        <div className="w-full">
          <div className="bg-white rounded-[28px] border border-[#E7E4DA] shadow-[0_20px_60px_-30px_rgba(23,63,66,0.25)] p-8 sm:p-10 w-full space-y-6">
            {/* Parent / Centre role switch: two side-by-side selectable cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleSwitch('parent')}
                className={`rounded-2xl border p-4 text-left relative transition-all cursor-pointer ${
                  targetRole === 'parent'
                    ? 'border-[#0B4A52]/60 bg-[#F1F6EE]'
                    : 'border-[#E7E4DA] bg-white hover:bg-stone-50'
                }`}
              >
                {targetRole === 'parent' && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-[#0B4A52] flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                )}
                <User className="w-5 h-5 text-[#4E7A5A] mb-3" />
                <span className="block text-sm font-semibold text-[#173F42]">Parent Portal</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch('centre')}
                className={`rounded-2xl border p-4 text-left relative transition-all cursor-pointer ${
                  targetRole === 'centre'
                    ? 'border-[#0B4A52]/60 bg-[#F1F6EE]'
                    : 'border-[#E7E4DA] bg-white hover:bg-stone-50'
                }`}
              >
                {targetRole === 'centre' && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-[#0B4A52] flex items-center justify-center text-white">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                )}
                <Building2 className="w-5 h-5 text-[#4E7A5A] mb-3" />
                <span className="block text-sm font-semibold text-[#173F42]">Centre Portal</span>
              </button>
            </div>

            {/* Title & Mode Switcher */}
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h1 className="text-3xl font-bold tracking-[-0.02em] text-[#173F42]">
                  {targetRole === 'parent'
                    ? authMode === 'login'
                      ? 'Parent login'
                      : 'Create a parent account'
                    : authMode === 'login'
                    ? 'Centre staff login'
                    : 'Create a centre account'}
                </h1>

                {/* Sub-toggle: Log In vs Sign Up as a small pill segmented control */}
                <div className="flex items-center rounded-full bg-[#F3F1EA] p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-white shadow-sm text-[#0B4A52] font-bold'
                        : 'text-[#5B6B66] hover:text-[#173F42] font-medium'
                    }`}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setSignupError(null);
                    }}
                    className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                      authMode === 'signup'
                        ? 'bg-white shadow-sm text-[#0B4A52] font-bold'
                        : 'text-[#5B6B66] hover:text-[#173F42] font-medium'
                    }`}
                  >
                    Create an account
                  </button>
                </div>
              </div>

              <p className="text-sm text-[#5B6B66] mt-2">
                {targetRole === 'parent'
                  ? authMode === 'login'
                    ? 'Access your child care applications, checklists, and waitlist tracking.'
                    : "Next you'll tell us about your child. Demo account, saved only in this browser."
                  : authMode === 'login'
                  ? 'Sign in to manage intake applications, verify documents, and report queue positions.'
                  : "Next you'll register your centre. Demo account, saved only in this browser."}
              </p>
            </div>

            {/* Error alerts */}
            {loginError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {loginError}
              </div>
            )}
            {signupError && (
              <div role="alert" className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {signupError}
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[#3F5250] mb-2">
                    {targetRole === 'parent' ? 'Parent Email' : 'Centre Administrator Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9AA59F] absolute left-4 top-4" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] pl-11 pr-4 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all"
                      placeholder={targetRole === 'parent' ? PARENT_DEMO_EMAIL : CENTRE_DEMOS[0].email}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#3F5250] mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9AA59F] absolute left-4 top-4" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 w-full rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] pl-11 pr-4 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="h-14 w-full rounded-xl bg-[#0B4A52] hover:bg-[#08383E] text-white text-base font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <span>Log In as {targetRole === 'parent' ? 'Parent' : 'Child-Care Centre'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* SIGN-UP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="signup-name" className="block text-sm font-medium text-[#3F5250] mb-2">
                    {targetRole === 'parent' ? 'Your name' : 'Your name (centre staff)'}
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder={targetRole === 'parent' ? 'e.g. Alex Morgan' : 'e.g. Jordan Lee'}
                    className="h-12 w-full rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-sm font-medium text-[#3F5250] mb-2">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={targetRole === 'parent' ? 'you@example.ca' : 'you@yourcentre.ca'}
                    className="h-12 w-full rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-[#3F5250] mb-2">
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
                    className="h-12 w-full rounded-xl border border-[#E8E4D6] bg-[#FBFAF3] px-4 text-sm text-[#1E3F42] placeholder:text-[#9AA59F] focus:border-[#45B5A5] focus:ring-2 focus:ring-[#45B5A5]/25 outline-none transition-all"
                  />
                  <p id="signup-password-hint" className="mt-1.5 text-[11px] text-[#7A8A84]">
                    At least {MIN_PASSWORD_LENGTH} characters. Demo only: stored as a hash in this browser and never shown again.
                  </p>
                </div>

                {/* Mandatory one-time terms and AI checkbox */}
                <div className="rounded-xl bg-[#FBFAF3] border border-[#E8E4D6] p-4 space-y-1.5 mt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0B4A52] focus:ring-[#45B5A5] border-stone-300 shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-stone-800 leading-snug font-medium select-none">
                      I have read the terms and how CareQ uses AI.
                    </span>
                  </label>
                  <div className="pl-6.5 text-[11px] text-stone-500">
                    <button
                      type="button"
                      onClick={onOpenTrustPage}
                      className="text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
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
                      ? 'bg-[#0B4A52] hover:bg-[#08383E] text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Create {targetRole === 'parent' ? 'parent' : 'centre'} account</span>
                </button>
              </form>
            )}

            {/* DEMO ACCOUNTS NOTE ON LOGIN PAGE */}
            <div className="pt-2 border-t border-[#E8E4D6]">
              <div className="rounded-2xl bg-[#FBF3E6] border border-[#EFE3CC] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 uppercase text-[11px] font-bold tracking-[0.14em] text-[#5B4A2E]">
                    <Sparkles className="w-3.5 h-3.5 text-[#A06C2D]" />
                    <span>Demo accounts</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#5B4A2E]/80 bg-white px-2 py-0.5 rounded-full border border-[#EFE3CC]">
                    Prototype Data
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Test Parent */}
                  <div className="bg-white p-3 rounded-xl border border-[#EFE3CC] flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#0B4A52]" />
                        <span>Test Parent: Priya Patel</span>
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Email: <code className="text-[#0B4A52] font-semibold">priya@example.ca</code> • Password: <code className="text-[#0B4A52] font-semibold">password</code> • Child: Anya
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('parent')}
                      className="shrink-0 px-3 py-1.5 text-[11px] font-bold text-[#0B4A52] bg-[#45B5A5]/15 hover:bg-[#45B5A5]/25 rounded-lg transition-colors cursor-pointer"
                      title="Log in directly as test parent"
                    >
                      Log in
                    </button>
                  </div>

                  {/* Test centres: the fictional demo centre, and one real centre's simulated demo account */}
                  {CENTRE_DEMOS.map((d) => (
                    <div key={d.email} className="bg-white p-3 rounded-xl border border-[#EFE3CC] flex items-center justify-between gap-2 shadow-2xs">
                      <div>
                        <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[#0B4A52] shrink-0" />
                          <span>Test Centre: {d.label}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          Email: <code className="text-[#0B4A52] font-semibold">{d.email}</code> • Password: <code className="text-[#0B4A52] font-semibold">password</code>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{d.note}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickDemoLogin('centre', d.email)}
                        className="shrink-0 px-3 py-1.5 text-[11px] font-bold text-[#0B4A52] bg-[#45B5A5]/15 hover:bg-[#45B5A5]/25 rounded-lg transition-colors cursor-pointer"
                        title={`Log in directly as ${d.label}`}
                      >
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
        <div className="max-w-6xl mx-auto px-6 border-t border-[#E7E4DA] py-6 text-xs text-[#6E7C77] bg-transparent flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>CareQ • Simplified Ontario Child Care Intake &amp; Central Waitlist Management</p>
          <div className="flex items-start gap-5">
            <ResetDemo variant="link" />
            <button
              type="button"
              onClick={onOpenTrustPage}
              className="text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline transition-colors cursor-pointer"
            >
              Trust and transparency
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
