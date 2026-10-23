/**
 * Data contracts and TypeScript interfaces for TradeLens Weekly Reports (Task 26).
 */

export interface DailyReportBreakdown {
  trade_date: string; // YYYY-MM-DD
  trades_count: number;
  winning_trades: number;
  losing_trades: number;
  gross_pnl: number;
  total_charges: number;
  net_pnl: number;
  win_rate: number;
}

export interface WeeklyReportSummary {
  id: string;
  user_id: string;
  week_start_date: string; // YYYY-MM-DD
  week_end_date: string;   // YYYY-MM-DD
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  gross_pnl: number;
  total_charges: number;
  net_pnl: number;
  best_day_date: string | null;
  best_day_pnl: number;
  worst_day_date: string | null;
  worst_day_pnl: number;
  adherence_score: number;
  rule_violations_count: number;
  top_behavioral_leak: string | null;
  top_leak_loss: number;
  focus_item: string;
  daily_breakdown: DailyReportBreakdown[];
  charges_breakdown?: Record<string, number>;
  email_delivery_status: "pending" | "sent" | "failed" | "skipped";
  email_sent_at?: string | null;
  generated_at: string;
}

export interface NotificationPreferences {
  weekly_email_enabled: boolean;
  email_notifications_email: string | null;
}
