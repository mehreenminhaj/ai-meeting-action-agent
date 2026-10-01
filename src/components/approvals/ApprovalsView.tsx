import React, { useState } from 'react';
import {
  CheckSquare,
  AlertCircle,
  HelpCircle,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Quote,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  Send,
  Edit3,
} from 'lucide-react';
import { ActionItem, WorkspaceMember } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface ApprovalsViewProps {
  actions: ActionItem[];
  members: WorkspaceMember[];
  onRefresh: () => void;
  highlightId?: string;
}

export const ApprovalsView: React.FC<ApprovalsViewProps> = ({
  actions,
  members,
  onRefresh,
  highlightId,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'flagged' | 'approved'>('pending');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Edit buffer state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOwnerId, setEditOwnerId] = useState<string>('');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDestinations, setEditDestinations] = useState<('jira' | 'notion')[]>(['jira']);

  // Clarification input
  const [clarificationItemId, setClarificationItemId] = useState<string | null>(null);
  const [clarificationQuestion, setClarificationQuestion] = useState('');

  // Selected for bulk
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const toggleEvidence = (id: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const startEditing = (item: ActionItem) => {
    setEditingItemId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditOwnerId(item.ownerMemberId || '');
    setEditDueDate(item.dueDate || '');
    setEditPriority(item.priority);
    setEditDestinations(item.targetDestinations || ['jira']);
  };

  const saveEdit = async (item: ActionItem) => {
    try {
      setIsProcessing(true);
      await api.updateAction(item.id, {
        title: editTitle,
        description: editDescription,
        ownerMemberId: editOwnerId || null,
        dueDate: editDueDate || null,
        priority: editPriority,
        targetDestinations: editDestinations,
      });
      setEditingItemId(null);
      setFeedback({ message: 'Action item updated. (Approval re-review required if previously approved)', type: 'success' });
      onRefresh();
    } catch (e: any) {
      setFeedback({ message: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (actionId: string) => {
    try {
      setIsProcessing(true);
      const res = await api.approveAction(actionId);
      setFeedback({ message: 'Approved! Dispatched to configured task destinations.', type: 'success' });
      onRefresh();
    } catch (e: any) {
      setFeedback({ message: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (actionId: string) => {
    const reason = window.prompt('Optional: State reason for rejection:');
    try {
      setIsProcessing(true);
      await api.rejectAction(actionId, reason || undefined);
      setFeedback({ message: 'Action item marked as rejected.', type: 'success' });
      onRefresh();
    } catch (e: any) {
      setFeedback({ message: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitClarification = async (actionId: string) => {
    if (!clarificationQuestion.trim()) return;
    try {
      setIsProcessing(true);
      await api.requestClarification(actionId, clarificationQuestion.trim());
      setClarificationItemId(null);
      setClarificationQuestion('');
      setFeedback({ message: 'Clarification question attached to action item.', type: 'success' });
      onRefresh();
    } catch (e: any) {
      setFeedback({ message: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsProcessing(true);
      const res = await api.bulkApprove(selectedIds);
      setFeedback({ message: `Successfully bulk-approved ${res.count} eligible action items!`, type: 'success' });
      setSelectedIds([]);
      onRefresh();
    } catch (e: any) {
      setFeedback({ message: e.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter actions
  const filteredActions = actions.filter((a) => {
    if (filter === 'pending') return a.status === 'pending_review';
    if (filter === 'flagged') return a.status === 'flagged_clarification' || a.ambiguityFlags.length > 0;
    if (filter === 'approved') return a.status === 'approved';
    return true;
  });

  const eligibleForBulk = filteredActions.filter((a) => a.status === 'pending_review' && Boolean(a.ownerMemberId));

  return (
    <div className="space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Human-in-the-Loop Review & Approvals</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict human verification gate. No external Jira ticket or Notion task is created without explicit authorized approval.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'pending', label: `Pending (${actions.filter((a) => a.status === 'pending_review').length})` },
            { id: 'flagged', label: `Needs Clarification (${actions.filter((a) => a.status === 'flagged_clarification' || a.ambiguityFlags.length > 0).length})` },
            { id: 'approved', label: `Approved (${actions.filter((a) => a.status === 'approved').length})` },
            { id: 'all', label: `All (${actions.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Bulk Approval Bar */}
      {eligibleForBulk.length > 0 && filter === 'pending' && (
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="text-xs font-bold text-indigo-950">Bulk Approval Available</p>
              <p className="text-[11px] text-indigo-700">
                {eligibleForBulk.length} items have resolved assignees, explicit context, and zero unresolved blockers.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedIds(eligibleForBulk.map((a) => a.id))}
              className="text-xs font-semibold text-indigo-700 hover:underline px-2 py-1"
            >
              Select All Eligible ({eligibleForBulk.length})
            </button>
            <button
              disabled={isProcessing || selectedIds.length === 0}
              onClick={handleBulkApprove}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Approve Selected ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Action Item Cards */}
      {filteredActions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No action items in this filter view</p>
          <p className="text-xs text-slate-400 mt-1">Select another tab or ingest a new transcript.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActions.map((action) => {
            const isEditing = editingItemId === action.id;
            const isSelected = selectedIds.includes(action.id);
            const isHighlighted = highlightId === action.id;
            const evidenceOpen = Boolean(expandedEvidence[action.id]);
            const assignedMember = members.find((m) => m.id === action.ownerMemberId);

            return (
              <div
                key={action.id}
                className={`bg-white rounded-2xl border shadow-xs transition-all overflow-hidden ${
                  isHighlighted ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header & Main Fields */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      {filter === 'pending' && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds([...selectedIds, action.id]);
                            else setSelectedIds(selectedIds.filter((id) => id !== action.id));
                          }}
                          className="mt-1 h-4 w-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                      )}
                      <div>
                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              action.priority === 'high'
                                ? 'bg-rose-100 text-rose-800'
                                : action.priority === 'medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {action.priority} Priority
                          </span>

                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                              action.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : action.status === 'rejected'
                                ? 'bg-slate-200 text-slate-700'
                                : action.status === 'flagged_clarification'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {action.status.replace('_', ' ')}
                          </span>

                          {/* Destination Tags */}
                          {action.targetDestinations.map((dest) => (
                            <span
                              key={dest}
                              className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              &rarr; {dest}
                            </span>
                          ))}

                          {action.confidence === 'high' ? (
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                              High Confidence
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              Moderate Confidence
                            </span>
                          )}
                        </div>

                        {/* Title & Description (Editable or View) */}
                        {isEditing ? (
                          <div className="space-y-3 mt-2">
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Task Title</label>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full text-sm font-bold text-slate-900 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-600">Description</label>
                              <textarea
                                rows={2}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full text-xs text-slate-700 border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {action.title}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{action.description}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Edit Trigger */}
                    {!isEditing && (
                      <button
                        onClick={() => startEditing(action)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit task parameters"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Metadata Row: Assignee, Deadline, Destinations */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* Assignee */}
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Assigned Owner</span>
                      {isEditing ? (
                        <select
                          value={editOwnerId}
                          onChange={(e) => setEditOwnerId(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white"
                        >
                          <option value="">(Unassigned)</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.displayName} ({m.role})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span
                            className={`font-semibold ${
                              assignedMember ? 'text-slate-800' : 'text-amber-600 italic'
                            }`}
                          >
                            {assignedMember ? assignedMember.displayName : action.statedOwner || 'Unassigned'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Deadline */}
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">Due Date</span>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full text-xs border border-slate-300 rounded-md p-1.5 bg-white"
                        />
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {formatDate(action.dueDate)}
                          </span>
                          <span className="text-[10px] text-slate-400">({action.deadlineBasis})</span>
                        </div>
                      )}
                    </div>

                    {/* Destination Selection */}
                    <div>
                      <span className="text-[11px] text-slate-400 font-semibold block mb-0.5">
                        Target System(s)
                      </span>
                      {isEditing ? (
                        <div className="flex items-center space-x-3 pt-1">
                          <label className="flex items-center space-x-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDestinations.includes('jira')}
                              onChange={(e) => {
                                if (e.target.checked) setEditDestinations([...editDestinations, 'jira']);
                                else setEditDestinations(editDestinations.filter((d) => d !== 'jira'));
                              }}
                            />
                            <span>Jira</span>
                          </label>
                          <label className="flex items-center space-x-1 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editDestinations.includes('notion')}
                              onChange={(e) => {
                                if (e.target.checked) setEditDestinations([...editDestinations, 'notion']);
                                else setEditDestinations(editDestinations.filter((d) => d !== 'notion'));
                              }}
                            />
                            <span>Notion</span>
                          </label>
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {action.targetDestinations.map((d) => d.toUpperCase()).join(' & ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ambiguity Warnings & Clarification Needed */}
                  {(action.ambiguityFlags.length > 0 || action.clarificationQuestions.length > 0) && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-amber-900 font-bold text-xs">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Ambiguity Flags Detected by AI Agent:</span>
                      </div>
                      <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5 pl-1">
                        {action.ambiguityFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                      {action.clarificationQuestions.length > 0 && (
                        <div className="pt-1 text-xs text-amber-900">
                          <span className="font-semibold">Questions to resolve: </span>
                          <span>{action.clarificationQuestions.join('; ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Acceptance Criteria */}
                  {action.acceptanceCriteria.length > 0 && (
                    <div className="mt-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700">Acceptance Criteria:</span>
                      <ul className="list-disc list-inside space-y-0.5 mt-0.5 pl-1 text-[11px] text-slate-500">
                        {action.acceptanceCriteria.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence Drawer Toggle */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleEvidence(action.id)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <Quote className="w-3.5 h-3.5" />
                      <span>{evidenceOpen ? 'Hide Transcript Evidence' : 'View Transcript Evidence'}</span>
                      {evidenceOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Card Actions Toolbar */}
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingItemId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(action)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setClarificationItemId(action.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium flex items-center space-x-1 cursor-pointer"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Flag Question</span>
                        </button>
                        <button
                          onClick={() => handleReject(action.id)}
                          disabled={action.status === 'rejected'}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleApprove(action.id)}
                          disabled={action.status === 'approved' || isProcessing}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{action.status === 'approved' ? 'Approved' : 'Approve & Execute'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expandable Transcript Evidence Drawer */}
                  {evidenceOpen && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Speaker: <strong>{action.evidence.speaker || 'Unknown'}</strong></span>
                        {action.evidence.timestamp && <span>Timestamp: {action.evidence.timestamp}</span>}
                      </div>
                      <blockquote className="italic text-slate-700 font-serif border-l-2 border-indigo-400 pl-2.5 py-0.5">
                        "{action.evidence.quote}"
                      </blockquote>
                    </div>
                  )}

                  {/* Clarification Input Prompt Box */}
                  {clarificationItemId === action.id && (
                    <div className="mt-3 p-3 rounded-xl bg-purple-50 border border-purple-200 space-y-2">
                      <label className="text-xs font-bold text-purple-900 block">
                        Add Clarification Question for Reviewer
                      </label>
                      <input
                        type="text"
                        value={clarificationQuestion}
                        onChange={(e) => setClarificationQuestion(e.target.value)}
                        placeholder="e.g., Which engineer will take the frontend components?"
                        className="w-full text-xs p-2 rounded-lg border border-purple-300 bg-white"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setClarificationItemId(null)}
                          className="px-2.5 py-1 text-xs text-slate-600"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitClarification(action.id)}
                          className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg"
                        >
                          Attach Question
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
