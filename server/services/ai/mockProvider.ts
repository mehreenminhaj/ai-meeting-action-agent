import { WorkspaceMember } from '../../types.js';

export interface RawExtractionOutput {
  executiveSummary: string;
  mainDiscussionPoints: string[];
  decisions: Array<{
    statement: string;
    context: string;
    evidenceQuote: string;
    evidenceSpeaker?: string;
    evidenceTimestamp?: string;
    decisionStatus: 'confirmed' | 'proposed' | 'deferred' | 'unresolved';
    confidence: 'high' | 'medium' | 'low';
    decisionMaker?: string;
  }>;
  actionItems: Array<{
    title: string;
    description: string;
    evidenceQuote: string;
    evidenceSpeaker?: string;
    evidenceTimestamp?: string;
    statedOwner?: string;
    resolvedMemberId?: string | null;
    dueDate?: string | null;
    deadlineBasis: 'explicit' | 'inferred' | 'unknown';
    deadlineReasoning?: string;
    priority: 'high' | 'medium' | 'low';
    confidence: 'high' | 'medium' | 'low';
    ambiguityFlags: string[];
    clarificationQuestions: string[];
    suggestedDestination: 'jira' | 'notion' | 'both';
    acceptanceCriteria: string[];
  }>;
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
  upcomingDeadlines: string[];
  suggestedFollowUpAgenda: string[];
}

export class MockAIProvider {
  public async extract(params: {
    transcript: string;
    meetingTitle: string;
    meetingDate?: string;
    timezone: string;
    members: WorkspaceMember[];
  }): Promise<RawExtractionOutput> {
    const text = params.transcript;

    // Check if this matches one of our known samples for highest-fidelity structured extraction
    if (text.includes('Postgres 16') || text.includes('Sprint 42') || text.includes('Ed25519')) {
      const alex = params.members.find((m) => m.displayName.includes('Alex'))?.id || null;
      const priya = params.members.find((m) => m.displayName.includes('Priya'))?.id || null;
      const marcus = params.members.find((m) => m.displayName.includes('Marcus'))?.id || null;
      const elena = params.members.find((m) => m.displayName.includes('Elena'))?.id || null;

      return {
        executiveSummary:
          'Engineering leadership aligned on Sprint 42 architecture and database cutover. The Postgres 16 production cutover is scheduled for October 10th at 02:00 UTC with replica lag verified at 42ms. Ed25519 authentication token migration is currently blocked by a Node 16 dependency in the payments microservice. A failover drill, customer notification, and test quarantine actions were assigned.',
        mainDiscussionPoints: [
          'Postgres 16 staging shadow traffic testing confirmed 42ms replica lag.',
          'Cross-region split-brain failover verification drill required before production maintenance window.',
          'Ed25519 asymmetric auth token migration blocked on Node 16 upgrade in payments service.',
          'Quarantine flaky Cypress checkout tests to protect developer velocity without blocking releases.',
        ],
        decisions: [
          {
            statement: 'Proceed with the production database cutover during the maintenance window on Saturday, October 10th at 02:00 UTC.',
            context: 'Staging shadow traffic testing confirmed replica lag peaked at 42ms, well within 100ms SLO.',
            evidenceQuote: 'Sarah Chen: Decision confirmed: we will proceed with the production database cutover during the maintenance window on Saturday, October 10th at 02:00 UTC.',
            evidenceSpeaker: 'Sarah Chen',
            evidenceTimestamp: '00:01:55',
            decisionStatus: 'confirmed',
            confidence: 'high',
            decisionMaker: 'Sarah Chen',
          },
          {
            statement: 'Do not block deployment on flaky non-critical tests; isolate and log bugs instead.',
            context: 'Cypress checkout suite experienced intermittent failures in staging.',
            evidenceQuote: 'Sarah Chen: No, we won\'t block deployment on flaky non-critical tests, but Elena, please quarantine the three flaky tests and log Jira bugs for each by Wednesday, October 7th.',
            evidenceSpeaker: 'Sarah Chen',
            evidenceTimestamp: '00:05:25',
            decisionStatus: 'confirmed',
            confidence: 'high',
            decisionMaker: 'Sarah Chen',
          },
        ],
        actionItems: [
          {
            title: 'Conduct synthetic failover drill in staging and document recovery runbook',
            description: 'Simulate cross-region us-east to us-west network partition to verify split-brain protection and record recovery time.',
            evidenceQuote: 'Alex Rivera: I will conduct a synthetic failover drill in staging by this Thursday, October 8th, and document the recovery runbook.',
            evidenceSpeaker: 'Alex Rivera',
            evidenceTimestamp: '00:01:30',
            statedOwner: 'Alex Rivera',
            resolvedMemberId: alex,
            dueDate: '2026-10-08',
            deadlineBasis: 'explicit',
            deadlineReasoning: 'Explicitly committed for "this Thursday, October 8th".',
            priority: 'high',
            confidence: 'high',
            ambiguityFlags: [],
            clarificationQuestions: [],
            suggestedDestination: 'jira',
            acceptanceCriteria: [
              'Failover simulated in staging',
              'Automated recovery verified under 90 seconds',
              'Runbook committed to docs repository',
            ],
          },
          {
            title: 'Publish customer support maintenance notice for October 10th cutover',
            description: 'Coordinate with customer support team and publish public advisory for the 15-minute maintenance window.',
            evidenceQuote: 'Sarah Chen: Priya, can you coordinate with the customer support team and publish the maintenance notice by Friday, October 9th at 5 PM?',
            evidenceSpeaker: 'Sarah Chen',
            evidenceTimestamp: '00:02:35',
            statedOwner: 'Priya Patel',
            resolvedMemberId: priya,
            dueDate: '2026-10-09',
            deadlineBasis: 'explicit',
            deadlineReasoning: 'Explicitly requested by Friday, October 9th at 5 PM.',
            priority: 'high',
            confidence: 'high',
            ambiguityFlags: [],
            clarificationQuestions: [],
            suggestedDestination: 'notion',
            acceptanceCriteria: [
              'Advisory reviewed by engineering lead',
              'Published to #announcements and customer helpdesk',
            ],
          },
          {
            title: 'Identify Node 16 upgrade blockers with payments team for Ed25519 support',
            description: 'Sync with Dave on payments squad to unblock billing service runtime upgrade before HMAC token deprecation on Nov 1st.',
            evidenceQuote: 'Sarah Chen: Marcus, can you sync with Dave on the payments team today to identify the upgrade blockers? Marcus Vance: Will do. I\'ll get an estimate from Dave by tomorrow afternoon.',
            evidenceSpeaker: 'Sarah Chen & Marcus Vance',
            evidenceTimestamp: '00:04:20',
            statedOwner: 'Marcus Vance',
            resolvedMemberId: marcus,
            dueDate: '2026-10-06',
            deadlineBasis: 'inferred',
            deadlineReasoning: 'Inferred from "sync today" and "estimate by tomorrow afternoon".',
            priority: 'high',
            confidence: 'high',
            ambiguityFlags: [],
            clarificationQuestions: [],
            suggestedDestination: 'both',
            acceptanceCriteria: ['List of legacy dependencies compiled', 'Upgrade target date committed by payments squad'],
          },
          {
            title: 'Quarantine flaky Cypress checkout tests and create Jira bug reports',
            description: 'Isolate 3 intermittent checkout test cases from master build and track with Jira bug tickets.',
            evidenceQuote: 'Sarah Chen: Elena, please quarantine the three flaky tests and log Jira bugs for each by Wednesday, October 7th.',
            evidenceSpeaker: 'Sarah Chen',
            evidenceTimestamp: '00:05:25',
            statedOwner: 'Elena Rostova',
            resolvedMemberId: elena,
            dueDate: '2026-10-07',
            deadlineBasis: 'explicit',
            deadlineReasoning: 'Explicit deadline stated "by Wednesday, October 7th".',
            priority: 'medium',
            confidence: 'high',
            ambiguityFlags: [],
            clarificationQuestions: [],
            suggestedDestination: 'jira',
            acceptanceCriteria: ['PR merged tagging flaky tests with @quarantine tag', '3 Jira tickets created linked to QA epic'],
          },
          {
            title: 'Define SOC2 audit log archival retention policy (S3 Glacier vs GCP Coldline)',
            description: 'Evaluate cost, retrieval time, and compliance requirements between AWS S3 Glacier and Google Cloud Storage Coldline.',
            evidenceQuote: 'Sarah Chen: One open question remaining: who is owning the SOC2 audit log archival policy? We talked about S3 Glacier vs GCP Coldline. Let\'s table that for next Monday\'s security sync.',
            evidenceSpeaker: 'Sarah Chen',
            evidenceTimestamp: '00:06:05',
            statedOwner: undefined,
            resolvedMemberId: null,
            dueDate: '2026-10-12',
            deadlineBasis: 'inferred',
            deadlineReasoning: 'Inferred from "table that for next Monday\'s security sync".',
            priority: 'low',
            confidence: 'medium',
            ambiguityFlags: ['Missing clear task owner', 'Storage provider decision unresolved'],
            clarificationQuestions: [
              'Which engineer will draft the storage cost & compliance comparison?',
              'Is the target retention period 1 year or 7 years under SOC2 Type II?',
            ],
            suggestedDestination: 'notion',
            acceptanceCriteria: ['Cost and retrieval SLA matrix completed'],
          },
        ],
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
        upcomingDeadlines: [
          '2026-10-06: Marcus Vance - Node 16 upgrade blocker estimate',
          '2026-10-07: Elena Rostova - Flaky Cypress tests quarantined',
          '2026-10-08: Alex Rivera - Synthetic failover drill',
          '2026-10-09: Priya Patel - Customer support maintenance notice',
          '2026-10-10: Production Postgres 16 cutover window (02:00 UTC)',
        ],
        suggestedFollowUpAgenda: [
          'Review synthetic failover drill results and updated runbook',
          'Payments squad Node runtime upgrade timeline',
          'S3 Glacier vs GCP Coldline SOC2 archival policy',
        ],
      };
    }

    // Dynamic heuristic extraction for any arbitrary user transcript
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const discussionPoints: string[] = [];
    const rawActionItems: RawExtractionOutput['actionItems'] = [];
    const rawDecisions: RawExtractionOutput['decisions'] = [];
    const blockers: RawExtractionOutput['blockersAndRisks'] = [];
    const questions: RawExtractionOutput['openQuestions'] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Match speaker if in format "[00:01] Name: Text" or "Name: Text"
      const speakerMatch = line.match(/^(?:\[[\d:]+\]\s*)?([A-Za-z\s]+?):/);
      const speaker = speakerMatch ? speakerMatch[1].trim() : undefined;
      const timestampMatch = line.match(/\[([\d:]+)\]/);
      const timestamp = timestampMatch ? timestampMatch[1] : undefined;

      if (lower.includes('decision:') || lower.includes('decided') || lower.includes('agreed') || lower.includes('decision confirmed')) {
        rawDecisions.push({
          statement: line.replace(/^(?:\[[\d:]+\]\s*)?[A-Za-z\s]+?:\s*/, '').replace(/decision(?: confirmed)?:\s*/i, ''),
          context: `Discussed during ${params.meetingTitle}`,
          evidenceQuote: line,
          evidenceSpeaker: speaker,
          evidenceTimestamp: timestamp,
          decisionStatus: 'confirmed',
          confidence: 'high',
          decisionMaker: speaker,
        });
      }

      if (
        lower.includes('will ') ||
        lower.includes('action:') ||
        lower.includes('todo') ||
        lower.includes('can you') ||
        lower.includes('please ') ||
        lower.includes('i will') ||
        lower.includes('assigned to')
      ) {
        // Try matching owner against known members
        let matchedMember = params.members.find((m) => {
          if (line.toLowerCase().includes(m.displayName.toLowerCase())) return true;
          return m.aliases.some((a) => line.toLowerCase().includes(a.toLowerCase()));
        });

        // If the speaker said "I will...", speaker might be the owner
        if (!matchedMember && speaker && (lower.includes('i will') || lower.includes("i'll"))) {
          matchedMember = params.members.find((m) => {
            return (
              m.displayName.toLowerCase().includes(speaker.toLowerCase()) ||
              speaker.toLowerCase().includes(m.displayName.toLowerCase())
            );
          });
        }

        const taskClean = line.replace(/^(?:\[[\d:]+\]\s*)?[A-Za-z\s]+?:\s*/, '');
        const hasOwner = Boolean(matchedMember);

        rawActionItems.push({
          title: taskClean.slice(0, 80),
          description: taskClean,
          evidenceQuote: line,
          evidenceSpeaker: speaker,
          evidenceTimestamp: timestamp,
          statedOwner: matchedMember ? matchedMember.displayName : speaker || undefined,
          resolvedMemberId: matchedMember?.id || null,
          dueDate: params.meetingDate || null,
          deadlineBasis: params.meetingDate ? 'inferred' : 'unknown',
          deadlineReasoning: params.meetingDate ? `Estimated from meeting date ${params.meetingDate}` : 'No deadline stated in transcript',
          priority: lower.includes('critical') || lower.includes('urgent') || lower.includes('p0') ? 'high' : 'medium',
          confidence: hasOwner ? 'high' : 'medium',
          ambiguityFlags: hasOwner ? [] : ['Owner not clearly assigned in transcript'],
          clarificationQuestions: hasOwner ? [] : ['Who is responsible for delivering this action item?'],
          suggestedDestination: 'jira',
          acceptanceCriteria: ['Task completed and verified by team lead'],
        });
      }

      if (lower.includes('blocker') || lower.includes('blocked') || lower.includes('risk') || lower.includes('impediment')) {
        blockers.push({
          description: line,
          affectedItem: params.meetingTitle,
          responsiblePerson: speaker,
          requiresEscalation: lower.includes('critical') || lower.includes('urgent'),
        });
      }

      if (line.includes('?') && (lower.includes('who') || lower.includes('how') || lower.includes('what') || lower.includes('when'))) {
        questions.push({
          question: line.replace(/^(?:\[[\d:]+\]\s*)?[A-Za-z\s]+?:\s*/, ''),
          context: line,
          personResponsible: 'Unassigned',
        });
      }

      if (discussionPoints.length < 5 && line.length > 30 && !line.includes('?')) {
        discussionPoints.push(line.slice(0, 100));
      }
    }

    return {
      executiveSummary: `Analysis of "${params.meetingTitle}". Extracted ${rawActionItems.length} proposed action items, ${rawDecisions.length} decisions, and ${blockers.length} blockers/risks.`,
      mainDiscussionPoints: discussionPoints.length > 0 ? discussionPoints : ['Team held alignment discussion.'],
      decisions: rawDecisions,
      actionItems: rawActionItems,
      blockersAndRisks: blockers,
      openQuestions: questions,
      upcomingDeadlines: params.meetingDate ? [`Discussion date: ${params.meetingDate}`] : [],
      suggestedFollowUpAgenda: ['Review task progress and open questions.'],
    };
  }
}
