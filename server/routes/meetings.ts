import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { requireAuth } from './auth.js';
import { Meeting } from '../types.js';
import { meetingAnalysisService } from '../services/ai/analysisService.js';
import { SAMPLE_TRANSCRIPTS } from '../db/sampleTranscripts.js';

export const meetingRouter = Router();

// GET /api/v1/sample-transcripts
meetingRouter.get('/sample-transcripts', (req, res) => {
  return res.json({ samples: SAMPLE_TRANSCRIPTS });
});

// GET /api/v1/workspaces/:workspace_id/meetings
meetingRouter.get('/workspaces/:workspace_id/meetings', requireAuth, (req, res) => {
  const meetings = db.getMeetings(req.params.workspace_id);
  return res.json({ meetings });
});

// POST /api/v1/workspaces/:workspace_id/meetings
meetingRouter.post('/workspaces/:workspace_id/meetings', requireAuth, async (req: any, res) => {
  const { title, meetingDate, timezone, sourceType, sourceUrl, transcriptText, autoProcess } = req.body;
  const workspaceId = req.params.workspace_id;

  if (!title || !transcriptText || transcriptText.trim().length === 0) {
    return res.status(400).json({ error: 'Meeting title and non-empty transcript text are required.' });
  }

  const now = new Date().toISOString();
  const transcriptHash = crypto.createHash('sha256').update(transcriptText).digest('hex');

  const newMeeting: Meeting = {
    id: `mtg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    workspaceId,
    createdBy: req.user.id,
    title: title.trim(),
    meetingDate: meetingDate || undefined,
    timezone: timezone || 'America/Los_Angeles',
    sourceType: sourceType || 'paste',
    sourceUrl: sourceUrl || undefined,
    transcriptText,
    transcriptHash,
    processingStatus: 'queued',
    createdAt: now,
    updatedAt: now,
  };

  db.addMeeting(newMeeting);

  db.logAudit({
    workspaceId,
    actorId: req.user.id,
    actorName: req.user.name,
    action: 'meeting.create',
    entityType: 'meeting',
    entityId: newMeeting.id,
    safeMetadata: { title: newMeeting.title, sourceType: newMeeting.sourceType },
  });

  // If autoProcess is requested, run analysis immediately
  if (autoProcess !== false) {
    try {
      const result = await meetingAnalysisService.analyzeMeeting(newMeeting.id);
      return res.status(201).json({
        meeting: db.getMeeting(newMeeting.id),
        analysis: result.analysis,
        decisions: result.decisions,
        actionItems: result.actionItems,
      });
    } catch (err: any) {
      console.error('Error analyzing meeting:', err);
      db.updateMeeting(newMeeting.id, {
        processingStatus: 'failed',
        processingError: err.message,
      });
      return res.status(201).json({
        meeting: db.getMeeting(newMeeting.id),
        error: `Processing failed: ${err.message}`,
      });
    }
  }

  return res.status(201).json({ meeting: newMeeting });
});

// GET /api/v1/meetings/:meeting_id
meetingRouter.get('/meetings/:meeting_id', requireAuth, (req, res) => {
  const meeting = db.getMeeting(req.params.meeting_id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  const analysis = db.getMeetingAnalysis(meeting.id);
  const decisions = db.getMeetingDecisions(meeting.id);
  const actions = db.getActionItems(meeting.id);
  return res.json({ meeting, analysis, decisions, actions });
});

// DELETE /api/v1/meetings/:meeting_id
meetingRouter.delete('/meetings/:meeting_id', requireAuth, (req, res) => {
  const meeting = db.getMeeting(req.params.meeting_id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  db.deleteMeeting(req.params.meeting_id);
  return res.json({ success: true, message: 'Meeting deleted successfully' });
});

// POST /api/v1/meetings/:meeting_id/process
meetingRouter.post('/meetings/:meeting_id/process', requireAuth, async (req, res) => {
  const meeting = db.getMeeting(req.params.meeting_id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  try {
    const result = await meetingAnalysisService.analyzeMeeting(meeting.id);
    return res.json({
      success: true,
      meeting: db.getMeeting(meeting.id),
      analysis: result.analysis,
      decisions: result.decisions,
      actionItems: result.actionItems,
    });
  } catch (err: any) {
    db.updateMeeting(meeting.id, {
      processingStatus: 'failed',
      processingError: err.message,
    });
    return res.status(500).json({ error: `Analysis failed: ${err.message}` });
  }
});

// POST /api/v1/meetings/:meeting_id/retry
meetingRouter.post('/meetings/:meeting_id/retry', requireAuth, async (req, res) => {
  const meeting = db.getMeeting(req.params.meeting_id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

  try {
    const result = await meetingAnalysisService.analyzeMeeting(meeting.id);
    return res.json({
      success: true,
      meeting: db.getMeeting(meeting.id),
      analysis: result.analysis,
      decisions: result.decisions,
      actionItems: result.actionItems,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `Retry failed: ${err.message}` });
  }
});
