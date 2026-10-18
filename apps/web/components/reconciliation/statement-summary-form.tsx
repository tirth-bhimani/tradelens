"use client";

import { useState, useEffect } from "react";
import { Sliders, RotateCcw, RefreshCw, FileText } from "lucide-react";

export interface StatementFormData {
  brokerName: string;
  statementPeriod: string;
  totalGrossPnl: number;
  totalCharges: number;
  totalNetPnl: number;
  tolerance: number;
}

interface StatementSummaryFormProps {
  initialData: StatementFormData;
  onSubmit: (data: StatementFormData) => void;
  onLoadSample: () => void;
}

export function StatementSummaryForm({ initialData, onSubmit, onLoadSample }: StatementSummaryFormProps) {
  const [formData, setFormData] = useState<StatementFormData>(initialData);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="card-zerodha-glass p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Broker Statement Parameters</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Active Broker: <span className="font-semibold text-slate-800 dark:text-slate-200">{formData.brokerName}</span> • Tolerance: ±₹{formData.tolerance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="btn-zerodha-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5"
            title="Load sample Zerodha contract note figures"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Load Sample Statement</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-zerodha-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isExpanded ? "Hide Settings" : "Edit Statement Figures"}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <form onSubmit={handleSubmit} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4 text-xs animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Broker Platform
              </label>
              <select
                value={formData.brokerName}
                onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="ZERODHA">Zerodha (Console / Kite)</option>
                <option value="GROWW">Groww Reports</option>
                <option value="ANGELONE">Angel One Tax P&L</option>
                <option value="UPSTOX">Upstox Reports</option>
                <option value="ICICIDIRECT">ICICI Direct</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Statement Period
              </label>
              <input
                type="text"
                value={formData.statementPeriod}
                onChange={(e) => setFormData({ ...formData, statementPeriod: e.target.value })}
                placeholder="FY 2024-25"
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
              >
              </input>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Regulatory Tolerance (₹)
              </label>
              <input
                type="number"
                step="0.10"
                min="0.10"
                max="50.00"
                value={formData.tolerance}
                onChange={(e) => setFormData({ ...formData, tolerance: parseFloat(e.target.value) || 1.00 })}
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Broker Gross Realized P&L (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalGrossPnl}
                onChange={(e) => {
                  const gross = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    totalGrossPnl: gross,
                    totalNetPnl: gross - formData.totalCharges,
                  });
                }}
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              >
              </input>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Broker Statement Charges (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalCharges}
                onChange={(e) => {
                  const chg = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    totalCharges: chg,
                    totalNetPnl: formData.totalGrossPnl - chg,
                  });
                }}
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              >
              </input>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Broker Statement Net P&L (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalNetPnl}
                onChange={(e) => setFormData({ ...formData, totalNetPnl: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-[4px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-mono"
              >
              </input>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="btn-zerodha-primary text-xs py-2 px-4 flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Apply Parameters & Re-Run Audit</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
