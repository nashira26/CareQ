/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  PARENT_PROFILE,
  conversationKey,
  ParentProfile,
  Centre,
  Application,
  ApplicationStatus,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { AppSidebar, SidebarItem } from './components/AppSidebar';
import { ParentHome } from './components/ParentView/ParentHome';
import { ParentOverview } from './components/ParentView/ParentOverview';
import { FindTab } from './components/ParentView/FindTab';
import { ApplyTab } from './components/ParentView/ApplyTab';
import { TrackTab } from './components/ParentView/TrackTab';
import { CentreDashboard } from './components/CentreView/CentreDashboard';
import { CentreOverview } from './components/CentreView/CentreOverview';
import { CentreMessages } from './components/CentreView/CentreMessages';
import { ConversationModal } from './components/ConversationModal';
import { TrustTransparencyPage } from './components/TrustTransparencyPage';
import { AuthPage } from './components/AuthPage';
import { LandingPage } from './components/LandingPage';
import { HelpTab } from './components/HelpTab';
import { AskCareQAssistant } from './components/AskCareQAssistant';
import type { SupportRequest } from './data/helpData';
import type { PreparedDraft } from './lib/prepareApplication';
import { ResetDemo, ResetContext } from './components/ResetDemo';
import { ParentOnboarding } from './components/Onboarding/ParentOnboarding';
import { CentreRegistration } from './components/Onboarding/CentreRegistration';
import { Child, CentreFormInput, ageInMonths } from './lib/family';
import type { Area, FsaCentroids } from './lib/rankCentres';
import { ApiStore, CentreStatus, DemoStore, LocalStore, StoreError, fetchConfig, isOutage } from './lib/store';
import { EMPTY_SNAPSHOT, Snapshot, normaliseSnapshot } from './lib/world';
import type { DraftChange, ExtractedFromInput, RequirementCitationInput } from './lib/service';
import torontoAreas from './data/torontoAreas.json';
import fsaCentroids from './data/fsaCentroids.json';
import { LogoFull } from './components/Logo';
import { setAiOffline } from './lib/aiFetch';
import { CentreDemoBanner } from './components/ui/CareUI';
import {
  Search,
  FileEdit,
  FileText,
  ListFilter,
  HelpCircle,
  Home,
  Info,
  Heart,
  LayoutGrid,
  ScrollText,
  Users,
  WifiOff,
  X,
  Loader2,
} from 'lucide-react';

const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;
const POLL_MS = 10_000; // mongo mode: pick up changes made on other devices
const TYPING_SAVE_MS = 600; // notes and AI drafts are saved shortly after typing stops

type ParentTab = 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help';
type CentreTab = 'home' | 'applications' | 'messages' | 'policy' | 'help';

export default function App() {
  // ---------------- Data store (MongoDB via the API, or this browser in local mode) ----------------
  const [store, setStore] = useState<DemoStore | null>(null);
  const [resetAvailable, setResetAvailable] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [snapshot, setRawSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [outage, setOutage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Offline / demo-mode notice (local mode chosen automatically, or the server couldn't be reached)
  const [modeNotice, setModeNotice] = useState<string | null>(null);

  /** Every snapshot the app shows goes through here: missing lists become [], maps {}. */
  const commit = useCallback((s: unknown) => setRawSnapshot(normaliseSnapshot(s)), []);
  /** Functional updates (typing), on an already-normalised snapshot. */
  const updateSnapshot = useCallback((fn: (s: Snapshot) => Snapshot) => setRawSnapshot((s) => normaliseSnapshot(fn(s))), []);

  // Always ends with a store and a valid snapshot: never a blank or crashed screen
  const boot = useCallback(async () => {
    setBootError(null);
    let config: Awaited<ReturnType<typeof fetchConfig>>;
    try {
      config = await fetchConfig();
    } catch {
      // Server unreachable: run the offline demo in this browser instead of failing
      const local = new LocalStore();
      commit(await local.load().catch(() => EMPTY_SNAPSHOT));
      setResetAvailable(false);
      setAiOffline(true); // every AI feature uses its basic mode, with a note instead of an error
      setModeNotice('Offline demo: saved in this browser only; AI features unavailable. Reload to reconnect.');
      setStore(local);
      return;
    }
    setAiOffline(false);
    const s: DemoStore = config.dataMode === 'local' ? new LocalStore() : new ApiStore();
    setResetAvailable(config.resetAvailable);
    // DATA_MODE=local is a deliberate choice; tell people only when the server fell back to it
    setModeNotice(
      config.dataMode === 'local' && config.dataModeReason && config.dataModeReason !== 'DATA_MODE=local'
        ? `Demo mode (${config.dataModeReason}): data stays in this browser and isn't shared between devices.`
        : null
    );
    try {
      commit(await s.load());
      setOutage(null);
    } catch (e) {
      commit(EMPTY_SNAPSHOT);
      setOutage(isOutage(e) ? (e as StoreError).message : "CareQ data couldn't be loaded.");
    }
    setStore(s);
  }, [commit]);
  useEffect(() => {
    boot();
  }, [boot]);

  // Unsaved typing (notes, AI drafts): saved after a short pause, flushed before submitting
  const pendingWrites = useRef(new Map<string, { timer: number; run: () => Promise<void> }>());

  const handleStoreError = useCallback(
    async (e: unknown) => {
      if (isOutage(e)) {
        setOutage((e as StoreError).message);
      } else if (e instanceof StoreError && e.status === 401 && store) {
        commit(await store.load().catch(() => EMPTY_SNAPSHOT)); // session ended: back to login
      } else {
        setActionError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    },
    [store, commit]
  );

  /** Runs a store call and shows its result (or a plain-language error). */
  const run = useCallback(
    async (p: Promise<Snapshot>): Promise<boolean> => {
      try {
        commit(await p);
        setOutage(null);
        return true;
      } catch (e) {
        await handleStoreError(e);
        return false;
      }
    },
    [handleStoreError, commit]
  );

  // Mongo mode: refresh every 10 s and when the window regains focus, so other devices' changes show up
  useEffect(() => {
    if (!store || store.mode !== 'mongo') return;
    const refresh = async () => {
      if (pendingWrites.current.size > 0 || document.visibilityState === 'hidden') return;
      try {
        commit(await store.load());
        setOutage(null);
      } catch (e) {
        if (isOutage(e)) setOutage((e as StoreError).message);
      }
    };
    const timer = window.setInterval(refresh, POLL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [store]);

  const scheduleWrite = (key: string, write: () => Promise<Snapshot>) => {
    const pending = pendingWrites.current;
    const existing = pending.get(key);
    if (existing) window.clearTimeout(existing.timer);
    const runWrite = async () => {
      pending.delete(key);
      try {
        await write(); // keep what's on screen (the user may still be typing)
        setOutage(null);
      } catch (e) {
        await handleStoreError(e);
      }
    };
    pending.set(key, { timer: window.setTimeout(runWrite, TYPING_SAVE_MS), run: runWrite });
  };
  const flushWrites = async () => {
    const pending = [...pendingWrites.current.values()];
    for (const p of pending) window.clearTimeout(p.timer);
    await Promise.all(pending.map((p) => p.run()));
  };

  // ---------------- What the signed-in user can see (already scoped by the store) ----------------
  // Defaults even though commit() normalises: a missing list must never crash a screen
  const {
    account: currentAccount = null,
    centres = [],
    applications = [],
    conversations = {},
    notifications = [],
    supportRequests = [],
    preparedDrafts = {},
  } = snapshot ?? EMPTY_SNAPSHOT;

  const [parentTab, setParentTab] = useState<ParentTab>('home');
  const [centreTab, setCentreTab] = useState<CentreTab>('home');
  const [isTrustPageOpen, setIsTrustPageOpen] = useState<boolean>(false);
  const [loggedOutView, setLoggedOutView] = useState<'landing' | 'auth'>('landing');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'signup'>('signup');
  const [authInitialRole, setAuthInitialRole] = useState<'parent' | 'centre'>('parent');
  // Centre registration: show the success screen until the centre chooses where to go next
  const [registrationScreenOpen, setRegistrationScreenOpen] = useState(false);
  // Policy text the centre asked AI to read right after registering
  const [policyToRead, setPolicyToRead] = useState<string | null>(null);
  // A document uploaded at sign-up, read with AI when the policy tab opens
  const [docToRead, setDocToRead] = useState<string | null>(null);

  const currentRole = currentAccount ? currentAccount.role : 'parent';

  // The signed-in parent and their active child (the first child for now)
  const myChildren: Child[] = currentAccount?.role === 'parent' ? currentAccount?.children ?? [] : [];
  const activeChild: Child | undefined = myChildren[0];
  const activeParentProfile: ParentProfile = activeChild
    ? {
        name: currentAccount?.name || PARENT_PROFILE.name,
        children: myChildren,
        childId: activeChild.id,
        childName: activeChild.firstName,
        childAgeMonths: ageInMonths(activeChild.dateOfBirth), // derived from date of birth
        careType: activeChild.careType,
        preferredStartDate: activeChild.preferredStartDate,
        homeArea: activeChild.homeArea,
      }
    : { ...PARENT_PROFILE, name: currentAccount?.name || PARENT_PROFILE.name, children: [] };

  // The signed-in centre
  const activeSingleCentre: Centre =
    centres.find((c) => c.id === currentAccount?.centreId) ?? centres[0] ?? ({ id: '', name: '', neighbourhood: '', ageGroups: [], hours: '', requirements: [] } as Centre);

  // ---------------- Actions ----------------

  const handleLogIn = async (input: { role: 'parent' | 'centre'; email: string; password: string }): Promise<string | null> => {
    if (!store) return "Can't reach the CareQ server.";
    try {
      commit(await store.logIn(input));
      setParentTab('home');
      setCentreTab('home');
      setIsTrustPageOpen(false);
      return null;
    } catch (e) {
      if (isOutage(e)) setOutage((e as StoreError).message);
      return (e as Error).message;
    }
  };
  const handleSignUp = async (input: { role: 'parent' | 'centre'; name: string; email: string; password: string }): Promise<string | null> => {
    if (!store) return "Can't reach the CareQ server.";
    try {
      commit(await store.signUp(input));
      setParentTab('home');
      setCentreTab('home');
      setIsTrustPageOpen(false);
      return null;
    } catch (e) {
      if (isOutage(e)) setOutage((e as StoreError).message);
      return (e as Error).message;
    }
  };
  const handleLogout = async () => {
    await flushWrites();
    setIsTrustPageOpen(false);
    setRegistrationScreenOpen(false);
    setLoggedOutView('landing');
    if (store) await run(store.logOut());
  };

  const handleMarkNotificationAsRead = (id: string) => store && run(store.markRead([id]));
  const handleMarkAllNotificationsAsRead = (_role: 'parent' | 'centre') => store && run(store.markRead('all'));

  const handleCreateSupportRequest = (newReq: Omit<SupportRequest, 'id' | 'referenceNumber' | 'submittedAt'>) =>
    store && run(store.createSupportRequest({ type: newReq.type, subject: newReq.subject, message: newReq.message, category: newReq.category }));
  const handleAdvanceConcernStep = (requestId: string) => store && run(store.advanceConcern(requestId));

  // Applications (parent)
  const handleSelectCentre = async (centreId: string) => {
    if (!store) return;
    try {
      const created = await store.createDraft(centreId);
      commit(created?.snapshot);
      setParentTab('apply');
    } catch (e) {
      await handleStoreError(e);
    }
  };
  const draftChange = (applicationId: string, change: DraftChange) => store && run(store.updateDraft(applicationId, change));
  const handleToggleRequirement = (applicationId: string, requirement: string) =>
    draftChange(applicationId, { kind: 'toggleRequirement', requirement });
  const handleUploadDocument = (applicationId: string, requirement: string, file: { fileName: string; fileSize: string }) =>
    draftChange(applicationId, { kind: 'uploadDocument', requirement, ...file });
  const handleRemoveDocument = (applicationId: string, requirement: string) => draftChange(applicationId, { kind: 'removeDocument', requirement });

  // Typing: show at once, save after a short pause
  const handleUpdateNoteToCentre = (applicationId: string, note: string) => {
    updateSnapshot((s) => ({ ...s, applications: (s.applications ?? []).map((a) => (a.id === applicationId ? { ...a, noteToCentre: note } : a)) }));
    if (store) scheduleWrite(`note:${applicationId}`, () => store.updateDraft(applicationId, { kind: 'noteToCentre', note }));
  };
  const handleUpdatePreparedDraft = (applicationId: string, draft: PreparedDraft) => {
    updateSnapshot((s) => ({ ...s, preparedDrafts: { ...(s.preparedDrafts ?? {}), [applicationId]: draft } }));
    if (store) scheduleWrite(`draft:${applicationId}`, () => store.updateDraft(applicationId, { kind: 'preparedDraft', draft }));
  };

  const handleSubmitApplication = async (applicationId: string) => {
    if (!store) return;
    await flushWrites(); // the reviewed draft and note must be saved before sending
    if (await run(store.submit(applicationId))) setParentTab('track');
  };
  const handleAcceptOffer = (applicationId: string, withdrawOthers: boolean) => store && run(store.acceptOffer(applicationId, withdrawOthers));
  const handleWithdrawApplication = (applicationId: string) => store && run(store.withdraw(applicationId));

  // Centre actions
  const handleUpdateStatus = (applicationId: string, newStatus: ApplicationStatus, waitlistPosition?: number, waitlistEstimate?: string) =>
    store && run(store.setStatus(applicationId, newStatus as CentreStatus, waitlistPosition, waitlistEstimate));
  const handleUpdateCentreRequirements = (
    centreId: string,
    requirements: string[],
    sources?: Record<string, string>,
    citations?: Record<string, RequirementCitationInput>,
    extractedFrom?: ExtractedFromInput
  ) => store && run(store.updateRequirements(centreId, requirements, sources ?? {}, citations, extractedFrom));

  // Onboarding and centre registration
  const handleCompleteOnboarding = async (children: Child[]) => {
    if (store && (await run(store.completeOnboarding(children)))) setParentTab('home');
  };
  const handleRegisterCentre = async (form: CentreFormInput, photoDataUrl?: string): Promise<{ centre?: Centre; error?: string }> => {
    if (!store) return { error: "Can't reach the CareQ server." };
    try {
      setRegistrationScreenOpen(true);
      const s = normaliseSnapshot(await store.registerCentre(form, photoDataUrl));
      setRawSnapshot(s);
      return { centre: s.centres.find((c) => c.id === s.account?.centreId) };
    } catch (e) {
      setRegistrationScreenOpen(false);
      if (isOutage(e)) setOutage((e as StoreError).message);
      return { error: (e as Error).message };
    }
  };

  // ---------------- Conversations ----------------
  const [activeChatModal, setActiveChatModal] = useState<{ isOpen: boolean; centreId: string; applicationId: string } | null>(null);

  /** The parent's application for the active child at a centre, or an enquiry (not saved). */
  const enquiryFor = (centreId: string, id: string): Application => ({
    id,
    centreId,
    parentAccountId: currentAccount?.id ?? '',
    childId: activeParentProfile.childId,
    parentName: activeParentProfile.name,
    childName: activeParentProfile.childName,
    childAgeMonths: activeParentProfile.childAgeMonths,
    careType: activeParentProfile.careType,
    preferredStartDate: activeParentProfile.preferredStartDate,
    status: 'Draft',
    completedRequirements: [],
  });
  const handleParentOpenConversation = (centreId: string) => {
    const app = applications.find((a) => a.centreId === centreId && a.childId === activeParentProfile.childId);
    setActiveChatModal({ isOpen: true, centreId, applicationId: app?.id ?? `enquiry-${centreId}-${activeParentProfile.childId}` });
  };
  const handleCentreOpenConversation = (application: Application) =>
    setActiveChatModal({ isOpen: true, centreId: application.centreId, applicationId: application.id });

  const activeChatApp = activeChatModal
    ? applications.find((a) => a.id === activeChatModal.applicationId) ?? enquiryFor(activeChatModal.centreId, activeChatModal.applicationId)
    : null;
  const activeChatCentre = activeChatModal ? centres.find((c) => c.id === activeChatModal.centreId) ?? activeSingleCentre : activeSingleCentre;
  const activeMessages = activeChatModal && activeChatApp ? conversations?.[conversationKey(activeChatModal.centreId, activeChatApp.childId)] ?? [] : [];

  const handleSendMessage = (text: string, aiAssisted: boolean, fromSimulatedDraft = false) => {
    if (!store || !activeChatModal || !activeChatApp) return;
    run(store.sendMessage({ centreId: activeChatModal.centreId, childId: activeChatApp.childId }, text, aiAssisted, fromSimulatedDraft));
  };

  // ---------------- Navigation ----------------
  const myApplications = currentRole === 'parent' ? applications : [];
  const draftCount = myApplications.filter((a) => a.status === 'Draft').length;
  const offerCount = myApplications.filter((a) => a.status === 'Offer').length;

  const parentSidebarItems: SidebarItem[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'find', label: 'Find Centres', icon: Search },
    { id: 'apply', label: 'Apply', icon: FileEdit, badge: draftCount > 0 ? `${draftCount} in progress` : undefined },
    { id: 'track', label: 'Track Status', icon: ListFilter, badge: offerCount > 0 ? 'Offer' : undefined },
    { id: 'companion', label: 'Parent companion', icon: Heart },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const centreApplications = currentRole === 'centre' ? applications : [];
  const centreSubmittedCount = centreApplications.filter((app) => app.status === 'Submitted').length;
  const centreSidebarItems: SidebarItem[] = [
    { id: 'home', label: 'Centre overview', icon: LayoutGrid },
    {
      id: 'applications',
      label: 'Applications & queue',
      icon: FileText,
      badge: centreSubmittedCount > 0 ? String(centreSubmittedCount) : undefined,
    },
    { id: 'messages', label: 'Family messages', icon: Heart },
    { id: 'policy', label: 'Policy & requirements', icon: ScrollText },
    { id: 'help', label: 'Contact & support', icon: Users },
  ];

  // ---------------- Banners ----------------
  const banners = (
    <>
      {modeNotice && !outage && (
        <div role="status" className="fixed bottom-4 left-4 z-[65] max-w-sm rounded-xl bg-[#F3EBDD] border border-[#E7D6A8] shadow-lg p-3 pr-9 text-xs text-[#5B4A2E] flex items-start gap-2">
          <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{modeNotice}</span>
          <button type="button" onClick={() => setModeNotice(null)} aria-label="Dismiss" className="absolute top-2 right-2 p-1 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {outage && (
        <div role="alert" className="fixed top-0 inset-x-0 z-[70] bg-[#A4543A] text-white text-xs sm:text-sm px-4 py-2 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{outage} Retrying…</span>
        </div>
      )}
      {actionError && (
        <div role="alert" className="fixed top-12 right-4 z-[70] max-w-sm rounded-xl bg-white border border-[#E7D6A8] shadow-lg p-3 pr-9 text-sm text-[#5B4A2E]">
          {actionError}
          <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss" className="absolute top-2 right-2 p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );

  // ---------------- Screens ----------------

  if (!store) {
    return (
      <div className="min-h-screen bg-[#FAF9F4] flex flex-col items-center justify-center gap-4 p-6 text-center text-[#173F42]">
        <LogoFull size={44} />
        {bootError ? (
          <>
            <p role="alert" className="text-sm text-[#A4543A] flex items-center gap-2">
              <WifiOff className="w-4 h-4" /> {bootError}
            </p>
            <button type="button" onClick={boot} className="h-10 px-4 rounded-xl bg-[#0B4A52] text-white text-sm font-semibold cursor-pointer">
              Try again
            </button>
          </>
        ) : (
          <p className="text-sm text-[#5B6B66] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading CareQ…
          </p>
        )}
      </div>
    );
  }

  const resetCtx = { mode: store.mode, isDemoAccount: Boolean(currentAccount?.isDemoAccount), resetAvailable };

  // New parent: onboarding (tell us about your child, your family)
  if (currentAccount?.role === 'parent' && currentAccount.onboarded === false) {
    return (
      <ResetContext.Provider value={resetCtx}>
        {banners}
        <ParentOnboarding parentName={currentAccount.name} areas={AREAS} onComplete={handleCompleteOnboarding} onLogout={handleLogout} />
      </ResetContext.Provider>
    );
  }

  // New centre account: register the centre
  if (currentAccount?.role === 'centre' && (!currentAccount.centreId || registrationScreenOpen)) {
    return (
      <ResetContext.Provider value={resetCtx}>
        {banners}
        <CentreRegistration
          staffEmail={currentAccount.email}
          areas={AREAS}
          fsa={FSA}
          onRegister={handleRegisterCentre}
          uploadsAvailable={store.mode === 'mongo'}
          onDone={(next, opts) => {
            setRegistrationScreenOpen(false);
            if (next === 'policy') {
              const text = centres.find((c) => c.id === currentAccount?.centreId)?.registration?.policyText;
              if (opts?.docKey) setDocToRead(opts.docKey);
              else setPolicyToRead(text ?? null);
              setCentreTab('policy');
            } else {
              setCentreTab('home');
            }
          }}
          onLogout={handleLogout}
        />
      </ResetContext.Provider>
    );
  }

  // If not logged in, render LandingPage first, or AuthPage / TrustTransparencyPage
  if (!currentAccount) {
    if (isTrustPageOpen) {
      return (
        <ResetContext.Provider value={resetCtx}>
          {banners}
          <div className="min-h-screen bg-[#F7F8F7] text-stone-900 font-sans flex flex-col antialiased">
            <header className="bg-white border-b border-stone-200 py-3.5 px-4 sm:px-8 shadow-2xs">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <LogoFull size={38} />
                <button
                  type="button"
                  onClick={() => setIsTrustPageOpen(false)}
                  className="text-xs font-semibold text-[#0B4A52] hover:text-[#45B5A5] underline cursor-pointer"
                >
                  {loggedOutView === 'landing' ? '← Back to Home' : 'Back to Sign-in'}
                </button>
              </div>
            </header>
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <TrustTransparencyPage onBack={() => setIsTrustPageOpen(false)} centres={centres} />
            </main>
            <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
              <p>CareQ • Simplified Ontario Child Care Intake & Central Waitlist Management</p>
            </footer>
            <AskCareQAssistant />
          </div>
        </ResetContext.Provider>
      );
    }

    if (loggedOutView === 'auth') {
      return (
        <ResetContext.Provider value={resetCtx}>
          {banners}
          <AuthPage
            initialMode={authInitialMode}
            initialRole={authInitialRole}
            onLogIn={handleLogIn}
            onSignUp={handleSignUp}
            onOpenTrustPage={() => setIsTrustPageOpen(true)}
            onBackToLanding={() => setLoggedOutView('landing')}
          />
          <AskCareQAssistant />
        </ResetContext.Provider>
      );
    }

    return (
      <ResetContext.Provider value={resetCtx}>
        {banners}
        <LandingPage
          onGetStarted={() => {
            setAuthInitialRole('parent');
            setAuthInitialMode('signup');
            setLoggedOutView('auth');
          }}
          onLogIn={() => {
            setAuthInitialRole('parent');
            setAuthInitialMode('login');
            setLoggedOutView('auth');
          }}
          onRegisterCentre={() => {
            setAuthInitialRole('centre');
            setAuthInitialMode('signup');
            setLoggedOutView('auth');
          }}
          onOpenTrust={() => setIsTrustPageOpen(true)}
        />
        <AskCareQAssistant />
      </ResetContext.Provider>
    );
  }

  return (
    <ResetContext.Provider value={resetCtx}>
      {banners}
      <div className="flex min-h-screen bg-[#FAF9F4] text-[#1E3F42] font-sans antialiased">
        <AppSidebar
          role={currentRole}
          items={currentRole === 'parent' ? parentSidebarItems : centreSidebarItems}
          activeId={currentRole === 'parent' ? parentTab : centreTab}
          onSelect={(id) => {
            if (currentRole === 'parent') setParentTab(id as ParentTab);
            else setCentreTab(id as CentreTab);
          }}
          onLogout={handleLogout}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Thin simulation prototype notice band above Navbar */}
          <div className="h-8 bg-[#F3EBDD] text-[11px] text-[#5B4A2E] flex items-center justify-center gap-3 px-4 shrink-0 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B9933E] shrink-0" />
            <span className="font-bold tracking-[0.14em]">PROTOTYPE</span>
            <span className="hidden sm:inline">Families, applications, positions, offers and messages in this demo are simulated.</span>
            <span className="sm:hidden">Simulated data prototype.</span>
            <Info className="w-3.5 h-3.5 text-[#5B4A2E] shrink-0" />
          </div>

          {/* Top Navbar: Role is fixed to the logged-in account (parents see only parent view; centres see only centre view) */}
          <Navbar
            currentRole={currentRole}
            parentProfile={activeParentProfile}
            singleCentre={activeSingleCentre}
            notifications={notifications}
            onMarkAsRead={handleMarkNotificationAsRead}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            onLogout={handleLogout}
          />

          {/* Main Container: Strictly one role view visible or Trust & Transparency page */}
          <main className="flex-1 max-w-[1180px] w-full mx-auto px-6 lg:px-10 py-10">
            <div id="app-sidebar-mobile-mount" />
            {isTrustPageOpen ? (
              <TrustTransparencyPage onBack={() => setIsTrustPageOpen(false)} centres={centres} />
            ) : currentRole === 'parent' ? (
              /* Parents see ONLY the parent screens */
              <div className="space-y-6">
                {parentTab === 'home' && (
                  <ParentOverview
                    parentProfile={activeParentProfile}
                    applications={myApplications}
                    centres={centres}
                    notifications={notifications}
                    onNavigate={setParentTab}
                  />
                )}

                {parentTab === 'companion' && (
                  <ParentHome
                    parentProfile={activeParentProfile}
                    applications={myApplications}
                    centres={centres}
                    notifications={notifications}
                    onMarkAsRead={handleMarkNotificationAsRead}
                    onMarkAllAsRead={() => handleMarkAllNotificationsAsRead('parent')}
                    onNavigate={setParentTab}
                  />
                )}

                {parentTab === 'find' && (
                  <FindTab
                    centres={centres}
                    applications={myApplications}
                    parentProfile={activeParentProfile}
                    homeArea={activeParentProfile.homeArea}
                    onSelectCentre={handleSelectCentre}
                    onNavigateToApply={() => setParentTab('apply')}
                    onOpenConversation={handleParentOpenConversation}
                  />
                )}

                {parentTab === 'apply' && (
                  <ApplyTab
                    centres={centres}
                    applications={myApplications}
                    parentProfile={activeParentProfile}
                    onToggleRequirement={handleToggleRequirement}
                    onUploadDocument={handleUploadDocument}
                    onRemoveDocument={handleRemoveDocument}
                    onSubmitApplication={handleSubmitApplication}
                    preparedDrafts={preparedDrafts}
                    onUpdatePreparedDraft={handleUpdatePreparedDraft}
                    onUpdateNoteToCentre={handleUpdateNoteToCentre}
                    onNavigateToFind={() => setParentTab('find')}
                    onNavigateToTrack={() => setParentTab('track')}
                  />
                )}

                {parentTab === 'track' && (
                  <TrackTab
                    centres={centres}
                    applications={myApplications}
                    parentProfile={activeParentProfile}
                    onAcceptOffer={handleAcceptOffer}
                    onWithdrawApplication={handleWithdrawApplication}
                    onNavigateToApply={() => setParentTab('apply')}
                    onNavigateToFind={() => setParentTab('find')}
                    onOpenConversation={handleParentOpenConversation}
                  />
                )}

                {parentTab === 'help' && (
                  <HelpTab
                    role="parent"
                    userName={activeParentProfile.name}
                    requests={supportRequests}
                    onSubmitRequest={handleCreateSupportRequest}
                    onAdvanceConcernStep={handleAdvanceConcernStep}
                  />
                )}
              </div>
            ) : (
              /* Centres see ONLY the centre screens */
              <div className="space-y-6">
                {/* On every centre-portal page: demo centres' portal accounts are simulated */}
                {activeSingleCentre.demoKind && (
                  <CentreDemoBanner centreName={activeSingleCentre.name} realCentre={activeSingleCentre.demoKind === 'open-data'} />
                )}
                {centreTab === 'home' && (
                  <CentreOverview
                    singleCentre={activeSingleCentre}
                    applications={centreApplications}
                    notifications={notifications}
                    onNavigate={setCentreTab}
                  />
                )}

                {centreTab === 'messages' && (
                  <CentreMessages
                    singleCentre={activeSingleCentre}
                    applications={centreApplications}
                    conversations={conversations}
                    onOpenConversation={handleCentreOpenConversation}
                  />
                )}

                {(centreTab === 'applications' || centreTab === 'policy' || centreTab === 'help') && (
                  <CentreDashboard
                    singleCentre={activeSingleCentre}
                    applications={centreApplications}
                    autoReadPolicyText={policyToRead}
                    onAutoReadPolicyStarted={() => setPolicyToRead(null)}
                    autoReadDocKey={docToRead}
                    onAutoReadDocStarted={() => setDocToRead(null)}
                    onUpdateStatus={handleUpdateStatus}
                    onUpdateCentreRequirements={handleUpdateCentreRequirements}
                    onOpenConversation={handleCentreOpenConversation}
                    requests={supportRequests}
                    onSubmitRequest={handleCreateSupportRequest}
                    onAdvanceConcernStep={handleAdvanceConcernStep}
                    activeTab={centreTab}
                    onTabChange={setCentreTab}
                  />
                )}
              </div>
            )}
          </main>

          {/* Bidirectional Conversation Modal with AI Assistant */}
          {activeChatModal?.isOpen && activeChatApp && activeChatCentre && (
            <ConversationModal
              isOpen={activeChatModal.isOpen}
              onClose={() => setActiveChatModal(null)}
              role={currentRole}
              centre={activeChatCentre}
              application={activeChatApp}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
            />
          )}

          {/* Footer linked for both parents and centres */}
          <footer className="border-t border-[#E7E4DA] bg-white/70 py-6 mt-12 text-center text-xs text-[#6E7C77]">
            <div className="max-w-[1180px] w-full mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p>CareQ • Simplified Ontario Child Care Intake &amp; Central Waitlist Management</p>
              <div className="flex items-center gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => setIsTrustPageOpen(true)}
                  className="text-[#0B4A52] hover:text-[#4E7A5A] font-semibold underline transition-colors cursor-pointer"
                >
                  Trust and transparency
                </button>
                <span className="text-stone-300">|</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[#5B6B66] hover:text-[#173F42] transition-colors cursor-pointer"
                  title="Log out of session"
                >
                  Log out
                </button>
                {/* The sidebar (with Reset demo) is hidden below lg, so offer it here too */}
                <ResetDemo variant="link" className="lg:hidden" />
              </div>
            </div>
          </footer>
        </div>

        {/* Ask CareQ Assistant Floating on every screen */}
        <AskCareQAssistant />
      </div>
    </ResetContext.Provider>
  );
}
