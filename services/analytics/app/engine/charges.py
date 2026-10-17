"""TradeLens Statutory Charges and Tax Computation Engine.

Implements high-precision, deterministic calculation of Indian stock market regulatory
and broker transaction charges (Brokerage, STT, Exchange Turnover Fees, SEBI Fees,
GST @ 18%, Stamp Duty) for closed round-trip PairedTrade records.

Complies strictly with:
- Section 288B of the Income-tax Act, 1961 (STT nearest integer rounding)
- Rule 4 of the Indian Stamp Rules, 2019 (Stamp Duty nearest integer rounding)
- SEBI Turnover and True-to-Label exchange charge structures
- Ministry of Finance Budget 2024 derivative STT revisions (effective Oct 1, 2024)
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from app.models.charges import ChargeRateConfig, ChargesBreakdown
from app.models.trade import PairedTrade, TradeSegment

# Pre-configured default statutory tariff schedules covering Indian market segments
# and historical revisions (specifically the Oct 1, 2024 Budget 2024 F&O STT hike).
DEFAULT_TARIFF_SCHEDULE: list[ChargeRateConfig] = [
    # 1. Equity Delivery (Zerodha standard: free brokerage, 0.1% buy + 0.1% sell STT, 0.015% buy stamp duty)
    ChargeRateConfig(
        segment="EQUITY_DELIVERY",
        effective_from=date(2020, 1, 1),
        effective_to=None,
        brokerage_per_order=Decimal("0.00"),
        brokerage_percent_cap=None,
        stt_rate_buy=Decimal("0.001000"),  # 0.1%
        stt_rate_sell=Decimal("0.001000"),  # 0.1%
        exchange_turnover_rate=Decimal("0.0000297"),  # NSE: 0.00297%
        sebi_turnover_rate=Decimal("0.000001"),  # ₹10 / crore
        gst_rate=Decimal("0.1800"),  # 18%
        stamp_duty_rate_buy=Decimal("0.000150"),  # 0.015%
    ),
    # 2. Equity Intraday (₹20 or 0.03% cap, 0% buy STT, 0.025% sell STT, 0.003% buy stamp duty)
    ChargeRateConfig(
        segment="EQUITY_INTRADAY",
        effective_from=date(2020, 1, 1),
        effective_to=None,
        brokerage_per_order=Decimal("20.00"),
        brokerage_percent_cap=Decimal("0.0003"),  # 0.03% max cap
        stt_rate_buy=Decimal("0.000000"),
        stt_rate_sell=Decimal("0.000250"),  # 0.025%
        exchange_turnover_rate=Decimal("0.0000297"),  # NSE: 0.00297%
        sebi_turnover_rate=Decimal("0.000001"),
        gst_rate=Decimal("0.1800"),
        stamp_duty_rate_buy=Decimal("0.000030"),  # 0.003%
    ),
    # 3a. Futures (Pre-Oct 1, 2024: 0.0125% sell STT)
    ChargeRateConfig(
        segment="FUTURES",
        effective_from=date(2020, 1, 1),
        effective_to=date(2024, 9, 30),
        brokerage_per_order=Decimal("20.00"),
        brokerage_percent_cap=Decimal("0.0003"),
        stt_rate_buy=Decimal("0.000000"),
        stt_rate_sell=Decimal("0.000125"),  # 0.0125%
        exchange_turnover_rate=Decimal("0.0000173"),  # NSE: 0.00173%
        sebi_turnover_rate=Decimal("0.000001"),
        gst_rate=Decimal("0.1800"),
        stamp_duty_rate_buy=Decimal("0.000020"),  # 0.002%
    ),
    # 3b. Futures (Post-Oct 1, 2024: 0.0200% sell STT Budget 2024 hike)
    ChargeRateConfig(
        segment="FUTURES",
        effective_from=date(2024, 10, 1),
        effective_to=None,
        brokerage_per_order=Decimal("20.00"),
        brokerage_percent_cap=Decimal("0.0003"),
        stt_rate_buy=Decimal("0.000000"),
        stt_rate_sell=Decimal("0.000200"),  # 0.02%
        exchange_turnover_rate=Decimal("0.0000173"),  # NSE: 0.00173%
        sebi_turnover_rate=Decimal("0.000001"),
        gst_rate=Decimal("0.1800"),
        stamp_duty_rate_buy=Decimal("0.000020"),  # 0.002%
    ),
    # 4a. Options (Pre-Oct 1, 2024: 0.0625% sell STT on premium)
    ChargeRateConfig(
        segment="OPTIONS",
        effective_from=date(2020, 1, 1),
        effective_to=date(2024, 9, 30),
        brokerage_per_order=Decimal("20.00"),
        brokerage_percent_cap=None,  # Flat ₹20 for options regardless of premium
        stt_rate_buy=Decimal("0.000000"),
        stt_rate_sell=Decimal("0.000625"),  # 0.0625%
        exchange_turnover_rate=Decimal("0.0003503"),  # NSE: 0.03503% on premium
        sebi_turnover_rate=Decimal("0.000001"),
        gst_rate=Decimal("0.1800"),
        stamp_duty_rate_buy=Decimal("0.000030"),  # 0.003% on buy premium
    ),
    # 4b. Options (Post-Oct 1, 2024: 0.1000% sell STT on premium Budget 2024 hike)
    ChargeRateConfig(
        segment="OPTIONS",
        effective_from=date(2024, 10, 1),
        effective_to=None,
        brokerage_per_order=Decimal("20.00"),
        brokerage_percent_cap=None,
        stt_rate_buy=Decimal("0.000000"),
        stt_rate_sell=Decimal("0.001000"),  # 0.10%
        exchange_turnover_rate=Decimal("0.0003503"),  # NSE: 0.03503% on premium
        sebi_turnover_rate=Decimal("0.000001"),
        gst_rate=Decimal("0.1800"),
        stamp_duty_rate_buy=Decimal("0.000030"),  # 0.003% on buy premium
    ),
]


class StatutoryChargesEngine:
    """Calculates deterministic Indian statutory taxes and charges on closed round-trip trades."""

    @classmethod
    def get_rate_config(
        cls,
        segment: TradeSegment,
        trade_date: date,
        custom_schedule: Sequence[ChargeRateConfig] | None = None,
    ) -> ChargeRateConfig:
        """Resolves the applicable tariff rate configuration for a segment and date.

        Searches custom_schedule first, then falls back to DEFAULT_TARIFF_SCHEDULE.
        """
        schedule = list(custom_schedule) if custom_schedule else DEFAULT_TARIFF_SCHEDULE

        # Match segment and date interval [effective_from, effective_to]
        candidates = [
            cfg
            for cfg in schedule
            if cfg.segment == segment
            and cfg.effective_from <= trade_date
            and (cfg.effective_to is None or trade_date <= cfg.effective_to)
        ]

        if candidates:
            # Pick candidate with latest effective_from
            return max(candidates, key=lambda c: c.effective_from)

        # Fallback to default schedule if custom schedule didn't contain a match
        if custom_schedule:
            return cls.get_rate_config(segment, trade_date, custom_schedule=None)

        raise ValueError(f"No statutory charge rate configuration found for {segment} on {trade_date}")

    @staticmethod
    def _calculate_leg_brokerage(turnover: Decimal, cfg: ChargeRateConfig) -> Decimal:
        """Calculates brokerage for a single order leg applying flat fee or percentage cap."""
        if cfg.brokerage_per_order == Decimal("0.00"):
            return Decimal("0.00")
        if cfg.brokerage_percent_cap is not None:
            raw = min(cfg.brokerage_per_order, turnover * cfg.brokerage_percent_cap)
            return raw.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return cfg.brokerage_per_order

    @classmethod
    def calculate_trade_charges(
        cls,
        trade: PairedTrade,
        config: ChargeRateConfig | None = None,
        custom_schedule: Sequence[ChargeRateConfig] | None = None,
    ) -> ChargesBreakdown:
        """Computes exact itemized statutory charges and taxes for a single PairedTrade.

        Dual-precision statutory rounding:
        - STT and Stamp Duty: Quantized to nearest integer rupee (ROUND_HALF_UP) per Indian tax law.
        - Brokerage, Exchange, SEBI, GST: Quantized to 2 decimal places (ROUND_HALF_UP).
        """
        # Determine turnover per leg (For options, prices represent premium)
        turnover_entry = trade.entry_price * trade.quantity
        turnover_exit = trade.exit_price * trade.quantity
        total_turnover = turnover_entry + turnover_exit

        # Separate into BUY and SELL execution legs (Short-trade inversion)
        if not trade.is_short:
            # Long trade: Entry is BUY, Exit is SELL
            buy_turnover = turnover_entry
            sell_turnover = turnover_exit
        else:
            # Short trade: Entry is SELL, Exit is BUY
            buy_turnover = turnover_exit
            sell_turnover = turnover_entry

        # Date-sensitive configuration lookup for each leg
        entry_cfg = config or cls.get_rate_config(trade.segment, trade.entry_time.date(), custom_schedule)
        exit_cfg = config or cls.get_rate_config(trade.segment, trade.exit_time.date(), custom_schedule)

        # 1. Brokerage calculation
        entry_brokerage = cls._calculate_leg_brokerage(turnover_entry, entry_cfg)
        is_expired_option = trade.segment == "OPTIONS" and trade.exit_price == Decimal("0.00")
        exit_brokerage = (
            Decimal("0.00") if is_expired_option else cls._calculate_leg_brokerage(turnover_exit, exit_cfg)
        )
        total_brokerage = (entry_brokerage + exit_brokerage).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 2. Securities Transaction Tax (STT)
        # Applied on BUY leg for delivery, and on SELL leg for delivery, intraday, futures, options.
        # Quantized to nearest whole rupee per s. 288B Income-tax Act, 1961 on each contract leg.
        buy_stt_cfg = entry_cfg if not trade.is_short else exit_cfg
        sell_stt_cfg = exit_cfg if not trade.is_short else entry_cfg

        raw_buy_stt = buy_turnover * buy_stt_cfg.stt_rate_buy
        raw_sell_stt = sell_turnover * sell_stt_cfg.stt_rate_sell

        quantized_buy_stt = raw_buy_stt.quantize(Decimal(1), rounding=ROUND_HALF_UP)
        quantized_sell_stt = raw_sell_stt.quantize(Decimal(1), rounding=ROUND_HALF_UP)
        quantized_stt = (quantized_buy_stt + quantized_sell_stt).quantize(Decimal("0.01"))

        # 3. Stamp Duty (Indian Stamp Act, 2019)
        # Levied strictly on the BUY transaction
        buy_duty_cfg = entry_cfg if not trade.is_short else exit_cfg
        raw_stamp_duty = buy_turnover * buy_duty_cfg.stamp_duty_rate_buy
        quantized_stamp_duty = raw_stamp_duty.quantize(Decimal(1), rounding=ROUND_HALF_UP).quantize(
            Decimal("0.01")
        )

        # 4. Exchange Turnover Fees (NSE/BSE infrastructure)
        raw_exchange_fee = (turnover_entry * entry_cfg.exchange_turnover_rate) + (
            turnover_exit * exit_cfg.exchange_turnover_rate
        )
        quantized_exchange_fee = raw_exchange_fee.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 5. SEBI Turnover Charges (₹10 / crore)
        raw_sebi = (turnover_entry * entry_cfg.sebi_turnover_rate) + (turnover_exit * exit_cfg.sebi_turnover_rate)
        quantized_sebi = raw_sebi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 6. Goods & Services Tax (GST @ 18%)
        # Strictly on (Brokerage + Exchange Fees + SEBI Fees). STT and Stamp Duty are excluded.
        gst_taxable_value = total_brokerage + quantized_exchange_fee + quantized_sebi
        quantized_gst = (gst_taxable_value * entry_cfg.gst_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 7. Total Aggregate Charges
        total_charges = (
            total_brokerage
            + quantized_stt
            + quantized_exchange_fee
            + quantized_sebi
            + quantized_gst
            + quantized_stamp_duty
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # 8. Friction analytics percentage (with zero-division guard)
        if total_turnover > Decimal("0.00"):
            charges_pct = ((total_charges / total_turnover) * Decimal(100)).quantize(
                Decimal("0.0001"), rounding=ROUND_HALF_UP
            )
        else:
            charges_pct = Decimal("0.0000")

        return ChargesBreakdown(
            brokerage=total_brokerage,
            stt=quantized_stt,
            exchange_turnover_fee=quantized_exchange_fee,
            sebi_charges=quantized_sebi,
            gst=quantized_gst,
            stamp_duty=quantized_stamp_duty,
            total_charges=total_charges,
            turnover_entry=turnover_entry.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            turnover_exit=turnover_exit.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            total_turnover=total_turnover.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            charges_pct_of_turnover=charges_pct,
        )

    @classmethod
    def enrich_trades_with_charges(
        cls,
        trades: Sequence[PairedTrade],
        custom_schedule: Sequence[ChargeRateConfig] | dict[str, ChargeRateConfig] | None = None,
    ) -> list[PairedTrade]:
        """Calculates charges for each trade and returns enriched copies with updated charges & net_pnl."""
        schedule_list: list[ChargeRateConfig] | None = None
        if isinstance(custom_schedule, dict):
            schedule_list = list(custom_schedule.values())
        elif custom_schedule is not None:
            schedule_list = list(custom_schedule)

        enriched: list[PairedTrade] = []
        for trade in trades:
            breakdown = cls.calculate_trade_charges(trade, custom_schedule=schedule_list)
            net_pnl = (trade.gross_pnl - breakdown.total_charges).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            updated_trade = trade.model_copy(
                update={
                    "charges": breakdown.total_charges,
                    "net_pnl": net_pnl,
                }
            )
            enriched.append(updated_trade)

        return enriched
