export interface SampleTranscript {
  id: string;
  title: string;
  meetingDate: string;
  sourceType: 'sample';
  description: string;
  transcriptText: string;
}

export const SAMPLE_TRANSCRIPTS: SampleTranscript[] = [
  {
    id: 'sample-sprint-planning-arch-sync',
    title: 'Sprint 42 Architecture & Cloud Migration Sync',
    meetingDate: '2026-10-05',
    sourceType: 'sample',
    description: 'Engineering leadership discussion on database cutover, JWT auth deprecation, and replica lag blockers.',
    transcriptText: `[00:00:02] Sarah Chen: Good morning everyone. Let's dive straight into the Sprint 42 architecture sync. The primary agenda is finalizing the Postgres 16 cutover plan and resolving the auth token deprecation.
[00:00:25] Alex Rivera: Thanks Sarah. On the database migration: we completed the shadow traffic test on staging. Replica lag peaked at 42ms during peak write load, which is well within our 100ms SLO.
[00:01:05] Marcus Vance: Wait, what happens if the network partition between us-east and us-west triggers during the sync window? Have we tested active split-brain failover?
[00:01:30] Alex Rivera: That's a valid catch. I will conduct a synthetic failover drill in staging by this Thursday, October 8th, and document the recovery runbook.
[00:01:55] Sarah Chen: Perfect. Decision confirmed: we will proceed with the production database cutover during the maintenance window on Saturday, October 10th at 02:00 UTC.
[00:02:20] Priya Patel: Does customer support know about the scheduled 15-minute maintenance window?
[00:02:35] Sarah Chen: Not yet. Priya, can you coordinate with the customer support team and publish the maintenance notice by Friday, October 9th at 5 PM?
[00:02:50] Priya Patel: Absolutely, I'll draft the customer advisory and share it in #announcements.
[00:03:10] Alex Rivera: On the authentication side: the legacy HMAC tokens are expiring on November 1st. We must migrate all internal microservices to Ed25519 asymmetric keys.
[00:03:40] Marcus Vance: Is the billing microservice ready for Ed25519 verification?
[00:03:55] Alex Rivera: Actually, that's currently a blocker. The billing service is still pinned to Node 16 which lacks the native crypto primitives. Someone on the payments squad needs to bump the runtime.
[00:04:20] Sarah Chen: Let's log this as a critical blocker. Marcus, can you sync with Dave on the payments team today to identify the upgrade blockers?
[00:04:40] Marcus Vance: Will do. I'll get an estimate from Dave by tomorrow afternoon.
[00:05:00] Elena Rostova: From QA: we noticed some flake in the end-to-end Cypress test suite for the checkout flow. Should we block the release if they fail?
[00:05:25] Sarah Chen: No, we won't block deployment on flaky non-critical tests, but Elena, please quarantine the three flaky tests and log Jira bugs for each by Wednesday, October 7th.
[00:05:48] Elena Rostova: Understood, I'll isolate them right after this call.
[00:06:05] Sarah Chen: Great. One open question remaining: who is owning the SOC2 audit log archival policy? We talked about S3 Glacier vs GCP Coldline. Let's table that for next Monday's security sync.
[00:06:30] Alex Rivera: Sounds good. We're all aligned. Thanks all!`,
  },
  {
    id: 'sample-product-roadmap-q4',
    title: 'Q4 Product Roadmap & Enterprise Features Sync',
    meetingDate: '2026-10-02',
    sourceType: 'sample',
    description: 'Product, Design, and Engineering alignment on Enterprise SSO, CSV Export, and Notion integration priority.',
    transcriptText: `[00:00:05] Priya Patel: Welcome team. Today we are locking in our Q4 roadmap priorities. We have customer requests piling up for Enterprise SAML SSO, bulk CSV export, and Notion workspace sync.
[00:00:35] Sarah Chen: Let's be realistic about engineering bandwidth. We only have three 2-week sprints before code freeze in December.
[00:01:00] Priya Patel: Okta and Azure AD SAML SSO are hard requirements for our top three enterprise sales prospects, representing $180k ARR. We have to deliver this by November 15th.
[00:01:25] Sarah Chen: Understood. Confirmed decision: Enterprise SAML SSO is P0 for Sprint 43. Alex, will you be able to take the backend architecture for SAML 2.0 / Okta integration?
[00:01:50] Alex Rivera: Yes, I can take that. I will deliver the technical architecture document and OpenID/SAML service specification in Notion by October 14th.
[00:02:15] Priya Patel: What about the Notion bi-directional sync? Our beta users are demanding automated page creation.
[00:02:35] Marcus Vance: The Notion API rate limit is 3 requests per second per integration token. If we do bi-directional syncing without a robust Redis event queue, we will crash their rate limiters.
[00:03:00] Sarah Chen: That's a serious risk. Let's decide to scope Notion sync to outbound task publishing only for v1. No bi-directional polling yet.
[00:03:25] Priya Patel: Agreed, that makes sense. Marcus, can you write the Notion API client rate-limiter wrapper and token bucket by October 16th?
[00:03:45] Marcus Vance: Yes, I'll build it with exponential backoff and add integration tests.
[00:04:10] Elena Rostova: Do we have test tenant credentials for Okta and Azure AD? We can't build integration test fixtures without them.
[00:04:30] Priya Patel: Good point. That's an open dependency. Someone needs to submit an IT request for enterprise sandbox licenses.
[00:04:50] Sarah Chen: Priya, please submit the IT ticket for Okta and Azure sandbox accounts by Monday, October 5th.
[00:05:10] Priya Patel: On it. Also, regarding the CSV Export: is that high priority?
[00:05:25] Sarah Chen: Let's defer CSV export to Q1. We need to stay laser-focused on enterprise security.
[00:05:45] Priya Patel: Decision confirmed: Defer CSV export to Q1 2027. We are adjourned!`,
  },
  {
    id: 'sample-incident-postmortem',
    title: 'Sev-1 Incident Post-Mortem: API Gateway Outage',
    meetingDate: '2026-09-28',
    sourceType: 'sample',
    description: 'Retrospective on 47-minute partial API Gateway outage caused by Redis cluster connection leak during rolling deploy.',
    transcriptText: `[00:00:00] Marcus Vance: This is the official post-mortem for incident INC-8492. On September 27th at 14:12 UTC, our public API gateway experienced a 47-minute partial outage, resulting in HTTP 504 errors for 34% of inbound requests.
[00:00:40] Sarah Chen: Let's walk through the timeline and 5 Whys. Marcus, what was the primary root cause?
[00:01:00] Marcus Vance: The root cause was an unhandled promise rejection in the Redis connection pool initializer during the v2.8.1 rolling deployment. When a Redis replica node rebooted, the connection pool did not reconnect, causing TCP socket starvation.
[00:01:45] Alex Rivera: Furthermore, the health check endpoint on the gateway was reporting HTTP 200 OK because it only checked CPU and memory, not active downstream connectivity to Redis.
[00:02:15] Sarah Chen: That is a critical flaw. Decision confirmed: We must mandate deep health checks across all microservices that verify downstream dependencies.
[00:02:40] Alex Rivera: I will rewrite the API Gateway health check probe to execute an active PING command against Redis and Postgres before returning healthy. I will have this deployed to staging by October 2nd.
[00:03:10] Marcus Vance: We also lacked Datadog alerting for connection pool exhaustion. The alert only fired when HTTP 5xx crossed 5% for 10 minutes.
[00:03:35] Marcus Vance: I will configure immediate Datadog P1 alerts for socket pool exhaustion (>85% capacity for 60 seconds) by tomorrow, September 29th.
[00:04:00] Elena Rostova: We need automated chaos tests that simulate database disconnects during deployments.
[00:04:20] Elena Rostova: I will create a Chaos Engineering test suite in staging using Chaos Mesh by October 12th to verify automatic connection recovery.
[00:04:45] Sarah Chen: Excellent. Who is compiling the public customer post-mortem report? Enterprise customers on enterprise SLAs require a formal RCA within 72 hours.
[00:05:10] Priya Patel: I will draft the customer-facing RCA document by September 30th at 12:00 PM and send it to Sarah and legal for review.
[00:05:30] Sarah Chen: Perfect. Confirmed decision: Incident RCA to be published externally by September 30th. Meeting adjourned.`,
  },
];
