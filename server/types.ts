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
export type ExecutionStatus =
  | 'pending_approval'
  | 'approved'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'partially_succeeded'
  | 'failed'
  | 'retry_scheduled'
  | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  accountStatus: 'active' | 'suspended';
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
    aiProvider: 'gemini' | 'mock' | 'openai';
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

export interface Meeting {
  id: string;
  workspaceId: string;
  createdBy: string;
  title: string;
  meetingDate?: string; // YYYY-MM-DD
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

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  workspaceMemberId?: string | null;
  displayName: string;
  email?: string | null;
  resolutionStatus: 'matched' | 'unresolved' | 'guest';
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

export interface ActionItem {
  id: string;
  meetingId: string;
  analysisVersion: number;
  title: string;
  description: string;
  ownerMemberId?: string | null;
  statedOwner?: string;
  ownerConfidence?: ConfidenceLevel;
  dueDate?: string | null; // YYYY-MM-DD
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
  createdAt: string;
  updatedAt: string;
}

export interface ActionApproval {
  id: string;
  actionItemId: string;
  reviewerId: string;
  reviewerName: string;
  approvedPayload: Partial<ActionItem>;
  itemVersion: number;
  decision: 'approved' | 'rejected' | 'reopened';
  reason?: string;
  createdAt: string;
}

export interface IntegrationConnection {
  id: string;
  workspaceId: string;
  provider: 'jira' | 'notion' | 'slack' | 'email';
  configuration: Record<string, any>;
  encryptedCredentials?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  lastVerifiedAt?: string;
  lastError?: string;
  isMockMode?: boolean;
}

export interface ExternalTask {
  id: string;
  actionItemId: string;
  workspaceId: string;
  provider: 'jira' | 'notion';
  externalId: string;
  externalKey?: string; // e.g. "PROJ-104"
  externalUrl: string;
  externalStatus: string;
  idempotencyKey: string;
  lastSyncedAt: string;
  createdAt: string;
}

export interface ExecutionRecord {
  id: string;
  workspaceId: string;
  actionItemId: string;
  provider: 'jira' | 'notion' | 'email' | 'slack' | 'n8n';
  executionStatus: ExecutionStatus;
  idempotencyKey: string;
  attempts: number;
  requestSummary: Record<string, any>;
  responseSummary?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
}

export interface NotificationRecord {
  id: string;
  workspaceId: string;
  actionItemId?: string;
  meetingId?: string;
  recipient: string;
  channel: 'email' | 'slack';
  templateKey: string;
  subject?: string;
  deliveryStatus: 'queued' | 'sent' | 'failed';
  providerMessageId?: string;
  idempotencyKey: string;
  errorMessage?: string;
  sentAt?: string;
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
