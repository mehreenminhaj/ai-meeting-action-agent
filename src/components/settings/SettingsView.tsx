import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Users,
  Sparkles,
  Shield,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Workspace, WorkspaceMember } from '../../types';
import { api } from '../../lib/api';

interface SettingsViewProps {
  workspace: Workspace | null;
  members: WorkspaceMember[];
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  workspace,
  members,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'workspace' | 'ai'>('members');

  // Add member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'owner' | 'admin' | 'member'>('member');
  const [newAliases, setNewAliases] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace) return;
    try {
      const aliasesArray = newAliases.split(',').map((a) => a.trim()).filter(Boolean);
      await api.addMember(workspace.id, {
        displayName: newDisplayName,
        email: newEmail,
        role: newRole,
        aliases: aliasesArray,
      });
      setShowAddMember(false);
      setNewDisplayName('');
      setNewEmail('');
      setNewAliases('');
      setFeedback('New workspace member registered into directory.');
      onRefresh();
    } catch (e: any) {
      alert(`Failed to add member: ${e.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workspace Settings & Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage known assignees for AI person resolution, timezone rules, and model provider configurations.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Member Directory ({members.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('workspace')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'workspace'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workspace Preferences</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all cursor-pointer ${
            activeTab === 'ai'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI Model Configuration</span>
        </button>
      </div>

      {/* TAB 1: Member Directory */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Workspace Assignee Directory
              </h2>
              <p className="text-xs text-slate-500">
                The AI extraction engine resolves spoken names and email addresses against this directory.
              </p>
            </div>
            <button
              onClick={() => setShowAddMember(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900">{member.displayName}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                      {member.role}
                    </span>
                  </div>
                  <p className="text-slate-500">{member.email}</p>
                  {member.aliases.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Aliases: {member.aliases.map((a) => `"${a}"`).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Status: <strong className="text-emerald-600">Active</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Add Member Modal Dialog */}
          {showAddMember && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Add Workspace Member</h3>
                <form onSubmit={handleAddMember} className="space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="e.g. Jordan Hayes"
                      className="w-full p-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="jordan.hayes@acme.io"
                      className="w-full p-2 rounded-lg border border-slate-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Aliases (comma-separated)</label>
                    <input
                      type="text"
                      value={newAliases}
                      onChange={(e) => setNewAliases(e.target.value)}
                      placeholder="e.g. Jordan, jhayes, Jord"
                      className="w-full p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Workspace Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>

                  <div className="pt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                    >
                      Save Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Workspace Preferences */}
      {activeTab === 'workspace' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Workspace Name</label>
            <input
              type="text"
              defaultValue={workspace?.name}
              className="w-full p-2 rounded-lg border border-slate-200 text-sm"
              disabled
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Timezone for Calendar Anchors</label>
            <input
              type="text"
              defaultValue={workspace?.timezone || 'America/Los_Angeles'}
              className="w-full p-2 rounded-lg border border-slate-200 font-mono text-xs"
              disabled
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Relative dates like "next Thursday" are resolved relative to this timezone and the meeting date.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: AI Model Configuration */}
      {activeTab === 'ai' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">AI Extraction Model Stack</h3>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-purple-950">
              <span>Primary Engine: Google GenAI (gemini-3.8-flash)</span>
              <span className="text-[10px] uppercase font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                Active
              </span>
            </div>
            <p className="text-purple-800 text-[11px]">
              Configured with structured JSON schema output, prompt injection defense wrappers, and zero-hallucination guardrails.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1 text-slate-600">
            <span className="font-semibold text-slate-800">Deterministic Fallback: High-Fidelity Mock Provider</span>
            <p className="text-[11px]">
              Available offline and during test suite executions to prevent unexpected API costs and enable seamless offline demo workflows.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
