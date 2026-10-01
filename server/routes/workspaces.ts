import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';
import { Workspace, WorkspaceMember } from '../types.js';

export const workspaceRouter = Router();

// GET /api/v1/workspaces
workspaceRouter.get('/', requireAuth, (req: any, res) => {
  const workspaces = db.getWorkspaces();
  return res.json({ workspaces });
});

// POST /api/v1/workspaces
workspaceRouter.post('/', requireAuth, (req: any, res) => {
  const { name, timezone, settings } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  const now = new Date().toISOString();
  const newWorkspace: Workspace = {
    id: `ws-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    timezone: timezone || 'America/Los_Angeles',
    settings: {
      defaultDestination: settings?.defaultDestination || 'jira',
      autoExecuteApproved: settings?.autoExecuteApproved ?? true,
      requireTwoPersonApproval: false,
      slackNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      aiProvider: 'gemini',
      modelName: 'gemini-3.8-flash',
    },
    createdAt: now,
  };

  db.addWorkspace(newWorkspace);

  // Add creator as owner
  db.addWorkspaceMember({
    id: `mem-${req.user.id}-${newWorkspace.id}`,
    workspaceId: newWorkspace.id,
    userId: req.user.id,
    displayName: req.user.name,
    email: req.user.email,
    role: 'owner',
    aliases: [req.user.name.split(' ')[0]],
    activeStatus: 'active',
    notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
    joinedAt: now,
  });

  return res.status(201).json({ workspace: newWorkspace });
});

// GET /api/v1/workspaces/:workspace_id
workspaceRouter.get('/:workspace_id', requireAuth, (req, res) => {
  const ws = db.getWorkspace(req.params.workspace_id);
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  return res.json({ workspace: ws });
});

// PATCH /api/v1/workspaces/:workspace_id
workspaceRouter.patch('/:workspace_id', requireAuth, (req, res) => {
  const updated = db.updateWorkspace(req.params.workspace_id, req.body);
  if (!updated) return res.status(404).json({ error: 'Workspace not found' });
  return res.json({ workspace: updated });
});

// GET /api/v1/workspaces/:workspace_id/members
workspaceRouter.get('/:workspace_id/members', requireAuth, (req, res) => {
  const members = db.getWorkspaceMembers(req.params.workspace_id);
  return res.json({ members });
});

// POST /api/v1/workspaces/:workspace_id/members
workspaceRouter.post('/:workspace_id/members', requireAuth, (req, res) => {
  const { displayName, email, role, aliases } = req.body;
  if (!displayName || !email) {
    return res.status(400).json({ error: 'Display name and email are required' });
  }

  const existing = db
    .getWorkspaceMembers(req.params.workspace_id)
    .find((m) => m.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'A member with this email already exists in the workspace' });
  }

  const newMember: WorkspaceMember = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId: req.params.workspace_id,
    userId: `usr-${Date.now()}`,
    displayName,
    email: email.toLowerCase(),
    role: role || 'member',
    aliases: aliases || [displayName.split(' ')[0]],
    activeStatus: 'active',
    notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
    joinedAt: new Date().toISOString(),
  };

  db.addWorkspaceMember(newMember);
  return res.status(201).json({ member: newMember });
});
