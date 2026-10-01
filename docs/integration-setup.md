# Integration Setup & Credential Guide

MeetingMind AI connects directly to external workstream systems via official REST APIs.

---

## 1. Jira Cloud Setup

### Generating an Atlassian API Token
1. Log into your Atlassian Account at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create API token**.
3. Label: `MeetingMind AI Integration`.
4. Copy the generated token string.

### Configuration in MeetingMind
1. In the navigation bar, click **Integrations** &rarr; **Jira Cloud**.
2. Uncheck **Mock Sandbox Simulation** to enable Live Mode.
3. Configure:
   - **Site URL:** `https://your-domain.atlassian.net`
   - **User Email:** Your Atlassian account email address
   - **Project Key:** e.g. `PROJ` or `ENG`
   - **API Token:** Paste your generated token
4. Click **Test Connection**. A live verification call will be made to `GET /rest/api/3/myself`.
5. Click **Save Configuration**.

---

## 2. Notion Integration Setup

### Creating an Internal Integration Secret
1. Go to [developers.notion.com](https://developers.notion.com) and log in.
2. Navigate to **View my integrations** &rarr; **+ New integration**.
3. Name: `MeetingMind AI`.
4. Associated workspace: Select your destination Notion workspace.
5. Content Capabilities: Enable **Read content**, **Update content**, **Insert content**.
6. Copy the **Internal Integration Secret** (`secret_...`).

### Connecting your Notion Database
1. Open the Notion page containing your task database in your browser or desktop app.
2. Click the `...` menu in the top right &rarr; Select **Connections** &rarr; Connect **MeetingMind AI**.
3. Obtain the 32-character **Database ID** from the database URL:
   `https://www.notion.so/{workspace_name}/{database_id}?v=...`
4. In MeetingMind, navigate to **Integrations** &rarr; **Notion Database API**.
5. Paste your **Target Database ID** and **Integration Secret**.
6. Click **Test Connection**. MeetingMind will verify the schema properties via `GET /v1/databases/{database_id}`.

---

## 3. Email & Slack Notifications

### SMTP Configuration
Set the following environment variables in `.env`:
\`\`\`bash
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASSWORD=your-password
SMTP_FROM_EMAIL=notifications@meetingmind.ai
\`\`\`

### Slack Incoming Webhooks
1. Create an Incoming Webhook in your Slack Workspace ([api.slack.com/apps](https://api.slack.com/apps)).
2. Set:
\`\`\`bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../X...
\`\`\`
MeetingMind will post formatted alert cards upon action approval and assignment.
