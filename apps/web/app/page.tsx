import { Activity, ArrowUpRight, BarChart3, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">TradeLens</h1>
              <p className="text-sm text-slate-400">Trade Journal & Rule Backtester</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Analytics Engine Online</span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-2">
            Turn Behavioral Leaks into Enforceable Trading Rules
          </h2>
          <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
            TradeLens pairs trades deterministically, reveals overtrading and revenge-entry patterns, and replays rule guardrails on your historical trades to measure true before-and-after performance impact.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-2 text-indigo-400 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Deterministic Engine</span>
              </div>
              <p className="text-xs text-slate-400">
                P&L, FIFO pairing, and Indian charges (STT, GST) computed with zero AI hallucination.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Rule Lab Replay</span>
              </div>
              <p className="text-xs text-slate-400">
                Test cooldown periods and loss limits on historical trades with 70/30 overfitting checks.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400 mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Row-Level Security</span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-tenant PostgreSQL policies guarantee complete data isolation between traders.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-900">
          <span>Version 0.1.0 • Monorepo Foundation</span>
          <span>Next.js App Router + FastAPI Analytics</span>
        </div>
      </div>
    </main>
  );
}
