import { CONFIG } from '../../config.js';
import { ActionItem, Workspace } from '../../types.js';

export interface JiraCreateIssueResult {
  issueId: string;
  issueKey: string;
  issueUrl: string;
  isMock: boolean;
}

export class JiraAdapter {
  public async testConnection(config: {
    siteUrl: string;
    userEmail?: string;
    apiToken?: string;
    projectKey?: string;
    isMockMode?: boolean;
  }): Promise<{ success: boolean; message: string; user?: string }> {
    if (config.isMockMode || !config.apiToken || !config.siteUrl) {
      return {
        success: true,
        message: 'Connected successfully to Jira Cloud Mock Adapter (Test Project: PROJ)',
        user: config.userEmail || 'demo-admin@jira-mock.internal',
      };
    }

    try {
      const cleanUrl = config.siteUrl.replace(/\/+$/, '');
      const auth = Buffer.from(`${config.userEmail}:${config.apiToken}`).toString('base64');
      const res = await fetch(`${cleanUrl}/rest/api/3/myself`, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: `Jira authentication failed (${res.status}): ${errorText.slice(0, 150)}`,
        };
      }

      const userData = (await res.json()) as { displayName?: string; emailAddress?: string };
      return {
        success: true,
        message: `Successfully connected to Jira Cloud as ${userData.displayName || userData.emailAddress}`,
        user: userData.displayName || userData.emailAddress,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Network error connecting to Jira: ${e.message}`,
      };
    }
  }

  public async createIssue(params: {
    action: ActionItem;
    workspace: Workspace;
    meetingTitle: string;
    jiraConfig: {
      siteUrl: string;
      userEmail?: string;
      apiToken?: string;
      projectKey: string;
      issueType?: string;
      isMockMode?: boolean;
    };
  }): Promise<JiraCreateIssueResult> {
    const { action, jiraConfig } = params;

    // Use Mock adapter if configured or in mock mode
    if (jiraConfig.isMockMode || !jiraConfig.apiToken || !jiraConfig.siteUrl) {
      const mockNum = Math.floor(100 + Math.random() * 900);
      const mockKey = `${jiraConfig.projectKey || 'PROJ'}-${mockNum}`;
      return {
        issueId: `jira-mock-${mockNum}`,
        issueKey: mockKey,
        issueUrl: `https://${(jiraConfig.siteUrl || 'acme.atlassian.net').replace(/^https?:\/\//, '')}/browse/${mockKey}`,
        isMock: true,
      };
    }

    const cleanUrl = jiraConfig.siteUrl.replace(/\/+$/, '');
    const auth = Buffer.from(`${jiraConfig.userEmail}:${jiraConfig.apiToken}`).toString('base64');

    // Build Atlassian Document Format (ADF) description
    const adfContent: any[] = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: action.description }],
      },
    ];

    if (action.evidence.quote) {
      adfContent.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `Transcript Evidence: "${action.evidence.quote}" (${action.evidence.speaker || 'Unknown'}, ${action.evidence.timestamp || 'N/A'})`,
                marks: [{ type: 'em' }],
              },
            ],
          },
        ],
      });
    }

    if (action.acceptanceCriteria.length > 0) {
      adfContent.push({
        type: 'heading',
        attrs: { level: 4 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }],
      });
      adfContent.push({
        type: 'bulletList',
        content: action.acceptanceCriteria.map((crit) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: crit }],
            },
          ],
        })),
      });
    }

    adfContent.push({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: `Extracted by MeetingMind AI from: ${params.meetingTitle}`,
          marks: [{ type: 'em' }],
        },
      ],
    });

    const payload: any = {
      fields: {
        project: { key: jiraConfig.projectKey || 'PROJ' },
        summary: action.title.slice(0, 255),
        issuetype: { name: jiraConfig.issueType || 'Task' },
        description: {
          type: 'doc',
          version: 1,
          content: adfContent,
        },
      },
    };

    if (action.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(action.dueDate)) {
      payload.fields.duedate = action.dueDate;
    }

    // Map priority
    const priorityMap: Record<string, string> = {
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };
    if (priorityMap[action.priority]) {
      payload.fields.priority = { name: priorityMap[action.priority] };
    }

    const res = await fetch(`${cleanUrl}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jira API error (${res.status}): ${errText}`);
    }

    const created = (await res.json()) as { id: string; key: string; self: string };
    return {
      issueId: created.id,
      issueKey: created.key,
      issueUrl: `${cleanUrl}/browse/${created.key}`,
      isMock: false,
    };
  }
}

export const jiraAdapter = new JiraAdapter();
