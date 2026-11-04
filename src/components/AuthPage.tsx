import React, { useState } from 'react';
import { User, Building2, Lock, Mail, ArrowRight, ShieldCheck, Check, Info, Sparkles, ExternalLink } from 'lucide-react';
import { LogoFull } from './Logo';

export interface MockAccount {
  id: string;
  role: 'parent' | 'centre';
  email: string;
  name: string;
  password?: string;
  childName?: string;
  childAgeMonths?: number;
  centreName?: string;
}

interface AuthPageProps {
  onLogin: (account: MockAccount) => void;
  mockAccounts: MockAccount[];
  onOpenTrustPage: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  mockAccounts,
  onOpenTrustPage,
}) => {
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
  const [signupChildName, setSignupChildName] = useState<string>('');
  const [signupChildAgeMonths, setSignupChildAgeMonths] = useState<number>(24);
  const [signupCentreName, setSignupCentreName] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  // Handle switching role
  const handleRoleSwitch = (role: 'parent' | 'centre') => {
    setTargetRole(role);
    setLoginError(null);
    setSignupError(null);
    if (role === 'parent') {
      setLoginEmail('priya@example.ca');
    } else {
      setLoginEmail('centre@riverdale.ca');
    }
  };

  // Handle Login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const found = mockAccounts.find(
      (a) => a.role === targetRole && a.email.toLowerCase() === loginEmail.trim().toLowerCase()
    );

    if (found) {
      onLogin(found);
    } else {
      // For prototype convenience, if an email doesn't match predefined test accounts, log in with provided credentials
      const autoAccount: MockAccount = {
        id: `acc-${Date.now()}`,
        role: targetRole,
        email: loginEmail.trim(),
        name: targetRole === 'parent' ? (loginEmail.split('@')[0] || 'Parent') : (loginEmail.split('@')[0] || 'Child-Care Centre'),
        childName: targetRole === 'parent' ? 'Child' : undefined,
        childAgeMonths: targetRole === 'parent' ? 24 : undefined,
        centreName: targetRole === 'centre' ? (loginEmail.split('@')[0] || 'Child-Care Centre') : undefined,
      };
      onLogin(autoAccount);
    }
  };

  // Handle Quick Demo Login button
  const handleQuickDemoLogin = (role: 'parent' | 'centre') => {
    const demo = mockAccounts.find((a) => a.role === role);
    if (demo) {
      onLogin(demo);
    }
  };

  // Handle Sign-Up submission
  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!termsAccepted) {
      setSignupError('Please check the required terms and AI usage agreement.');
      return;
    }

    if (!signupEmail.trim() || !signupName.trim()) {
      setSignupError('Please fill in all required fields.');
      return;
    }

    const newAccount: MockAccount = {
      id: `acc-${Date.now()}`,
      role: targetRole,
      email: signupEmail.trim(),
      name: signupName.trim(),
      password: signupPassword,
      childName: targetRole === 'parent' ? (signupChildName.trim() || 'Child') : undefined,
      childAgeMonths: targetRole === 'parent' ? Number(signupChildAgeMonths) || 24 : undefined,
      centreName: targetRole === 'centre' ? (signupCentreName.trim() || signupName.trim()) : undefined,
    };

    onLogin(newAccount);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-stone-900 font-sans flex flex-col justify-between antialiased">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 py-3.5 px-4 sm:px-8 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoFull size={38} />
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-[#0B4A52] bg-[#0B4A52]/10 px-2.5 py-1 rounded-full border border-[#0B4A52]/20">
              Ontario Licensed Intake Portal
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
          {/* Top Role Selector Tabs: "Parent" vs "Child-care centre" */}
          <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50">
            <button
              type="button"
              onClick={() => handleRoleSwitch('parent')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                targetRole === 'parent'
                  ? 'border-[#0B4A52] bg-white text-[#0B4A52]'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/70'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Parent Portal</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('centre')}
              className={`py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
                targetRole === 'centre'
                  ? 'border-[#0B4A52] bg-white text-[#0B4A52]'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-100/70'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Child-Care Centre</span>
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Title & Mode Switcher */}
            <div>
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-stone-900 tracking-tight">
                  {targetRole === 'parent'
                    ? authMode === 'login'
                      ? 'Parent Login'
                      : 'Parent Sign-Up'
                    : authMode === 'login'
                    ? 'Centre Staff Login'
                    : 'Centre Registration'}
                </h1>

                {/* Sub-toggle: Log In vs Sign Up */}
                <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className={`px-3 py-1 rounded-md transition-all ${
                      authMode === 'login'
                        ? 'bg-white text-[#0B4A52] shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setSignupError(null);
                    }}
                    className={`px-3 py-1 rounded-md transition-all ${
                      authMode === 'signup'
                        ? 'bg-white text-[#0B4A52] shadow-2xs font-bold'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </div>

              <p className="text-xs text-stone-500 mt-1">
                {targetRole === 'parent'
                  ? authMode === 'login'
                    ? 'Access your child care applications, checklists, and waitlist tracking.'
                    : 'Register to find licensed child care, submit documents, and track positions.'
                  : authMode === 'login'
                  ? 'Sign in to manage intake applications, verify documents, and report queue positions.'
                  : 'Register your licensed child care facility for Ontario coordinated intake.'}
              </p>
            </div>

            {/* Error alerts */}
            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {loginError}
              </div>
            )}
            {signupError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {signupError}
              </div>
            )}

            {/* LOGIN FORM */}
            {authMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    {targetRole === 'parent' ? 'Parent Email' : 'Centre Administrator Email'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                      placeholder={targetRole === 'parent' ? 'priya@example.ca' : 'centre@riverdale.ca'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-[#0B4A52] hover:bg-[#08383e] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Log In as {targetRole === 'parent' ? 'Parent' : 'Child-Care Centre'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* SIGN-UP FORM */
              <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                {targetRole === 'parent' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Parent Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. Priya Patel"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Child's Name
                        </label>
                        <input
                          type="text"
                          required
                          value={signupChildName}
                          onChange={(e) => setSignupChildName(e.target.value)}
                          placeholder="e.g. Anya"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Age (Months)
                        </label>
                        <input
                          type="number"
                          required
                          min={0}
                          max={72}
                          value={signupChildAgeMonths}
                          onChange={(e) => setSignupChildAgeMonths(Number(e.target.value))}
                          placeholder="24"
                          className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Licensed Centre Name
                      </label>
                      <input
                        type="text"
                        required
                        value={signupCentreName}
                        onChange={(e) => setSignupCentreName(e.target.value)}
                        placeholder="e.g. Maple Grove Early Learning"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Administrator / Director Name
                      </label>
                      <input
                        type="text"
                        required
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder={targetRole === 'parent' ? 'priya@example.ca' : 'director@centre.ca'}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Create Password
                  </label>
                  <input
                    type="password"
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-[#45B5A5]/30 focus:border-[#45B5A5]"
                  />
                </div>

                {/* Mandatory one-time terms and AI checkbox */}
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5 mt-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#0B4A52] focus:ring-[#45B5A5] border-stone-300 shrink-0"
                    />
                    <span className="text-xs text-stone-800 leading-snug font-medium select-none">
                      I have read the terms and how CareQ uses AI.
                    </span>
                  </label>
                  <div className="pl-6 text-[11px] text-stone-500">
                    <button
                      type="button"
                      onClick={onOpenTrustPage}
                      className="text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline inline-flex items-center gap-0.5"
                    >
                      <span>Read Trust and transparency terms</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!termsAccepted}
                  className={`w-full py-2.5 px-4 text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                    termsAccepted
                      ? 'bg-[#0B4A52] hover:bg-[#08383e] text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>Create {targetRole === 'parent' ? 'Parent' : 'Centre'} Account</span>
                </button>
              </form>
            )}

            {/* DEMO ACCOUNTS NOTE ON LOGIN PAGE */}
            <div className="pt-2 border-t border-stone-200">
              <div className="p-3.5 rounded-xl bg-[#F0FDFA] border border-[#45B5A5]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B4A52]">
                    <Sparkles className="w-3.5 h-3.5 text-[#45B5A5]" />
                    <span>Demo accounts</span>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-[#0B4A52]/70 bg-white px-2 py-0.5 rounded-full border border-[#45B5A5]/20">
                    Prototype Data
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Test Parent */}
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#0B4A52]" />
                        <span>Test Parent: Priya Patel</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Email: <code className="text-[#0B4A52] font-semibold">priya@example.ca</code> • Child: Anya
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('parent')}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-[#0B4A52] bg-[#45B5A5]/15 hover:bg-[#45B5A5]/25 rounded-md transition-colors"
                      title="Log in directly as test parent"
                    >
                      Log in
                    </button>
                  </div>

                  {/* Test Centre */}
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#0B4A52]" />
                        <span>Test Centre: Riverdale Early Learning</span>
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Email: <code className="text-[#0B4A52] font-semibold">centre@riverdale.ca</code> • CWELCC Admin
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin('centre')}
                      className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-[#0B4A52] bg-[#45B5A5]/15 hover:bg-[#45B5A5]/25 rounded-md transition-colors"
                      title="Log in directly as test centre"
                    >
                      Log in
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>CareQ • Simplified Ontario Child Care Intake & Central Waitlist Management</p>
          <button
            type="button"
            onClick={onOpenTrustPage}
            className="text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline transition-colors cursor-pointer"
          >
            Trust and transparency
          </button>
        </div>
      </footer>
    </div>
  );
};
