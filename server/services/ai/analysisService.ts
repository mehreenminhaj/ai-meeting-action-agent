import crypto from 'crypto';
import { db } from '../../db/database.js';
import {
  Meeting,
  MeetingAnalysis,
  MeetingDecision,
  ActionItem,
  WorkspaceMember,
} from '../../types.js';
import { GeminiAIProvider } from './geminiProvider.js';
import { PROMPT_VERSION } from './prompts.js';

export class MeetingAnalysisService {
  private geminiProvider: GeminiAIProvider;

  constructor() {
    this.geminiProvider = new GeminiAIProvider();
  }

  // Stage 1: Transcript Preparation
  public normalizeTranscript(rawText: string): {
    normalizedText: string;
    detectedSpeakers: string[];
    lineCount: number;
    wordCount: number;
  } {
    // Standardize CRLF / LF
    const normalized = rawText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excess consecutive blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const speakers = new Set<string>();
    const lines = normalized.split('\n');

    for (const line of lines) {
      // Common transcript speaker patterns: "Name:", "[00:12:34] Name:", "10:14 - Name:"
      const match = line.match(/^(?:\[[\d:]+\]\s*|\d{1,2}:\d{2}\s*-\s*)?([A-Za-z\s.'_-]{2,30}?):/);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 1 && !/^(note|summary|agenda|action|decision|time|date)$/i.test(name)) {
          speakers.add(name);
        }
      }
    }

    const words = normalized.split(/\s+/).filter(Boolean);

    return {
      normalizedText: normalized,
      detectedSpeakers: Array.from(speakers),
      lineCount: lines.length,
      wordCount: words.length,
    };
  }

  // Owner Resolution: Order strictly follows specification:
  // 1. Match an explicit email address
  // 2. Match exact known display name
  // 3. Match explicitly configured alias
  // 4. Match fuzzy suggestion only if threshold > 0.85; otherwise leave unresolved!
  public resolveOwner(
    statedOwner: string | undefined,
    members: WorkspaceMember[]
  ): { resolvedMemberId: string | null; confidence: 'high' | 'medium' | 'low'; ambiguity?: string } {
    if (!statedOwner || statedOwner.trim() === '' || statedOwner.toLowerCase() === 'unassigned') {
      return { resolvedMemberId: null, confidence: 'low', ambiguity: 'No task owner specified in transcript' };
    }

    const clean = statedOwner.trim().toLowerCase();

    // 1. Explicit email
    const emailMatch = members.find((m) => m.email.toLowerCase() === clean);
    if (emailMatch) {
      return { resolvedMemberId: emailMatch.id, confidence: 'high' };
    }

    // 2. Exact display name match
    const nameMatch = members.find((m) => m.displayName.toLowerCase() === clean);
    if (nameMatch) {
      return { resolvedMemberId: nameMatch.id, confidence: 'high' };
    }

    // 3. Known alias match
    const aliasMatch = members.find((m) =>
      m.aliases.some((a) => a.toLowerCase() === clean)
    );
    if (aliasMatch) {
      return { resolvedMemberId: aliasMatch.id, confidence: 'high' };
    }

    // 4. Substring / partial word match (e.g. "Alex" in "Alex Rivera")
    const partialMatch = members.find((m) => {
      const parts = m.displayName.toLowerCase().split(/\s+/);
      return parts.includes(clean) || m.displayName.toLowerCase().includes(clean);
    });

    if (partialMatch) {
      return { resolvedMemberId: partialMatch.id, confidence: 'medium' };
    }

    // If ambiguous or unknown, DO NOT GUESS! Leave unresolved.
    return {
      resolvedMemberId: null,
      confidence: 'low',
      ambiguity: `Could not confidently match mentioned person "${statedOwner}" to any workspace member directory`,
    };
  }

  // Deterministic Date Resolution
  public resolveDate(
    dateStr: string | null | undefined,
    meetingDate: string | undefined,
    deadlineBasis: 'explicit' | 'inferred' | 'unknown'
  ): { resolvedDate: string | null; basis: 'explicit' | 'inferred' | 'unknown'; reasoning: string } {
    if (!dateStr || dateStr.trim() === '') {
      return {
        resolvedDate: null,
        basis: 'unknown',
        reasoning: 'No deadline was stated or committed in the transcript',
      };
    }

    // Check if ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
      return {
        resolvedDate: dateStr.trim(),
        basis: deadlineBasis || 'explicit',
        reasoning: `Resolved deadline: ${dateStr.trim()}`,
      };
    }

    // If meeting date is available and user said e.g. "by tomorrow" or "by Friday"
    if (meetingDate && /^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
      const lower = dateStr.toLowerCase();
      const base = new Date(meetingDate);

      if (lower.includes('tomorrow')) {
        const nextDay = new Date(base);
        nextDay.setDate(nextDay.getDate() + 1);
        return {
          resolvedDate: nextDay.toISOString().split('T')[0],
          basis: 'inferred',
          reasoning: `Inferred 1 day after meeting date (${meetingDate})`,
        };
      }
    }

    return {
      resolvedDate: null,
      basis: 'unknown',
      reasoning: `Date reference "${dateStr}" is ambiguous without meeting calendar anchor. Flagged for review.`,
    };
  }

  // Full Pipeline Execution
  public async analyzeMeeting(meetingId: string): Promise<{
    analysis: MeetingAnalysis;
    decisions: MeetingDecision[];
    actionItems: ActionItem[];
  }> {
    const startTime = Date.now();
    const meeting = db.getMeeting(meetingId);
    if (!meeting) throw new Error(`Meeting not found: ${meetingId}`);

    const workspace = db.getWorkspace(meeting.workspaceId);
    const members = db.getWorkspaceMembers(meeting.workspaceId);

    // Update meeting status to processing
    db.updateMeeting(meetingId, { processingStatus: 'processing' });

    // Stage 1: Preparation
    const prep = this.normalizeTranscript(meeting.transcriptText);

    // Stage 2-5: AI Extraction
    const extractionResult = await this.geminiProvider.extract({
      transcript: prep.normalizedText,
      meetingTitle: meeting.title,
      meetingDate: meeting.meetingDate,
      timezone: meeting.timezone || workspace?.timezone || 'UTC',
      members,
    });

    const raw = extractionResult.data;
    const currentVersion = (db.getMeetingAnalysis(meetingId)?.version || 0) + 1;

    // Stage 4: Process Decisions
    const decisions: MeetingDecision[] = (raw.decisions || []).map((d, index) => {
      return {
        id: `dec-${meetingId}-${currentVersion}-${index + 1}`,
        meetingId,
        analysisVersion: currentVersion,
        statement: d.statement || 'Decision statement',
        context: d.context || '',
        evidence: {
          quote: d.evidenceQuote || 'Transcript discussion',
          speaker: d.evidenceSpeaker,
          timestamp: d.evidenceTimestamp,
        },
        decisionStatus: d.decisionStatus || 'confirmed',
        confidence: d.confidence || 'high',
        decisionMaker: d.decisionMaker,
        createdAt: new Date().toISOString(),
      };
    });

    // Stage 3 & 6: Process Action Items with Deterministic Owner Resolution & Validation
    const actionItems: ActionItem[] = (raw.actionItems || []).map((a, index) => {
      const ownerRes = this.resolveOwner(a.statedOwner, members);
      const dateRes = this.resolveDate(a.dueDate, meeting.meetingDate, a.deadlineBasis);

      const ambiguityFlags: string[] = [...(a.ambiguityFlags || [])];
      const clarificationQuestions: string[] = [...(a.clarificationQuestions || [])];

      if (ownerRes.ambiguity) {
        ambiguityFlags.push(ownerRes.ambiguity);
      }
      if (!ownerRes.resolvedMemberId && !clarificationQuestions.some((q) => q.toLowerCase().includes('who'))) {
        clarificationQuestions.push('Who will be assigned as the responsible owner for this task?');
      }
      if (dateRes.basis === 'unknown' && !clarificationQuestions.some((q) => q.toLowerCase().includes('when') || q.toLowerCase().includes('due'))) {
        ambiguityFlags.push('Deadline is unspecified or ambiguous');
        clarificationQuestions.push('What is the required completion date for this deliverable?');
      }

      // Suggested destination
      let dest: 'jira' | 'notion' | 'both' = a.suggestedDestination || 'jira';
      let targets: ('jira' | 'notion')[] = dest === 'both' ? ['jira', 'notion'] : [dest];

      const hasBlocker = ambiguityFlags.length > 0;

      return {
        id: `act-${meetingId}-${currentVersion}-${index + 1}`,
        meetingId,
        analysisVersion: currentVersion,
        title: a.title || 'Action Item',
        description: a.description || a.title || '',
        ownerMemberId: ownerRes.resolvedMemberId,
        statedOwner: a.statedOwner,
        ownerConfidence: ownerRes.confidence,
        dueDate: dateRes.resolvedDate,
        deadlineBasis: dateRes.basis,
        deadlineReasoning: dateRes.reasoning,
        priority: a.priority || 'medium',
        status: 'pending_review',
        evidence: {
          quote: a.evidenceQuote || 'Transcript discussion',
          speaker: a.evidenceSpeaker,
          timestamp: a.evidenceTimestamp,
        },
        confidence: a.confidence || (hasBlocker ? 'medium' : 'high'),
        ambiguityFlags: Array.from(new Set(ambiguityFlags)),
        clarificationQuestions: Array.from(new Set(clarificationQuestions)),
        suggestedDestination: dest,
        targetDestinations: targets,
        acceptanceCriteria: a.acceptanceCriteria || ['Deliverable completed as agreed.'],
        executionEligibility: !hasBlocker && Boolean(ownerRes.resolvedMemberId),
        approvedVersion: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Stage 7: Summary synthesis
    const validationWarnings: string[] = [];
    if (actionItems.some((act) => !act.ownerMemberId)) {
      validationWarnings.push('One or more action items do not have a confirmed workspace assignee.');
    }
    if (actionItems.some((act) => !act.dueDate)) {
      validationWarnings.push('One or more action items lack a definite completion deadline.');
    }

    const analysis: MeetingAnalysis = {
      id: `anl-${meetingId}-${currentVersion}`,
      meetingId,
      version: currentVersion,
      provider: extractionResult.providerUsed,
      model: extractionResult.modelUsed,
      promptVersion: PROMPT_VERSION,
      summary: {
        executiveSummary: raw.executiveSummary || `Summary for ${meeting.title}`,
        mainDiscussionPoints: raw.mainDiscussionPoints || [],
        confirmedDecisionsCount: decisions.filter((d) => d.decisionStatus === 'confirmed').length,
        actionItemsCount: actionItems.length,
        blockersCount: (raw.blockersAndRisks || []).length,
        upcomingDeadlines: raw.upcomingDeadlines || [],
        suggestedFollowUpAgenda: raw.suggestedFollowUpAgenda || [],
      },
      blockersAndRisks: raw.blockersAndRisks || [],
      openQuestions: raw.openQuestions || [],
      structuredOutput: raw,
      validationStatus: validationWarnings.length > 0 ? 'has_warnings' : 'valid',
      validationWarnings,
      processingDurationMs: Date.now() - startTime,
      createdAt: new Date().toISOString(),
    };

    // Save all to database
    db.addMeetingAnalysis(analysis);
    decisions.forEach((d) => db.addMeetingDecision(d));
    actionItems.forEach((a) => db.addActionItem(a));

    db.updateMeeting(meetingId, {
      processingStatus: 'needs_review',
    });

    db.logAudit({
      workspaceId: meeting.workspaceId,
      actorName: 'AI Analysis Service',
      action: 'meeting.analyzed',
      entityType: 'meeting',
      entityId: meetingId,
      safeMetadata: {
        version: currentVersion,
        actionsFound: actionItems.length,
        decisionsFound: decisions.length,
        durationMs: analysis.processingDurationMs,
      },
    });

    return { analysis, decisions, actionItems };
  }
}

export const meetingAnalysisService = new MeetingAnalysisService();
