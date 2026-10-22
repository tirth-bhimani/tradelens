/**
 * TradeLens Saved Rulebook & Adherence Tracking Types (Task 23).
 */

export interface SavedRule {
  id: string;
  user_id?: string;
  rule_type: string;
  rule_payload: Record<string, any>;
  natural_language_text?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TradeViolation {
  trade_id: string;
  symbol: string;
  entry_time: string;
  rule_id: string;
  rule_type: string;
  violation_code: string;
  penalty_pnl: number;
  explanation: string;
}

export interface RuleAdherenceStat {
  rule_id: string;
  rule_type: string;
  is_active: boolean;
  total_evaluations: number;
  violations_count: number;
  adherence_pct: number;
  avoidable_loss_incurred: number;
}

export interface AdherenceReport {
  total_trades_evaluated: number;
  total_adhering_trades: number;
  total_violating_trades: number;
  discipline_score_pct: number;
  total_avoidable_losses_incurred: number;
  violations: TradeViolation[];
  rules_breakdown: RuleAdherenceStat[];
  evaluated_at: string;
}

export interface SaveRuleInput {
  rule_type: string;
  rule_payload: Record<string, any>;
  natural_language_text?: string;
  is_active?: boolean;
}
