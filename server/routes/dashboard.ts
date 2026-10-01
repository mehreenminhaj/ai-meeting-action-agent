import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';

export const dashboardRouter = Router();

// GET /api/v1/dashboard/summary
dashboardRouter.get('/summary', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const workspace = db.getWorkspace(workspaceId);
  const meetings = db.getMeetings(workspaceId);
  const actions = db.getActionItems(undefined, workspaceId);
  const externalTasks = db.getExternalTasks(undefined, workspaceId);
  const executionRecords = db.getExecutionRecords(workspaceId);

  // Today in workspace timezone (approximate YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];
  const next7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const meetingsProcessed = meetings.filter((m) => db.getMeetingAnalysis(m.id)).length;
  const actionItemsExtracted = actions.length;
  const pendingApprovals = actions.filter((a) => a.status === 'pending_review').length;
  const tasksCreated = externalTasks.length;
  const failedExecutions = executionRecords.filter((e) => e.executionStatus === 'failed').length;

  const overdueActions = actions.filter(
    (a) => a.dueDate && a.dueDate < today && a.status !== 'approved' && a.status !== 'rejected'
  ).length;

  const upcomingDeadlines = actions.filter(
    (a) => a.dueDate && a.dueDate >= today && a.dueDate <= next7Days && a.status !== 'rejected'
  ).length;

  // Breakdown by destination
  const jiraTasksCount = externalTasks.filter((t) => t.provider === 'jira').length;
  const notionTasksCount = externalTasks.filter((t) => t.provider === 'notion').length;

  return res.json({
    metrics: {
      meetingsProcessed,
      actionItemsExtracted,
      pendingApprovals,
      tasksCreated,
      failedExecutions,
      overdueActions,
      upcomingDeadlines,
      jiraTasksCount,
      notionTasksCount,
    },
    workspace,
  });
});

// GET /api/v1/dashboard/recent-meetings
dashboardRouter.get('/recent-meetings', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const meetings = db.getMeetings(workspaceId).slice(0, 5);

  const enriched = meetings.map((m) => {
    const analysis = db.getMeetingAnalysis(m.id);
    const actions = db.getActionItems(m.id);
    const decisions = db.getMeetingDecisions(m.id);
    return {
      id: m.id,
      title: m.title,
      meetingDate: m.meetingDate,
      processingStatus: m.processingStatus,
      createdAt: m.createdAt,
      sourceType: m.sourceType,
      actionsCount: actions.length,
      decisionsCount: decisions.length,
      hasAnalysis: Boolean(analysis),
      executiveSummary: analysis?.summary.executiveSummary || null,
    };
  });

  return res.json({ recentMeetings: enriched });
});

// GET /api/v1/dashboard/pending-approvals
dashboardRouter.get('/pending-approvals', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const actions = db.getActionItems(undefined, workspaceId);
  const pending = actions.filter((a) => a.status === 'pending_review' || a.status === 'flagged_clarification');

  const members = db.getWorkspaceMembers(workspaceId);
  const enriched = pending.map((a) => {
    const meeting = db.getMeeting(a.meetingId);
    const assignedMember = members.find((m) => m.id === a.ownerMemberId);
    return {
      ...a,
      meetingTitle: meeting?.title || 'Meeting',
      assignedMemberName: assignedMember?.displayName || a.statedOwner || 'Unassigned',
    };
  });

  return res.json({ pendingApprovals: enriched });
});

// GET /api/v1/dashboard/upcoming-deadlines
dashboardRouter.get('/upcoming-deadlines', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const actions = db.getActionItems(undefined, workspaceId);
  const members = db.getWorkspaceMembers(workspaceId);

  const today = new Date().toISOString().split('T')[0];
  const withDeadlines = actions
    .filter((a) => a.dueDate && a.status !== 'rejected')
    .sort((a, b) => (a.dueDate! > b.dueDate! ? 1 : -1))
    .slice(0, 8)
    .map((a) => {
      const meeting = db.getMeeting(a.meetingId);
      const member = members.find((m) => m.id === a.ownerMemberId);
      const isOverdue = a.dueDate! < today && a.status !== 'approved';
      return {
        id: a.id,
        title: a.title,
        dueDate: a.dueDate,
        isOverdue,
        priority: a.priority,
        status: a.status,
        meetingTitle: meeting?.title,
        ownerName: member?.displayName || a.statedOwner || 'Unassigned',
      };
    });

  return res.json({ deadlines: withDeadlines });
});

// GET /api/v1/dashboard/execution-activity
dashboardRouter.get('/execution-activity', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const executions = db.getExecutionRecords(workspaceId).slice(0, 10);
  const auditLogs = db.getAuditLogs(workspaceId).slice(0, 10);

  return res.json({ executions, auditLogs });
});
