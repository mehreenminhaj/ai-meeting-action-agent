import crypto from 'crypto';
import { db } from '../../db/database.js';
import { CONFIG } from '../../config.js';
import { ActionItem, Meeting, NotificationRecord, Workspace } from '../../types.js';

export class NotificationService {
  public async sendTaskAssignmentNotification(params: {
    action: ActionItem;
    workspace: Workspace;
    meeting: Meeting;
    recipientEmail: string;
    recipientName: string;
    externalLinks: Array<{ provider: string; url: string; key?: string }>;
  }): Promise<NotificationRecord> {
    const { action, workspace, meeting, recipientEmail, recipientName, externalLinks } = params;

    const idempotencyKey = `notif-assign-${action.id}-${recipientEmail}`;
    const existing = db.getNotifications(workspace.id).find((n) => n.idempotencyKey === idempotencyKey);
    if (existing && existing.deliveryStatus === 'sent') {
      return existing;
    }

    const subject = `[Action Assigned] ${action.title}`;
    const linksText = externalLinks.map((l) => `- ${l.provider.toUpperCase()}: ${l.url}`).join('\n');

    const emailBody = `Hi ${recipientName},\n\nYou have been assigned an action item from "${meeting.title}":\n\nTask: ${action.title}\nDescription: ${action.description}\nDue Date: ${action.dueDate || 'No explicit deadline'}\nPriority: ${action.priority.toUpperCase()}\n\nTranscript Evidence: "${action.evidence.quote}"\n\nExternal Tasks Created:\n${linksText || 'None'}\n\nReview or manage this in MeetingMind AI.`;

    const record: NotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      workspaceId: workspace.id,
      actionItemId: action.id,
      meetingId: meeting.id,
      recipient: recipientEmail,
      channel: 'email',
      templateKey: 'task_assigned',
      subject,
      deliveryStatus: 'sent',
      providerMessageId: `msg-${Date.now()}`,
      idempotencyKey,
      sentAt: new Date().toISOString(),
    };

    // If Slack webhook is configured, also post to Slack
    if (workspace.settings.slackNotificationsEnabled && CONFIG.slackWebhookUrl) {
      try {
        await fetch(CONFIG.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🎯 *New Action Item Assigned to ${recipientName}*\n*Task:* ${action.title}\n*Due:* ${action.dueDate || 'TBD'} | *Priority:* ${action.priority.toUpperCase()}\n*Source Meeting:* ${meeting.title}\n${linksText}`,
          }),
        });
      } catch (e) {
        console.warn('Slack notification failed:', e);
      }
    }

    db.addNotification(record);
    return record;
  }

  public async sendMeetingSummaryNotification(params: {
    meeting: Meeting;
    workspace: Workspace;
    recipients: string[];
    summaryText: string;
    decisionsCount: number;
    actionsCount: number;
  }): Promise<void> {
    for (const recipient of params.recipients) {
      const idempotencyKey = `notif-summary-${params.meeting.id}-${recipient}`;
      const record: NotificationRecord = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        workspaceId: params.workspace.id,
        meetingId: params.meeting.id,
        recipient,
        channel: 'email',
        templateKey: 'meeting_summary',
        subject: `[Meeting Summary] ${params.meeting.title}`,
        deliveryStatus: 'sent',
        providerMessageId: `msg-summary-${Date.now()}`,
        idempotencyKey,
        sentAt: new Date().toISOString(),
      };
      db.addNotification(record);
    }
  }
}

export const notificationService = new NotificationService();
