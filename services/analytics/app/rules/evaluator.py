"""TradeLens Stateful Rule Predicate Evaluator (Task 21).

Evaluates closed round-trip trades chronologically against the 9 canonical trading
guardrail rules defined in Task 19. Maintains a deterministic timeline state machine
tracking daily realized P&L, daily trade volume, consecutive loss streaks, last loss
exit timestamps, and session halt statuses in Indian Standard Time (IST).
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from app.engine.instruments import InstrumentNormalizer
from app.models.trade import PairedTrade
from app.rules.catalog import (
    CompositeRule,
    CoolOffAfterLossRule,
    DailyLossLimitRule,
    DisallowedInstrumentType,
    ExpiryIndexName,
    MaxConsecutiveLossesRule,
    MaxDailyTradesLimitRule,
    MaxPositionSizeRule,
    NoTradingOnExpiryDayRule,
    SingleTradingRule,
    SkipInstrumentTypeRule,
    TimeOfDayCutoffRule,
    TradingRule,
)

IST = ZoneInfo("Asia/Kolkata")
LUNCH_START = "11:30"
LUNCH_END = "13:00"

# Standard Indian index weekly expiry weekdays (0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri)
INDEX_EXPIRY_WEEKDAY: dict[str, int] = {
    "NIFTY": 3,       # Thursday
    "BANKNIFTY": 2,   # Wednesday
    "FINNIFTY": 1,    # Tuesday
    "MIDCPNIFTY": 0,  # Monday
    "SENSEX": 4,      # Friday
}


class TradeReplayState:
    """Timeline state machine tracking cumulative intraday variables and streak records."""

    def __init__(self) -> None:
        self.current_date: date | None = None
        self.daily_realized_pnl: Decimal = Decimal("0.00")
        self.daily_trades_count: int = 0
        self.daily_halted: bool = False
        self.daily_halt_reason: str | None = None
        self.consecutive_losses: int = 0
        self.last_loss_exit_time: datetime | None = None
        self.cooldown_until: datetime | None = None
        self.open_executed_trades: list[PairedTrade] = []

    def advance_to_time(
        self,
        current_time: datetime,
        current_date: date,
        rule: TradingRule,
        starting_capital: Decimal,
    ) -> None:
        """Processes exits for all executed trades whose exit_time <= current_time,

        updating realized daily P&L, consecutive losses, and cooldown windows before
        evaluating the new candidate trade entering at current_time.
        """
        # Calendar day transition in IST
        if self.current_date != current_date:
            self.current_date = current_date
            self.daily_realized_pnl = Decimal("0.00")
            self.daily_trades_count = 0
            self.daily_halted = False
            self.daily_halt_reason = None
            self.cooldown_until = None
            self.consecutive_losses = 0
            self.open_executed_trades.clear()

        # Realize closed trades up to current_time (sorted chronologically by exit_time)
        still_open: list[PairedTrade] = []
        for trade in sorted(self.open_executed_trades, key=lambda t: t.exit_time):
            if trade.exit_time <= current_time:
                self._realize_trade_exit(trade, rule, starting_capital)
            else:
                still_open.append(trade)
        self.open_executed_trades = still_open

    def _realize_trade_exit(
        self,
        trade: PairedTrade,
        rule: TradingRule,
        starting_capital: Decimal,
    ) -> None:
        """Updates internal state when an executed trade officially closes."""
        self.daily_realized_pnl += trade.net_pnl

        # Losing trade updates
        if trade.net_pnl < Decimal("0.00"):
            self.consecutive_losses += 1
            self.last_loss_exit_time = trade.exit_time

            # Update cooldown if CoolOffAfterLossRule is active
            self._check_and_apply_cooldown(trade, rule)

        # Winning trade updates
        elif trade.net_pnl > Decimal("0.00"):
            self.consecutive_losses = 0

        # Breakeven trades (net_pnl == 0) leave consecutive losses unchanged

        # Check if daily loss limit was breached by this realized exit
        self._check_daily_loss_breach(rule, starting_capital)

    def _check_and_apply_cooldown(self, trade: PairedTrade, rule: TradingRule) -> None:
        """Determines if a closed losing trade triggers a mandatory pause."""
        active_rules: list[SingleTradingRule] = (
            list(rule.rules) if isinstance(rule, CompositeRule) else [rule]
        )

        for r in active_rules:
            if isinstance(r, CoolOffAfterLossRule):
                loss_amount = abs(trade.net_pnl)
                # Check trigger loss threshold if configured
                if r.trigger_loss_inr is not None and loss_amount < Decimal(str(r.trigger_loss_inr)):
                    continue
                # Check consecutive losses requirement
                if self.consecutive_losses >= r.max_consecutive_losses:
                    cooldown_end = trade.exit_time + timedelta(minutes=r.cooldown_minutes)
                    if self.cooldown_until is None or cooldown_end > self.cooldown_until:
                        self.cooldown_until = cooldown_end

            elif isinstance(r, MaxConsecutiveLossesRule):
                if (
                    r.action == "MANDATORY_COOLDOWN"
                    and r.cooldown_minutes is not None
                    and self.consecutive_losses >= r.consecutive_losses
                ):
                    cooldown_end = trade.exit_time + timedelta(minutes=r.cooldown_minutes)
                    if self.cooldown_until is None or cooldown_end > self.cooldown_until:
                        self.cooldown_until = cooldown_end

    def _check_daily_loss_breach(self, rule: TradingRule, starting_capital: Decimal) -> None:
        """Checks if realized daily losses breach a DailyLossLimitRule threshold."""
        active_rules: list[SingleTradingRule] = (
            list(rule.rules) if isinstance(rule, CompositeRule) else [rule]
        )

        for r in active_rules:
            if isinstance(r, DailyLossLimitRule):
                threshold: Decimal
                if r.max_loss_inr is not None:
                    threshold = Decimal(str(r.max_loss_inr))
                elif r.max_loss_percent_capital is not None:
                    capital_base = (
                        Decimal(str(r.starting_capital))
                        if r.starting_capital is not None
                        else starting_capital
                    )
                    threshold = capital_base * (Decimal(str(r.max_loss_percent_capital)) / Decimal("100"))
                else:
                    continue

                if self.daily_realized_pnl <= -threshold:
                    self.daily_halted = True
                    self.daily_halt_reason = (
                        f"DAILY_LOSS_LIMIT breached: daily loss of ₹{abs(self.daily_realized_pnl):.2f} "
                        f"crossed maximum threshold of ₹{threshold:.2f}"
                    )
                    break


# ==============================================================================
# Rule 1: COOL_OFF_AFTER_LOSS
# ==============================================================================
def evaluate_cool_off_after_loss(
    rule: CoolOffAfterLossRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade entry falls inside an active post-loss cooldown window."""
    if state.cooldown_until is not None and trade.entry_time < state.cooldown_until:
        remaining_sec = max(1, int((state.cooldown_until - trade.entry_time).total_seconds()))
        remaining_min = (remaining_sec + 59) // 60
        entry_ist = trade.entry_time.astimezone(IST)
        cooldown_ist = state.cooldown_until.astimezone(IST)
        return False, (
            f"COOL_OFF_AFTER_LOSS: entry at {entry_ist:%H:%M:%S} is within mandatory "
            f"{rule.cooldown_minutes}m pause (active until {cooldown_ist:%H:%M:%S}, ~{remaining_min}m remaining)"
        )
    return True, None


# ==============================================================================
# Rule 2: MAX_CONSECUTIVE_LOSSES
# ==============================================================================
def evaluate_max_consecutive_losses(
    rule: MaxConsecutiveLossesRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade occurs while consecutive loss threshold is active."""
    if state.consecutive_losses >= rule.consecutive_losses:
        if rule.action == "HALT_FOR_DAY":
            state.daily_halted = True
            state.daily_halt_reason = (
                f"MAX_CONSECUTIVE_LOSSES: reached {state.consecutive_losses} consecutive losses "
                f"(threshold: {rule.consecutive_losses})"
            )
            return False, state.daily_halt_reason
        elif rule.action == "MANDATORY_COOLDOWN":
            if state.cooldown_until is not None and trade.entry_time < state.cooldown_until:
                return False, (
                    f"MAX_CONSECUTIVE_LOSSES: {state.consecutive_losses} consecutive losses triggered "
                    f"mandatory {rule.cooldown_minutes}m cooldown"
                )
    return True, None


# ==============================================================================
# Rule 3: DAILY_LOSS_LIMIT
# ==============================================================================
def evaluate_daily_loss_limit(
    rule: DailyLossLimitRule,
    trade: PairedTrade,
    state: TradeReplayState,
    starting_capital: Decimal,
) -> tuple[bool, str | None]:
    """Checks if daily realized loss has already crossed allowed threshold."""
    threshold: Decimal
    if r_inr := rule.max_loss_inr:
        threshold = Decimal(str(r_inr))
    elif r_pct := rule.max_loss_percent_capital:
        capital_base = (
            Decimal(str(rule.starting_capital))
            if rule.starting_capital is not None
            else starting_capital
        )
        threshold = capital_base * (Decimal(str(r_pct)) / Decimal("100"))
    else:
        return True, None

    if state.daily_realized_pnl <= -threshold:
        state.daily_halted = True
        state.daily_halt_reason = (
            f"DAILY_LOSS_LIMIT: daily realized loss (-₹{abs(state.daily_realized_pnl):.2f}) "
            f"breached limit of ₹{threshold:.2f}"
        )
        return False, state.daily_halt_reason
    return True, None


# ==============================================================================
# Rule 4: MAX_DAILY_TRADES_LIMIT
# ==============================================================================
def evaluate_max_daily_trades_limit(
    rule: MaxDailyTradesLimitRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if daily trade count has already reached maximum permitted volume."""
    if state.daily_trades_count >= rule.max_trades:
        state.daily_halted = True
        state.daily_halt_reason = (
            f"MAX_DAILY_TRADES_LIMIT: daily trade count ({state.daily_trades_count}) "
            f"reached maximum session cap of {rule.max_trades}"
        )
        return False, state.daily_halt_reason
    return True, None


# ==============================================================================
# Rule 5: TIME_OF_DAY_CUTOFF
# ==============================================================================
def evaluate_time_of_day_cutoff(
    rule: TimeOfDayCutoffRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade entry time falls within allowed intraday operating hours."""
    entry_ist = trade.entry_time.astimezone(IST)
    time_str = f"{entry_ist.hour:02d}:{entry_ist.minute:02d}"

    if time_str < rule.allowed_start_time:
        return False, (
            f"TIME_OF_DAY_CUTOFF: entry at {time_str} is earlier than allowed start time {rule.allowed_start_time}"
        )

    if time_str > rule.allowed_end_time:
        return False, (
            f"TIME_OF_DAY_CUTOFF: entry at {time_str} is later than allowed cutoff time {rule.allowed_end_time}"
        )

    if rule.restricted_lunch_break and (LUNCH_START <= time_str < LUNCH_END):
        return False, (
            f"TIME_OF_DAY_CUTOFF: entry at {time_str} is inside restricted midday chop window (11:30 - 13:00)"
        )

    return True, None


# ==============================================================================
# Rule 6: MAX_POSITION_SIZE
# ==============================================================================
def evaluate_max_position_size(
    rule: MaxPositionSizeRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade size exceeds allowed shares, F&O lot count, or capital commitment."""
    # Check segment applicability
    is_equity = trade.segment in ("EQUITY_DELIVERY", "EQUITY_INTRADAY") or trade.instrument_type == "EQ"
    if rule.segment == "EQUITY" and not is_equity:
        return True, None
    if rule.segment == "FNO" and is_equity:
        return True, None

    # Check maximum share quantity
    if rule.max_quantity is not None and trade.quantity > Decimal(str(rule.max_quantity)):
        return False, (
            f"MAX_POSITION_SIZE: quantity {trade.quantity} exceeds maximum allowed {rule.max_quantity}"
        )

    # Check maximum lots
    if rule.max_lots is not None:
        norm = InstrumentNormalizer.normalize(trade.symbol)
        lot_size = norm.lot_size if norm.lot_size > 0 else 1
        lots = int(trade.quantity / Decimal(str(lot_size)))
        if lots > rule.max_lots:
            return False, (
                f"MAX_POSITION_SIZE: trade volume {trade.quantity} ({lots} lots @ lot_size={lot_size}) "
                f"exceeds maximum allowed {rule.max_lots} lots"
            )

    # Check maximum INR capital allocation per trade
    if rule.max_capital_per_trade_inr is not None:
        trade_capital = trade.entry_price * trade.quantity
        if trade_capital > Decimal(str(rule.max_capital_per_trade_inr)):
            return False, (
                f"MAX_POSITION_SIZE: trade capital allocation ₹{trade_capital:.2f} "
                f"exceeds maximum allowed ₹{rule.max_capital_per_trade_inr:.2f}"
            )

    return True, None


# ==============================================================================
# Rule 7: SKIP_INSTRUMENT_TYPE
# ==============================================================================
def evaluate_skip_instrument_type(
    rule: SkipInstrumentTypeRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade product matches any forbidden instrument category."""
    classification: DisallowedInstrumentType | None = None

    if trade.instrument_type in ("CE", "PE") or trade.segment == "OPTIONS":
        classification = "OPTIONS_SELL" if trade.is_short else "OPTIONS_BUY"
    elif trade.instrument_type == "FUT" or trade.segment == "FUTURES":
        classification = "FUTURES"
    elif trade.segment == "EQUITY_INTRADAY" or (trade.instrument_type == "EQ" and trade.is_intraday):
        classification = "EQUITY_INTRADAY"
    elif trade.segment == "EQUITY_DELIVERY" or (trade.instrument_type == "EQ" and not trade.is_intraday):
        classification = "EQUITY_DELIVERY"

    if classification and classification in rule.disallowed_types:
        return False, f"SKIP_INSTRUMENT_TYPE: {classification} trades are disallowed by rule policy"

    return True, None


# ==============================================================================
# Rule 8: NO_TRADING_ON_EXPIRY_DAY
# ==============================================================================
def evaluate_no_trading_on_expiry_day(
    rule: NoTradingOnExpiryDayRule,
    trade: PairedTrade,
    state: TradeReplayState,
) -> tuple[bool, str | None]:
    """Checks if trade occurs on an index/derivatives contract expiry session."""
    norm = InstrumentNormalizer.normalize(trade.symbol)
    entry_date = trade.entry_time.astimezone(IST).date()

    # Determine underlying index name
    underlying = norm.underlying.upper() if norm.underlying else trade.symbol.upper()
    affects_all = "ALL" in rule.affected_indices
    is_affected_index = affects_all or underlying in rule.affected_indices

    # Check if entry_date matches contract expiry date or standard weekly expiry day
    is_expiry_day = False
    if norm.is_derivative and norm.expiry_date and norm.expiry_date == entry_date:
        is_expiry_day = True
    elif is_affected_index and underlying in INDEX_EXPIRY_WEEKDAY:
        target_weekday = INDEX_EXPIRY_WEEKDAY[underlying]
        if entry_date.weekday() == target_weekday:
            is_expiry_day = True
    elif affects_all and norm.is_derivative and entry_date.weekday() in (0, 1, 2, 3, 4):
        # If ALL indices affected, check if it's the contract's expiry
        if norm.expiry_date and norm.expiry_date == entry_date:
            is_expiry_day = True

    if is_expiry_day and is_affected_index:
        if rule.action == "HALT_FOR_DAY":
            return False, (
                f"NO_TRADING_ON_EXPIRY_DAY: {underlying} expiry session active on {entry_date.isoformat()} (action: HALT_FOR_DAY)"
            )
        elif rule.action == "CAP_LOTS" and rule.max_lots is not None:
            lot_size = norm.lot_size if norm.lot_size > 0 else 1
            lots = int(trade.quantity / Decimal(str(lot_size)))
            if lots > rule.max_lots:
                return False, (
                    f"NO_TRADING_ON_EXPIRY_DAY: volume of {lots} lots exceeds expiry cap of {rule.max_lots} lots"
                )

    return True, None


# ==============================================================================
# Rule 9: COMPOSITE_RULE & Dispatcher
# ==============================================================================
def evaluate_trade(
    trade: PairedTrade,
    rule: TradingRule,
    state: TradeReplayState,
    starting_capital: Decimal,
) -> tuple[bool, str | None]:
    """Dispatches trade evaluation across atomic or composite rule structures.

    Returns (is_allowed, skip_reason). If allowed, is_allowed is True and skip_reason is None.
    """
    if isinstance(rule, CompositeRule):
        failed_reasons: list[str] = []
        for sub_rule in rule.rules:
            allowed, reason = evaluate_single_rule(trade, sub_rule, state, starting_capital)
            if not allowed and reason:
                failed_reasons.append(reason)

        if failed_reasons:
            return False, "; ".join(failed_reasons)
        return True, None

    return evaluate_single_rule(trade, rule, state, starting_capital)


def evaluate_single_rule(
    trade: PairedTrade,
    rule: SingleTradingRule,
    state: TradeReplayState,
    starting_capital: Decimal,
) -> tuple[bool, str | None]:
    """Evaluates a single atomic rule against the candidate trade."""
    if isinstance(rule, CoolOffAfterLossRule):
        return evaluate_cool_off_after_loss(rule, trade, state)
    elif isinstance(rule, MaxConsecutiveLossesRule):
        return evaluate_max_consecutive_losses(rule, trade, state)
    elif isinstance(rule, DailyLossLimitRule):
        return evaluate_daily_loss_limit(rule, trade, state, starting_capital)
    elif isinstance(rule, MaxDailyTradesLimitRule):
        return evaluate_max_daily_trades_limit(rule, trade, state)
    elif isinstance(rule, TimeOfDayCutoffRule):
        return evaluate_time_of_day_cutoff(rule, trade, state)
    elif isinstance(rule, MaxPositionSizeRule):
        return evaluate_max_position_size(rule, trade, state)
    elif isinstance(rule, SkipInstrumentTypeRule):
        return evaluate_skip_instrument_type(rule, trade, state)
    elif isinstance(rule, NoTradingOnExpiryDayRule):
        return evaluate_no_trading_on_expiry_day(rule, trade, state)
    return True, None
