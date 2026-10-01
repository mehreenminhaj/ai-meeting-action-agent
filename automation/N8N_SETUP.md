# MeetingMind AI - n8n Workflow Automation Setup Guide

MeetingMind AI provides optional integration with **n8n** for external workflow orchestration, scheduled reminders, team messaging, and failure alerting.

The application remains **fully functional** even when n8n is not installed or configured. The backend is the single source of truth for all human approvals, state transitions, and execution idempotency.

---

## Architecture & Workflows Overview

| Workflow | Trigger | Description | Safety Guarantees |
|---|---|---|---|
| **Workflow A** | Webhook: `meeting-processing-event` | Dispatched when AI analysis completes | Validates webhook signature. Does not execute actions without human approval. |
| **Workflow B** | Webhook: `approved-action-execution` | Triggered when a human approves an action item | Backend verifies approval state and idempotency keys before any task creation. |
| **Workflow C** | Cron: Daily at 09:00 UTC | Queries backend for tasks due within 7 days | Timezone-aware filtering. Sends non-duplicate digest to Slack. |
| **Workflow D** | Webhook: `failed-execution-alerts` | Dispatched on external integration error | Alerts team channel with safe diagnostics and manual retry link. |

---

## 1. Prerequisites

- A running n8n instance (Self-hosted via Docker or n8n Cloud)
- MeetingMind AI running on `http://localhost:3000` (or your deployed URL)

---

## 2. Importing Workflows into n8n

1. Open your n8n web interface (typically `http://localhost:5678`).
2. Navigate to **Workflows** in the left sidebar.
3. Click **Add Workflow** → Select **Import from File...** (top right menu).
4. Select one of the workflow files located in `automation/workflows/`:
   - `workflow-a-meeting-processing-event.json`
   - `workflow-b-approved-action-execution.json`
   - `workflow-c-scheduled-reminders.json`
   - `workflow-d-failed-execution-alerts.json`
5. Click **Save** and name your workflow.

---

## 3. Configuring Webhook Secrets & Credentials

### Shared Secret Authentication
All webhooks emitted from MeetingMind include an `X-MeetingMind-Secret` HTTP header matching your `.env` value:

\`\`\`bash
N8N_WEBHOOK_SECRET=your-secure-shared-secret
\`\`\`

In n8n:
- In the **Validate Secret Signature** node, verify the header `x-meetingmind-secret` equals your configured secret token.

### Slack / Messaging Node Credentials
1. In n8n, click on the **Slack Notification** node.
2. Under **Credentials**, select or create your **Slack API Token** or **Incoming Webhook**.
3. Select your designated announcements channel (e.g. `#eng-announcements` or `#eng-alerts`).

---

## 4. Testing & Activating Workflows

1. In MeetingMind AI, navigate to **Automation & History** → **n8n Automation**.
2. Click **Dispatch Test Payload** for Workflow A or Workflow B.
3. Verify that the event is logged in n8n execution history.
4. Toggle the workflow switch in n8n to **Active** (green) to enable production event consumption.

---

## 5. Security & Isolation Considerations

- **Never bypass approval:** n8n workflows cannot create external Jira or Notion tasks without prior human approval recorded in MeetingMind.
- **Redaction:** Webhook payloads contain task metadata and links, never raw passwords, API keys, or full unredacted transcripts.
- **Idempotency:** Repeated webhook deliveries will not create duplicate tasks because the backend checks unique `idempotencyKey` values before dispatching external APIs.
