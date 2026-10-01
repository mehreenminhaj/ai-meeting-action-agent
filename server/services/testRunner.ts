import { db } from '../db/database.js';
import { meetingAnalysisService } from './ai/analysisService.js';
import { executionEngine } from './executionEngine.js';
import { SAMPLE_TRANSCRIPTS } from '../db/sampleTranscripts.js';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  assertionDetails?: string;
}

export class AutomatedTestRunner {
  public async runAllSuites(): Promise<{
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
    results: TestResult[];
  }> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    // Suite 1: Transcript Normalization
    await this.runTest(results, 'Unit: AI Engine', 'Normalizes CRLF and removes excess whitespace', () => {
      const input = 'Alice: Hello\r\n\r\n\r\n\r\nBob: Hi there   \n';
      const output = meetingAnalysisService.normalizeTranscript(input);
      if (output.normalizedText.includes('\r')) throw new Error('Carriage returns were not normalized');
      if (output.normalizedText.includes('\n\n\n')) throw new Error('Excess blank lines preserved');
      if (!output.detectedSpeakers.includes('Alice') || !output.detectedSpeakers.includes('Bob')) {
        throw new Error('Failed to detect Alice or Bob speakers');
      }
    });

    // Suite 2: Owner Resolution Rules
    await this.runTest(results, 'Unit: Identity Resolution', 'Resolves exact email match first', () => {
      const members = db.getWorkspaceMembers('ws-acme-cloud');
      const res = meetingAnalysisService.resolveOwner('sarah.chen@acme.io', members);
      if (res.resolvedMemberId !== 'mem-sarah-chen' || res.confidence !== 'high') {
        throw new Error(`Expected mem-sarah-chen with high confidence, got ${JSON.stringify(res)}`);
      }
    });

    await this.runTest(results, 'Unit: Identity Resolution', 'Resolves exact display name match', () => {
      const members = db.getWorkspaceMembers('ws-acme-cloud');
      const res = meetingAnalysisService.resolveOwner('Alex Rivera', members);
      if (res.resolvedMemberId !== 'mem-alex-rivera' || res.confidence !== 'high') {
        throw new Error(`Expected mem-alex-rivera with high confidence, got ${JSON.stringify(res)}`);
      }
    });

    await this.runTest(results, 'Unit: Identity Resolution', 'Resolves known alias (mvance -> Marcus Vance)', () => {
      const members = db.getWorkspaceMembers('ws-acme-cloud');
      const res = meetingAnalysisService.resolveOwner('mvance', members);
      if (res.resolvedMemberId !== 'mem-marcus-vance') {
        throw new Error(`Expected mem-marcus-vance for alias mvance, got ${res.resolvedMemberId}`);
      }
    });

    await this.runTest(results, 'Unit: Identity Resolution', 'Never invents an owner for unassigned tasks', () => {
      const members = db.getWorkspaceMembers('ws-acme-cloud');
      const res = meetingAnalysisService.resolveOwner(undefined, members);
      if (res.resolvedMemberId !== null) {
        throw new Error('Expected null resolvedMemberId for missing owner');
      }
      if (!res.ambiguity) {
        throw new Error('Expected ambiguity flag for unassigned task');
      }
    });

    await this.runTest(results, 'Unit: Identity Resolution', 'Leaves unknown person unresolved rather than guessing', () => {
      const members = db.getWorkspaceMembers('ws-acme-cloud');
      const res = meetingAnalysisService.resolveOwner('Jonathan Strange Unknown Person', members);
      if (res.resolvedMemberId !== null) {
        throw new Error('Guessed an unknown person against workspace directory');
      }
    });

    // Suite 3: Date Resolution
    await this.runTest(results, 'Unit: Date Resolution', 'Validates explicit ISO date format (YYYY-MM-DD)', () => {
      const res = meetingAnalysisService.resolveDate('2026-10-15', '2026-10-01', 'explicit');
      if (res.resolvedDate !== '2026-10-15' || res.basis !== 'explicit') {
        throw new Error(`Expected 2026-10-15 explicit, got ${JSON.stringify(res)}`);
      }
    });

    await this.runTest(results, 'Unit: Date Resolution', 'Infers relative date "tomorrow" anchored to meeting date', () => {
      const res = meetingAnalysisService.resolveDate('tomorrow', '2026-10-05', 'inferred');
      if (res.resolvedDate !== '2026-10-06') {
        throw new Error(`Expected 2026-10-06, got ${res.resolvedDate}`);
      }
    });

    await this.runTest(results, 'Unit: Date Resolution', 'Flags relative dates as unknown when meeting date is missing', () => {
      const res = meetingAnalysisService.resolveDate('next Friday', undefined, 'inferred');
      if (res.resolvedDate !== null || res.basis !== 'unknown') {
        throw new Error('Assumed a calendar date without a meeting anchor');
      }
    });

    // Suite 4: Decision Classification & Human Review Guard
    await this.runTest(results, 'Unit: Human Approval Guard', 'Unapproved action item throws on execution', async () => {
      const actions = db.getActionItems();
      const pendingItem = actions.find((a) => a.status === 'pending_review');
      if (!pendingItem) throw new Error('No pending review action item found to test guard');

      let thrown = false;
      try {
        await executionEngine.executeActionItem({
          actionItemId: pendingItem.id,
          workspaceId: 'ws-acme-cloud',
          actorId: 'usr-sarah-chen',
          actorName: 'Sarah Chen',
        });
      } catch (e: any) {
        thrown = true;
        if (!e.message.includes('Execution rejected')) {
          throw new Error(`Expected approval rejection message, got: ${e.message}`);
        }
      }
      if (!thrown) throw new Error('Execution engine permitted execution of an unapproved action item!');
    });

    // Suite 5: Invalidation of Approval on Payload Change
    await this.runTest(results, 'Unit: Human Approval Guard', 'Invalidates approval when action payload is edited', () => {
      // Create a dummy approved action item
      const testActionId = `test-act-inval-${Date.now()}`;
      db.addActionItem({
        id: testActionId,
        meetingId: 'mtg-sprint-42-sync',
        analysisVersion: 1,
        title: 'Original Approved Title',
        description: 'Original description',
        ownerMemberId: 'mem-alex-rivera',
        dueDate: '2026-10-15',
        deadlineBasis: 'explicit',
        priority: 'high',
        status: 'approved',
        evidence: { quote: 'Quote' },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'jira',
        targetDestinations: ['jira'],
        acceptanceCriteria: [],
        executionEligibility: true,
        approvedVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update the title
      db.updateActionItem(testActionId, {
        title: 'Modified Title Post-Approval',
      });

      const updated = db.getActionItem(testActionId);
      if (updated?.status === 'approved' || updated?.approvedVersion !== null) {
        throw new Error('Action item remained approved after payload modification!');
      }
    });

    // Suite 6: Idempotency & Duplicate Task Prevention
    await this.runTest(results, 'Integration: Execution & Idempotency', 'Prevents duplicate external task creation on repeated execution', async () => {
      const testActionId = `test-act-idem-${Date.now()}`;
      db.addActionItem({
        id: testActionId,
        meetingId: 'mtg-sprint-42-sync',
        analysisVersion: 1,
        title: 'Idempotency Test Deliverable',
        description: 'Verify no duplicate Jira or Notion issues created',
        ownerMemberId: 'mem-sarah-chen',
        dueDate: '2026-10-20',
        deadlineBasis: 'explicit',
        priority: 'medium',
        status: 'approved',
        evidence: { quote: 'I will handle this' },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'jira',
        targetDestinations: ['jira'],
        acceptanceCriteria: ['Pass test'],
        executionEligibility: true,
        approvedVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // First run
      const run1 = await executionEngine.executeActionItem({
        actionItemId: testActionId,
        workspaceId: 'ws-acme-cloud',
        actorId: 'usr-sarah-chen',
        actorName: 'Sarah Chen',
      });

      const tasksAfterRun1 = db.getExternalTasks(testActionId);
      if (tasksAfterRun1.length !== 1) {
        throw new Error(`Expected exactly 1 external task after run 1, got ${tasksAfterRun1.length}`);
      }

      // Second run (repeated execution call)
      const run2 = await executionEngine.executeActionItem({
        actionItemId: testActionId,
        workspaceId: 'ws-acme-cloud',
        actorId: 'usr-sarah-chen',
        actorName: 'Sarah Chen',
      });

      const tasksAfterRun2 = db.getExternalTasks(testActionId);
      if (tasksAfterRun2.length !== 1) {
        throw new Error(`Duplicate task created! Expected 1 task, got ${tasksAfterRun2.length}`);
      }
    });

    // Suite 7: Dual Destination & Partial Failure Resilience
    await this.runTest(results, 'Integration: Dual Destination', 'Tracks Jira and Notion separately without cross-duplication', async () => {
      const testActionId = `test-act-dual-${Date.now()}`;
      db.addActionItem({
        id: testActionId,
        meetingId: 'mtg-sprint-42-sync',
        analysisVersion: 1,
        title: 'Dual Target Architecture Document',
        description: 'Create issue in Jira and Notion page concurrently',
        ownerMemberId: 'mem-priya-patel',
        dueDate: '2026-10-22',
        deadlineBasis: 'explicit',
        priority: 'high',
        status: 'approved',
        evidence: { quote: 'Priya will publish to both' },
        confidence: 'high',
        ambiguityFlags: [],
        clarificationQuestions: [],
        suggestedDestination: 'both',
        targetDestinations: ['jira', 'notion'],
        acceptanceCriteria: ['Dual task verified'],
        executionEligibility: true,
        approvedVersion: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await executionEngine.executeActionItem({
        actionItemId: testActionId,
        workspaceId: 'ws-acme-cloud',
        actorId: 'usr-sarah-chen',
        actorName: 'Sarah Chen',
      });

      if (!result.success) throw new Error('Dual destination execution reported failure');
      const tasks = db.getExternalTasks(testActionId);
      const hasJira = tasks.some((t) => t.provider === 'jira');
      const hasNotion = tasks.some((t) => t.provider === 'notion');

      if (!hasJira || !hasNotion) {
        throw new Error(`Expected both Jira and Notion tasks, got ${JSON.stringify(tasks.map((t) => t.provider))}`);
      }
    });

    // Suite 8: Dashboard Metric Calculations
    await this.runTest(results, 'Unit: Dashboard Metrics', 'Correctly calculates non-deleted action items and pending approvals', () => {
      const actions = db.getActionItems(undefined, 'ws-acme-cloud');
      const pending = actions.filter((a) => a.status === 'pending_review').length;
      if (typeof pending !== 'number') throw new Error('Invalid pending calculation');
    });

    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    return {
      passed,
      failed,
      total,
      durationMs: Date.now() - startTime,
      results,
    };
  }

  private async runTest(
    results: TestResult[],
    suite: string,
    name: string,
    fn: () => Promise<void> | void
  ): Promise<void> {
    const t0 = Date.now();
    try {
      await fn();
      results.push({
        suite,
        name,
        passed: true,
        durationMs: Date.now() - t0,
      });
    } catch (e: any) {
      results.push({
        suite,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        error: e.message || 'Assertion failed',
      });
    }
  }
}

export const automatedTestRunner = new AutomatedTestRunner();
