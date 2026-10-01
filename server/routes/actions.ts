import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';
import { executionEngine } from '../services/executionEngine.js';

export const actionRouter = Router();

// GET /api/v1/actions (workspace scoped)
actionRouter.get('/', requireAuth, (req, res) => {
  const workspaceId = req.query.workspaceId as string;
  const meetingId = req.query.meetingId as string;
  const actions = db.getActionItems(meetingId, workspaceId);
  const externalTasks = db.getExternalTasks(undefined, workspaceId);

  // Attach external tasks for each action item
  const enriched = actions.map((act) => ({
    ...act,
    externalTasks: externalTasks.filter((t) => t.actionItemId === act.id),
  }));

  return res.json({ actions: enriched });
});

// GET /api/v1/actions/:action_id
actionRouter.get('/:action_id', requireAuth, (req, res) => {
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });
  const externalTasks = db.getExternalTasks(action.id);
  return res.json({ action: { ...action, externalTasks } });
});

// PATCH /api/v1/actions/:action_id
actionRouter.patch('/:action_id', requireAuth, (req: any, res) => {
  const { title, description, ownerMemberId, dueDate, priority, targetDestinations, acceptanceCriteria } = req.body;
  const existing = db.getActionItem(req.params.action_id);
  if (!existing) return res.status(404).json({ error: 'Action item not found' });

  const meeting = db.getMeeting(existing.meetingId);
  const workspaceId = meeting?.workspaceId || db.getWorkspaces()[0]?.id;

  // If ownerMemberId is being updated, verify member exists in workspace
  let statedOwner = existing.statedOwner;
  if (ownerMemberId !== undefined) {
    if (ownerMemberId) {
      const member = db.getWorkspaceMembers(workspaceId).find((m) => m.id === ownerMemberId);
      if (member) {
        statedOwner = member.displayName;
      }
    } else {
      statedOwner = 'Unassigned';
    }
  }

  const updated = db.updateActionItem(req.params.action_id, {
    title: title !== undefined ? title : existing.title,
    description: description !== undefined ? description : existing.description,
    ownerMemberId: ownerMemberId !== undefined ? ownerMemberId : existing.ownerMemberId,
    statedOwner,
    dueDate: dueDate !== undefined ? dueDate : existing.dueDate,
    priority: priority !== undefined ? priority : existing.priority,
    targetDestinations: targetDestinations !== undefined ? targetDestinations : existing.targetDestinations,
    acceptanceCriteria: acceptanceCriteria !== undefined ? acceptanceCriteria : existing.acceptanceCriteria,
    executionEligibility: Boolean(ownerMemberId !== undefined ? ownerMemberId : existing.ownerMemberId),
  });

  db.logAudit({
    workspaceId,
    actorId: req.user.id,
    actorName: req.user.name,
    action: 'action.update',
    entityType: 'action_item',
    entityId: req.params.action_id,
    safeMetadata: { updates: req.body },
  });

  return res.json({ action: updated });
});

// POST /api/v1/actions/:action_id/approve
actionRouter.post('/:action_id/approve', requireAuth, async (req: any, res) => {
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });

  const meeting = db.getMeeting(action.meetingId);
  const workspaceId = meeting?.workspaceId || db.getWorkspaces()[0]?.id;
  const workspace = db.getWorkspace(workspaceId);

  // Update status to approved
  const updated = db.updateActionItem(action.id, {
    status: 'approved',
    approvedVersion: action.analysisVersion,
  });

  // Record approval
  db.addActionApproval({
    id: `appr-${Date.now()}`,
    actionItemId: action.id,
    reviewerId: req.user.id,
    reviewerName: req.user.name,
    approvedPayload: { ...action },
    itemVersion: action.analysisVersion,
    decision: 'approved',
    createdAt: new Date().toISOString(),
  });

  db.logAudit({
    workspaceId,
    actorId: req.user.id,
    actorName: req.user.name,
    action: 'action.approve',
    entityType: 'action_item',
    entityId: action.id,
    safeMetadata: { version: action.analysisVersion },
  });

  // Auto-execute if workspace setting enables it
  let executionResult = null;
  if (workspace?.settings.autoExecuteApproved && action.ownerMemberId) {
    try {
      executionResult = await executionEngine.executeActionItem({
        actionItemId: action.id,
        workspaceId,
        actorId: req.user.id,
        actorName: req.user.name,
      });
    } catch (e: any) {
      console.warn('Auto-execution non-fatal failure:', e.message);
    }
  }

  const externalTasks = db.getExternalTasks(action.id);
  return res.json({
    action: { ...updated, externalTasks },
    executionResult,
    message: 'Action item approved successfully',
  });
});

// POST /api/v1/actions/:action_id/reject
actionRouter.post('/:action_id/reject', requireAuth, (req: any, res) => {
  const { reason } = req.body;
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });

  const meeting = db.getMeeting(action.meetingId);
  const workspaceId = meeting?.workspaceId || db.getWorkspaces()[0]?.id;

  const updated = db.updateActionItem(action.id, {
    status: 'rejected',
  });

  db.addActionApproval({
    id: `appr-${Date.now()}`,
    actionItemId: action.id,
    reviewerId: req.user.id,
    reviewerName: req.user.name,
    approvedPayload: {},
    itemVersion: action.analysisVersion,
    decision: 'rejected',
    reason: reason || 'Rejected by reviewer',
    createdAt: new Date().toISOString(),
  });

  db.logAudit({
    workspaceId,
    actorId: req.user.id,
    actorName: req.user.name,
    action: 'action.reject',
    entityType: 'action_item',
    entityId: action.id,
    safeMetadata: { reason },
  });

  return res.json({ action: updated, message: 'Action item marked rejected' });
});

// POST /api/v1/actions/:action_id/request-clarification
actionRouter.post('/:action_id/request-clarification', requireAuth, (req: any, res) => {
  const { question } = req.body;
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });

  const existingQuestions = action.clarificationQuestions || [];
  if (question && !existingQuestions.includes(question)) {
    existingQuestions.push(question);
  }

  const updated = db.updateActionItem(action.id, {
    status: 'flagged_clarification',
    clarificationQuestions: existingQuestions,
  });

  return res.json({ action: updated });
});

// POST /api/v1/actions/:action_id/execute
actionRouter.post('/:action_id/execute', requireAuth, async (req: any, res) => {
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });

  const meeting = db.getMeeting(action.meetingId);
  const workspaceId = meeting?.workspaceId || db.getWorkspaces()[0]?.id;

  try {
    const result = await executionEngine.executeActionItem({
      actionItemId: action.id,
      workspaceId,
      actorId: req.user.id,
      actorName: req.user.name,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/actions/:action_id/retry
actionRouter.post('/:action_id/retry', requireAuth, async (req: any, res) => {
  const action = db.getActionItem(req.params.action_id);
  if (!action) return res.status(404).json({ error: 'Action item not found' });

  const meeting = db.getMeeting(action.meetingId);
  const workspaceId = meeting?.workspaceId || db.getWorkspaces()[0]?.id;
  const forceProvider = req.body.provider as 'jira' | 'notion' | undefined;

  try {
    const result = await executionEngine.executeActionItem({
      actionItemId: action.id,
      workspaceId,
      actorId: req.user.id,
      actorName: req.user.name,
      forceRetryProvider: forceProvider,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/v1/actions/bulk-approve
actionRouter.post('/bulk-approve', requireAuth, async (req: any, res) => {
  const { actionIds } = req.body;
  if (!Array.isArray(actionIds) || actionIds.length === 0) {
    return res.status(400).json({ error: 'Array of actionIds is required' });
  }

  const results: any[] = [];
  for (const id of actionIds) {
    const action = db.getActionItem(id);
    if (!action) continue;

    // Enforce eligibility: Must have owner to be bulk approved safely
    if (!action.ownerMemberId) {
      continue;
    }

    db.updateActionItem(id, {
      status: 'approved',
      approvedVersion: action.analysisVersion,
    });

    db.addActionApproval({
      id: `appr-${Date.now()}-${id}`,
      actionItemId: id,
      reviewerId: req.user.id,
      reviewerName: req.user.name,
      approvedPayload: { ...action },
      itemVersion: action.analysisVersion,
      decision: 'approved',
      createdAt: new Date().toISOString(),
    });

    results.push(id);
  }

  return res.json({ approvedIds: results, count: results.length });
});
