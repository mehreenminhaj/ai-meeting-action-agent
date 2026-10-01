# Troubleshooting & Operational Guide

## Common Issues & Resolutions

### 1. "No GEMINI_API_KEY detected" Warning
- **Symptom:** Logs show `Using High-Fidelity Mock AI Provider`.
- **Cause:** No `GEMINI_API_KEY` was supplied in environment variables.
- **Resolution:**
  - In Google AI Studio, server-side Gemini API is enabled via `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`.
  - For local development outside AI Studio, export `GEMINI_API_KEY=your_key` in `.env`.
  - The built-in Mock Provider delivers full structured extractions with evidence quotes for testing and offline development.

### 2. Jira Cloud 401 / 403 Forbidden
- **Symptom:** Jira test connection fails with `Jira authentication failed (401)`.
- **Cause:** Using Atlassian account password instead of API Token, or email mismatch.
- **Resolution:** Generate an API Token at [id.atlassian.com](https://id.atlassian.com) and ensure the user email matches the token owner.

### 3. Notion 404 Could Not Find Database
- **Symptom:** Notion connection test fails with `404 object_not_found`.
- **Cause:** The destination Notion database has not been shared with the MeetingMind internal integration.
- **Resolution:** In Notion, click `...` at the top right of the database page &rarr; **Connections** &rarr; Add **MeetingMind AI**.

### 4. Health Check Endpoint
- Run a quick sanity check against the backend:
\`\`\`bash
curl http://localhost:3000/api/health
\`\`\`
Expected response:
\`\`\`json
{
  "status": "healthy",
  "app": "MeetingMind AI",
  "nodeEnv": "development"
}
\`\`\`
