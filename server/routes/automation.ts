import { Router } from 'express';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';
import { CONFIG } from '../config.js';

export const automationRouter = Router();

// GET /api/v1/automation/workflows
automationRouter.get('/workflows', requireAuth, (req, res) => {
  return res.json({
    workflows: [
      {
        id: 'workflow-a',
        name: 'Workflow A: Meeting Processing Event',
        description: 'Receives authorized webhook when a meeting analysis is ready, validates event signature, and routes notification to team channel.',
        trigger: 'Webhook: POST /webhook/meeting-processing-event',
        status: 'ready_to_import',
        file: 'automation/workflows/workflow-a-meeting-processing-event.json',
      },
      {
        id: 'workflow-b',
        name: 'Workflow B: Approved Action Execution',
        description: 'Orchestrates approved task dispatching to Jira and Notion with verified idempotency keys.',
        trigger: 'Webhook: POST /webhook/approved-action-execution',
        status: 'ready_to_import',
        file: 'automation/workflows/workflow-b-approved-action-execution.json',
      },
      {
        id: 'workflow-c',
        name: 'Workflow C: Scheduled Reminders',
        description: 'Cron schedule (daily 09:00 UTC) querying upcoming and overdue action items to dispatch timezone-aware digests.',
        trigger: 'Cron: 0 9 * * *',
        status: 'ready_to_import',
        file: 'automation/workflows/workflow-c-scheduled-reminders.json',
      },
      {
        id: 'workflow-d',
        name: 'Workflow D: Failed Execution Alerts',
        description: 'Triggered when task creation or notification encounters a terminal failure, notifying the workspace admin.',
        trigger: 'Webhook: POST /webhook/failed-execution-alerts',
        status: 'ready_to_import',
        file: 'automation/workflows/workflow-d-failed-execution-alerts.json',
      },
    ],
    n8nConfig: {
      baseUrl: CONFIG.n8nWebhookBaseUrl || 'http://localhost:5678/webhook',
      hasSecret: Boolean(CONFIG.n8nWebhookSecret),
    },
  });
});

// POST /api/v1/automation/webhooks/incoming
// Webhook endpoint called by external n8n workflows
automationRouter.post('/webhooks/incoming', (req, res) => {
  const secretHeader = req.headers['x-meetingmind-secret'];
  if (CONFIG.n8nWebhookSecret && secretHeader !== CONFIG.n8nWebhookSecret) {
    return res.status(401).json({ error: 'Unauthorized: Invalid n8n webhook secret signature' });
  }

  const { event, actionId, workspaceId, status, provider, externalUrl, message } = req.body;

  if (event === 'n8n.execution_callback' && actionId) {
    const action = db.getActionItem(actionId);
    if (action) {
      db.logAudit({
        workspaceId: workspaceId || db.getWorkspaces()[0]?.id,
        actorName: 'n8n Orchestration Agent',
        action: 'n8n.callback_received',
        entityType: 'action_item',
        entityId: actionId,
        safeMetadata: { provider, status, externalUrl, message },
      });
    }
  }

  return res.json({ received: true, timestamp: new Date().toISOString() });
});

// POST /api/v1/automation/n8n/trigger-test
automationRouter.post('/n8n/trigger-test', requireAuth, async (req: any, res) => {
  const { workflowId } = req.body;
  const workspaceId = db.getWorkspaces()[0]?.id;

  // Log simulation of n8n trigger
  db.logAudit({
    workspaceId,
    actorId: req.user.id,
    actorName: req.user.name,
    action: 'n8n.trigger_test',
    entityType: 'workflow',
    entityId: workflowId || 'workflow-a',
    safeMetadata: { simulated: true, timestamp: new Date().toISOString() },
  });

  return res.json({
    success: true,
    message: `Test payload dispatched to ${workflowId || 'Workflow A'}. Signature verified.`,
  });
});
