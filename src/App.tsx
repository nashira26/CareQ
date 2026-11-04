/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  INITIAL_CENTRES,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  INITIAL_NOTIFICATIONS,
  PARENT_PROFILE,
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
import { FindTab } from './components/ParentView/FindTab';
import { ApplyTab } from './components/ParentView/ApplyTab';
import { TrackTab } from './components/ParentView/TrackTab';
import { CentreDashboard } from './components/CentreView/CentreDashboard';
import { ConversationModal } from './components/ConversationModal';
import { TrustTransparencyPage } from './components/TrustTransparencyPage';
import { AuthPage, MockAccount } from './components/AuthPage';
import { HelpTab } from './components/HelpTab';
import { AskCareQAssistant } from './components/AskCareQAssistant';
import { SupportRequest, INITIAL_SUPPORT_REQUESTS, ConcernStep } from './data/helpData';
import { LogoFull } from './components/Logo';
import { Search, FileEdit, ListFilter, HelpCircle } from 'lucide-react';

const INITIAL_MOCK_ACCOUNTS: MockAccount[] = [
  {
    id: 'parent-priya',
    role: 'parent',
    email: 'priya@example.ca',
    name: 'Priya Patel',
    password: 'password',
    childName: 'Anya',
    childAgeMonths: 22,
  },
  {
    id: 'centre-riverdale',
    role: 'centre',
    email: 'centre@riverdale.ca',
    name: 'Sarah Jenkins',
    password: 'password',
    centreName: 'Riverdale Early Learning Centre',
  },
];

export default function App() {
  // Mock accounts stored in app state
  const [mockAccounts, setMockAccounts] = useState<MockAccount[]>(INITIAL_MOCK_ACCOUNTS);

  // Authenticated account in session (null = shows login/sign-up page)
  const [currentAccount, setCurrentAccount] = useState<MockAccount | null>(null);

  // Parent View Tab Switcher: 'find' | 'apply' | 'track' | 'help'
  const [parentTab, setParentTab] = useState<'find' | 'apply' | 'track' | 'help'>('track');

  // In-memory centres state (Riverdale Early Learning Centre is the single centre managed in Centre role)
  const [centres, setCentres] = useState<Centre[]>(INITIAL_CENTRES);
  const singleCentre = centres[0]; // Riverdale Early Learning Centre

  // In-memory application state
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);

  // In-memory conversations map between centres and parents
  const [conversations, setConversations] = useState<ConversationsMap>(INITIAL_CONVERSATIONS);

  // In-memory in-app notifications state
  const [notifications, setNotifications] = useState<InAppNotification[]>(INITIAL_NOTIFICATIONS);

  // Trust and transparency page navigation state
  const [isTrustPageOpen, setIsTrustPageOpen] = useState<boolean>(false);

  // Mark single notification as read
  const handleMarkNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Mark all notifications for a role as read
  const handleMarkAllNotificationsAsRead = (role: 'parent' | 'centre') => {
    setNotifications((prev) =>
      prev.map((n) => (n.recipientRole === role ? { ...n, read: true } : n))
    );
  };

  // Login handler
  const handleLogin = (account: MockAccount) => {
    setMockAccounts((prev) => {
      if (prev.some((a) => a.email.toLowerCase() === account.email.toLowerCase())) {
        return prev;
      }
      return [...prev, account];
    });

    if (account.role === 'centre' && account.centreName) {
      const exists = centres.some((c) => c.name.toLowerCase() === account.centreName!.toLowerCase());
      if (!exists) {
        const newCentre: Centre = {
          id: `c-custom-${Date.now()}`,
          name: account.centreName,
          neighbourhood: 'Toronto & GTA',
          ageGroups: ['Toddler', 'Preschool'],
          hours: '7:30 AM - 6:00 PM',
          requirements: [...singleCentre.requirements],
          address: 'Ontario Licensed Child Care Facility',
        };
        setCentres((prev) => [newCentre, ...prev]);
      }
    }

    setCurrentAccount(account);
    setIsTrustPageOpen(false);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentAccount(null);
    setIsTrustPageOpen(false);
  };

  const currentRole = currentAccount ? currentAccount.role : 'parent';

  const activeParentProfile: ParentProfile =
    currentAccount && currentAccount.role === 'parent'
      ? {
          name: currentAccount.name || PARENT_PROFILE.name,
          childName: currentAccount.childName || PARENT_PROFILE.childName,
          childAgeMonths: currentAccount.childAgeMonths || PARENT_PROFILE.childAgeMonths,
          careType: PARENT_PROFILE.careType,
          preferredStartDate: PARENT_PROFILE.preferredStartDate,
        }
      : PARENT_PROFILE;

  const activeSingleCentre: Centre =
    currentAccount && currentAccount.role === 'centre'
      ? centres.find((c) => c.name.toLowerCase() === (currentAccount.centreName || '').toLowerCase()) || singleCentre
      : singleCentre;

  // Support & concern requests state (for Help tab)
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>(INITIAL_SUPPORT_REQUESTS);

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

  // Add / select a centre for application from Parent Find tab
  const handleSelectCentre = (centreId: string) => {
    const existing = applications.find(
      (a) => a.centreId === centreId && a.parentName === PARENT_PROFILE.name
    );
    if (!existing) {
      const newApp: Application = {
        id: `app-${centreId}-anya-${Date.now()}`,
        centreId,
        parentName: PARENT_PROFILE.name,
        childName: PARENT_PROFILE.childName,
        childAgeMonths: PARENT_PROFILE.childAgeMonths,
        careType: PARENT_PROFILE.careType,
        preferredStartDate: PARENT_PROFILE.preferredStartDate,
        status: 'Draft',
        completedRequirements: [],
        uploadedDocuments: {},
      };
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
    const childName = targetApp ? targetApp.childName : PARENT_PROFILE.childName;
    const parentName = targetApp ? targetApp.parentName : PARENT_PROFILE.name;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        return {
          ...app,
          status: 'Submitted' as ApplicationStatus,
          submittedAt: formattedDate,
        };
      })
    );

    // Notify centre of new application submission
    const notif: InAppNotification = {
      id: `notif-centre-sub-${Date.now()}`,
      recipientRole: 'centre',
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
    const childName = targetApp ? targetApp.childName : PARENT_PROFILE.childName;
    const parentName = targetApp ? targetApp.parentName : PARENT_PROFILE.name;

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return { ...app, status: 'Accepted' as ApplicationStatus };
        }
        // Only withdraw Priya's other applications
        if (
          withdrawOthers &&
          app.parentName === PARENT_PROFILE.name &&
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
    const childName = targetApp ? targetApp.childName : PARENT_PROFILE.childName;
    const parentName = targetApp ? targetApp.parentName : PARENT_PROFILE.name;

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
    const parentName = targetApp ? targetApp.parentName : PARENT_PROFILE.name;

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
          waitlistReportedBy: isWaitlisted ? singleCentre.name : app.waitlistReportedBy,
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
      parentMessage = `${singleCentre.name} updated your position to ${waitlistPosition} on ${formattedDate}`;
      centreMessage = `Updated ${childName}'s position to ${waitlistPosition} on ${formattedDate}`;
      notifType = 'position';
    } else if (newStatus === 'Offer') {
      parentMessage = `${singleCentre.name} made an offer for ${childName} on ${formattedDate}`;
      centreMessage = `Made an offer to ${parentName} for ${childName} on ${formattedDate}`;
      notifType = 'offer';
    } else {
      parentMessage = `${singleCentre.name} updated your application status to ${newStatus} on ${formattedDate}`;
      centreMessage = `Updated ${childName}'s status to ${newStatus} on ${formattedDate}`;
      notifType = 'status';
    }

    const newNotifs: InAppNotification[] = [
      {
        id: `notif-parent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: 'parent',
        message: parentMessage,
        timestamp: formattedDate,
        createdAt: Date.now(),
        read: false,
        type: notifType,
      },
      {
        id: `notif-centre-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipientRole: 'centre',
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
  const handleUpdateCentreRequirements = (centreId: string, newRequirements: string[]) => {
    setCentres((prev) =>
      prev.map((c) => {
        if (c.id !== centreId) return c;
        return {
          ...c,
          requirements: newRequirements,
        };
      })
    );
  };

  // Open conversation from Parent View (clicking centre)
  const handleParentOpenConversation = (centreId: string) => {
    // Find or locate Anya's application for this centre
    let app = applications.find(
      (a) => a.centreId === centreId && a.parentName === PARENT_PROFILE.name
    );
    if (!app) {
      app = {
        id: `app-${centreId}-anya-inquiry`,
        centreId,
        parentName: PARENT_PROFILE.name,
        childName: PARENT_PROFILE.childName,
        childAgeMonths: PARENT_PROFILE.childAgeMonths,
        careType: PARENT_PROFILE.careType,
        preferredStartDate: PARENT_PROFILE.preferredStartDate,
        status: 'Draft',
        completedRequirements: [],
      };
    }
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
    const childKey = app ? app.childName.toLowerCase() : 'anya';
    const convKey = `${activeChatModal.centreId}-${childKey}`;

    const formattedTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: currentRole,
      senderName: currentRole === 'parent' ? PARENT_PROFILE.name : centre.name,
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
    ? applications.find((a) => a.id === activeChatModal.applicationId) || {
        id: activeChatModal.applicationId,
        centreId: activeChatModal.centreId,
        parentName: PARENT_PROFILE.name,
        childName: PARENT_PROFILE.childName,
        childAgeMonths: PARENT_PROFILE.childAgeMonths,
        careType: PARENT_PROFILE.careType,
        preferredStartDate: PARENT_PROFILE.preferredStartDate,
        status: 'Draft' as ApplicationStatus,
        completedRequirements: [],
      }
    : null;

  const activeChatCentre = activeChatModal
    ? centres.find((c) => c.id === activeChatModal.centreId) || singleCentre
    : singleCentre;

  const activeConvKey =
    activeChatModal && activeChatApp
      ? `${activeChatModal.centreId}-${activeChatApp.childName.toLowerCase()}`
      : 'c1-anya';

  const activeMessages = conversations[activeConvKey] || [];

  // Filter Priya's applications for the Parent view
  const priyaApplications = applications.filter(
    (a) => a.parentName === PARENT_PROFILE.name
  );

  // Tab badge counts
  const draftCount = priyaApplications.filter((a) => a.status === 'Draft').length;
  const offerCount = priyaApplications.filter((a) => a.status === 'Offer').length;

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
    <div className="min-h-screen bg-[#F7F8F7] text-stone-900 font-sans flex flex-col antialiased">
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
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isTrustPageOpen ? (
          <TrustTransparencyPage
            onBack={() => setIsTrustPageOpen(false)}
            centres={centres}
          />
        ) : currentRole === 'parent' ? (
          /* Parents see ONLY the parent screens */
          <div className="space-y-6">
            {/* Parent View Tab Bar (3 tabs: Find, Apply, Track) */}
            <nav className="flex border-b border-stone-200 gap-2 sm:gap-6 text-sm font-medium">
              <button
                type="button"
                onClick={() => setParentTab('find')}
                className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all ${
                  parentTab === 'find'
                    ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>1. Find Centres</span>
              </button>

              <button
                type="button"
                onClick={() => setParentTab('apply')}
                className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all relative ${
                  parentTab === 'apply'
                    ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <FileEdit className="w-4 h-4" />
                <span>2. Apply</span>
                {draftCount > 0 && (
                  <span className="ml-1 text-[11px] font-semibold bg-stone-100 text-[#0B4A52] px-1.5 py-0.2 rounded-full border border-stone-200">
                    {draftCount} in progress
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setParentTab('track')}
                className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all relative ${
                  parentTab === 'track'
                    ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>3. Track Status</span>
                {offerCount > 0 && (
                  <span className="ml-1 text-[11px] font-bold bg-[#F9BE2F] text-[#451A03] px-2 py-0.5 rounded-full border border-[#E0A31A] animate-bounce shadow-2xs">
                    Offer Available!
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setParentTab('help')}
                className={`pb-3 px-2 flex items-center gap-2 border-b-2 transition-all relative ${
                  parentTab === 'help'
                    ? 'border-[#45B5A5] text-[#0B4A52] font-bold'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>4. Help & Support</span>
              </button>
            </nav>

            {/* Parent Tabs Content */}
            {parentTab === 'find' && (
              <FindTab
                centres={centres}
                applications={priyaApplications}
                parentProfile={activeParentProfile}
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
          <CentreDashboard
            singleCentre={activeSingleCentre}
            applications={applications}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCentreRequirements={handleUpdateCentreRequirements}
            onOpenConversation={handleCentreOpenConversation}
            requests={supportRequests}
            onSubmitRequest={handleCreateSupportRequest}
            onAdvanceConcernStep={handleAdvanceConcernStep}
          />
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
      <footer className="border-t border-stone-200 bg-white py-6 mt-12 text-center text-xs text-stone-500">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>CareQ • Simplified Ontario Child Care Intake & Central Waitlist Management</p>
          <div className="flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setIsTrustPageOpen(true)}
              className="text-[#0B4A52] hover:text-[#45B5A5] font-semibold underline transition-colors cursor-pointer"
            >
              Trust and transparency
            </button>
            <span className="text-stone-300">|</span>
            <button
              type="button"
              onClick={handleLogout}
              className="text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              title="Log out of session"
            >
              Log out
            </button>
          </div>
        </div>
      </footer>

      {/* Ask CareQ Assistant Floating on every screen */}
      <AskCareQAssistant centres={centres} />
    </div>
  );
}
