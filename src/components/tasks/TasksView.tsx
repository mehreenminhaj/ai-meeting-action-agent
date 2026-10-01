import React, { useState } from 'react';
import {
  ListTodo,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  Columns,
  Table as TableIcon,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { ActionItem, WorkspaceMember } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface TasksViewProps {
  actions: ActionItem[];
  members: WorkspaceMember[];
  onRefresh: () => void;
  onNavigateToApprovals: (id?: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  actions,
  members,
  onRefresh,
  onNavigateToApprovals,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'board'>('board');
  const [destinationFilter, setDestinationFilter] = useState<'all' | 'jira' | 'notion'>('all');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (actionId: string, provider?: 'jira' | 'notion') => {
    try {
      setRetryingId(actionId);
      await api.retryAction(actionId, provider);
      onRefresh();
    } catch (e: any) {
      alert(`Retry error: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const filtered = actions.filter((act) => {
    if (destinationFilter === 'all') return true;
    return act.targetDestinations.includes(destinationFilter);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Task Lifecycle & Workstream Tracker</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor synchronized external tasks across Jira and Notion with verifiable external links and idempotent retry controls.
          </p>
        </div>

        {/* View Switcher & Filters */}
        <div className="flex items-center space-x-2">
          {/* Destination Filter */}
          <select
            value={destinationFilter}
            onChange={(e) => setDestinationFilter(e.target.value as any)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 font-semibold cursor-pointer"
          >
            <option value="all">All Destinations</option>
            <option value="jira">Jira Only</option>
            <option value="notion">Notion Only</option>
          </select>

          {/* Toggle Table vs Board */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center space-x-1">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'board' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: Awaiting Human Review */}
          <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Needs Approval ({filtered.filter((a) => a.status === 'pending_review' || a.status === 'flagged_clarification').length})
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filtered
                .filter((a) => a.status === 'pending_review' || a.status === 'flagged_clarification')
                .map((item) => {
                  const member = members.find((m) => m.id === item.ownerMemberId);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 transition-all space-y-2 cursor-pointer"
                      onClick={() => onNavigateToApprovals(item.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.targetDestinations.join(' & ').toUpperCase()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2">{item.title}</h4>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{member?.displayName || item.statedOwner || 'Unassigned'}</span>
                        <span>{formatDate(item.dueDate)}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Column 2: Approved / Synchronizing */}
          <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Approved ({filtered.filter((a) => a.status === 'approved' && (!a.externalTasks || a.externalTasks.length === 0)).length})
              </span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filtered
                .filter((a) => a.status === 'approved' && (!a.externalTasks || a.externalTasks.length === 0))
                .map((item) => {
                  const member = members.find((m) => m.id === item.ownerMemberId);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white border border-indigo-200 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          Approved
                        </span>
                        <span className="text-[10px] text-indigo-600 font-semibold">Queued Dispatch</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>{member?.displayName || 'Unassigned'}</span>
                        <button
                          onClick={() => handleRetry(item.id)}
                          className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                        >
                          Execute Now
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Column 3: External Synchronized (Jira & Notion) */}
          <div className="bg-slate-100/70 rounded-2xl p-4 border border-slate-200 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Synchronized ({filtered.filter((a) => a.externalTasks && a.externalTasks.length > 0).length})
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto">
              {filtered
                .filter((a) => a.externalTasks && a.externalTasks.length > 0)
                .map((item) => {
                  const member = members.find((m) => m.id === item.ownerMemberId);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white border border-emerald-200 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Synchronized</span>
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(item.dueDate)}</span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>

                      {/* Direct External Links */}
                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        {item.externalTasks?.map((task) => (
                          <a
                            key={task.id}
                            href={task.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors"
                          >
                            <span className="font-bold text-[10px] uppercase text-indigo-700">
                              {task.provider}: {task.externalKey || task.externalId}
                            </span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Assignee: {member?.displayName || 'Unassigned'}</span>
                        <button
                          onClick={() => handleRetry(item.id)}
                          disabled={retryingId === item.id}
                          className="text-[11px] text-slate-400 hover:text-slate-700 flex items-center space-x-1 cursor-pointer"
                          title="Re-verify or sync missing destinations"
                        >
                          <RotateCcw className={`w-3 h-3 ${retryingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Sync</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">External Destinations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => {
                  const member = members.find((m) => m.id === item.ownerMemberId);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 max-w-xs truncate">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {member?.displayName || item.statedOwner || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(item.dueDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            item.priority === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : item.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          {item.externalTasks && item.externalTasks.length > 0 ? (
                            item.externalTasks.map((t) => (
                              <a
                                key={t.id}
                                href={t.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] hover:underline inline-flex items-center space-x-1"
                              >
                                <span>{t.externalKey || t.provider}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Not created</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {item.status === 'approved' ? (
                          <button
                            onClick={() => handleRetry(item.id)}
                            className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                          >
                            Execute
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigateToApprovals(item.id)}
                            className="text-xs text-slate-600 font-semibold hover:underline cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
