import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileText,
  ListTodo,
  Quote,
  Clock,
  Layers,
  Trash2,
} from 'lucide-react';
import { ActionItem, Meeting, MeetingAnalysis, MeetingDecision, WorkspaceMember } from '../../types';
import { api } from '../../lib/api';
import { formatDate } from '../../lib/utils';

interface MeetingDetailViewProps {
  meetingId: string;
  members: WorkspaceMember[];
  onBack: () => void;
  onNavigateToApprovals: (actionId?: string) => void;
}

export const MeetingDetailView: React.FC<MeetingDetailViewProps> = ({
  meetingId,
  members,
  onBack,
  onNavigateToApprovals,
}) => {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [analysis, setAnalysis] = useState<MeetingAnalysis | null>(null);
  const [decisions, setDecisions] = useState<MeetingDecision[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'decisions' | 'actions' | 'blockers' | 'questions' | 'transcript'>('summary');
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getMeeting(meetingId);
      setMeeting(res.meeting);
      setAnalysis(res.analysis || null);
      setDecisions(res.decisions);
      setActions(res.actions);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [meetingId]);

  const handleReprocess = async () => {
    try {
      setReprocessing(true);
      const res = await api.processMeeting(meetingId);
      setMeeting(res.meeting);
      setAnalysis(res.analysis);
      setDecisions(res.decisions);
      setActions(res.actionItems);
      setError(null);
    } catch (e: any) {
      setError(`Reprocessing failed: ${e.message}`);
    } finally {
      setReprocessing(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this meeting and its extracted records?')) return;
    try {
      await api.deleteMeeting(meetingId);
      onBack();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-semibold">Loading meeting analysis & records...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-sm font-bold text-slate-800">Meeting not found</p>
        <button onClick={onBack} className="mt-3 text-xs text-indigo-600 underline">
          &larr; Return to Meetings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  meeting.processingStatus === 'needs_review'
                    ? 'bg-amber-100 text-amber-800'
                    : meeting.processingStatus === 'completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                {meeting.processingStatus.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400">Date: {formatDate(meeting.meetingDate)}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">{meeting.title}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${reprocessing ? 'animate-spin' : ''}`} />
            <span>{reprocessing ? 'Reprocessing...' : 'Rerun AI Analysis'}</span>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
            title="Delete Meeting"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 border-b border-slate-200 pb-px">
        {[
          { id: 'summary', label: 'Summary & Synthesis', icon: FileText, count: undefined },
          { id: 'decisions', label: 'Decisions', icon: CheckCircle2, count: decisions.length },
          { id: 'actions', label: 'Action Items', icon: ListTodo, count: actions.length },
          { id: 'blockers', label: 'Blockers & Risks', icon: AlertTriangle, count: analysis?.blockersAndRisks.length },
          { id: 'questions', label: 'Open Questions', icon: HelpCircle, count: analysis?.openQuestions.length },
          { id: 'transcript', label: 'Original Transcript', icon: Quote, count: undefined },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Overview</h2>
            <p className="text-sm text-slate-800 leading-relaxed font-serif">
              {analysis?.summary.executiveSummary || 'Analysis pending or not available.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discussion Points */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Key Discussion Points
              </h2>
              <ul className="space-y-2">
                {analysis?.summary.mainDiscussionPoints.map((pt, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Follow-up Agenda */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Suggested Follow-up Agenda
              </h2>
              <ul className="space-y-2">
                {analysis?.summary.suggestedFollowUpAgenda.map((agenda, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start space-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                    <span>{agenda}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Decisions */}
      {activeTab === 'decisions' && (
        <div className="space-y-4">
          {decisions.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center bg-white rounded-2xl border">
              No explicit decisions found in transcript.
            </p>
          ) : (
            decisions.map((dec) => (
              <div key={dec.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      dec.decisionStatus === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {dec.decisionStatus} Decision
                  </span>
                  {dec.decisionMaker && (
                    <span className="text-[11px] text-slate-500">
                      Decided by: <strong>{dec.decisionMaker}</strong>
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{dec.statement}</h3>
                {dec.context && <p className="text-xs text-slate-600">{dec.context}</p>}
                {dec.evidence?.quote && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs italic text-slate-600">
                    "{dec.evidence.quote}" ({dec.evidence.speaker || 'Speaker'}, {dec.evidence.timestamp || 'N/A'})
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Action Items */}
      {activeTab === 'actions' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => onNavigateToApprovals()}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
            >
              Open in Review & Approval View &rarr;
            </button>
          </div>
          {actions.map((act) => {
            const member = members.find((m) => m.id === act.ownerMemberId);
            return (
              <div
                key={act.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        act.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {act.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{act.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">{act.description}</p>
                  <div className="mt-1 flex items-center space-x-3 text-[11px] text-slate-400">
                    <span>Assignee: <strong className="text-slate-700">{member?.displayName || act.statedOwner || 'Unassigned'}</strong></span>
                    <span>Due: <strong className="text-slate-700">{formatDate(act.dueDate)}</strong></span>
                    <span>Priority: {act.priority.toUpperCase()}</span>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateToApprovals(act.id)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  Review Item
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: Blockers & Risks */}
      {activeTab === 'blockers' && (
        <div className="space-y-3">
          {(analysis?.blockersAndRisks || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center bg-white rounded-2xl border">
              No active blockers or architectural risks identified.
            </p>
          ) : (
            analysis?.blockersAndRisks.map((b, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-rose-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    {b.requiresEscalation ? 'Requires Escalation' : 'Known Risk'}
                  </span>
                  {b.responsiblePerson && (
                    <span className="text-xs text-slate-500">Contact: {b.responsiblePerson}</span>
                  )}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">{b.description}</h3>
                {b.proposedNextStep && (
                  <p className="text-xs text-slate-600">
                    <strong>Mitigation:</strong> {b.proposedNextStep}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 5: Open Questions */}
      {activeTab === 'questions' && (
        <div className="space-y-3">
          {(analysis?.openQuestions || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center bg-white rounded-2xl border">
              No unanswered questions flagged.
            </p>
          ) : (
            analysis?.openQuestions.map((q, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border border-purple-200 shadow-xs space-y-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                  Unanswered Discussion Point
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1">{q.question}</p>
                {q.context && <p className="text-xs text-slate-500">{q.context}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 6: Original Transcript Viewer */}
      {activeTab === 'transcript' && (
        <div className="p-5 rounded-2xl bg-slate-900 text-slate-100 shadow-md font-mono text-xs leading-relaxed space-y-2 max-h-[600px] overflow-y-auto">
          {meeting.transcriptText.split('\n').map((line, idx) => {
            const isSpeaker = line.match(/^(\[[\d:]+\]\s*)?([A-Za-z\s]+?):/);
            return (
              <div key={idx} className="py-0.5 hover:bg-slate-800/80 px-2 rounded">
                {isSpeaker ? (
                  <>
                    <span className="text-purple-400 font-bold">{isSpeaker[0]}</span>
                    <span className="text-slate-300">{line.slice(isSpeaker[0].length)}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{line}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
