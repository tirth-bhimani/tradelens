/**
 * TradeLens AI Behavioral Insights Types and Helpers.
 * Matches Pydantic v2 schemas from the analytics engine (Task 16 & 17).
 */

export type SeverityLevel = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
export type DisciplineGrade = "A+" | "A" | "B" | "C" | "D" | "F";

export interface FrontendSuggestedRule {
  rule_id: string;
  rule_name: string;
  rationale: string;
  recommended_parameters: Record<string, any>;
}

export interface FrontendLeakDiagnosis {
  leak_type: string;
  severity: SeverityLevel;
  title: string;
  diagnosis: string;
  evidence: string;
  trade_count?: number;
  pnl_impact_inr?: number;
}

export interface FrontendInsightReport {
  overall_summary: string;
  discipline_grade: DisciplineGrade;
  discipline_score: number;
  top_leaks: FrontendLeakDiagnosis[];
  suggested_rules: FrontendSuggestedRule[];
  educational_disclaimer: string;
  provider_used: string;
  cached?: boolean;
  stats_hash?: string;
  grounding_verified?: boolean;
}

/**
 * Constructs a deep-link URL into Rule Lab with pre-filled parameters.
 */
export function buildRuleLabDeepLink(
  ruleId: string,
  params: Record<string, any> = {}
): string {
  const query = new URLSearchParams();
  query.set("prefillRule", ruleId);

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null) {
      query.set(key, String(val));
    }
  }

  return `/rule-lab?${query.toString()}`;
}

/**
 * Standard baseline mock insights report for offline development and testing.
 */
export const DEFAULT_INSIGHT_REPORT: FrontendInsightReport = {
  overall_summary:
    "Execution discipline scored at 68/100 (Grade: C) across 24 closed trades. " +
    "Win rate stood at 58.3% with realized net P&L of ₹18,500.00. " +
    "The primary area for risk refinement centers on mitigating impulsive re-entry tilt following losses.",
  discipline_grade: "C",
  discipline_score: 68,
  grounding_verified: true,
  provider_used: "FREE_DETERMINISTIC",
  top_leaks: [
    {
      leak_type: "RE_ENTRY_TILT",
      severity: "HIGH",
      title: "Impulsive Re-entry Tilt Following Losses",
      diagnosis:
        "You exhibited revenge trading impulses by rushing into new positions within minutes of taking a loss, resulting in compounded capital degradation and emotional sizing.",
      evidence: "Detected 5 hurried re-entries leading to ₹8,500.00 in avoidable drawdown across losing trades.",
      trade_count: 5,
      pnl_impact_inr: -8500.0,
    },
    {
      leak_type: "OVERTRADING",
      severity: "MODERATE",
      title: "Excessive Intraday Trade Frequency",
      diagnosis:
        "Trade velocity spiked beyond your statistical edge during the afternoon session, generating disproportionate broker statutory fees and slippage.",
      evidence: "Exceeded 8 trades on 2 session days, causing ₹4,200.00 in churn cost and friction.",
      trade_count: 14,
      pnl_impact_inr: -4200.0,
    },
    {
      leak_type: "HOLDING_LOSERS",
      severity: "MODERATE",
      title: "Asymmetric Loser Duration Squeeze",
      diagnosis:
        "Losing trades were held more than 2.4x longer than winning trades, giving losses too much breathing room to damage overall expectancy.",
      evidence: "Average loser held 10m 12s vs average winner held 4m 15s.",
      trade_count: 8,
      pnl_impact_inr: -5800.0,
    },
  ],
  suggested_rules: [
    {
      rule_id: "COOL_OFF_AFTER_LOSS",
      rule_name: "15-Minute Mandatory Cooldown After Loss",
      rationale: "Enforces an emotional circuit breaker after any loss to reset cognitive clarity.",
      recommended_parameters: {
        cooldown_minutes: 15,
        max_consecutive_losses: 1,
      },
    },
    {
      rule_id: "MAX_DAILY_TRADES_LIMIT",
      rule_name: "Max 5 Trades Per Market Session",
      rationale: "Caps total session trades to eliminate afternoon overtrading churn.",
      recommended_parameters: {
        max_trades: 5,
      },
    },
    {
      rule_id: "TIMED_LOSS_CUTOFF",
      rule_name: "10-Minute Maximum Holding Cutoff for Losers",
      rationale: "Automatically liquidates stagnant losing positions before theta and momentum decay expand.",
      recommended_parameters: {
        max_minutes: 10,
      },
    },
  ],
  educational_disclaimer:
    "DISCLAIMER: This diagnostic audit is strictly educational and behavioral. " +
    "TradeLens does not predict market prices, recommend securities, or provide financial advice.",
};
