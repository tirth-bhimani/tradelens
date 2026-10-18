"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Receipt,
  Scale,
  Info,
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/utils/format";
import {
  DiscrepancyCard,
  type SymbolReconciliationItem,
} from "@/components/reconciliation/discrepancy-card";
import { ReconciliationTable } from "@/components/reconciliation/reconciliation-table";
import {
  StatementSummaryForm,
  type StatementFormData,
} from "@/components/reconciliation/statement-summary-form";

// Initial Zerodha reconciliation sample data
const DEFAULT_SYMBOLS: SymbolReconciliationItem[] = [
  {
    symbol: "RELIANCE",
    status: "MATCHED",
    app_gross_pnl: 10000.0,
    broker_gross_pnl: 10000.0,
    gross_delta: 0.0,
    app_charges: 454.86,
    broker_charges: 454.86,
    charges_delta: 0.0,
    app_net_pnl: 9545.14,
    broker_net_pnl: 9545.14,
    net_delta: 0.0,
    paired_trades_count: 2,
    has_open_positions: false,
    discrepancy_reasons: [],
    explanation: "Exact match between TradeLens calculations and broker contract notes.",
  },
  {
    symbol: "TCS",
    status: "MATCHED",
    app_gross_pnl: 4000.0,
    broker_gross_pnl: 4000.0,
    gross_delta: 0.0,
    app_charges: 118.83,
    broker_charges: 119.0,
    charges_delta: -0.17,
    app_net_pnl: 3881.17,
    broker_net_pnl: 3881.0,
    net_delta: 0.17,
    paired_trades_count: 1,
    has_open_positions: false,
    discrepancy_reasons: ["ROUNDING_VARIANCE"],
    explanation: "Matched cleanly within statutory rounding tolerance (delta: +₹0.17).",
  },
  {
    symbol: "ITC",
    status: "DISCREPANCY",
    app_gross_pnl: 5000.0,
    broker_gross_pnl: 5000.0,
    gross_delta: 0.0,
    app_charges: 95.0,
    broker_charges: 110.93,
    charges_delta: -15.93,
    app_net_pnl: 4905.0,
    broker_net_pnl: 4889.07,
    net_delta: 15.93,
    paired_trades_count: 1,
    has_open_positions: false,
    discrepancy_reasons: ["DP_CHARGES_UNACCOUNTED"],
    explanation:
      "Variance of ₹15.93 matches standard CDSL/NSDL Depository Participant (DP) charges on delivery sell orders. DP fees are debited to your ledger by the depository.",
  },
  {
    symbol: "TATAMOTORS",
    status: "DISCREPANCY",
    app_gross_pnl: 2000.0,
    broker_gross_pnl: 1000.0,
    gross_delta: 1000.0,
    app_charges: 40.0,
    broker_charges: 20.0,
    charges_delta: 20.0,
    app_net_pnl: 1960.0,
    broker_net_pnl: 980.0,
    net_delta: 980.0,
    paired_trades_count: 1,
    has_open_positions: true,
    discrepancy_reasons: ["OPEN_POSITION_RESIDUAL"],
    explanation:
      "Symbol has 50 residual open lots. Unmatched inventory carries unrealized P&L that the broker statement excludes until settled.",
  },
];

export default function ReconciliationPage() {
  const [symbols, setSymbols] = useState<SymbolReconciliationItem[]>(DEFAULT_SYMBOLS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<StatementFormData>({
    brokerName: "ZERODHA",
    statementPeriod: "FY 2024-25 (Q3)",
    totalGrossPnl: 20000.0,
    totalCharges: 704.79,
    totalNetPnl: 19295.21,
    tolerance: 1.0,
  });

  // Totals calculations
  const appTotalGross = symbols.reduce((acc, s) => acc + s.app_gross_pnl, 0);
  const appTotalCharges = symbols.reduce((acc, s) => acc + s.app_charges, 0);
  const appTotalNet = symbols.reduce((acc, s) => acc + s.app_net_pnl, 0);

  const brokerTotalGross = formData.totalGrossPnl;
  const brokerTotalCharges = formData.totalCharges;
  const brokerTotalNet = formData.totalNetPnl;

  const netDelta = appTotalNet - brokerTotalNet;
  const chargesDelta = appTotalCharges - brokerTotalCharges;

  const matchedCount = symbols.filter((s) => s.status === "MATCHED").length;
  const discrepancyCount = symbols.filter((s) => s.status !== "MATCHED").length;
  const matchPercentage =
    symbols.length > 0 ? (matchedCount / symbols.length) * 100 : 100;
  const isFullyReconciled =
    Math.abs(netDelta) <= formData.tolerance && discrepancyCount === 0;

  const handleApplyForm = (data: StatementFormData) => {
    setFormData(data);
    setIsFormOpen(false);
  };

  const handleLoadSample = () => {
    setSymbols(DEFAULT_SYMBOLS);
    setFormData({
      brokerName: "ZERODHA",
      statementPeriod: "FY 2024-25 (Q3)",
      totalGrossPnl: 20000.0,
      totalCharges: 704.79,
      totalNetPnl: 19295.21,
      tolerance: 1.0,
    });
  };

  return (
    <div className="space-y-5">
      {/* Integrated Terminal Header (Clean & Unboxed) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-[4px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700">
              <Scale className="w-3 h-3 text-[#387ed1]" />
              <span>Audit Engine • Sec 288B</span>
            </span>
            <span className="text-slate-400 dark:text-slate-600 text-xs">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Active: <strong className="text-slate-700 dark:text-slate-200">{formData.brokerName}</strong> (±₹{formData.tolerance.toFixed(2)})
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Broker Statement Reconciliation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Compare TradeLens calculated paired trades and statutory taxes against official broker Tax P&L summaries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadSample}
            className="btn-zerodha-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5"
            title="Reload Zerodha contract note baseline"
          >
            <span>Reset to Sample</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="btn-zerodha-secondary text-xs py-1.5 px-3 flex items-center space-x-1.5"
          >
            <span>{isFormOpen ? "Hide Statement Settings" : "Configure Statement"}</span>
          </button>
          <Link
            href="/imports"
            className="btn-zerodha-primary text-xs py-1.5 px-3.5 inline-flex items-center space-x-1.5"
          >
            <span>Import History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top Financial KPI Ribbon (Unified Terminal Bar - No floating box soup) */}
      <div className="rounded-[4px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d131f] divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 grid grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Match Status */}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Audit Status</span>
            {isFullyReconciled ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
            )}
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-between">
            <span className="tabular-nums">{matchPercentage.toFixed(1)}% Match</span>
            <span className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-[2px] border ${
              isFullyReconciled
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            }`}>
              {isFullyReconciled ? "Clean" : "Variance"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {matchedCount} of {symbols.length} scrips clean
          </p>
        </div>

        {/* Metric 2: Net P&L Variance */}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Net P&L Variance</span>
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {netDelta > 0 ? "+" : ""}
            {formatIndianCurrency(netDelta)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            App: {formatIndianCurrency(appTotalNet)} / Broker: {formatIndianCurrency(brokerTotalNet)}
          </p>
        </div>

        {/* Metric 3: Charges Variance */}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Charges Delta</span>
            <Receipt className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {chargesDelta > 0 ? "+" : ""}
            {formatIndianCurrency(chargesDelta)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            App: {formatIndianCurrency(appTotalCharges)} / Broker: {formatIndianCurrency(brokerTotalCharges)}
          </p>
        </div>

        {/* Metric 4: Discrepancy Count */}
        <div className="p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Audit Findings</span>
            <Scale className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
            {discrepancyCount} {discrepancyCount === 1 ? "Item" : "Items"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {discrepancyCount === 0
              ? "All within statutory limits"
              : "Root causes identified below"}
          </p>
        </div>
      </div>

      {/* Collapsible Statement Settings Drawer */}
      {isFormOpen && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-[4px] p-4 bg-slate-50/70 dark:bg-[#0c121d] animate-in fade-in duration-150">
          <StatementSummaryForm
            initialData={formData}
            onSubmit={handleApplyForm}
            onLoadSample={handleLoadSample}
          />
        </div>
      )}

      {/* Sleek Minimalist Diagnostic Briefing (Institutional, Zero AI Pastel Box) */}
      {discrepancyCount > 0 && (
        <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c1017] p-3.5 rounded-[4px] flex items-start gap-3 text-xs">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white block text-xs tracking-tight">
              Audit Findings ({discrepancyCount} items):
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong>ITC:</strong> ₹15.93 variance matches standard CDSL/NSDL Depository Participant (DP) fee on delivery sell orders. &bull; <strong>TATAMOTORS:</strong> 50 open lots carrying unrealized P&L excluded from broker statement.
            </p>
          </div>
        </div>
      )}

      {/* Flagged Discrepancies Grid */}
      {discrepancyCount > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
              <span>Audit Breakdown ({discrepancyCount})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {symbols
              .filter((s) => s.status !== "MATCHED")
              .map((item) => (
                <DiscrepancyCard key={item.symbol} item={item} />
              ))}
          </div>
        </div>
      )}

      {/* Full Comparison Table Section */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Scrip-by-Scrip Audit Grid
          </h2>
        </div>
        <ReconciliationTable symbols={symbols} />
      </div>
    </div>
  );
}
