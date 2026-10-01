import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';
import { jiraAdapter } from '../services/integrations/jiraAdapter.js';
import { notionAdapter } from '../services/integrations/notionAdapter.js';
import { encryptSecret } from '../config.js';
import { IntegrationConnection } from '../types.js';

export const integrationRouter = Router();

// GET /api/v1/integrations
integrationRouter.get('/', requireAuth, (req, res) => {
  const workspaceId = (req.query.workspaceId as string) || db.getWorkspaces()[0]?.id;
  const list = db.getIntegrations(workspaceId);

  // Strip sensitive credentials before returning
  const safeList = list.map((i) => ({
    id: i.id,
    workspaceId: i.workspaceId,
    provider: i.provider,
    configuration: i.configuration,
    connectionStatus: i.connectionStatus,
    lastVerifiedAt: i.lastVerifiedAt,
    lastError: i.lastError,
    isMockMode: i.isMockMode,
  }));

  return res.json({ integrations: safeList });
});

// POST /api/v1/integrations/jira/connect
integrationRouter.post('/jira/connect', requireAuth, async (req: any, res) => {
  const { workspaceId, siteUrl, userEmail, apiToken, projectKey, issueType, isMockMode } = req.body;
  const wsId = workspaceId || db.getWorkspaces()[0]?.id;

  // Test connection
  const testRes = await jiraAdapter.testConnection({
    siteUrl,
    userEmail,
    apiToken,
    projectKey,
    isMockMode: isMockMode ?? true,
  });

  const connection: IntegrationConnection = {
    id: `int-jira-${wsId}`,
    workspaceId: wsId,
    provider: 'jira',
    configuration: {
      siteUrl,
      userEmail,
      projectKey: projectKey || 'PROJ',
      issueType: issueType || 'Task',
    },
    encryptedCredentials: apiToken ? encryptSecret(apiToken) : undefined,
    connectionStatus: testRes.success ? 'connected' : 'error',
    lastVerifiedAt: new Date().toISOString(),
    lastError: testRes.success ? undefined : testRes.message,
    isMockMode: isMockMode ?? true,
  };

  db.saveIntegration(connection);

  return res.json({
    success: testRes.success,
    message: testRes.message,
    connection: {
      ...connection,
      encryptedCredentials: undefined,
    },
  });
});

// POST /api/v1/integrations/jira/test
integrationRouter.post('/jira/test', requireAuth, async (req, res) => {
  const { siteUrl, userEmail, apiToken, projectKey, isMockMode } = req.body;
  const result = await jiraAdapter.testConnection({
    siteUrl,
    userEmail,
    apiToken,
    projectKey,
    isMockMode: isMockMode ?? true,
  });
  return res.json(result);
});

// POST /api/v1/integrations/notion/connect
integrationRouter.post('/notion/connect', requireAuth, async (req: any, res) => {
  const { workspaceId, apiKey, databaseId, titleProperty, statusProperty, priorityProperty, dueDateProperty, isMockMode } = req.body;
  const wsId = workspaceId || db.getWorkspaces()[0]?.id;

  const testRes = await notionAdapter.testConnection({
    apiKey,
    databaseId,
    isMockMode: isMockMode ?? true,
  });

  const connection: IntegrationConnection = {
    id: `int-notion-${wsId}`,
    workspaceId: wsId,
    provider: 'notion',
    configuration: {
      databaseId,
      databaseName: testRes.databaseTitle || 'Notion Database',
      titleProperty: titleProperty || 'Name',
      statusProperty: statusProperty || 'Status',
      priorityProperty: priorityProperty || 'Priority',
      dueDateProperty: dueDateProperty || 'Due Date',
    },
    encryptedCredentials: apiKey ? encryptSecret(apiKey) : undefined,
    connectionStatus: testRes.success ? 'connected' : 'error',
    lastVerifiedAt: new Date().toISOString(),
    lastError: testRes.success ? undefined : testRes.message,
    isMockMode: isMockMode ?? true,
  };

  db.saveIntegration(connection);

  return res.json({
    success: testRes.success,
    message: testRes.message,
    connection: {
      ...connection,
      encryptedCredentials: undefined,
    },
  });
});

// POST /api/v1/integrations/notion/test
integrationRouter.post('/notion/test', requireAuth, async (req, res) => {
  const { apiKey, databaseId, isMockMode } = req.body;
  const result = await notionAdapter.testConnection({
    apiKey,
    databaseId,
    isMockMode: isMockMode ?? true,
  });
  return res.json(result);
});

// PATCH /api/v1/integrations/:provider
integrationRouter.patch('/:provider', requireAuth, (req, res) => {
  const workspaceId = req.body.workspaceId || db.getWorkspaces()[0]?.id;
  const existing = db.getIntegration(workspaceId, req.params.provider);
  if (!existing) return res.status(404).json({ error: 'Integration not found' });

  if (req.body.configuration) {
    existing.configuration = { ...existing.configuration, ...req.body.configuration };
  }
  if (req.body.isMockMode !== undefined) {
    existing.isMockMode = req.body.isMockMode;
  }
  if (req.body.connectionStatus) {
    existing.connectionStatus = req.body.connectionStatus;
  }

  db.saveIntegration(existing);
  return res.json({ integration: { ...existing, encryptedCredentials: undefined } });
});
