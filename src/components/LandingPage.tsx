import React from 'react';
import { ArrowRight, ShieldCheck, Sparkles, FileText, CheckCheck, Lock } from 'lucide-react';
import { LogoFull } from './Logo';
import { HouseIllustration } from './ui/CareUI';

export interface LandingPageProps {
  onGetStarted: () => void;
  onLogIn: () => void;
  onOpenTrust: () => void;
  onRegisterCentre?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onLogIn,
  onOpenTrust,
  onRegisterCentre,
}) => {
  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen bg-cq-page text-cq-ink-body font-brand-page flex flex-col antialiased selection:bg-cq-sage selection:text-cq-ink"
    >
      {/* ---------------- Navigation Header ---------------- */}
      <header className="sticky top-0 z-40 w-full bg-cq-page/90 backdrop-blur-md border-b border-cq-line/80 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoFull size={40} />
          </div>

          <nav className="flex items-center gap-2 sm:gap-6">
            <button
              type="button"
              onClick={scrollToHowItWorks}
              className="text-sm font-semibold text-cq-muted hover:text-cq-ink transition-colors cursor-pointer hidden md:inline-flex"
            >
              See how it works
            </button>
            <button
              type="button"
              onClick={onOpenTrust}
              className="text-sm font-semibold text-cq-muted hover:text-cq-ink transition-colors cursor-pointer hidden sm:inline-flex"
            >
              Trust &amp; AI
            </button>
            <button
              type="button"
              onClick={onLogIn}
              className="h-10 px-4 rounded-xl border border-cq-line bg-white text-sm font-semibold text-cq-ink hover:bg-cq-page transition-colors cursor-pointer"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={onGetStarted}
              className="h-10 px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white text-sm font-semibold shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Get started</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </nav>
        </div>
      </header>

      {/* ---------------- Main Content ---------------- */}
      <main className="flex-1 flex flex-col">
        {/* 1. HERO SECTION */}
        <section className="max-w-6xl w-full mx-auto px-6 pt-12 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cq-sage-250 bg-cq-sage-50 px-4 py-1.5 text-xs font-semibold text-cq-sage-ink mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ontario Child Care Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-bold text-cq-ink leading-[1.12]">
              Your child-care applications, followed through to a spot.
            </h1>

            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-cq-muted max-w-xl">
              CareQ keeps every Ontario child-care application in one place. It shows what each centre has told you, what's still unknown, and the next step to take. Nothing is sent without your approval.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onGetStarted}
                className="h-12 px-6 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white font-semibold text-base shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="h-12 px-6 rounded-xl border border-cq-line bg-white text-base font-semibold text-cq-ink hover:bg-cq-page transition-colors cursor-pointer"
              >
                See how it works
              </button>
            </div>

            <p className="mt-5 text-xs text-cq-soft font-medium flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cq-accent shrink-0" />
              <span>Built for Ontario families · Licensed centres only · You approve every step</span>
            </p>
          </div>

          <div className="w-full max-w-[540px] mx-auto lg:max-w-none">
            <div className="rounded-3xl bg-cq-sage-100 p-3 shadow-xs border border-cq-sage-line-2">
              <div className="rounded-3xl bg-cq-sage-150 overflow-hidden relative">
                <HouseIllustration tone="sage" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* 2. PROBLEM & STATS SECTION */}
        <section className="bg-white border-y border-cq-line py-16 lg:py-24">
          <div className="max-w-6xl w-full mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
              <p className="text-xs font-semibold text-cq-muted mb-3">
                The current reality
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink">
                Getting a child-care spot shouldn't be a second job
              </h2>
            </div>

            {/* 3 Problem Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="rounded-2xl border border-cq-line bg-cq-page p-7 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-peach text-cq-peach-ink flex items-center justify-center font-bold text-base mb-5">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-cq-ink mb-2">
                    Too many lists
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    Every centre runs its own waitlist.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-cq-line bg-cq-page p-7 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-lilac text-cq-lilac-ink flex items-center justify-center font-bold text-base mb-5">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-cq-ink mb-2">
                    Too little information
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    Positions and openings are rarely shared.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-cq-line bg-cq-page p-7 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-sand text-cq-sand-ink-2 flex items-center justify-center font-bold text-base mb-5">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-cq-ink mb-2">
                    Too much follow-up
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    Parents spend hours chasing updates.
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Stat Cards with Sources */}
            <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-cq-line">
              <div className="rounded-2xl border border-cq-line bg-white p-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-cq-brand">
                  ~15,000
                </p>
                <p className="mt-2 text-sm font-semibold text-cq-ink">
                  children waiting in Region of Waterloo
                </p>
                <p className="mt-2 text-xs text-cq-soft">
                  (CP24, Sept 2026)
                </p>
              </div>

              <div className="rounded-2xl border border-cq-line bg-white p-6">
                <p className="text-2xl sm:text-3xl font-extrabold text-cq-brand">
                  ~8,500
                </p>
                <p className="mt-2 text-sm font-semibold text-cq-ink">
                  on Ottawa's central waitlist
                </p>
                <p className="mt-2 text-xs text-cq-soft">
                  (CP24, Sept 2026)
                </p>
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

        {/* 3. HOW CAREQ WORKS SECTION */}
        <section id="how-it-works" className="py-16 lg:py-24 scroll-mt-24">
          <div className="max-w-6xl w-full mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
              <p className="text-xs font-semibold text-cq-muted mb-3">
                A calmer path
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink">
                How CareQ works
              </h2>
            </div>

            {/* 4 Numbered Steps */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Step 1 */}
              <div className="rounded-2xl border border-cq-line bg-white p-6 flex flex-col justify-between hover:border-cq-secondary transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-sage text-cq-sage-ink font-bold text-sm flex items-center justify-center mb-6">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-cq-ink mb-2">
                    Find centres that fit
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    describe what you need in a sentence
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="rounded-2xl border border-cq-line bg-white p-6 flex flex-col justify-between hover:border-cq-secondary transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-sage text-cq-sage-ink font-bold text-sm flex items-center justify-center mb-6">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-cq-ink mb-2">
                    Apply with confidence
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    checklists from each centre's published handbook, with the exact quote
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="rounded-2xl border border-cq-line bg-white p-6 flex flex-col justify-between hover:border-cq-secondary transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-sage text-cq-sage-ink font-bold text-sm flex items-center justify-center mb-6">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-cq-ink mb-2">
                    Track every application
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    positions as each centre reports them, with dates
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="rounded-2xl border border-cq-line bg-white p-6 flex flex-col justify-between hover:border-cq-secondary transition-colors">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cq-sage text-cq-sage-ink font-bold text-sm flex items-center justify-center mb-6">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-cq-ink mb-2">
                    Accept your spot and free up the rest
                  </h3>
                  <p className="text-sm text-cq-muted leading-relaxed">
                    withdraw from other lists in one step
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BUILT FOR BOTH SIDES SECTION */}
        <section className="bg-white border-y border-cq-line py-16 lg:py-24">
          <div className="max-w-6xl w-full mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center mb-12 sm:mb-16">
              <p className="text-xs font-semibold text-cq-muted mb-3">
                Two sides, one calm system
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink">
                Built for both sides
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Card 1: For parents */}
              <div className="rounded-2xl border border-cq-line bg-cq-page p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cq-sage-250 bg-cq-sage-50 px-3.5 py-1 text-xs font-semibold text-cq-sage-ink mb-5">
                    <span>Families</span>
                  </div>
                  <h3 className="text-2xl font-bold text-cq-ink mb-3">
                    For parents
                  </h3>
                  <p className="text-base text-cq-muted leading-relaxed">
                    Less paperwork, fewer follow-ups, clearer answers.
                  </p>
                </div>
              </div>

              {/* Card 2: For centres */}
              <div className="rounded-2xl border border-cq-line bg-cq-page p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-cq-lilac-line-3 bg-cq-lilac px-3.5 py-1 text-xs font-semibold text-cq-lilac-ink mb-5">
                    <span>Licensed Operators</span>
                  </div>
                  <h3 className="text-2xl font-bold text-cq-ink mb-3">
                    For centres
                  </h3>
                  <p className="text-base text-cq-muted leading-relaxed mb-6">
                    Upload your handbook once, confirm the checklist, and keep families informed.
                  </p>
                </div>
                <div>
                  {onRegisterCentre && (
                    <button
                      type="button"
                      onClick={onRegisterCentre}
                      className="h-11 px-5 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white font-semibold text-sm shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Register your centre</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. AI THAT HELPS, NEVER DECIDES SECTION */}
        <section className="py-16 lg:py-24">
          <div className="max-w-6xl w-full mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <p className="text-xs font-semibold text-cq-muted mb-3">
                Ethical &amp; Transparent
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink">
                AI that helps, never decides
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-cq-line bg-white p-6 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-cq-sage text-cq-sage-ink flex items-center justify-center mb-4">
                  <CheckCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-cq-ink leading-snug">
                  You approve everything
                </h3>
              </div>

              <div className="rounded-2xl border border-cq-line bg-white p-6 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-cq-sand text-cq-sand-ink-2 flex items-center justify-center mb-4">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-cq-ink leading-snug">
                  No guesses: only centre-reported positions
                </h3>
              </div>

              <div className="rounded-2xl border border-cq-line bg-white p-6 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-cq-lilac text-cq-lilac-ink flex items-center justify-center mb-4">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-cq-ink leading-snug">
                  Centres decide admissions; CareQ ranks no one
                </h3>
              </div>

              <div className="rounded-2xl border border-cq-line bg-white p-6 text-center sm:text-left flex flex-col items-center sm:items-start">
                <div className="w-10 h-10 rounded-xl bg-cq-peach text-cq-peach-ink flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-cq-ink leading-snug">
                  Your data stays yours
                </h3>
              </div>
            </div>

            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={onOpenTrust}
                className="inline-flex items-center gap-2 text-sm font-bold text-cq-brand hover:text-cq-secondary underline transition-colors cursor-pointer"
              >
                <span>Read how we use AI →</span>
              </button>
            </div>
          </div>
        </section>

        {/* QUESTIONS PARENTS ASK SECTION */}
        <section className="bg-white border-y border-cq-line py-16 lg:py-24">
          <div className="max-w-4xl w-full mx-auto px-6">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-cq-muted mb-3">
                Clear answers
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-cq-ink">
                Questions parents ask
              </h2>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-cq-line bg-cq-page p-6 sm:p-7">
                <h3 className="text-base sm:text-lg font-bold text-cq-ink">
                  Does CareQ guarantee a spot?
                </h3>
                <p className="mt-2 text-sm sm:text-base text-cq-muted leading-relaxed">
                  No. Centres make all admission decisions.
                </p>
              </div>

              <div className="rounded-2xl border border-cq-line bg-cq-page p-6 sm:p-7">
                <h3 className="text-base sm:text-lg font-bold text-cq-ink">
                  Does the AI apply for me automatically?
                </h3>
                <p className="mt-2 text-sm sm:text-base text-cq-muted leading-relaxed">
                  No. Nothing is sent until you approve it.
                </p>
              </div>

              <div className="rounded-2xl border border-cq-line bg-cq-page p-6 sm:p-7">
                <h3 className="text-base sm:text-lg font-bold text-cq-ink">
                  Where does waitlist information come from?
                </h3>
                <p className="mt-2 text-sm sm:text-base text-cq-muted leading-relaxed">
                  From the centres, with the date of every update. We never estimate positions.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* WHO WE ARE BLOCK */}
        <section className="py-16 lg:py-20">
          <div className="max-w-4xl w-full mx-auto px-6 text-center">
            <p className="text-xs font-semibold text-cq-muted mb-3">
              About the project
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-cq-ink mb-4">
              Who we are
            </h2>
            <p className="text-base sm:text-lg text-cq-muted leading-relaxed max-w-2xl mx-auto">
              CareQ is a women-led prototype that helps Ontario families find, apply for and track licensed child care in one place: helpful AI, with people in control.
            </p>
            <div className="mt-6 inline-flex flex-col items-center justify-center rounded-2xl bg-white border border-cq-line px-6 py-4 shadow-xs">
              <span className="text-xs font-bold text-cq-brand">
                Team 38 – Coalesce
              </span>
              <span className="text-sm text-cq-soft mt-1">
                our names: [names]
              </span>
            </div>
          </div>
        </section>

        {/* 5. FINAL CALL TO ACTION */}
        <section className="py-12 lg:py-20">
          <div className="max-w-4xl w-full mx-auto px-6">
            <div className="rounded-3xl bg-cq-sage border border-cq-sage-line-2 p-8 sm:p-14 text-center">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-cq-ink leading-tight max-w-2xl mx-auto">
                Spend less time chasing waitlists and more time with your family.
              </h2>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="h-12 px-8 rounded-xl bg-cq-brand hover:bg-cq-brand-hover text-white font-semibold text-base shadow-sm transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
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
              CareQ: a little care, every step.
            </p>
            <p className="max-w-2xl leading-relaxed text-cq-soft">
              Prototype built by Team 38 – Coalesce for the Women in AI Canada Hackathon 2026. Centre listings come from Ontario open data; all families, waitlists and messages shown are simulated. © 2026 CareQ
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
            <button
              type="button"
              onClick={onOpenTrust}
              className="text-cq-brand hover:underline cursor-pointer"
            >
              Trust &amp; AI
            </button>
            <span className="text-cq-stone-300">|</span>
            <button
              type="button"
              onClick={onLogIn}
              className="text-cq-muted hover:text-cq-ink cursor-pointer"
            >
              Log in
            </button>
            <span className="text-cq-stone-300">|</span>
            <button
              type="button"
              onClick={onGetStarted}
              className="text-cq-brand hover:underline cursor-pointer"
            >
              Get started
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
