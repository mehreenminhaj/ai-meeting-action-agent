import React, { useState } from 'react';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api';

export const TestRunnerView: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{
    passed: number;
    failed: number;
    total: number;
    durationMs: number;
    results: Array<{ suite: string; name: string; passed: boolean; durationMs: number; error?: string }>;
  } | null>(null);

  const handleRunTests = async () => {
    try {
      setRunning(true);
      const res = await api.runAllTests();
      setSummary(res);
    } catch (e: any) {
      alert(`Test runner error: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Automated Test Suite Runner</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Execute unit and integration tests directly in the browser to verify domain logic, identity matching, and idempotency guarantees.
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={running}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm flex items-center space-x-2 cursor-pointer self-start sm:self-auto"
        >
          <Play className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
          <span>{running ? 'Executing Test Suites...' : 'Run All Test Suites (10+)'}</span>
        </button>
      </div>

      {/* Summary Scorecard if run */}
      {summary && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Total Suites</span>
            <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Passed</span>
            <p className="text-2xl font-bold text-emerald-600 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-1" />
              {summary.passed}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Failed</span>
            <p className={`text-2xl font-bold ${summary.failed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {summary.failed}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Execution Time</span>
            <p className="text-2xl font-bold text-indigo-600">{summary.durationMs}ms</p>
          </div>
        </div>
      )}

      {/* Test Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Test Suite Assertions</span>
          <span className="text-xs text-slate-400">Coverage: Engine, Security, Adapters</span>
        </div>

        {!summary ? (
          <div className="p-12 text-center">
            <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Ready to execute automated test suites</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Run All Test Suites" above to run live tests across the backend engine.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.results.map((res, index) => (
              <div key={index} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/60">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {res.suite}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{res.name}</span>
                  </div>
                  {res.error && (
                    <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg font-mono">
                      {res.error}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">{res.durationMs}ms</span>
                  {res.passed ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PASS</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>FAIL</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
