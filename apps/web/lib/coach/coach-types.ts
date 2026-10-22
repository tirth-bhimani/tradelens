/**
 * TradeLens Coach-Trader Organization & Permission Consent Types (Tasks 24 & 25).
 */

export type CoachConsentStatus = "pending" | "active" | "revoked";

export interface CoachProfile {
  id: string;
  email: string;
  display_name: string;
  organization_name?: string;
  role: "coach" | "client_admin" | "platform_admin";
  created_at?: string;
}

export interface TraderProfile {
  id: string;
  email: string;
  display_name: string;
  timezone?: string;
  trading_segments?: string[];
}

export interface CoachInvitation {
  id: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  organization_id?: string | null;
  organization_name?: string | null;
  invite_token: string;
  invite_code: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
}

export interface CoachAccessRecord {
  id: string;
  trader_id: string;
  coach_id: string;
  coach_name: string;
  coach_email: string;
  organization_name?: string | null;
  status: CoachConsentStatus;
  permissions: {
    read_trades: boolean;
    read_analytics: boolean;
    suggest_rules: boolean;
  };
  granted_at: string;
  revoked_at?: string | null;
}

export interface StudentRosterItem {
  id: string;
  trader_id: string;
  trader_name: string;
  trader_email: string;
  status: CoachConsentStatus;
  total_trades: number;
  win_rate: number;
  net_pnl: number;
  adherence_pct: number;
  risk_level: "low" | "medium" | "high";
  risk_reasons?: string[];
  top_leak?: string;
  granted_at: string;
  last_active?: string;
}

export interface CreateInviteInput {
  organization_id?: string;
  expires_in_days?: number;
}

export interface ConsentAcceptanceResult {
  success: boolean;
  coachName?: string;
  error?: string | null;
}

/**
 * Task 25: Coach Cohort Dashboard & Intervention Types
 */

export interface CoachNote {
  id: string;
  coach_id: string;
  trader_id: string;
  author_name?: string;
  note: string;
  tags: string[];
  is_private_to_coach: boolean;
  created_at: string;
}

export interface CohortRiskDistribution {
  green: number; // Disciplined
  yellow: number; // Moderate Risk
  red: number; // High Tilt / Drawdown Risk
  revoked: number;
}

export interface CohortAggregateStats {
  total_students: number;
  active_students: number;
  cohort_win_rate: number;
  cohort_net_pnl: number;
  cohort_adherence_avg: number;
  top_behavioral_leak: string;
  risk_distribution: CohortRiskDistribution;
}

export interface DrillDownEquityPoint {
  date: string;
  pnl: number;
  cumulative_pnl: number;
}

export interface DrillDownTrade {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  entry_price: number;
  exit_price: number;
  pnl: number;
  holding_duration: string;
  executed_at: string;
}

export interface DrillDownTiltCascade {
  id: string;
  trigger_symbol: string;
  detected_at: string;
  loss_spiral_inr: number;
  trades_in_cascade: number;
  severity: "moderate" | "severe";
}

export interface TraderDrillDownData {
  trader_id: string;
  trader_name: string;
  trader_email: string;
  status: CoachConsentStatus;
  connected_date: string;
  metrics: {
    win_rate: number;
    profit_factor: number;
    max_drawdown_pct: number;
    total_trades: number;
    net_pnl: number;
    adherence_pct: number;
  };
  equity_curve: DrillDownEquityPoint[];
  recent_trades: DrillDownTrade[];
  tilt_cascades: DrillDownTiltCascade[];
  notes: CoachNote[];
  rules: Array<{
    id: string;
    name: string;
    rule_type: string;
    is_active: boolean;
    suggested_by_coach_id?: string;
  }>;
}

export interface AssignRuleInput {
  traderId: string;
  ruleName: string;
  ruleType: string;
  rulePayload: Record<string, any>;
  naturalLanguageText: string;
  actionMode?: "restrict" | "flag_only";
}
