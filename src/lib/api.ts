import {
  ActionItem,
  AuditLog,
  DashboardMetrics,
  ExecutionRecord,
  IntegrationConnection,
  Meeting,
  MeetingAnalysis,
  MeetingDecision,
  SampleTranscript,
  User,
  Workspace,
  WorkspaceMember,
} from '../types';

const BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('meetingmind_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as any),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errMessage = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errMessage = data.error;
    } catch {}
    throw new Error(errMessage);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async getMe(): Promise<{ user: User; workspaces: Workspace[]; currentWorkspace: Workspace }> {
    return fetchJson(`${BASE_URL}/auth/me`);
  },

  // Dashboard
  async getDashboardSummary(workspaceId: string): Promise<{ metrics: DashboardMetrics; workspace: Workspace }> {
    return fetchJson(`${BASE_URL}/dashboard/summary?workspaceId=${workspaceId}`);
  },
  async getRecentMeetings(workspaceId: string): Promise<{ recentMeetings: any[] }> {
    return fetchJson(`${BASE_URL}/dashboard/recent-meetings?workspaceId=${workspaceId}`);
  },
  async getPendingApprovals(workspaceId: string): Promise<{ pendingApprovals: any[] }> {
    return fetchJson(`${BASE_URL}/dashboard/pending-approvals?workspaceId=${workspaceId}`);
  },
  async getUpcomingDeadlines(workspaceId: string): Promise<{ deadlines: any[] }> {
    return fetchJson(`${BASE_URL}/dashboard/upcoming-deadlines?workspaceId=${workspaceId}`);
  },
  async getExecutionActivity(workspaceId: string): Promise<{ executions: ExecutionRecord[]; auditLogs: AuditLog[] }> {
    return fetchJson(`${BASE_URL}/dashboard/execution-activity?workspaceId=${workspaceId}`);
  },

  // Meetings
  async getMeetings(workspaceId: string): Promise<{ meetings: Meeting[] }> {
    return fetchJson(`${BASE_URL}/workspaces/${workspaceId}/meetings`);
  },
  async getSampleTranscripts(): Promise<{ samples: SampleTranscript[] }> {
    return fetchJson(`${BASE_URL}/sample-transcripts`);
  },
  async createMeeting(
    workspaceId: string,
    payload: {
      title: string;
      meetingDate?: string;
      timezone?: string;
      sourceType?: string;
      sourceUrl?: string;
      transcriptText: string;
      autoProcess?: boolean;
    }
  ): Promise<{ meeting: Meeting; analysis?: MeetingAnalysis; decisions?: MeetingDecision[]; actionItems?: ActionItem[] }> {
    return fetchJson(`${BASE_URL}/workspaces/${workspaceId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async getMeeting(meetingId: string): Promise<{
    meeting: Meeting;
    analysis?: MeetingAnalysis;
    decisions: MeetingDecision[];
    actions: ActionItem[];
  }> {
    return fetchJson(`${BASE_URL}/meetings/${meetingId}`);
  },
  async deleteMeeting(meetingId: string): Promise<{ success: boolean }> {
    return fetchJson(`${BASE_URL}/meetings/${meetingId}`, { method: 'DELETE' });
  },
  async processMeeting(meetingId: string): Promise<{
    success: boolean;
    meeting: Meeting;
    analysis: MeetingAnalysis;
    decisions: MeetingDecision[];
    actionItems: ActionItem[];
  }> {
    return fetchJson(`${BASE_URL}/meetings/${meetingId}/process`, { method: 'POST' });
  },

  // Actions
  async getActions(workspaceId: string, meetingId?: string): Promise<{ actions: ActionItem[] }> {
    const url = meetingId
      ? `${BASE_URL}/actions?workspaceId=${workspaceId}&meetingId=${meetingId}`
      : `${BASE_URL}/actions?workspaceId=${workspaceId}`;
    return fetchJson(url);
  },
  async updateAction(actionId: string, updates: Partial<ActionItem>): Promise<{ action: ActionItem }> {
    return fetchJson(`${BASE_URL}/actions/${actionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },
  async approveAction(actionId: string): Promise<{ action: ActionItem; message: string; executionResult?: any }> {
    return fetchJson(`${BASE_URL}/actions/${actionId}/approve`, { method: 'POST' });
  },
  async rejectAction(actionId: string, reason?: string): Promise<{ action: ActionItem; message: string }> {
    return fetchJson(`${BASE_URL}/actions/${actionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
  async requestClarification(actionId: string, question: string): Promise<{ action: ActionItem }> {
    return fetchJson(`${BASE_URL}/actions/${actionId}/request-clarification`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },
  async executeAction(actionId: string): Promise<any> {
    return fetchJson(`${BASE_URL}/actions/${actionId}/execute`, { method: 'POST' });
  },
  async retryAction(actionId: string, provider?: 'jira' | 'notion'): Promise<any> {
    return fetchJson(`${BASE_URL}/actions/${actionId}/retry`, {
      method: 'POST',
      body: JSON.stringify({ provider }),
    });
  },
  async bulkApprove(actionIds: string[]): Promise<{ approvedIds: string[]; count: number }> {
    return fetchJson(`${BASE_URL}/actions/bulk-approve`, {
      method: 'POST',
      body: JSON.stringify({ actionIds }),
    });
  },

  // Workspaces & Members
  async getMembers(workspaceId: string): Promise<{ members: WorkspaceMember[] }> {
    return fetchJson(`${BASE_URL}/workspaces/${workspaceId}/members`);
  },
  async addMember(
    workspaceId: string,
    payload: { displayName: string; email: string; role?: string; aliases?: string[] }
  ): Promise<{ member: WorkspaceMember }> {
    return fetchJson(`${BASE_URL}/workspaces/${workspaceId}/members`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<{ workspace: Workspace }> {
    return fetchJson(`${BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Integrations
  async getIntegrations(workspaceId: string): Promise<{ integrations: IntegrationConnection[] }> {
    return fetchJson(`${BASE_URL}/integrations?workspaceId=${workspaceId}`);
  },
  async connectJira(payload: any): Promise<any> {
    return fetchJson(`${BASE_URL}/integrations/jira/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async testJira(payload: any): Promise<any> {
    return fetchJson(`${BASE_URL}/integrations/jira/test`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async connectNotion(payload: any): Promise<any> {
    return fetchJson(`${BASE_URL}/integrations/notion/connect`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async testNotion(payload: any): Promise<any> {
    return fetchJson(`${BASE_URL}/integrations/notion/test`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async updateIntegration(provider: string, payload: any): Promise<any> {
    return fetchJson(`${BASE_URL}/integrations/${provider}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // Automation
  async getWorkflows(): Promise<{ workflows: any[]; n8nConfig: any }> {
    return fetchJson(`${BASE_URL}/automation/workflows`);
  },
  async triggerTestWorkflow(workflowId: string): Promise<any> {
    return fetchJson(`${BASE_URL}/automation/n8n/trigger-test`, {
      method: 'POST',
      body: JSON.stringify({ workflowId }),
    });
  },

  // Test Runner
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
    results: Array<{ suite: string; name: string; passed: boolean; durationMs: number; error?: string }>;
  }> {
    return fetchJson(`${BASE_URL}/tests/run`, { method: 'POST' });
  },
};
