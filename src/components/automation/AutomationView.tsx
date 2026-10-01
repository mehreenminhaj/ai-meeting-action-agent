import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code,
  ShieldCheck,
  Clock,
  Layers,
} from 'lucide-react';
import { ExecutionRecord, AuditLog } from '../../types';
import { api } from '../../lib/api';
import { formatTimeAgo } from '../../lib/utils';

interface AutomationViewProps {
  executions: ExecutionRecord[];
  auditLogs: AuditLog[];
  onRefresh: () => void;
}

export const AutomationView: React.FC<AutomationViewProps> = ({
  executions,
  auditLogs,
  onRefresh,
}) => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [testingWorkflowId, setTestingWorkflowId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getWorkflows().then((res) => setWorkflows(res.workflows)).catch(console.error);
  }, []);

  const handleTriggerTest = async (wfId: string) => {
    try {
      setTestingWorkflowId(wfId);
      const res = await api.triggerTestWorkflow(wfId);
      setTestMessage(res.message);
      onRefresh();
    } catch (e: any) {
      setTestMessage(`Error: ${e.message}`);
    } finally {
      setTestingWorkflowId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900">n8n Orchestration & Execution History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage external workflow triggers, webhook authentication, and immutable execution records.
          </p>
        </div>
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Webhook Signature: SHA-256</span>
        </div>
      </div>

      {testMessage && (
        <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span>{testMessage}</span>
          </div>
          <button onClick={() => setTestMessage(null)} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* n8n Workflows Gallery */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Available Importable n8n Workflows
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf) => (
            <div
              key={wf.id}
              className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-sm font-bold text-slate-900">{wf.name}</h3>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                    Import Ready
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{wf.description}</p>
                <div className="mt-2.5 p-2 rounded-lg bg-slate-50 font-mono text-[11px] text-slate-600 border border-slate-200">
                  {wf.trigger}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                  {wf.file}
                </span>
                <button
                  onClick={() => handleTriggerTest(wf.id)}
                  disabled={testingWorkflowId === wf.id}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3 h-3" />
                  <span>{testingWorkflowId === wf.id ? 'Dispatching...' : 'Dispatch Test Payload'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Execution Records & Idempotency Log</h2>
          </div>
          <span className="text-xs text-slate-400">{executions.length} recorded events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="pb-2">Destination</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Idempotency Key</th>
                <th className="pb-2">Payload Summary</th>
                <th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {executions.map((exec) => (
                <tr key={exec.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 font-bold uppercase text-slate-800">{exec.provider}</td>
                  <td className="py-2.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        exec.executionStatus === 'succeeded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exec.executionStatus === 'failed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exec.executionStatus}
                    </span>
                  </td>
                  <td className="py-2.5 text-[11px] text-slate-500">{exec.idempotencyKey}</td>
                  <td className="py-2.5 font-sans text-xs text-slate-700 max-w-xs truncate">
                    {exec.requestSummary?.title || 'Execution payload'}
                  </td>
                  <td className="py-2.5 font-sans text-xs text-slate-400 whitespace-nowrap">
                    {formatTimeAgo(exec.startedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
