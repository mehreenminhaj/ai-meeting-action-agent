import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Workspace,
  WorkspaceMember,
  Meeting,
  MeetingAnalysis,
  MeetingDecision,
  ActionItem,
  ActionApproval,
  IntegrationConnection,
  ExternalTask,
  ExecutionRecord,
  NotificationRecord,
  AuditLog,
} from '../types.js';
import { hashPassword } from '../config.js';
import { SAMPLE_TRANSCRIPTS } from './sampleTranscripts.js';

interface DatabaseSchema {
  users: User[];
  workspaces: Workspace[];
  workspaceMembers: WorkspaceMember[];
  meetings: Meeting[];
  meetingAnalyses: MeetingAnalysis[];
  meetingDecisions: MeetingDecision[];
  actionItems: ActionItem[];
  actionApprovals: ActionApproval[];
  integrationConnections: IntegrationConnection[];
  externalTasks: ExternalTask[];
  executionRecords: ExecutionRecord[];
  notifications: NotificationRecord[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'meetingmind.json');

class DatabaseService {
  private data: DatabaseSchema;
  private isPersisting = false;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing database file, seeding initial database:', e);
    }

    return this.createSeedData();
  }

  public save(): void {
    if (this.isPersisting) return;
    this.isPersisting = true;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error persisting database:', e);
    } finally {
      this.isPersisting = false;
    }
  }

  private createSeedData(): DatabaseSchema {
    const now = new Date().toISOString();
    const defaultPasswordHash = hashPassword('demo12345');

    const defaultUser: User = {
      id: 'usr-sarah-chen',
      name: 'Sarah Chen',
      email: 'sarah.chen@acme.io',
      passwordHash: defaultPasswordHash,
      role: 'owner',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      createdAt: now,
      updatedAt: now,
      accountStatus: 'active',
    };

    const alexUser: User = {
      id: 'usr-alex-rivera',
      name: 'Alex Rivera',
      email: 'alex.rivera@acme.io',
      passwordHash: defaultPasswordHash,
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: now,
      updatedAt: now,
      accountStatus: 'active',
    };

    const workspaceId = 'ws-acme-cloud';
    const workspace: Workspace = {
      id: workspaceId,
      name: 'Acme Cloud Platform',
      timezone: 'America/Los_Angeles',
      settings: {
        defaultDestination: 'jira',
        autoExecuteApproved: true,
        requireTwoPersonApproval: false,
        slackNotificationsEnabled: true,
        emailNotificationsEnabled: true,
        aiProvider: 'gemini',
        modelName: 'gemini-3.8-flash',
      },
      createdAt: now,
    };

    const members: WorkspaceMember[] = [
      {
        id: 'mem-sarah-chen',
        workspaceId,
        userId: 'usr-sarah-chen',
        displayName: 'Sarah Chen',
        email: 'sarah.chen@acme.io',
        role: 'owner',
        aliases: ['Sarah', 'Sarah C.', 'schen'],
        activeStatus: 'active',
        notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
        joinedAt: now,
      },
      {
        id: 'mem-alex-rivera',
        workspaceId,
        userId: 'usr-alex-rivera',
        displayName: 'Alex Rivera',
        email: 'alex.rivera@acme.io',
        role: 'admin',
        aliases: ['Alex', 'Alex R.', 'arivera'],
        activeStatus: 'active',
        notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
        joinedAt: now,
      },
      {
        id: 'mem-priya-patel',
        workspaceId,
        userId: 'usr-priya-patel',
        displayName: 'Priya Patel',
        email: 'priya.patel@acme.io',
        role: 'member',
        aliases: ['Priya', 'Priya P.', 'ppatel'],
        activeStatus: 'active',
        notificationPreferences: { emailOnAssignment: true, emailOnSummary: true, slackNotifications: true },
        joinedAt: now,
      },
      {
        id: 'mem-marcus-vance',
        workspaceId,
        userId: 'usr-marcus-vance',
        displayName: 'Marcus Vance',
        email: 'marcus.vance@acme.io',
        role: 'member',
        aliases: ['Marcus', 'mvance', 'Marc'],
        activeStatus: 'active',
        notificationPreferences: { emailOnAssignment: true, emailOnSummary: false, slackNotifications: true },
        joinedAt: now,
      },
      {
        id: 'mem-elena-rostova',
        workspaceId,
        userId: 'usr-elena-rostova',
        displayName: 'Elena Rostova',
        email: 'elena.rostova@acme.io',
        role: 'member',
        aliases: ['Elena', 'erostova'],
        activeStatus: 'active',
        notificationPreferences: { emailOnAssignment: true, emailOnSummary: false, slackNotifications: false },
        joinedAt: now,
      },
    ];

    const meeting1Id = 'mtg-sprint-42-sync';
    const sample1 = SAMPLE_TRANSCRIPTS[0];
    const meeting1: Meeting = {
      id: meeting1Id,
      workspaceId,
      createdBy: 'usr-sarah-chen',
      title: sample1.title,
      meetingDate: sample1.meetingDate,
      timezone: 'America/Los_Angeles',
      sourceType: 'sample',
      transcriptText: sample1.transcriptText,
      transcriptHash: crypto.createHash('sha256').update(sample1.transcriptText).digest('hex'),
      processingStatus: 'needs_review',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };

    const analysis1: MeetingAnalysis = {
      id: 'anl-sprint-42',
      meetingId: meeting1Id,
      version: 1,
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      promptVersion: 'v1.4.0-structured',
      summary: {
        executiveSummary:
          'Engineering alignment on Sprint 42 cloud migration. The Postgres 16 cutover was approved for October 10th at 02:00 UTC with replica lag verified at 42ms. Ed25519 asymmetric auth migration faces a dependency blocker in the billing service. Synthetic failover testing and customer maintenance advisories were assigned.',
        mainDiscussionPoints: [
          'Postgres 16 shadow traffic testing passed with 42ms peak replica lag.',
          'Cross-region network partition split-brain risk flagged by Marcus Vance.',
          'Ed25519 auth token migration blocked on Node 16 upgrade in payments microservice.',
          'Quarantining 3 flaky Cypress checkout tests to prevent pipeline false positives.',
        ],
        confirmedDecisionsCount: 1,
        actionItemsCount: 5,
        blockersCount: 1,
        upcomingDeadlines: ['2026-10-07 (Elena - Flaky tests)', '2026-10-08 (Alex - Failover drill)', '2026-10-09 (Priya - Support notice)'],
        suggestedFollowUpAgenda: [
          'Review synthetic failover drill results and updated runbook',
          'Payments squad Node runtime upgrade timeline',
          'S3 Glacier vs GCP Coldline SOC2 archival policy',
        ],
      },
      blockersAndRisks: [
        {
          description: 'Billing microservice is pinned to Node 16, lacking native Ed25519 crypto primitives required for token upgrade before Nov 1st.',
          affectedItem: 'Ed25519 authentication migration',
          responsiblePerson: 'Marcus Vance / Dave (Payments)',
          proposedNextStep: 'Sync with payments squad lead to schedule runtime bump.',
          requiresEscalation: true,
        },
      ],
      openQuestions: [
        {
          question: 'Who owns the SOC2 audit log archival policy between S3 Glacier and GCP Coldline?',
          context: 'Tabled until next Monday security sync.',
          personResponsible: 'Unassigned',
        },
      ],
      structuredOutput: {},
      validationStatus: 'valid',
      validationWarnings: [],
      processingDurationMs: 1420,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    };

    const decisions1: MeetingDecision[] = [
      {
        id: 'dec-1',
        meetingId: meeting1Id,
        analysisVersion: 1,
        statement: 'Proceed with production database cutover during the maintenance window on Saturday, October 10th at 02:00 UTC.',
        context: 'Shadow traffic test on staging verified replica lag peaked at 42ms, within 100ms SLO.',
        evidence: {
          quote: 'Sarah Chen: Decision confirmed: we will proceed with the production database cutover during the maintenance window on Saturday, October 10th at 02:00 UTC.',
          speaker: 'Sarah Chen',
          timestamp: '00:01:55',
        },
        decisionStatus: 'confirmed',
        confidence: 'high',
        decisionMaker: 'Sarah Chen',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'dec-2',
        meetingId: meeting1Id,
        analysisVersion: 1,
        statement: 'Do not block release on flaky non-critical Cypress checkout tests; isolate them instead.',
        context: 'Cypress test suite had intermittent flake in staging.',
        evidence: {
          quote: 'Sarah Chen: No, we won\'t block deployment on flaky non-critical tests, but Elena, please quarantine the three flaky tests and log Jira bugs for each by Wednesday, October 7th.',
          speaker: 'Sarah Chen',
          timestamp: '00:05:25',
        },
        decisionStatus: 'confirmed',
        confidence: 'high',
        decisionMaker: 'Sarah Chen',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ];

    const actions1: ActionItem[] = [
      {
        id: 'act-1',
        meetingId: meeting1Id,
        analysisVersion: 1,
        title: 'Conduct synthetic failover drill in staging and document recovery runbook',
        description: 'Simulate cross-region us-east to us-west network partition to verify split-brain protection and measure automated failover recovery time.',
        ownerMemberId: 'mem-alex-rivera',
        statedOwner: 'Alex Rivera',
        ownerConfidence: 'high',
        dueDate: '2026-10-08',
        deadlineBasis: 'explicit',
        deadlineReasoning: 'Explicitly stated "by this Thursday, October 8th".',
        priority: 'high',
        status: 'pending_review',
        evidence: {
          quote: 'Alex Rivera: I will conduct a synthetic failover drill in staging by this Thursday, October 8th, and document the recovery runbook.',
          speaker: 'Alex Rivera',
          timestamp: '00:01:30',
        },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'jira',
        targetDestinations: ['jira'],
        acceptanceCriteria: [
          'Synthetic split-brain simulated in staging environment',
          'Failover time measured and logged under 90s',
          'Step-by-step recovery runbook committed to docs repo',
        ],
        executionEligibility: true,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'act-2',
        meetingId: meeting1Id,
        analysisVersion: 1,
        title: 'Publish customer support maintenance notice for October 10th cutover',
        description: 'Coordinate with customer support and draft public notification for 15-minute scheduled database maintenance window.',
        ownerMemberId: 'mem-priya-patel',
        statedOwner: 'Priya Patel',
        ownerConfidence: 'high',
        dueDate: '2026-10-09',
        deadlineBasis: 'explicit',
        deadlineReasoning: 'Explicitly requested "by Friday, October 9th at 5 PM".',
        priority: 'high',
        status: 'approved',
        evidence: {
          quote: 'Sarah Chen: Priya, can you coordinate with the customer support team and publish the maintenance notice by Friday, October 9th at 5 PM?',
          speaker: 'Sarah Chen / Priya Patel',
          timestamp: '00:02:35',
        },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'notion',
        targetDestinations: ['notion'],
        acceptanceCriteria: [
          'Draft advisory approved by engineering lead',
          'Shared in #announcements and customer help center',
        ],
        executionEligibility: true,
        approvedVersion: 1,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'act-3',
        meetingId: meeting1Id,
        analysisVersion: 1,
        title: 'Identify Node 16 upgrade blockers with payments team for Ed25519 support',
        description: 'Sync with Dave on payments squad to unblock billing service runtime upgrade before HMAC token expiration on Nov 1st.',
        ownerMemberId: 'mem-marcus-vance',
        statedOwner: 'Marcus Vance',
        ownerConfidence: 'high',
        dueDate: '2026-10-06',
        deadlineBasis: 'inferred',
        deadlineReasoning: 'Stated "sync today" and "estimate from Dave by tomorrow afternoon".',
        priority: 'high',
        status: 'pending_review',
        evidence: {
          quote: 'Sarah Chen: Marcus, can you sync with Dave on the payments team today to identify the upgrade blockers? Marcus Vance: Will do. I\'ll get an estimate from Dave by tomorrow afternoon.',
          speaker: 'Sarah Chen & Marcus Vance',
          timestamp: '00:04:20',
        },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'both',
        targetDestinations: ['jira', 'notion'],
        acceptanceCriteria: [
          'Detailed list of Node 16 deprecated dependencies compiled',
          'Engineering timeline committed by payments team',
        ],
        executionEligibility: true,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'act-4',
        meetingId: meeting1Id,
        analysisVersion: 1,
        title: 'Quarantine flaky Cypress checkout tests and create Jira bug reports',
        description: 'Isolate 3 intermittent checkout test cases from mandatory PR blocking build and log tracking tickets.',
        ownerMemberId: 'mem-elena-rostova',
        statedOwner: 'Elena Rostova',
        ownerConfidence: 'high',
        dueDate: '2026-10-07',
        deadlineBasis: 'explicit',
        deadlineReasoning: 'Explicit deadline stated "by Wednesday, October 7th".',
        priority: 'medium',
        status: 'pending_review',
        evidence: {
          quote: 'Sarah Chen: Elena, please quarantine the three flaky tests and log Jira bugs for each by Wednesday, October 7th.',
          speaker: 'Sarah Chen',
          timestamp: '00:05:25',
        },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'jira',
        targetDestinations: ['jira'],
        acceptanceCriteria: [
          'PR merged tagging flaky tests with @quarantine tag',
          '3 Jira tickets created linked to QA epic',
        ],
        executionEligibility: true,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'act-5',
        meetingId: meeting1Id,
        analysisVersion: 1,
        title: 'Define SOC2 audit log archival retention policy (S3 Glacier vs GCP Coldline)',
        description: 'Evaluate cost, retrieval time, and compliance requirements between AWS S3 Glacier and Google Cloud Storage Coldline.',
        ownerMemberId: null,
        statedOwner: 'Unassigned',
        ownerConfidence: 'low',
        dueDate: '2026-10-12',
        deadlineBasis: 'inferred',
        deadlineReasoning: 'Deferred to next Monday security sync.',
        priority: 'low',
        status: 'flagged_clarification',
        evidence: {
          quote: 'Sarah Chen: One open question remaining: who is owning the SOC2 audit log archival policy? We talked about S3 Glacier vs GCP Coldline. Let\'s table that for next Monday\'s security sync.',
          speaker: 'Sarah Chen',
          timestamp: '00:06:05',
        },
        confidence: 'medium',
        ambiguityFlags: ['Missing clear task owner', 'Storage provider decision unresolved'],
        clarificationQuestions: [
          'Which engineer will draft the storage cost & compliance comparison?',
          'Is the target retention period 1 year or 7 years under SOC2 Type II?',
        ],
        suggestedDestination: 'notion',
        targetDestinations: ['notion'],
        acceptanceCriteria: ['Cost and retrieval SLA matrix completed'],
        executionEligibility: false,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
    ];

    const integrations: IntegrationConnection[] = [
      {
        id: 'int-jira',
        workspaceId,
        provider: 'jira',
        configuration: {
          siteUrl: 'https://acme-cloud.atlassian.net',
          projectKey: 'PROJ',
          issueType: 'Task',
          autoAssigneeMatch: true,
        },
        connectionStatus: 'connected',
        lastVerifiedAt: now,
        isMockMode: true,
      },
      {
        id: 'int-notion',
        workspaceId,
        provider: 'notion',
        configuration: {
          databaseId: '7f9184ab204b4c73a628c68832e8b109',
          databaseName: 'Engineering Sprint Backlog',
          titleProperty: 'Name',
          statusProperty: 'Status',
          assigneeProperty: 'Assignee',
          priorityProperty: 'Priority',
          dueDateProperty: 'Due Date',
        },
        connectionStatus: 'connected',
        lastVerifiedAt: now,
        isMockMode: true,
      },
      {
        id: 'int-slack',
        workspaceId,
        provider: 'slack',
        configuration: {
          channelName: '#eng-actions',
          notifyOnApproval: true,
          notifyOnCompletion: true,
        },
        connectionStatus: 'connected',
        lastVerifiedAt: now,
        isMockMode: true,
      },
      {
        id: 'int-email',
        workspaceId,
        provider: 'email',
        configuration: {
          fromEmail: 'notifications@meetingmind.ai',
          replyTo: 'sarah.chen@acme.io',
          dailySummaryEnabled: true,
        },
        connectionStatus: 'connected',
        lastVerifiedAt: now,
        isMockMode: true,
      },
    ];

    // Seed an already-executed external task for act-2
    const externalTasks: ExternalTask[] = [
      {
        id: 'ext-notion-1',
        actionItemId: 'act-2',
        workspaceId,
        provider: 'notion',
        externalId: 'notion-page-99182a',
        externalKey: 'NOTION-PAGE-99182',
        externalUrl: 'https://notion.so/acme-workspace/99182a',
        externalStatus: 'In Progress',
        idempotencyKey: 'idem-act-2-notion-v1',
        lastSyncedAt: now,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    const executionRecords: ExecutionRecord[] = [
      {
        id: 'exec-1',
        workspaceId,
        actionItemId: 'act-2',
        provider: 'notion',
        executionStatus: 'succeeded',
        idempotencyKey: 'idem-act-2-notion-v1',
        attempts: 1,
        requestSummary: {
          title: 'Publish customer support maintenance notice for October 10th cutover',
          databaseId: '7f9184ab204b4c73a628c68832e8b109',
          destination: 'notion',
        },
        responseSummary: {
          pageId: 'notion-page-99182a',
          url: 'https://notion.so/acme-workspace/99182a',
        },
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3600000 + 420).toISOString(),
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'aud-1',
        workspaceId,
        actorId: 'usr-sarah-chen',
        actorName: 'Sarah Chen',
        action: 'meeting.create',
        entityType: 'meeting',
        entityId: meeting1Id,
        safeMetadata: { title: meeting1.title, sourceType: 'sample' },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'aud-2',
        workspaceId,
        actorId: 'system',
        actorName: 'MeetingMind Analysis Engine',
        action: 'analysis.completed',
        entityType: 'analysis',
        entityId: 'anl-sprint-42',
        safeMetadata: { durationMs: 1420, actionsFound: 5, decisionsFound: 2 },
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'aud-3',
        workspaceId,
        actorId: 'usr-sarah-chen',
        actorName: 'Sarah Chen',
        action: 'action.approve',
        entityType: 'action_item',
        entityId: 'act-2',
        safeMetadata: { title: 'Publish customer support maintenance notice' },
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      },
      {
        id: 'aud-4',
        workspaceId,
        actorId: 'system',
        actorName: 'Execution Dispatcher',
        action: 'integration.task_created',
        entityType: 'external_task',
        entityId: 'ext-notion-1',
        safeMetadata: { provider: 'notion', key: 'NOTION-PAGE-99182' },
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    const notifications: NotificationRecord[] = [
      {
        id: 'notif-1',
        workspaceId,
        actionItemId: 'act-2',
        meetingId: meeting1Id,
        recipient: 'priya.patel@acme.io',
        channel: 'email',
        templateKey: 'task_assigned',
        subject: '[Action Assigned] Publish customer support maintenance notice for October 10th cutover',
        deliveryStatus: 'sent',
        providerMessageId: 'msg-mailtrap-77291',
        idempotencyKey: 'idem-notif-act-2-priya',
        sentAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ];

    return {
      users: [defaultUser, alexUser],
      workspaces: [workspace],
      workspaceMembers: members,
      meetings: [meeting1],
      meetingAnalyses: [analysis1],
      meetingDecisions: decisions1,
      actionItems: actions1,
      actionApprovals: [],
      integrationConnections: integrations,
      externalTasks,
      executionRecords,
      notifications,
      auditLogs,
    };
  }

  // Generic Getters
  public getUsers(): User[] {
    return this.data.users;
  }
  public getWorkspaces(): Workspace[] {
    return this.data.workspaces;
  }
  public getWorkspace(id: string): Workspace | undefined {
    return this.data.workspaces.find((w) => w.id === id);
  }
  public getWorkspaceMembers(workspaceId: string): WorkspaceMember[] {
    return this.data.workspaceMembers.filter((m) => m.workspaceId === workspaceId);
  }
  public getMeetings(workspaceId: string): Meeting[] {
    return this.data.meetings
      .filter((m) => m.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  public getMeeting(id: string): Meeting | undefined {
    return this.data.meetings.find((m) => m.id === id);
  }
  public getMeetingAnalysis(meetingId: string): MeetingAnalysis | undefined {
    return this.data.meetingAnalyses
      .filter((a) => a.meetingId === meetingId)
      .sort((a, b) => b.version - a.version)[0];
  }
  public getMeetingDecisions(meetingId: string): MeetingDecision[] {
    return this.data.meetingDecisions.filter((d) => d.meetingId === meetingId);
  }
  public getActionItems(meetingId?: string, workspaceId?: string): ActionItem[] {
    if (meetingId) {
      return this.data.actionItems.filter((a) => a.meetingId === meetingId);
    }
    if (workspaceId) {
      const meetingIds = new Set(this.data.meetings.filter((m) => m.workspaceId === workspaceId).map((m) => m.id));
      return this.data.actionItems.filter((a) => meetingIds.has(a.meetingId));
    }
    return this.data.actionItems;
  }
  public getActionItem(id: string): ActionItem | undefined {
    return this.data.actionItems.find((a) => a.id === id);
  }
  public getIntegrations(workspaceId: string): IntegrationConnection[] {
    return this.data.integrationConnections.filter((i) => i.workspaceId === workspaceId);
  }
  public getIntegration(workspaceId: string, provider: string): IntegrationConnection | undefined {
    return this.data.integrationConnections.find(
      (i) => i.workspaceId === workspaceId && i.provider === provider
    );
  }
  public getExternalTasks(actionItemId?: string, workspaceId?: string): ExternalTask[] {
    if (actionItemId) {
      return this.data.externalTasks.filter((e) => e.actionItemId === actionItemId);
    }
    if (workspaceId) {
      return this.data.externalTasks.filter((e) => e.workspaceId === workspaceId);
    }
    return this.data.externalTasks;
  }
  public getExecutionRecords(workspaceId: string): ExecutionRecord[] {
    return this.data.executionRecords
      .filter((e) => e.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
  public getNotifications(workspaceId: string): NotificationRecord[] {
    return this.data.notifications.filter((n) => n.workspaceId === workspaceId);
  }
  public getAuditLogs(workspaceId: string): AuditLog[] {
    return this.data.auditLogs
      .filter((a) => a.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Mutations
  public addUser(user: User): void {
    this.data.users.push(user);
    this.save();
  }
  public addWorkspace(workspace: Workspace): void {
    this.data.workspaces.push(workspace);
    this.save();
  }
  public updateWorkspace(id: string, updates: Partial<Workspace>): Workspace | undefined {
    const ws = this.data.workspaces.find((w) => w.id === id);
    if (!ws) return undefined;
    Object.assign(ws, updates);
    this.save();
    return ws;
  }
  public addWorkspaceMember(member: WorkspaceMember): void {
    this.data.workspaceMembers.push(member);
    this.save();
  }
  public addMeeting(meeting: Meeting): void {
    this.data.meetings.push(meeting);
    this.save();
  }
  public updateMeeting(id: string, updates: Partial<Meeting>): Meeting | undefined {
    const mtg = this.data.meetings.find((m) => m.id === id);
    if (!mtg) return undefined;
    Object.assign(mtg, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return mtg;
  }
  public deleteMeeting(id: string): boolean {
    const index = this.data.meetings.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.data.meetings.splice(index, 1);
    this.data.meetingAnalyses = this.data.meetingAnalyses.filter((a) => a.meetingId !== id);
    this.data.meetingDecisions = this.data.meetingDecisions.filter((d) => d.meetingId !== id);
    this.data.actionItems = this.data.actionItems.filter((a) => a.meetingId !== id);
    this.save();
    return true;
  }
  public addMeetingAnalysis(analysis: MeetingAnalysis): void {
    this.data.meetingAnalyses.push(analysis);
    this.save();
  }
  public addMeetingDecision(decision: MeetingDecision): void {
    this.data.meetingDecisions.push(decision);
    this.save();
  }
  public updateMeetingDecision(id: string, updates: Partial<MeetingDecision>): MeetingDecision | undefined {
    const dec = this.data.meetingDecisions.find((d) => d.id === id);
    if (!dec) return undefined;
    Object.assign(dec, updates);
    this.save();
    return dec;
  }
  public addActionItem(action: ActionItem): void {
    this.data.actionItems.push(action);
    this.save();
  }
  public updateActionItem(id: string, updates: Partial<ActionItem>): ActionItem | undefined {
    const act = this.data.actionItems.find((a) => a.id === id);
    if (!act) return undefined;
    // If the approved payload was edited, invalidate the prior approval
    if (
      act.status === 'approved' &&
      updates.status !== 'approved' &&
      updates.status !== 'rejected' &&
      (updates.title !== undefined ||
        updates.description !== undefined ||
        updates.dueDate !== undefined ||
        updates.ownerMemberId !== undefined ||
        updates.priority !== undefined ||
        updates.targetDestinations !== undefined)
    ) {
      act.status = 'pending_review';
      act.approvedVersion = null;
    }
    Object.assign(act, updates, { updatedAt: new Date().toISOString() });
    this.save();
    return act;
  }
  public addActionApproval(approval: ActionApproval): void {
    this.data.actionApprovals.push(approval);
    this.save();
  }
  public saveIntegration(integration: IntegrationConnection): void {
    const idx = this.data.integrationConnections.findIndex(
      (i) => i.workspaceId === integration.workspaceId && i.provider === integration.provider
    );
    if (idx >= 0) {
      this.data.integrationConnections[idx] = integration;
    } else {
      this.data.integrationConnections.push(integration);
    }
    this.save();
  }
  public addExternalTask(task: ExternalTask): void {
    this.data.externalTasks.push(task);
    this.save();
  }
  public addExecutionRecord(record: ExecutionRecord): void {
    this.data.executionRecords.push(record);
    this.save();
  }
  public updateExecutionRecord(id: string, updates: Partial<ExecutionRecord>): ExecutionRecord | undefined {
    const rec = this.data.executionRecords.find((r) => r.id === id);
    if (!rec) return undefined;
    Object.assign(rec, updates);
    this.save();
    return rec;
  }
  public addNotification(record: NotificationRecord): void {
    this.data.notifications.push(record);
    this.save();
  }
  public updateNotification(id: string, updates: Partial<NotificationRecord>): NotificationRecord | undefined {
    const rec = this.data.notifications.find((n) => n.id === id);
    if (!rec) return undefined;
    Object.assign(rec, updates);
    this.save();
    return rec;
  }
  public logAudit(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...log,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.push(newLog);
    this.save();
    return newLog;
  }

  // Reset demo data helper
  public resetToDemo(): void {
    this.data = this.createSeedData();
    this.save();
  }
}

export const db = new DatabaseService();
