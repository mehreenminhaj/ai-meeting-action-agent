export type UserRole = 'owner' | 'admin' | 'member';
export type MeetingStatus =
  | 'draft'
  | 'queued'
  | 'processing'
  | 'needs_review'
  | 'awaiting_approval'
  | 'approved'
  | 'partially_executed'
  | 'completed'
  | 'failed'
  | 'archived';

export type DecisionStatus = 'confirmed' | 'proposed' | 'deferred' | 'unresolved';
export type ActionItemStatus = 'pending_review' | 'approved' | 'rejected' | 'flagged_clarification';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type DeadlineBasis = 'explicit' | 'inferred' | 'unknown';
export type DestinationType = 'jira' | 'notion' | 'both';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  name: string;
  timezone: string;
  settings: {
    defaultDestination: DestinationType;
    autoExecuteApproved: boolean;
    requireTwoPersonApproval: boolean;
    slackNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    aiProvider: string;
    modelName: string;
  };
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  displayName: string;
  email: string;
  role: UserRole;
  aliases: string[];
  activeStatus: 'active' | 'invited' | 'deactivated';
  notificationPreferences: {
    emailOnAssignment: boolean;
    emailOnSummary: boolean;
    slackNotifications: boolean;
  };
  joinedAt: string;
}

export interface TranscriptEvidence {
  quote: string;
  speaker?: string;
  timestamp?: string;
  locationHint?: string;
}

export interface ExternalTask {
  id: string;
  actionItemId: string;
  workspaceId: string;
  provider: 'jira' | 'notion';
  externalId: string;
  externalKey?: string;
  externalUrl: string;
  externalStatus: string;
  idempotencyKey: string;
  lastSyncedAt: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  analysisVersion: number;
  title: string;
  description: string;
  ownerMemberId?: string | null;
  statedOwner?: string;
  ownerConfidence?: ConfidenceLevel;
  dueDate?: string | null;
  deadlineBasis: DeadlineBasis;
  deadlineReasoning?: string;
  priority: PriorityLevel;
  status: ActionItemStatus;
  evidence: TranscriptEvidence;
  confidence: ConfidenceLevel;
  ambiguityFlags: string[];
  clarificationQuestions: string[];
  suggestedDestination: DestinationType;
  targetDestinations: ('jira' | 'notion')[];
  acceptanceCriteria: string[];
  executionEligibility: boolean;
  approvedVersion?: number | null;
  externalTasks?: ExternalTask[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingDecision {
  id: string;
  meetingId: string;
  analysisVersion: number;
  statement: string;
  context: string;
  evidence: TranscriptEvidence;
  decisionStatus: DecisionStatus;
  confidence: ConfidenceLevel;
  decisionMaker?: string;
  relatedActionIds?: string[];
  clarificationNeeded?: string;
  createdAt: string;
}

export interface MeetingAnalysis {
  id: string;
  meetingId: string;
  version: number;
  provider: string;
  model: string;
  promptVersion: string;
  summary: {
    executiveSummary: string;
    mainDiscussionPoints: string[];
    confirmedDecisionsCount: number;
    actionItemsCount: number;
    blockersCount: number;
    upcomingDeadlines: string[];
    suggestedFollowUpAgenda: string[];
  };
  blockersAndRisks: Array<{
    description: string;
    affectedItem?: string;
    responsiblePerson?: string;
    proposedNextStep?: string;
    requiresEscalation: boolean;
  }>;
  openQuestions: Array<{
    question: string;
    context?: string;
    personResponsible?: string;
  }>;
  structuredOutput: Record<string, any>;
  validationStatus: 'valid' | 'has_warnings' | 'invalid';
  validationWarnings: string[];
  processingDurationMs: number;
  createdAt: string;
}

export interface Meeting {
  id: string;
  workspaceId: string;
  createdBy: string;
  title: string;
  meetingDate?: string;
  timezone: string;
  sourceType: 'paste' | 'upload' | 'sample';
  sourceUrl?: string;
  transcriptText: string;
  transcriptHash: string;
  processingStatus: MeetingStatus;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  provider: 'jira' | 'notion' | 'slack' | 'email';
  configuration: Record<string, any>;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastVerifiedAt?: string;
  lastError?: string;
  isMockMode?: boolean;
}

export interface ExecutionRecord {
  id: string;
  workspaceId: string;
  actionItemId: string;
  provider: 'jira' | 'notion' | 'email' | 'slack' | 'n8n';
  executionStatus: string;
  idempotencyKey: string;
  attempts: number;
  requestSummary: Record<string, any>;
  responseSummary?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorId?: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  safeMetadata: Record<string, any>;
  createdAt: string;
}

export interface SampleTranscript {
  id: string;
  title: string;
  meetingDate: string;
  sourceType: 'sample';
  description: string;
  transcriptText: string;
}

export interface DashboardMetrics {
  meetingsProcessed: number;
  actionItemsExtracted: number;
  pendingApprovals: number;
  tasksCreated: number;
  failedExecutions: number;
  overdueActions: number;
  upcomingDeadlines: number;
  jiraTasksCount: number;
  notionTasksCount: number;
}
