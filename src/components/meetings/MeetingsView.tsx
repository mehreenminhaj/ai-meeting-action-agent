import React, { useState } from 'react';
import {
  FileText,
  Search,
  PlusCircle,
  Calendar,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Meeting } from '../../types';
import { formatDate } from '../../lib/utils';

interface MeetingsViewProps {
  meetings: Meeting[];
  onSelectMeeting: (meetingId: string) => void;
  onOpenIngest: () => void;
}

export const MeetingsView: React.FC<MeetingsViewProps> = ({
  meetings,
  onSelectMeeting,
  onOpenIngest,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.transcriptText.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.processingStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Meeting Repository</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            All ingested audio transcripts, notes, and AI-extracted deliverable summaries
          </p>
        </div>
        <button
          onClick={onOpenIngest}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ingest Transcript</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transcripts or titles..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Meeting Cards List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No meetings match your criteria</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or ingest a sample transcript.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((meeting) => (
            <div
              key={meeting.id}
              onClick={() => onSelectMeeting(meeting.id)}
              className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      meeting.processingStatus === 'needs_review'
                        ? 'bg-amber-100 text-amber-800'
                        : meeting.processingStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : meeting.processingStatus === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {meeting.processingStatus.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {meeting.sourceType.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {meeting.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {meeting.transcriptText.slice(0, 140)}...
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(meeting.meetingDate)}</span>
                </div>
                <div className="flex items-center space-x-1 text-indigo-600 font-medium">
                  <span>Open Analysis</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
