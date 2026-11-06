/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  INITIAL_CENTRES,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  PARENT_PROFILE,
  PRIYA_CHILDREN,
  PRIYA_ACCOUNT_ID,
  RIVERDALE_CENTRE_ID,
  conversationKey,
  ParentProfile,
  Centre,
  Application,
  ApplicationStatus,
  UploadedDocument,
  ChatMessage,
  ConversationsMap,
  InAppNotification,
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
import { AuthPage, MockAccount } from './components/AuthPage';
import { HelpTab } from './components/HelpTab';
import { AskCareQAssistant } from './components/AskCareQAssistant';
import { SupportRequest, INITIAL_SUPPORT_REQUESTS, ConcernStep } from './data/helpData';
import { PreparedDraft, NOT_PROVIDED } from './lib/prepareApplication';
import { DemoState, loadDemoState, saveDemoState, mergeCentres, splitCentres } from './lib/demoStorage';
import { ResetDemo } from './components/ResetDemo';
import { ParentOnboarding } from './components/Onboarding/ParentOnboarding';
import { CentreRegistration } from './components/Onboarding/CentreRegistration';
import { Child, ageInMonths } from './lib/family';
import type { Area, FsaCentroids } from './lib/rankCentres';
import torontoAreas from './data/torontoAreas.json';
import fsaCentroids from './data/fsaCentroids.json';

const AREAS = (torontoAreas as { areas: Area[] }).areas;
const FSA = fsaCentroids as FsaCentroids;
import { LogoFull } from './components/Logo';
import {
  Search,
  FileEdit,
  FileText,
  ListFilter,
  HelpCircle,
  Home,
  Building2,
  Info,
  Heart,
  LayoutGrid,
  ScrollText,
  Users,
} from 'lucide-react';

const INITIAL_MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: PRIYA_ACCOUNT_ID,
    role: 'parent',
    email: 'priya@example.ca',
    name: 'Priya Patel',
    password: 'password',
    children: PRIYA_CHILDREN,
    onboarded: true,
  },
  {
    id: 'centre-riverdale',
    role: 'centre',
    email: 'centre@riverdale.ca',
    name: 'Sarah Jenkins',
    password: 'password',
    centreName: 'Riverdale Early Learning Centre',
    centreId: RIVERDALE_CENTRE_ID,
  },
];

const formatDate = (opts: Intl.DateTimeFormatOptions) => new Date().toLocaleDateString('en-US', opts);

export default function App() {
  // Mock accounts stored in app state
  // Demo state saved in this browser (null = start from the mock data). Read once on start.
  const [saved] = useState(() => loadDemoState());

  const [mockAccounts, setMockAccounts] = useState<MockAccount[]>(() =>
    saved
      ? [...INITIAL_MOCK_ACCOUNTS, ...saved.mockAccounts.filter((a) => !INITIAL_MOCK_ACCOUNTS.some((d) => d.id === a.id))]
      : INITIAL_MOCK_ACCOUNTS
  );

  // Authenticated account in session (null = shows login/sign-up page)
  const [currentAccount, setCurrentAccount] = useState<MockAccount | null>(() =>
    saved?.sessionAccountId ? mockAccounts.find((a) => a.id === saved.sessionAccountId) ?? null : null
  );

  // Parent View Tab Switcher: 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help'
  const [parentTab, setParentTab] = useState<'home' | 'find' | 'apply' | 'track' | 'companion' | 'help'>('home');

  // Centre View Tab Switcher: 'home' | 'applications' | 'messages' | 'policy' | 'help'
  const [centreTab, setCentreTab] = useState<'home' | 'applications' | 'messages' | 'policy' | 'help'>('home');

  // In-memory centres state (Riverdale Early Learning Centre is the single centre managed in Centre role)
  const [centres, setCentres] = useState<Centre[]>(() =>
    saved ? mergeCentres(INITIAL_CENTRES, saved.centreOverrides, saved.selfRegisteredCentres) : INITIAL_CENTRES
  );
  const singleCentre = centres[0]; // Riverdale Early Learning Centre

  // In-memory application state
  const [applications, setApplications] = useState<Application[]>(() => saved?.applications ?? INITIAL_APPLICATIONS);

  // AI-prepared drafts, kept apart from applications so nothing reaches a centre before the parent submits
  const [preparedDrafts, setPreparedDrafts] = useState<Record<string, PreparedDraft>>(() => saved?.preparedDrafts ?? {});
  const handleUpdatePreparedDraft = (applicationId: string, draft: PreparedDraft) =>
    setPreparedDrafts((prev) => ({ ...prev, [applicationId]: draft }));

  // In-memory conversations map between centres and parents
  const [conversations, setConversations] = useState<ConversationsMap>(() => saved?.conversations ?? INITIAL_CONVERSATIONS);

  // In-memory in-app notifications state
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => saved?.notifications ?? INITIAL_NOTIFICATIONS);

  // Trust and transparency page navigation state
  const [isTrustPageOpen, setIsTrustPageOpen] = useState<boolean>(false);

  // Mark single notification as read
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all of the signed-in user's notifications as read
  const handleMarkAllNotificationsAsRead = (_role: 'parent' | 'centre') => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientId === myRecipientId ? { ...n, read: true } : n))
    );
  };

  // Login handler
  const handleLogin = (incoming: MockAccount) => {
    const account = incoming;
    setParentTab('home');
    setCentreTab('home');

    // Centre staff are linked to their centre by id; a new centre account registers its centre next

    setMockAccounts((prev) => {
      const i = prev.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
      if (i === -1) return [...prev, account];
      const next = [...prev];
      next[i] = { ...prev[i], ...account };
      return next;
    });

    setCurrentAccount(account);
    setIsTrustPageOpen(false);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentAccount(null);
    setIsTrustPageOpen(false);
  };

  // Update the signed-in account (and its saved copy)
  const updateCurrentAccount = (patch: Partial<MockAccount>) => {
    if (!currentAccount) return;
    const updated = { ...currentAccount, ...patch };
    setCurrentAccount(updated);
    setMockAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Centre registration: show the success screen until the centre chooses where to go next
  const [registrationScreenOpen, setRegistrationScreenOpen] = useState(false);
  // Policy text the centre asked AI to read right after registering
  const [policyToRead, setPolicyToRead] = useState<string | null>(null);

  const currentRole = currentAccount ? currentAccount.role : 'parent';

  // The signed-in parent and their active child (Priya's seed child is Anya)
  const myAccountId = currentAccount?.id ?? PRIYA_ACCOUNT_ID;
  const myChildren: Child[] =
    currentAccount?.role === 'parent' ? currentAccount.children ?? [] : PRIYA_CHILDREN;
  const activeChild: Child | undefined = myChildren[0]; // the first child is active everywhere for now
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
    : { ...PARENT_PROFILE, name: currentAccount?.name || PARENT_PROFILE.name };

  // The signed-in centre (by id)
  const activeSingleCentre: Centre =
    currentAccount && currentAccount.role === 'centre'
      ? centres.find((c) => c.id === currentAccount.centreId) || singleCentre
      : singleCentre;

  // Notifications are addressed to a parent account or a centre
  const myRecipientId = currentAccount?.role === 'centre' ? activeSingleCentre.id : myAccountId;
  const myNotifications = notifications.filter((n) => n.recipientId === myRecipientId);

  // Support & concern requests state (for Help tab)
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(
    () => saved?.supportRequests ?? INITIAL_SUPPORT_REQUESTS
  );

  // Save the demo in this browser: debounced ~300 ms, and flushed when the page is hidden/closed.
  const demoState: DemoState = {
    mockAccounts: mockAccounts.filter((a) => !INITIAL_MOCK_ACCOUNTS.some((d) => d.id === a.id)),
    sessionAccountId: currentAccount?.id ?? null,
    applications,
    conversations,
    notifications,
    supportRequests,
    ...splitCentres(centres, INITIAL_CENTRES),
    preparedDrafts,
  };
  const latestDemoState = useRef(demoState);
  latestDemoState.current = demoState;
  useEffect(() => {
    const t = window.setTimeout(() => saveDemoState(latestDemoState.current), 300);
    return () => window.clearTimeout(t);
  }, [mockAccounts, currentAccount, applications, conversations, notifications, supportRequests, centres, preparedDrafts]);
  useEffect(() => {
    const flush = () => saveDemoState(latestDemoState.current);
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const handleCreateSupportRequest = (
    newReq: Omit<SupportRequest, 'id' | 'referenceNumber' | 'submittedAt'>
  ) => {
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const refNum = `CQ-${Math.floor(1000 + Math.random() * 9000)}`;

    const created: SupportRequest = {
      ...newReq,
      id: `req-${Date.now()}`,
      referenceNumber: refNum,
      submittedAt: today,
    };

    setSupportRequests((prev) => [created, ...prev]);
  };

  const handleAdvanceConcernStep = (requestId: string) => {
    const steps: ConcernStep[] = [
      'Submitted',
      'Under review by CareQ support',
      'Shared with the other party (if needed)',
      'Resolved',
    ];
    const today = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    setSupportRequests((prev) =>
      prev.map((req) => {
        if (req.id !== requestId || req.type !== 'concern') return req;

        const currentIdx = steps.indexOf(req.concernStep || 'Submitted');
        const nextIdx = Math.min(steps.length - 1, currentIdx + 1);
        const nextStep = steps[nextIdx];
        const existingHistory = req.concernStepsHistory || [];
        const updatedHistory = existingHistory.some((h) => h.step === nextStep)
          ? existingHistory
          : [...existingHistory, { step: nextStep, date: today }];

        return {
          ...req,
          concernStep: nextStep,
          concernStepsHistory: updatedHistory,
          status: nextStep === 'Resolved' ? 'Resolved' : 'In progress',
        };
      })
    );
  };

  // Active chat modal state
  const [activeChatModal, setActiveChatModal] = useState<{
    isOpen: boolean;
    centreId: string;
    applicationId: string;
  } | null>(null);

  // A new application (or an enquiry before applying) for the active child at a centre
  const newApplicationFor = (centreId: string, id: string): Application => ({
    id,
    centreId,
    parentAccountId: myAccountId,
    childId: activeParentProfile.childId,
    parentName: activeParentProfile.name,
    childName: activeParentProfile.childName,
    childAgeMonths: activeParentProfile.childAgeMonths,
    careType: activeParentProfile.careType,
    preferredStartDate: activeParentProfile.preferredStartDate,
    parentNotes: activeChild?.notes || undefined,
    status: 'Draft',
    completedRequirements: [],
    uploadedDocuments: {},
  });
  const myApplicationAt = (centreId: string) =>
    applications.find(
      (a) => a.centreId === centreId && a.parentAccountId === myAccountId && a.childId === activeParentProfile.childId
    );

  // Add / select a centre for application from Parent Find tab
  const handleSelectCentre = (centreId: string) => {
    const existing = myApplicationAt(centreId);
    if (!existing) {
      const newApp = newApplicationFor(centreId, `app-${centreId}-${activeParentProfile.childId}-${Date.now()}`);
      setApplications((prev) => [newApp, ...prev]);
    }
    // Switch to apply tab to view checklist
    setParentTab('apply');
  };

  // Toggle requirement checklist item in Apply tab
  const handleToggleRequirement = (applicationId: string, requirementName: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const exists = app.completedRequirements.includes(requirementName);
        return {
          ...app,
          completedRequirements: exists
            ? app.completedRequirements.filter((r) => r !== requirementName)
            : [...app.completedRequirements, requirementName],
        };
      })
    );
  };

  // Upload or attach document to an application requirement
  const handleUploadDocument = (
    applicationId: string,
    requirementName: string,
    file: { fileName: string; fileSize: string }
  ) => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const doc: UploadedDocument = {
      fileName: file.fileName,
      fileSize: file.fileSize,
      uploadedAt: formattedDate,
    };

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const existingDocs = app.uploadedDocuments || {};
        const completed = app.completedRequirements.includes(requirementName)
          ? app.completedRequirements
          : [...app.completedRequirements, requirementName];

        return {
          ...app,
          completedRequirements: completed,
          uploadedDocuments: {
            ...existingDocs,
            [requirementName]: doc,
          },
        };
      })
    );
  };

  // Note to the centre on a draft (centres with no published requirements)
  const handleUpdateNoteToCentre = (applicationId: string, note: string) =>
    setApplications((prev) =>
      prev.map((a) => (a.id === applicationId && a.status === 'Draft' ? { ...a, noteToCentre: note.slice(0, 1000) } : a))
    );

  // Remove uploaded document
  const handleRemoveDocument = (applicationId: string, requirementName: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const existingDocs = { ...(app.uploadedDocuments || {}) };
        delete existingDocs[requirementName];

        return {
          ...app,
          completedRequirements: app.completedRequirements.filter(
            (r) => r !== requirementName
          ),
          uploadedDocuments: existingDocs,
        };
      })
    );
  };

  // Submit application after Review & Approve confirmation
  const handleSubmitApplication = (applicationId: string) => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const notifDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const targetApp = applications.find((a) => a.id === applicationId);
    const childName = targetApp ? targetApp.childName : activeParentProfile.childName;
    const parentName = targetApp ? targetApp.parentName : activeParentProfile.name;

    // The parent approved: attach the reviewed AI draft (if any) to what is sent
    const draft = preparedDrafts[applicationId];
    const prepared: Partial<Application> = draft
      ? {
          preparedFields: draft.fields.map((f) => ({
            label: f.label,
            value: f.value.trim() || NOT_PROVIDED,
            source: f.source,
          })),
          preparedChecklist: draft.checklist,
          noteToCentre: draft.noteToCentre.trim() || undefined,
          preparedWithAi: true,
          aiMode: draft.aiMode,
        }
      : {};

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        return {
          ...app,
          ...prepared,
          status: 'Submitted' as ApplicationStatus,
          submittedAt: formattedDate,
        };
      })
    );
    if (draft) {
      setPreparedDrafts((prev) => {
        const next = { ...prev };
        delete next[applicationId];
        return next;
      });
    }

    // Notify centre of new application submission
    const notif: InAppNotification = {
      id: `notif-centre-sub-${Date.now()}`,
      recipientRole: 'centre',
      recipientId: targetApp?.centreId ?? RIVERDALE_CENTRE_ID,
      message: `${parentName} submitted an application for ${childName} on ${notifDate}`,
      timestamp: notifDate,
      createdAt: Date.now(),
      read: false,
      type: 'application',
    };
    setNotifications((prev) => [notif, ...prev]);

    // Switch to track tab to see newly submitted application in the queue table
    setParentTab('track');
  };

  // Accept offer and optionally withdraw other applications
  const handleAcceptOffer = (applicationId: string, withdrawOthers: boolean) => {
    const notifDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const targetApp = applications.find((a) => a.id === applicationId);
    const childName = targetApp ? targetApp.childName : activeParentProfile.childName;
    const parentName = targetApp ? targetApp.parentName : activeParentProfile.name;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return { ...app, status: 'Accepted' as ApplicationStatus };
        }
        // Only withdraw this parent's other applications for the same child
        if (
          withdrawOthers &&
          targetApp &&
          app.parentAccountId === targetApp.parentAccountId &&
          app.childId === targetApp.childId &&
          app.status !== 'Withdrawn'
        ) {
          return { ...app, status: 'Withdrawn' as ApplicationStatus };
        }
        return app;
      })
    );

    // Notify centre that offer was accepted
    const notif: InAppNotification = {
      id: `notif-centre-acc-${Date.now()}`,
      recipientRole: 'centre',
      recipientId: targetApp?.centreId ?? RIVERDALE_CENTRE_ID,
      message: `${parentName} accepted the offer for ${childName} on ${notifDate}`,
      timestamp: notifDate,
      createdAt: Date.now(),
      read: false,
      type: 'offer',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Withdraw single application
  const handleWithdrawApplication = (applicationId: string) => {
    const notifDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const targetApp = applications.find((a) => a.id === applicationId);
    const childName = targetApp ? targetApp.childName : activeParentProfile.childName;
    const parentName = targetApp ? targetApp.parentName : activeParentProfile.name;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return { ...app, status: 'Withdrawn' as ApplicationStatus };
        }
        return app;
      })
    );

    // Notify centre that application was withdrawn
    const notif: InAppNotification = {
      id: `notif-centre-wd-${Date.now()}`,
      recipientRole: 'centre',
      recipientId: targetApp?.centreId ?? RIVERDALE_CENTRE_ID,
      message: `${parentName} withdrew the application for ${childName} on ${notifDate}`,
      timestamp: notifDate,
      createdAt: Date.now(),
      read: false,
      type: 'status',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Centre view updates: Under review, Waitlisted with position & wait estimate, Make offer
  const handleUpdateStatus = (
    applicationId: string,
    newStatus: ApplicationStatus,
    waitlistPosition?: number,
    waitlistEstimate?: string
  ) => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const targetApp = applications.find((a) => a.id === applicationId);
    const childName = targetApp ? targetApp.childName : 'your child';
    const appCentre = (targetApp && centres.find((c) => c.id === targetApp.centreId)) || activeSingleCentre;
    const parentName = targetApp ? targetApp.parentName : activeParentProfile.name;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const isWaitlisted = newStatus === 'Waitlisted';

        let newHistory = app.positionHistory ? [...app.positionHistory] : [];
        if (isWaitlisted && typeof waitlistPosition === 'number' && waitlistPosition > 0) {
          if (newHistory.length === 0 && app.waitlistPosition && app.waitlistReportedDate) {
            newHistory.push({
              position: app.waitlistPosition,
              date: app.waitlistReportedDate,
            });
          }
          newHistory.push({
            position: waitlistPosition,
            date: formattedDate,
          });
        }

        return {
          ...app,
          status: newStatus,
          waitlistPosition: isWaitlisted ? waitlistPosition : app.waitlistPosition,
          waitlistReportedBy: isWaitlisted ? appCentre.name : app.waitlistReportedBy,
          waitlistReportedDate: isWaitlisted ? formattedDate : app.waitlistReportedDate,
          waitlistReportedTimestamp: isWaitlisted ? Date.now() : app.waitlistReportedTimestamp,
          waitlistEstimate: isWaitlisted
            ? (waitlistEstimate && waitlistEstimate.trim() ? waitlistEstimate.trim() : undefined)
            : app.waitlistEstimate,
          positionHistory: isWaitlisted && newHistory.length > 0 ? newHistory : app.positionHistory,
        };
      })
    );

    // Create notifications for parent and centre
    let parentMessage = '';
    let centreMessage = '';
    let notifType: 'status' | 'position' | 'offer' = 'status';

    if (newStatus === 'Waitlisted' && typeof waitlistPosition === 'number' && waitlistPosition > 0) {
      parentMessage = `${appCentre.name} updated your position to ${waitlistPosition} on ${formattedDate}`;
      centreMessage = `Updated ${childName}'s position to ${waitlistPosition} on ${formattedDate}`;
      notifType = 'position';
    } else if (newStatus === 'Offer') {
      parentMessage = `${appCentre.name} made an offer for ${childName} on ${formattedDate}`;
      centreMessage = `Made an offer to ${parentName} for ${childName} on ${formattedDate}`;
      notifType = 'offer';
    } else {
      parentMessage = `${appCentre.name} updated your application status to ${newStatus} on ${formattedDate}`;
      centreMessage = `Updated ${childName}'s status to ${newStatus} on ${formattedDate}`;
      notifType = 'status';
    }

    const newNotifs: InAppNotification[] = [
      {
        id: `notif-parent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: 'parent',
        recipientId: targetApp?.parentAccountId ?? myAccountId,
        message: parentMessage,
        timestamp: formattedDate,
        createdAt: Date.now(),
        read: false,
        type: notifType,
      },
      {
        id: `notif-centre-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: 'centre',
        recipientId: appCentre.id,
        message: centreMessage,
        timestamp: formattedDate,
        createdAt: Date.now() + 1,
        read: false,
        type: notifType,
      },
    ];

    setNotifications((prev) => [...newNotifs, ...prev]);
  };

  // Centre view policy requirement update (from Gemini extractor)
  const handleUpdateCentreRequirements = (
    centreId: string,
    newRequirements: string[],
    requirementSources?: Record<string, string>
  ) => {
    setCentres((prev) =>
      prev.map((c) => {
        if (c.id !== centreId) return c;
        return {
          ...c,
          requirements: newRequirements,
          // Source sentences confirmed by the centre in the policy reader
          requirementSources: requirementSources ?? c.requirementSources,
        };
      })
    );
  };

  // Open conversation from Parent View (clicking centre)
  const handleParentOpenConversation = (centreId: string) => {
    // The parent's own application for the active child at this centre, or an enquiry
    const app =
      myApplicationAt(centreId) ??
      newApplicationFor(centreId, `app-${centreId}-${activeParentProfile.childId}-inquiry`);
    setActiveChatModal({
      isOpen: true,
      centreId,
      applicationId: app.id,
    });
  };

  // Open conversation from Centre View (clicking Message Parent on child's application)
  const handleCentreOpenConversation = (application: Application) => {
    setActiveChatModal({
      isOpen: true,
      centreId: application.centreId,
      applicationId: application.id,
    });
  };

  // Send message in active conversation
  const handleSendMessage = (text: string, aiAssisted: boolean) => {
    if (!activeChatModal) return;

    const app = applications.find((a) => a.id === activeChatModal.applicationId);
    const centre = centres.find((c) => c.id === activeChatModal.centreId) || singleCentre;
    const convKey = conversationKey(activeChatModal.centreId, app ? app.childId : activeParentProfile.childId);

    const formattedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: currentRole,
      senderName: currentRole === 'parent' ? activeParentProfile.name : centre.name,
      text,
      timestamp: `Today • ${formattedTime}`,
      aiAssisted,
    };

    setConversations((prev) => {
      const existing = prev[convKey] || [];
      return {
        ...prev,
        [convKey]: [...existing, newMsg],
      };
    });
  };

  // Active chat modal resolved objects
  const activeChatApp = activeChatModal
    ? applications.find((a) => a.id === activeChatModal.applicationId) ||
      newApplicationFor(activeChatModal.centreId, activeChatModal.applicationId)
    : null;

  const activeChatCentre = activeChatModal
    ? centres.find((c) => c.id === activeChatModal.centreId) || singleCentre
    : singleCentre;

  const activeConvKey =
    activeChatModal && activeChatApp
      ? conversationKey(activeChatModal.centreId, activeChatApp.childId)
      : '';

  const activeMessages = conversations[activeConvKey] || [];

  // The signed-in parent's applications only
  const priyaApplications = applications.filter((a) => a.parentAccountId === myAccountId);

  // Tab badge counts
  const draftCount = priyaApplications.filter((a) => a.status === 'Draft').length;
  const offerCount = priyaApplications.filter((a) => a.status === 'Offer').length;

  // Parent sidebar items in this order: Overview (Home icon, id 'home'), Find Centres (Search, 'find'), Apply (FileEdit, 'apply', badge "{draftCount} in progress" if > 0), Track Status (ListFilter, 'track', badge "Offer" if offerCount > 0), Parent companion (Heart, 'companion'), Help & Support (HelpCircle, 'help')
  const parentSidebarItems: SidebarItem[] = [
    { id: 'home', label: 'Overview', icon: Home },
    { id: 'find', label: 'Find Centres', icon: Search },
    {
      id: 'apply',
      label: 'Apply',
      icon: FileEdit,
      badge: draftCount > 0 ? `${draftCount} in progress` : undefined,
    },
    {
      id: 'track',
      label: 'Track Status',
      icon: ListFilter,
      badge: offerCount > 0 ? 'Offer' : undefined,
    },
    { id: 'companion', label: 'Parent companion', icon: Heart },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const centreApplications = applications.filter(
    (app) => app.centreId === activeSingleCentre.id
  );
  const centreSubmittedCount = centreApplications.filter(
    (app) => app.status === 'Submitted'
  ).length;

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

  // New parent: onboarding (tell us about your child, your family)
  if (currentAccount?.role === 'parent' && currentAccount.onboarded === false) {
    return (
      <ParentOnboarding
        parentName={currentAccount.name}
        areas={AREAS}
        onComplete={(children) => {
          updateCurrentAccount({ children, onboarded: true });
          setParentTab('home');
        }}
        onLogout={handleLogout}
      />
    );
  }

  // New centre account: register the centre
  if (currentAccount?.role === 'centre' && (!currentAccount.centreId || registrationScreenOpen)) {
    return (
      <CentreRegistration
        staffEmail={currentAccount.email}
        areas={AREAS}
        fsa={FSA}
        onRegistered={(centre) => {
          setRegistrationScreenOpen(true);
          setCentres((prev) => [centre, ...prev]);
          updateCurrentAccount({ centreId: centre.id, centreName: centre.name });
        }}
        onDone={(next) => {
          setRegistrationScreenOpen(false);
          if (next === 'policy') {
            const text = centres.find((c) => c.id === currentAccount.centreId)?.registration?.policyText;
            setPolicyToRead(text ?? null);
            setCentreTab('policy');
          } else {
            setCentreTab('home');
          }
        }}
        onLogout={handleLogout}
      />
    );
  }

  // If not logged in, render separate Parent / Centre Login & Sign-up Portal
  if (!currentAccount) {
    if (isTrustPageOpen) {
      return (
        <div className="min-h-screen bg-[#F7F8F7] text-stone-900 font-sans flex flex-col antialiased">
          <header className="bg-white border-b border-stone-200 py-3.5 px-4 sm:px-8 shadow-2xs">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <LogoFull size={38} />
              <button
                type="button"
                onClick={() => setIsTrustPageOpen(false)}
                className="text-xs font-semibold text-[#0B4A52] hover:text-[#45B5A5] underline cursor-pointer"
              >
                Back to Sign-in
              </button>
            </div>
          </header>
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
            <TrustTransparencyPage
              onBack={() => setIsTrustPageOpen(false)}
              centres={centres}
            />
          </main>
          <footer className="border-t border-stone-200 bg-white py-4 px-4 text-center text-xs text-stone-500">
            <p>CareQ • Simplified Ontario Child Care Intake & Central Waitlist Management</p>
          </footer>
          <AskCareQAssistant centres={centres} />
        </div>
      );
    }

    return (
      <>
        <AuthPage
          onLogin={handleLogin}
          mockAccounts={mockAccounts}
          onOpenTrustPage={() => setIsTrustPageOpen(true)}
        />
        <AskCareQAssistant centres={centres} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#FAF9F4] text-[#1E3F42] font-sans antialiased">
      <AppSidebar
        role={currentRole}
        items={currentRole === 'parent' ? parentSidebarItems : centreSidebarItems}
        activeId={currentRole === 'parent' ? parentTab : centreTab}
        onSelect={(id) => {
          if (currentRole === 'parent') {
            setParentTab(id as 'home' | 'find' | 'apply' | 'track' | 'companion' | 'help');
          } else {
            setCentreTab(id as 'home' | 'applications' | 'messages' | 'policy' | 'help');
          }
        }}
        onLogout={handleLogout}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Thin simulation prototype notice band above Navbar */}
        <div className="h-8 bg-[#F3EBDD] text-[11px] text-[#5B4A2E] flex items-center justify-center gap-3 px-4 shrink-0 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B9933E] shrink-0" />
          <span className="font-bold tracking-[0.14em]">PROTOTYPE</span>
          <span className="hidden sm:inline">Centres, families, waitlists and messages in this demo are simulated.</span>
          <span className="sm:hidden">Simulated data prototype.</span>
          <Info className="w-3.5 h-3.5 text-[#5B4A2E] shrink-0" />
        </div>

        {/* Top Navbar: Role is fixed to the logged-in account (parents see only parent view; centres see only centre view) */}
        <Navbar
          currentRole={currentRole}
          parentProfile={activeParentProfile}
          singleCentre={activeSingleCentre}
          notifications={myNotifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onLogout={handleLogout}
        />

        {/* Main Container: Strictly one role view visible or Trust & Transparency page */}
        <main className="flex-1 max-w-[1180px] w-full mx-auto px-6 lg:px-10 py-10">
          <div id="app-sidebar-mobile-mount" />
        {isTrustPageOpen ? (
          <TrustTransparencyPage
            onBack={() => setIsTrustPageOpen(false)}
            centres={centres}
          />
        ) : currentRole === 'parent' ? (
          /* Parents see ONLY the parent screens */
          <div className="space-y-6">
            {/* Parent Tabs Content */}
            {parentTab === 'home' && (
              <ParentOverview
                parentProfile={activeParentProfile}
                applications={priyaApplications}
                centres={centres}
                notifications={myNotifications}
                onNavigate={setParentTab}
              />
            )}

            {parentTab === 'companion' && (
              <ParentHome
                parentProfile={activeParentProfile}
                applications={priyaApplications}
                centres={centres}
                notifications={myNotifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={() => handleMarkAllNotificationsAsRead('parent')}
                onNavigate={setParentTab}
              />
            )}

            {parentTab === 'find' && (
              <FindTab
                centres={centres}
                applications={priyaApplications}
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
                applications={priyaApplications}
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
                applications={priyaApplications}
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
            {centreTab === 'home' && (
              <CentreOverview
                singleCentre={activeSingleCentre}
                applications={centreApplications}
                notifications={myNotifications}
                onNavigate={setCentreTab}
              />
            )}

            {centreTab === 'messages' && (
              <CentreMessages
                singleCentre={activeSingleCentre}
                applications={applications}
                conversations={conversations}
                onOpenConversation={handleCentreOpenConversation}
              />
            )}

            {(centreTab === 'applications' || centreTab === 'policy' || centreTab === 'help') && (
              <CentreDashboard
                singleCentre={activeSingleCentre}
                applications={applications}
                autoReadPolicyText={policyToRead}
                onAutoReadPolicyStarted={() => setPolicyToRead(null)}
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
            <span className="text-stone-300 lg:hidden">|</span>
            {/* The sidebar (with Reset demo) is hidden below lg, so offer it here too */}
            <ResetDemo variant="link" className="lg:hidden" />
          </div>
        </div>
      </footer>
    </div>

    {/* Ask CareQ Assistant Floating on every screen */}
    <AskCareQAssistant centres={centres} />
  </div>
);
}
