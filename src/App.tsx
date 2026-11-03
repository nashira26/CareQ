/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  INITIAL_CENTRES,
  INITIAL_APPLICATIONS,
  INITIAL_CONVERSATIONS,
  PARENT_PROFILE,
  Centre,
  Application,
  ApplicationStatus,
  UploadedDocument,
  ChatMessage,
  ConversationsMap,
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { FindTab } from './components/ParentView/FindTab';
import { ApplyTab } from './components/ParentView/ApplyTab';
import { TrackTab } from './components/ParentView/TrackTab';
import { CentreDashboard } from './components/CentreView/CentreDashboard';
import { ConversationModal } from './components/ConversationModal';
import { Search, FileEdit, ListFilter } from 'lucide-react';

export default function App() {
  // Top-level Role: 'parent' | 'centre' (strictly single role, switched ONLY via the demo tab at top)
  const [currentRole, setCurrentRole] = useState<'parent' | 'centre'>('parent');

  // Parent View Tab Switcher: 'find' | 'apply' | 'track'
  const [parentTab, setParentTab] = useState<'find' | 'apply' | 'track'>('track');

  // In-memory centres state (Riverdale Early Learning Centre is the single centre managed in Centre role)
  const [centres, setCentres] = useState<Centre[]>(INITIAL_CENTRES);
  const singleCentre = centres[0]; // Riverdale Early Learning Centre

  // In-memory application state
  const [applications, setApplications] = useState<Application[]>(INITIAL_APPLICATIONS);

  // In-memory conversations map between centres and parents
  const [conversations, setConversations] = useState<ConversationsMap>(INITIAL_CONVERSATIONS);

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
    // Switch to track tab to see newly submitted application in the queue table
    setParentTab('track');
  };

  // Accept offer and optionally withdraw other applications
  const handleAcceptOffer = (applicationId: string, withdrawOthers: boolean) => {
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
  };

  // Withdraw single application
  const handleWithdrawApplication = (applicationId: string) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id === applicationId) {
          return { ...app, status: 'Withdrawn' as ApplicationStatus };
        }
        return app;
      })
    );
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

    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const isWaitlisted = newStatus === 'Waitlisted';
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
        };
      })
    );
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

  return (
    <div className="min-h-screen bg-[#F7F8F7] text-stone-900 font-sans flex flex-col antialiased">
      {/* Top Navbar with demo role switcher strictly at the top */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={(r) => setCurrentRole(r)}
        parentProfile={PARENT_PROFILE}
        singleCentre={singleCentre}
      />

      {/* Main Container: Strictly one role view visible */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentRole === 'parent' ? (
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
            </nav>

            {/* Parent Tabs Content */}
            {parentTab === 'find' && (
              <FindTab
                centres={centres}
                applications={priyaApplications}
                parentProfile={PARENT_PROFILE}
                onSelectCentre={handleSelectCentre}
                onNavigateToApply={() => setParentTab('apply')}
                onOpenConversation={handleParentOpenConversation}
              />
            )}

            {parentTab === 'apply' && (
              <ApplyTab
                centres={centres}
                applications={priyaApplications}
                parentProfile={PARENT_PROFILE}
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
                parentProfile={PARENT_PROFILE}
                onAcceptOffer={handleAcceptOffer}
                onWithdrawApplication={handleWithdrawApplication}
                onNavigateToApply={() => setParentTab('apply')}
                onNavigateToFind={() => setParentTab('find')}
                onOpenConversation={handleParentOpenConversation}
              />
            )}
          </div>
        ) : (
          /* Single Centre View (Strictly single centre: Riverdale Early Learning Centre) */
          <CentreDashboard
            singleCentre={singleCentre}
            applications={applications}
            onUpdateStatus={handleUpdateStatus}
            onUpdateCentreRequirements={handleUpdateCentreRequirements}
            onOpenConversation={handleCentreOpenConversation}
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

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-12 text-center text-xs text-stone-500">
        <p>CareQ • Simplified Ontario Child Care Intake & Central Waitlist Management</p>
      </footer>
    </div>
  );
}
