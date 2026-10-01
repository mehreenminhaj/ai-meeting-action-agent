import React from 'react';
import {
  FileText,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Calendar,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import { DashboardMetrics, ExecutionRecord, AuditLog } from '../../types';
import { formatDate, formatTimeAgo } from '../../lib/utils';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  recentMeetings: any[];
  pendingApprovals: any[];
  upcomingDeadlines: any[];
  executionActivity: { executions: ExecutionRecord[]; auditLogs: AuditLog[] };
  onNavigate: (tab: string, meta?: any) => void;
  onOpenIngest: () => void;
  onApproveAction: (actionId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  recentMeetings,
  pendingApprovals,
  upcomingDeadlines,
  executionActivity,
  onNavigate,
  onOpenIngest,
  onApproveAction,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold mb-2 border border-purple-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agentic Orchestration Active</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Meeting-to-Action Executive Hub
          </h1>
          <p className="text-sm text-purple-200/80 mt-1">
            Analyzing spoken dialogues, extracting deterministic deliverables, and synchronizing verified tasks to Jira and Notion with human-in-the-loop review.
          </p>
        </div>
        <div className="z-10 flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenIngest}
            className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Ingest New Meeting</span>
          </button>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold border border-white/20 transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <span>Review Pending ({metrics?.pendingApprovals || 0})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Meetings Processed */}
        <div
          onClick={() => onNavigate('meetings')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meetings Processed</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.meetingsProcessed ?? 0}</span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> 100% analyzed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Multi-stage pipeline</p>
        </div>

        {/* Metric 2: Action Items Extracted */}
        <div
          onClick={() => onNavigate('tasks')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Action Items</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.actionItemsExtracted ?? 0}</span>
            <span className="text-xs text-slate-500">extracted items</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Anchored with transcript evidence</p>
        </div>

        {/* Metric 3: Pending Approvals */}
        <div
          onClick={() => onNavigate('approvals')}
          className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-950">{metrics?.pendingApprovals ?? 0}</span>
            <span className="text-xs text-amber-700 font-semibold">awaiting review</span>
          </div>
          <p className="text-xs text-amber-800/80 mt-1">Human-in-the-loop requirement</p>
        </div>

        {/* Metric 4: Tasks Created */}
        <div
          onClick={() => onNavigate('tasks')}
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks Synchronized</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{metrics?.tasksCreated ?? 0}</span>
            <span className="text-xs text-slate-500">
              ({metrics?.jiraTasksCount ?? 0} Jira &bull; {metrics?.notionTasksCount ?? 0} Notion)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Idempotent execution verified</p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Priority Pending Approvals & Recent Meetings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Pending Approvals Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-sm font-bold text-slate-900">Priority Approvals Awaiting Review</h2>
              </div>
              <button
                onClick={() => onNavigate('approvals')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <span>View All ({pendingApprovals.length})</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">All action items reviewed!</p>
                <p className="text-xs text-slate-400 mt-0.5">Ingest another meeting transcript to generate tasks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            item.priority === 'high'
                              ? 'bg-rose-100 text-rose-800'
                              : item.priority === 'medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                      <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                        <span>Assignee: <strong className="text-slate-600">{item.assignedMemberName}</strong></span>
                        <span>Due: <strong className="text-slate-600">{formatDate(item.dueDate)}</strong></span>
                        <span>Source: {item.meetingTitle}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => onApproveAction(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => onNavigate('approvals', { highlightId: item.id })}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-medium cursor-pointer"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Meetings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Recent Analyzed Meetings</h2>
              <button
                onClick={() => onNavigate('meetings')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
              >
                <span>All Meetings</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Meeting Title</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Decisions</th>
                    <th className="pb-2">Actions</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentMeetings.map((mtg) => (
                    <tr
                      key={mtg.id}
                      onClick={() => onNavigate('meetings', { meetingId: mtg.id })}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3 font-semibold text-slate-800">
                        <div>{mtg.title}</div>
                        {mtg.executiveSummary && (
                          <div className="text-[11px] font-normal text-slate-400 line-clamp-1 mt-0.5">
                            {mtg.executiveSummary}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">{formatDate(mtg.meetingDate)}</td>
                      <td className="py-3 text-slate-600 font-medium">{mtg.decisionsCount}</td>
                      <td className="py-3 text-slate-600 font-medium">{mtg.actionsCount}</td>
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            mtg.processingStatus === 'needs_review'
                              ? 'bg-amber-100 text-amber-800'
                              : mtg.processingStatus === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {mtg.processingStatus.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-indigo-600 font-medium hover:underline">View &rarr;</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Column: Deadlines & Live Execution Activity */}
        <div className="space-y-6">
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-slate-900">Upcoming Deadlines (7 Days)</h2>
              </div>
              <span className="text-xs text-slate-400">{upcomingDeadlines.length} tasks</span>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming deadlines within 7 days.</p>
            ) : (
              <div className="space-y-2.5">
                {upcomingDeadlines.map((dl) => (
                  <div
                    key={dl.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 flex items-start justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">{dl.title}</p>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                        <span>{dl.ownerName}</span>
                        <span>&bull;</span>
                        <span className="font-mono text-purple-700 font-medium">{dl.dueDate}</span>
                      </div>
                    </div>
                    {dl.isOverdue ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0">
                        Overdue
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 shrink-0 uppercase">
                        {dl.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execution Activity & Audit Log */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Live Execution Ledger</h2>
              </div>
              <button
                onClick={() => onNavigate('automation')}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                History
              </button>
            </div>

            <div className="space-y-3">
              {executionActivity.executions.slice(0, 4).map((exec) => (
                <div key={exec.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider px-1.5 py-0.2 rounded bg-slate-100">
                      {exec.provider}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        exec.executionStatus === 'succeeded'
                          ? 'text-emerald-600'
                          : exec.executionStatus === 'failed'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {exec.executionStatus}
                    </span>
                  </div>
                  <p className="text-slate-600 line-clamp-1">{exec.requestSummary?.title || 'Execution payload'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatTimeAgo(exec.startedAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
