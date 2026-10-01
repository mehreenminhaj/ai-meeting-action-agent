# Architecture & Pipeline Specification

## 1. Pipeline Stages

MeetingMind AI breaks transcript comprehension and task extraction into seven discrete, verifiable stages:

### Stage 1: Ingestion & Normalization
- Standardizes Unicode representations, CRLF / LF line terminations, and whitespace.
- Identifies speaker labels using regular expressions (`[00:01:23] Name:`, `Name:`).
- Preserves verbatim transcript integrity with SHA-256 cryptographic hashing (`transcript_hash`) to detect duplicate submissions.

### Stage 2: Semantic Understanding
- Categorizes meeting context: Executive purpose, discussion topics, and timeline anchors.
- Identifies conversational themes across architecture, product specifications, or incidents.

### Stage 3: Action Item Extraction & Evidence Anchoring
- Extracts actionable deliverables using verb-oriented syntax.
- **Evidence Binding:** Every action item retains the exact quote from the transcript, the speaker's name, and the timestamp.
- Identifies explicit commitments ("I will do X") vs requests ("Can you do Y").

### Stage 4: Decision Classification
- Distinguishes **confirmed decisions** from **proposed decisions**, suggestions, or hypothetical discussions.
- Attaches confidence ratings and identifies the decision maker when explicit authority was exercised.

### Stage 5: Blockers, Risks & Questions
- Identifies technical, cross-team, or operational impediments.
- Flags whether a blocker requires escalation.
- Captures unanswered questions for subsequent meeting agendas.

### Stage 6: Deterministic Validation & Member Directory Resolution
- Bypasses LLM hallucinations by applying deterministic resolution logic:
  1. Exact email match against the workspace directory.
  2. Exact known display name match.
  3. Configured alias match (e.g. `mvance` &rarr; `Marcus Vance`).
  4. Substring / token matching with confidence thresholding.
  5. If confidence is insufficient, **leaves owner unresolved**.
- Date resolution anchors relative terms ("tomorrow", "by next Friday") to the explicit meeting date and workspace timezone. If meeting date is absent, flags the date as `unknown`.

### Stage 7: Synthesis & Human Gate
- Produces an executive summary, main discussion points, upcoming deadlines, and follow-up agendas.
- Locks the meeting in `needs_review` state. **No external side effects occur until authorized human approval.**

---

## 2. Central Execution Engine & Idempotency

### Idempotency Key Design
Execution keys are constructed deterministically:
\`\`\`
exec-{actionId}-{provider}-v{approvedVersion}
\`\`\`

When dispatching:
1. Engine checks the database for existing `ExternalTask` records matching `actionItemId` and `provider`.
2. If already present, skips execution and returns the existing external task URL.
3. If not present, creates an `ExecutionRecord` in `running` state.
4. Invokes provider adapter (`jiraAdapter` or `notionAdapter`).
5. On success, records `ExternalTask` and marks record `succeeded`.
6. On error, marks record `failed` and preserves error diagnostics for manual review.

### Dual Destination Partial Failure Recovery
When an action targets both Jira and Notion:
- If Jira succeeds and Notion fails due to a rate limit or credential error:
  - Jira `ExternalTask` is preserved (`PROJ-104`).
  - Notion is marked `failed`.
- Clicking **Retry** invokes execution specifically for Notion, leaving the Jira ticket intact without duplicate issue creation.
