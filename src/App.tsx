import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { MeetingsView } from './components/meetings/MeetingsView';
import { MeetingDetailView } from './components/meetings/MeetingDetailView';
import { ApprovalsView } from './components/approvals/ApprovalsView';
import { TasksView } from './components/tasks/TasksView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { AutomationView } from './components/automation/AutomationView';
import { TestRunnerView } from './components/tests/TestRunnerView';
import { SettingsView } from './components/settings/SettingsView';
import { MeetingIngestModal } from './components/meetings/MeetingIngestModal';
import { api } from './lib/api';
import {
  ActionItem,
  AuditLog,
  DashboardMetrics,
  ExecutionRecord,
  IntegrationConnection,
  Meeting,
  User,
  Workspace,
  WorkspaceMember,
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [highlightActionId, setHighlightActionId] = useState<string | undefined>(undefined);
  const [isIngestOpen, setIsIngestOpen] = useState(false);

  // Core Data
  const [user, setUser] = useState<User | undefined>(undefined);
  const [workspace, setWorkspace] = useState<Workspace | undefined>(undefined);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [executionActivity, setExecutionActivity] = useState<{
    executions: ExecutionRecord[];
    auditLogs: AuditLog[];
  }>({ executions: [], auditLogs: [] });

  const [loading, setLoading] = useState(true);

  const refreshAllData = useCallback(async () => {
    try {
      const meRes = await api.getMe();
      setUser(meRes.user);
      const ws = meRes.currentWorkspace;
      setWorkspace(ws);

      if (ws) {
        const [dashRes, meetRes, actRes, memRes, intRes, recMeetRes, pendRes, deadRes, execRes] =
          await Promise.all([
            api.getDashboardSummary(ws.id),
            api.getMeetings(ws.id),
            api.getActions(ws.id),
            api.getMembers(ws.id),
            api.getIntegrations(ws.id),
            api.getRecentMeetings(ws.id),
            api.getPendingApprovals(ws.id),
            api.getUpcomingDeadlines(ws.id),
            api.getExecutionActivity(ws.id),
          ]);

        setMetrics(dashRes.metrics);
        setMeetings(meetRes.meetings);
        setActions(actRes.actions);
        setMembers(memRes.members);
        setIntegrations(intRes.integrations);
        setRecentMeetings(recMeetRes.recentMeetings);
        setPendingApprovals(pendRes.pendingApprovals);
        setUpcomingDeadlines(deadRes.deadlines);
        setExecutionActivity(execRes);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    setSelectedMeetingId(null);
    setHighlightActionId(undefined);
  };

  const handleNavigate = (tab: string, meta?: any) => {
    setCurrentTab(tab);
    if (tab === 'meetings' && meta?.meetingId) {
      setSelectedMeetingId(meta.meetingId);
    } else {
      setSelectedMeetingId(null);
    }
    if (tab === 'approvals' && meta?.highlightId) {
      setHighlightActionId(meta.highlightId);
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      await api.approveAction(actionId);
      refreshAllData();
    } catch (e: any) {
      alert(`Approval error: ${e.message}`);
    }
  };

  const handleMeetingCreated = (meetingId: string) => {
    refreshAllData();
    setSelectedMeetingId(meetingId);
    setCurrentTab('meetings');
  };

  const pendingApprovalsCount = actions.filter((a) => a.status === 'pending_review').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800">Initializing MeetingMind AI Engine...</p>
          <p className="text-xs text-slate-400">Loading workspace credentials & models</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingApprovalsCount={pendingApprovalsCount}
        user={user}
        workspace={workspace}
        onOpenIngest={() => setIsIngestOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            metrics={metrics}
            recentMeetings={recentMeetings}
            pendingApprovals={pendingApprovals}
            upcomingDeadlines={upcomingDeadlines}
            executionActivity={executionActivity}
            onNavigate={handleNavigate}
            onOpenIngest={() => setIsIngestOpen(true)}
            onApproveAction={handleApproveAction}
          />
        )}

        {currentTab === 'meetings' && !selectedMeetingId && (
          <MeetingsView
            meetings={meetings}
            onSelectMeeting={(id) => setSelectedMeetingId(id)}
            onOpenIngest={() => setIsIngestOpen(true)}
          />
        )}

        {currentTab === 'meetings' && selectedMeetingId && (
          <MeetingDetailView
            meetingId={selectedMeetingId}
            members={members}
            onBack={() => setSelectedMeetingId(null)}
            onNavigateToApprovals={(id) => handleNavigate('approvals', { highlightId: id })}
          />
        )}

        {currentTab === 'approvals' && (
          <ApprovalsView
            actions={actions}
            members={members}
            onRefresh={refreshAllData}
            highlightId={highlightActionId}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            actions={actions}
            members={members}
            onRefresh={refreshAllData}
            onNavigateToApprovals={(id) => handleNavigate('approvals', { highlightId: id })}
          />
        )}

        {currentTab === 'integrations' && (
          <IntegrationsView
            integrations={integrations}
            workspaceId={workspace?.id || 'ws-acme-cloud'}
            onRefresh={refreshAllData}
          />
        )}

        {currentTab === 'automation' && (
          <AutomationView
            executions={executionActivity.executions}
            auditLogs={executionActivity.auditLogs}
            onRefresh={refreshAllData}
          />
        )}

        {currentTab === 'tests' && <TestRunnerView />}

        {currentTab === 'settings' && (
          <SettingsView
            workspace={workspace || null}
            members={members}
            onRefresh={refreshAllData}
          />
        )}
      </main>

      {/* Ingest Modal */}
      {workspace && (
        <MeetingIngestModal
          isOpen={isIngestOpen}
          onClose={() => setIsIngestOpen(false)}
          workspaceId={workspace.id}
          onMeetingCreated={handleMeetingCreated}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>&copy; 2026 MeetingMind AI &bull; Autonomous Meeting-to-Action Engine</p>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Strict Human-in-the-Loop Verification</span>
            <span>&bull;</span>
            <span className="text-slate-400">Jira Cloud & Notion API Idempotency</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
