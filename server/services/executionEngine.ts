import { db } from '../db/database.js';
import {
  ActionItem,
  ExecutionRecord,
  ExternalTask,
  Workspace,
  Meeting,
} from '../types.js';
import { jiraAdapter } from './integrations/jiraAdapter.js';
import { notionAdapter } from './integrations/notionAdapter.js';
import { notificationService } from './integrations/notificationService.js';
import { CONFIG } from '../config.js';

export class ExecutionEngine {
  public async executeActionItem(params: {
    actionItemId: string;
    workspaceId: string;
    actorId: string;
    actorName: string;
    forceRetryProvider?: 'jira' | 'notion';
  }): Promise<{
    success: boolean;
    results: Array<{ provider: 'jira' | 'notion'; success: boolean; externalUrl?: string; error?: string }>;
    externalTasks: ExternalTask[];
  }> {
    const action = db.getActionItem(params.actionItemId);
    if (!action) throw new Error(`Action item not found: ${params.actionItemId}`);

    // Mandatory human approval enforcement
    if (action.status !== 'approved') {
      throw new Error(`Execution rejected: Action item is in '${action.status}' state and must be approved by an authorized user first.`);
    }

    const meeting = db.getMeeting(action.meetingId);
    if (!meeting) throw new Error(`Source meeting not found for action ${action.id}`);

    const workspace = db.getWorkspace(params.workspaceId);
    if (!workspace) throw new Error(`Workspace not found: ${params.workspaceId}`);

    const existingExternalTasks = db.getExternalTasks(action.id);
    const destinations: ('jira' | 'notion')[] =
      action.targetDestinations.length > 0 ? action.targetDestinations : ['jira'];

    const executionResults: Array<{ provider: 'jira' | 'notion'; success: boolean; externalUrl?: string; error?: string }> = [];
    const createdExternalTasks: ExternalTask[] = [];

    for (const provider of destinations) {
      // If forceRetryProvider is specified, only run that one
      if (params.forceRetryProvider && params.forceRetryProvider !== provider) {
        continue;
      }

      // Check idempotency: If this provider already successfully created an external task for this action item, DO NOT RE-CREATE!
      const alreadyDone = existingExternalTasks.find((t) => t.provider === provider);
      if (alreadyDone && !params.forceRetryProvider) {
        executionResults.push({
          provider,
          success: true,
          externalUrl: alreadyDone.externalUrl,
        });
        continue;
      }

      const idempotencyKey = `exec-${action.id}-${provider}-v${action.approvedVersion || 1}`;
      const execRecord: ExecutionRecord = {
        id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: workspace.id,
        actionItemId: action.id,
        provider,
        executionStatus: 'running',
        idempotencyKey,
        attempts: 1,
        requestSummary: {
          title: action.title,
          description: action.description,
          dueDate: action.dueDate,
          priority: action.priority,
          provider,
        },
        startedAt: new Date().toISOString(),
      };
      db.addExecutionRecord(execRecord);

      try {
        if (provider === 'jira') {
          const jiraConfig = db.getIntegration(workspace.id, 'jira')?.configuration || {
            siteUrl: CONFIG.jiraBaseUrl || 'https://acme.atlassian.net',
            userEmail: CONFIG.jiraUserEmail,
            apiToken: CONFIG.jiraApiToken,
            projectKey: CONFIG.jiraDefaultProjectKey || 'PROJ',
            isMockMode: true,
          };

          const jiraRes = await jiraAdapter.createIssue({
            action,
            workspace,
            meetingTitle: meeting.title,
            jiraConfig: {
              siteUrl: jiraConfig.siteUrl,
              userEmail: jiraConfig.userEmail,
              apiToken: jiraConfig.apiToken,
              projectKey: jiraConfig.projectKey || 'PROJ',
              issueType: jiraConfig.issueType || 'Task',
              isMockMode: jiraConfig.isMockMode ?? true,
            },
          });

          const extTask: ExternalTask = {
            id: `ext-jira-${Date.now()}`,
            actionItemId: action.id,
            workspaceId: workspace.id,
            provider: 'jira',
            externalId: jiraRes.issueId,
            externalKey: jiraRes.issueKey,
            externalUrl: jiraRes.issueUrl,
            externalStatus: 'To Do',
            idempotencyKey,
            lastSyncedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          db.addExternalTask(extTask);
          createdExternalTasks.push(extTask);

          db.updateExecutionRecord(execRecord.id, {
            executionStatus: 'succeeded',
            responseSummary: { issueId: jiraRes.issueId, issueKey: jiraRes.issueKey, issueUrl: jiraRes.issueUrl },
            completedAt: new Date().toISOString(),
          });

          executionResults.push({ provider: 'jira', success: true, externalUrl: jiraRes.issueUrl });
        } else if (provider === 'notion') {
          const notionConfig = db.getIntegration(workspace.id, 'notion')?.configuration || {
            apiKey: CONFIG.notionApiKey,
            databaseId: CONFIG.notionDefaultDatabaseId || '7f9184ab204b4c73a628c68832e8b109',
            isMockMode: true,
          };

          const notionRes = await notionAdapter.createPage({
            action,
            workspace,
            meetingTitle: meeting.title,
            notionConfig: {
              apiKey: notionConfig.apiKey,
              databaseId: notionConfig.databaseId || '7f9184ab204b4c73a628c68832e8b109',
              titleProperty: notionConfig.titleProperty || 'Name',
              statusProperty: notionConfig.statusProperty || 'Status',
              priorityProperty: notionConfig.priorityProperty || 'Priority',
              dueDateProperty: notionConfig.dueDateProperty || 'Due Date',
              isMockMode: notionConfig.isMockMode ?? true,
            },
          });

          const extTask: ExternalTask = {
            id: `ext-notion-${Date.now()}`,
            actionItemId: action.id,
            workspaceId: workspace.id,
            provider: 'notion',
            externalId: notionRes.pageId,
            externalKey: `PAGE-${notionRes.pageId.slice(-6).toUpperCase()}`,
            externalUrl: notionRes.pageUrl,
            externalStatus: 'Not Started',
            idempotencyKey,
            lastSyncedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          };
          db.addExternalTask(extTask);
          createdExternalTasks.push(extTask);

          db.updateExecutionRecord(execRecord.id, {
            executionStatus: 'succeeded',
            responseSummary: { pageId: notionRes.pageId, pageUrl: notionRes.pageUrl },
            completedAt: new Date().toISOString(),
          });

          executionResults.push({ provider: 'notion', success: true, externalUrl: notionRes.pageUrl });
        }
      } catch (err: any) {
        db.updateExecutionRecord(execRecord.id, {
          executionStatus: 'failed',
          errorCode: 'PROVIDER_ERROR',
          errorMessage: err.message || 'Unknown integration error',
          completedAt: new Date().toISOString(),
        });

        executionResults.push({ provider, success: false, error: err.message });
      }
    }

    // Determine overall success state
    const anyFailed = executionResults.some((r) => !r.success);
    const anySucceeded = executionResults.some((r) => r.success);

    // Send assignment notification to owner if assigned and at least one destination succeeded
    if (action.ownerMemberId && anySucceeded) {
      const member = db.getWorkspaceMembers(workspace.id).find((m) => m.id === action.ownerMemberId);
      if (member) {
        const allCreated = db.getExternalTasks(action.id);
        await notificationService.sendTaskAssignmentNotification({
          action,
          workspace,
          meeting,
          recipientEmail: member.email,
          recipientName: member.displayName,
          externalLinks: allCreated.map((t) => ({ provider: t.provider, url: t.externalUrl, key: t.externalKey })),
        });
      }
    }

    // Trigger n8n webhook if configured
    if (CONFIG.n8nWebhookBaseUrl) {
      try {
        await fetch(`${CONFIG.n8nWebhookBaseUrl}/approved-action-execution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MeetingMind-Secret': CONFIG.n8nWebhookSecret,
          },
          body: JSON.stringify({
            event: 'action.executed',
            actionId: action.id,
            title: action.title,
            workspaceId: workspace.id,
            results: executionResults,
          }),
        });
      } catch (e) {
        console.warn('n8n webhook dispatch non-fatal failure:', e);
      }
    }

    db.logAudit({
      workspaceId: workspace.id,
      actorId: params.actorId,
      actorName: params.actorName,
      action: 'action.execute',
      entityType: 'action_item',
      entityId: action.id,
      safeMetadata: {
        destinations,
        success: !anyFailed,
        partial: anySucceeded && anyFailed,
        results: executionResults,
      },
    });

    return {
      success: !anyFailed,
      results: executionResults,
      externalTasks: db.getExternalTasks(action.id),
    };
  }
}

export const executionEngine = new ExecutionEngine();
