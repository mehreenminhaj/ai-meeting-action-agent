import React, { useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  HelpCircle,
  RefreshCw,
  Sliders,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { IntegrationConnection } from '../../types';
import { api } from '../../lib/api';

interface IntegrationsViewProps {
  integrations: IntegrationConnection[];
  workspaceId: string;
  onRefresh: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  integrations,
  workspaceId,
  onRefresh,
}) => {
  const jira = integrations.find((i) => i.provider === 'jira');
  const notion = integrations.find((i) => i.provider === 'notion');
  const email = integrations.find((i) => i.provider === 'email');
  const slack = integrations.find((i) => i.provider === 'slack');

  // Jira Form State
  const [jiraSiteUrl, setJiraSiteUrl] = useState(jira?.configuration?.siteUrl || 'https://acme-cloud.atlassian.net');
  const [jiraUserEmail, setJiraUserEmail] = useState(jira?.configuration?.userEmail || 'sarah.chen@acme.io');
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraProjectKey, setJiraProjectKey] = useState(jira?.configuration?.projectKey || 'PROJ');
  const [jiraMockMode, setJiraMockMode] = useState(jira?.isMockMode ?? true);
  const [jiraTesting, setJiraTesting] = useState(false);
  const [jiraFeedback, setJiraFeedback] = useState<string | null>(null);

  // Notion Form State
  const [notionApiKey, setNotionApiKey] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState(jira?.configuration?.databaseId || '7f9184ab204b4c73a628c68832e8b109');
  const [notionMockMode, setNotionMockMode] = useState(notion?.isMockMode ?? true);
  const [notionTesting, setNotionTesting] = useState(false);
  const [notionFeedback, setNotionFeedback] = useState<string | null>(null);

  const handleTestJira = async () => {
    try {
      setJiraTesting(true);
      setJiraFeedback(null);
      const res = await api.testJira({
        siteUrl: jiraSiteUrl,
        userEmail: jiraUserEmail,
        apiToken: jiraApiToken,
        projectKey: jiraProjectKey,
        isMockMode: jiraMockMode,
      });
      setJiraFeedback(res.message);
    } catch (e: any) {
      setJiraFeedback(`Error: ${e.message}`);
    } finally {
      setJiraTesting(false);
    }
  };

  const handleSaveJira = async () => {
    try {
      setJiraTesting(true);
      const res = await api.connectJira({
        workspaceId,
        siteUrl: jiraSiteUrl,
        userEmail: jiraUserEmail,
        apiToken: jiraApiToken,
        projectKey: jiraProjectKey,
        isMockMode: jiraMockMode,
      });
      setJiraFeedback(res.message);
      onRefresh();
    } catch (e: any) {
      setJiraFeedback(`Save failed: ${e.message}`);
    } finally {
      setJiraTesting(false);
    }
  };

  const handleTestNotion = async () => {
    try {
      setNotionTesting(true);
      setNotionFeedback(null);
      const res = await api.testNotion({
        apiKey: notionApiKey,
        databaseId: notionDatabaseId,
        isMockMode: notionMockMode,
      });
      setNotionFeedback(res.message);
    } catch (e: any) {
      setNotionFeedback(`Error: ${e.message}`);
    } finally {
      setNotionTesting(false);
    }
  };

  const handleSaveNotion = async () => {
    try {
      setNotionTesting(true);
      const res = await api.connectNotion({
        workspaceId,
        apiKey: notionApiKey,
        databaseId: notionDatabaseId,
        isMockMode: notionMockMode,
      });
      setNotionFeedback(res.message);
      onRefresh();
    } catch (e: any) {
      setNotionFeedback(`Save failed: ${e.message}`);
    } finally {
      setNotionTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Enterprise Integrations & Destinations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure real or simulated API adapters for Jira Cloud, Notion, Email notifications, and Slack webhooks.
          </p>
        </div>
        <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>AES-256 Encrypted Credential Vault</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* JIRA CLOUD INTEGRATION CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                Jira
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Jira Cloud REST API</h3>
                <p className="text-xs text-slate-400">Atlassian Cloud issue generation</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                jira?.connectionStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {jira?.connectionStatus || 'Ready'}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700">Mock Sandbox Simulation</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={jiraMockMode}
                onChange={(e) => setJiraMockMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Site URL</label>
              <input
                type="text"
                value={jiraSiteUrl}
                onChange={(e) => setJiraSiteUrl(e.target.value)}
                placeholder="https://your-domain.atlassian.net"
                className="w-full p-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">User Email</label>
                <input
                  type="email"
                  value={jiraUserEmail}
                  onChange={(e) => setJiraUserEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full p-2 rounded-lg border border-slate-200 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Project Key</label>
                <input
                  type="text"
                  value={jiraProjectKey}
                  onChange={(e) => setJiraProjectKey(e.target.value)}
                  placeholder="PROJ"
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono uppercase text-xs"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">API Token</label>
              <input
                type="password"
                value={jiraApiToken}
                onChange={(e) => setJiraApiToken(e.target.value)}
                placeholder={jiraMockMode ? 'Optional in mock mode' : 'Atlassian API token'}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>
          </div>

          {jiraFeedback && (
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-900 text-xs flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{jiraFeedback}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              onClick={handleTestJira}
              disabled={jiraTesting}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Test Connection
            </button>
            <button
              onClick={handleSaveJira}
              disabled={jiraTesting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>

        {/* NOTION INTEGRATION CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                N
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Notion Database API</h3>
                <p className="text-xs text-slate-400">Dynamic page & backlog sync</p>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                notion?.connectionStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {notion?.connectionStatus || 'Ready'}
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="font-semibold text-slate-700">Mock Sandbox Simulation</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notionMockMode}
                onChange={(e) => setNotionMockMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Database ID</label>
              <input
                type="text"
                value={notionDatabaseId}
                onChange={(e) => setNotionDatabaseId(e.target.value)}
                placeholder="32-character Notion database ID"
                className="w-full p-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Internal Integration Secret</label>
              <input
                type="password"
                value={notionApiKey}
                onChange={(e) => setNotionApiKey(e.target.value)}
                placeholder={notionMockMode ? 'Optional in mock mode' : 'secret_...'}
                className="w-full p-2 rounded-lg border border-slate-200 font-mono text-xs"
              />
            </div>
          </div>

          {notionFeedback && (
            <div className="p-2.5 rounded-lg bg-slate-100 text-slate-900 text-xs flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{notionFeedback}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
            <button
              onClick={handleTestNotion}
              disabled={notionTesting}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              Test Connection
            </button>
            <button
              onClick={handleSaveNotion}
              disabled={notionTesting}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Configuration
            </button>
          </div>
        </div>

        {/* EMAIL & NOTIFICATIONS CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Email Notifications (SMTP)</h3>
              <p className="text-xs text-slate-400">Action assignment & meeting summary digests</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Automated email dispatches are sent to resolved task owners upon successful task creation. Mailtrap or standard SMTP server can be attached via <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">.env</code>.
          </p>
        </div>

        {/* SLACK WEBHOOK CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Slack Incoming Webhook</h3>
              <p className="text-xs text-slate-400">Broadcast approvals & daily standup reminders</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Posts real-time task notifications to team channels. Configured via <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">SLACK_WEBHOOK_URL</code> or through the n8n automation bridge.
          </p>
        </div>
      </div>
    </div>
  );
};
