import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Upload,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { SampleTranscript } from '../../types';
import { api } from '../../lib/api';

interface MeetingIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onMeetingCreated: (meetingId: string) => void;
}

export const MeetingIngestModal: React.FC<MeetingIngestModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  onMeetingCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'upload' | 'sample'>('sample');
  const [samples, setSamples] = useState<SampleTranscript[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');

  // Form fields
  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [transcriptText, setTranscriptText] = useState('');
  const [sourceType, setSourceType] = useState<'paste' | 'upload' | 'sample'>('sample');
  const [autoProcess, setAutoProcess] = useState(true);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getSampleTranscripts().then((res) => {
        setSamples(res.samples);
        if (res.samples.length > 0 && !selectedSampleId) {
          loadSample(res.samples[0]);
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  const loadSample = (sample: SampleTranscript) => {
    setSelectedSampleId(sample.id);
    setTitle(sample.title);
    setMeetingDate(sample.meetingDate);
    setTranscriptText(sample.transcriptText);
    setSourceType('sample');
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB for text)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit. Please upload a smaller text transcript.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setTranscriptText(text);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
        }
        setSourceType('upload');
        setError(null);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file content.');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a meeting title.');
      return;
    }
    if (!transcriptText.trim()) {
      setError('Please provide or upload transcript content.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createMeeting(workspaceId, {
        title,
        meetingDate,
        timezone,
        sourceType,
        transcriptText,
        autoProcess,
      });

      onMeetingCreated(res.meeting.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest and process meeting transcript.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;
  const lineCount = transcriptText.split('\n').filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Ingest Meeting Transcript</h2>
              <p className="text-xs text-slate-500">
                Transform spoken dialogue into verified decisions, assignees, and Jira/Notion tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Method Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex space-x-4">
          <button
            onClick={() => {
              setActiveTab('sample');
              setSourceType('sample');
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'sample'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Preloaded Samples (1-Click)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('paste');
              setSourceType('paste');
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Transcript Text</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('upload');
              setSourceType('upload');
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.txt, .md)</span>
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Sample Transcripts Picker Tab */}
          {activeTab === 'sample' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select a Production Sample Transcript
                </label>
                <span className="text-[11px] text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded-md">
                  Includes speakers, dates & blockers
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {samples.map((sample) => {
                  const isSelected = selectedSampleId === sample.id;
                  return (
                    <div
                      key={sample.id}
                      onClick={() => loadSample(sample)}
                      className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{sample.title}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{sample.description}</p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Date: {sample.meetingDate}</span>
                        <span className="text-indigo-600 font-medium">Load &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* File Upload Tab */}
          {activeTab === 'upload' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700 mb-1">
                Drag & drop your transcript file, or <span className="text-indigo-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mb-4">Supports .txt, .md, and text documents up to 5MB</p>
              <input
                type="file"
                accept=".txt,.md,.text"
                onChange={handleFileUpload}
                className="hidden"
                id="transcript-file-input"
              />
              <label
                htmlFor="transcript-file-input"
                className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
              >
                <FileCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Select File from Disk</span>
              </label>
            </div>
          )}

          {/* Metadata Fields: Title, Date, Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Cloud Migration & Architecture Review"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Meeting Date</span>
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          {/* Transcript Content Textarea & Live Character / Word Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Transcript Content <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {wordCount} words &bull; {lineCount} lines
              </span>
            </div>
            <textarea
              rows={8}
              value={transcriptText}
              onChange={(e) => setTranscriptText(e.target.value)}
              placeholder="Paste dialogue transcript here, e.g.:&#10;[00:01:20] Sarah: We need to finalize the database cutover plan by Thursday...&#10;[00:02:00] Alex: I will run the staging failover test and post the runbook."
              className="w-full font-mono text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 leading-relaxed"
              required
            />
          </div>

          {/* Options: Auto-process toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-xs font-bold text-purple-900">Run AI Multi-Stage Extraction Pipeline Immediately</p>
                <p className="text-[11px] text-purple-700">
                  Extracts decisions, action items, matches workspace members, and flags ambiguities.
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title || !transcriptText}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-sm flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing with AI Agent...</span>
                </>
              ) : (
                <>
                  <span>Ingest & Start Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
