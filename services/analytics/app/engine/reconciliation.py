"""TradeLens Broker Statement Reconciliation Engine.

Implements high-precision, deterministic reconciliation between TradeLens
computed round-trip trades / statutory charges and broker-issued Tax P&L statements.
Diagnoses discrepancies with automated classification rules (DP charges, open lots,
missing legs, and rounding variations).
"""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal

from app.models.reconciliation import (
    BrokerStatementSummary,
    BrokerSymbolSummary,
    DiscrepancyReason,
    ReconciliationReport,
    ReconciliationStatus,
    SymbolReconciliation,
)
from app.models.trade import OpenPosition, PairedTrade

# Canonical Depository Participant (DP) charge signatures in India
# Standard: ₹13.50 base CDSL fee + 18% GST (₹2.43) = ₹15.93 per scrip/day
STANDARD_DP_WITH_GST = Decimal("15.93")
STANDARD_DP_BASE = Decimal("13.50")


class ReconciliationEngine:
    """Deterministic comparative engine for broker tax statement reconciliation."""

    @classmethod
    def reconcile(
        cls,
        trades: Sequence[PairedTrade],
        open_positions: Sequence[OpenPosition] | None = None,
        statement_summary: BrokerStatementSummary | None = None,
        tolerance_threshold: Decimal = Decimal("1.00"),
    ) -> ReconciliationReport:
        """Executes a two-level reconciliation (portfolio & per-symbol) against a broker statement."""
        open_pos_list = open_positions or []

        # 1. Group TradeLens trades by canonical symbol
        trades_by_symbol: dict[str, list[PairedTrade]] = defaultdict(list)
        for trade in trades:
            trades_by_symbol[trade.symbol].append(trade)

        # 2. Track open positions by symbol
        open_symbols = {p.symbol for p in open_pos_list if p.quantity > Decimal(0)}

        # 3. Index broker symbol summaries
        broker_symbols: dict[str, BrokerSymbolSummary] = {}
        if statement_summary and statement_summary.symbols:
            for b_sym in statement_summary.symbols:
                broker_symbols[b_sym.symbol] = b_sym

        # 4. Resolve full universe of evaluated symbols
        all_symbols = sorted(set(trades_by_symbol.keys()) | set(broker_symbols.keys()))

        symbol_reports: list[SymbolReconciliation] = []
        matched_count = 0
        discrepancy_count = 0

        for symbol in all_symbols:
            app_trades = trades_by_symbol.get(symbol, [])
            broker_sym = broker_symbols.get(symbol)
            has_open = symbol in open_symbols

            if app_trades and broker_sym:
                # Symbol exists in both TradeLens and Broker Statement
                app_gross = sum((t.gross_pnl for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                app_charges = sum((t.charges for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                app_net = sum((t.net_pnl for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

                broker_gross = broker_sym.realized_gross_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                broker_charges = broker_sym.charges.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                broker_net = broker_sym.net_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                gross_delta = (app_gross - broker_gross).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                charges_delta = (app_charges - broker_charges).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                net_delta = (app_net - broker_net).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                is_delivery = any(t.segment == "EQUITY_DELIVERY" for t in app_trades)

                status, reasons, explanation = cls._diagnose_symbol_delta(
                    gross_delta=gross_delta,
                    charges_delta=charges_delta,
                    net_delta=net_delta,
                    has_open_positions=has_open,
                    is_delivery=is_delivery,
                    tolerance=tolerance_threshold,
                )

                if status == "MATCHED":
                    matched_count += 1
                else:
                    discrepancy_count += 1

                symbol_reports.append(
                    SymbolReconciliation(
                        symbol=symbol,
                        status=status,
                        app_gross_pnl=app_gross,
                        broker_gross_pnl=broker_gross,
                        gross_delta=gross_delta,
                        app_charges=app_charges,
                        broker_charges=broker_charges,
                        charges_delta=charges_delta,
                        app_net_pnl=app_net,
                        broker_net_pnl=broker_net,
                        net_delta=net_delta,
                        paired_trades_count=len(app_trades),
                        has_open_positions=has_open,
                        discrepancy_reasons=reasons,
                        explanation=explanation,
                    )
                )

            elif app_trades and not broker_sym:
                # Traded in App, but absent from broker statement
                app_gross = sum((t.gross_pnl for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                app_charges = sum((t.charges for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )
                app_net = sum((t.net_pnl for t in app_trades), Decimal("0.00")).quantize(
                    Decimal("0.01"), rounding=ROUND_HALF_UP
                )

                discrepancy_count += 1
                symbol_reports.append(
                    SymbolReconciliation(
                        symbol=symbol,
                        status="MISSING_IN_BROKER",
                        app_gross_pnl=app_gross,
                        broker_gross_pnl=Decimal("0.00"),
                        gross_delta=app_gross,
                        app_charges=app_charges,
                        broker_charges=Decimal("0.00"),
                        charges_delta=app_charges,
                        app_net_pnl=app_net,
                        broker_net_pnl=Decimal("0.00"),
                        net_delta=app_net,
                        paired_trades_count=len(app_trades),
                        has_open_positions=has_open,
                        discrepancy_reasons=["MISSING_TRADE_FILLS"],
                        explanation=f"Symbol '{symbol}' was traded in TradeLens ({len(app_trades)} trades), but has no entry on the broker statement.",
                    )
                )

            elif not app_trades and broker_sym:
                # Present on broker statement, but missing from TradeLens tradebook
                broker_gross = broker_sym.realized_gross_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                broker_charges = broker_sym.charges.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                broker_net = broker_sym.net_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                discrepancy_count += 1
                symbol_reports.append(
                    SymbolReconciliation(
                        symbol=symbol,
                        status="MISSING_IN_APP",
                        app_gross_pnl=Decimal("0.00"),
                        broker_gross_pnl=broker_gross,
                        gross_delta=-broker_gross,
                        app_charges=Decimal("0.00"),
                        broker_charges=broker_charges,
                        charges_delta=-broker_charges,
                        app_net_pnl=Decimal("0.00"),
                        broker_net_pnl=broker_net,
                        net_delta=-broker_net,
                        paired_trades_count=0,
                        has_open_positions=has_open,
                        discrepancy_reasons=["MISSING_TRADE_FILLS"],
                        explanation=f"Broker statement reports ₹{broker_net:.2f} for '{symbol}', but no matching trade fills were found in TradeLens.",
                    )
                )

        # 5. Portfolio Aggregate Totals
        app_total_gross = sum((t.gross_pnl for t in trades), Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        app_total_charges = sum((t.charges for t in trades), Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        app_total_net = sum((t.net_pnl for t in trades), Decimal("0.00")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        broker_total_gross = (
            statement_summary.total_gross_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if statement_summary
            else app_total_gross
        )
        broker_total_charges = (
            statement_summary.total_charges.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if statement_summary
            else app_total_charges
        )
        broker_total_net = (
            statement_summary.total_net_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if statement_summary
            else app_total_net
        )

        gross_delta_total = (app_total_gross - broker_total_gross).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        charges_delta_total = (app_total_charges - broker_total_charges).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        net_delta_total = (app_total_net - broker_total_net).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        total_eval = len(all_symbols)
        if total_eval > 0:
            match_pct = (Decimal(matched_count) / Decimal(total_eval) * Decimal(100)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        else:
            match_pct = Decimal("100.00")

        is_fully_reconciled = (
            abs(net_delta_total) <= tolerance_threshold and discrepancy_count == 0
        )

        # 6. Generate systemic portfolio warnings
        systemic_warnings: list[str] = []
        dp_flagged = [s for s in symbol_reports if "DP_CHARGES_UNACCOUNTED" in s.discrepancy_reasons]
        if dp_flagged:
            systemic_warnings.append(
                f"Depository Participant (DP) charges were detected on {len(dp_flagged)} delivery symbol(s) (₹15.93 per scrip/day). DP charges are ledger debits that do not appear on tradebook order fills."
            )

        open_flagged = [s for s in symbol_reports if "OPEN_POSITION_RESIDUAL" in s.discrepancy_reasons]
        if open_flagged:
            systemic_warnings.append(
                f"{len(open_flagged)} symbol(s) have un-exited residual open lots. Unsold inventory carries unrealized P&L that does not appear on closed tax P&L statements."
            )

        if discrepancy_count > 0 and not is_fully_reconciled:
            systemic_warnings.append(
                f"Portfolio contains {discrepancy_count} symbol(s) with net discrepancies exceeding the ₹{tolerance_threshold} regulatory tolerance."
            )

        return ReconciliationReport(
            broker_name=statement_summary.broker_name if statement_summary else "ZERODHA",
            tolerance_threshold=tolerance_threshold,
            total_symbols_evaluated=total_eval,
            matched_symbols_count=matched_count,
            discrepancy_symbols_count=discrepancy_count,
            match_percentage=match_pct,
            app_total_gross_pnl=app_total_gross,
            broker_total_gross_pnl=broker_total_gross,
            gross_pnl_delta=gross_delta_total,
            app_total_charges=app_total_charges,
            broker_total_charges=broker_total_charges,
            charges_delta=charges_delta_total,
            app_total_net_pnl=app_total_net,
            broker_total_net_pnl=broker_total_net,
            net_pnl_delta=net_delta_total,
            is_fully_reconciled=is_fully_reconciled,
            symbols=symbol_reports,
            systemic_warnings=systemic_warnings,
        )

    @classmethod
    def _diagnose_symbol_delta(
        cls,
        gross_delta: Decimal,
        charges_delta: Decimal,
        net_delta: Decimal,
        has_open_positions: bool,
        is_delivery: bool,
        tolerance: Decimal,
    ) -> tuple[ReconciliationStatus, list[DiscrepancyReason], str]:
        """Diagnoses why a symbol has a discrepancy and produces human-readable explanations."""
        reasons: list[DiscrepancyReason] = []

        # 1. Check if within tolerance
        if abs(net_delta) <= tolerance:
            if abs(net_delta) > Decimal("0.00"):
                reasons.append("ROUNDING_VARIANCE")
                explanation = f"Matched cleanly within statutory rounding tolerance (delta: ₹{net_delta:+.2f})."
            else:
                explanation = "Exact match between TradeLens calculations and broker statement."
            return "MATCHED", reasons, explanation

        # 2. Check for Depository Participant (DP) charges signature
        # When broker includes DP charges, broker charges > app charges => charges_delta is negative
        # and gross_delta is ~0 (execution prices matched)
        fee_difference = abs(charges_delta)
        is_dp_match = False
        if (
            is_delivery
            and abs(gross_delta) <= tolerance
            and (
                abs(fee_difference % STANDARD_DP_WITH_GST) <= Decimal("0.10")
                or abs(fee_difference % STANDARD_DP_BASE) <= Decimal("0.10")
            )
        ):
            is_dp_match = True

        if is_dp_match:
            reasons.append("DP_CHARGES_UNACCOUNTED")
            explanation = (
                f"Variance of ₹{fee_difference:.2f} matches standard CDSL/NSDL Depository Participant (DP) "
                f"charges on delivery sell transactions. TradeLens calculates execution statutory charges; DP fees are debited to the ledger separately."
            )
            return "DISCREPANCY", reasons, explanation

        # 3. Check for open positions / period cutoff residuals
        if has_open_positions and abs(gross_delta) > tolerance:
            reasons.append("OPEN_POSITION_RESIDUAL")
            explanation = (
                f"Symbol has residual open lots. Unmatched positions carry unrealized P&L "
                f"(Gross delta: ₹{gross_delta:+.2f}) that the broker statement excludes until settled."
            )
            return "DISCREPANCY", reasons, explanation

        # 4. Check for state stamp duty differences or rounding accumulation
        if abs(gross_delta) <= tolerance and abs(charges_delta) > tolerance:
            reasons.append("STAMP_DUTY_STATE_VARIATION")
            explanation = (
                f"Gross execution P&L matches exactly, but statutory deductions differ by ₹{charges_delta:+.2f}. "
                f"Likely due to broker contract-note monthly aggregation rounding or state stamp duty differences."
            )
            return "DISCREPANCY", reasons, explanation

        # 5. Default Unclassified Delta
        reasons.append("UNCLASSIFIED_DELTA")
        explanation = (
            f"Net P&L differs by ₹{net_delta:+.2f} (Gross delta: ₹{gross_delta:+.2f}, Charges delta: ₹{charges_delta:+.2f}). "
            f"Possible causes include missing trade fills, corporate action adjustment, or unrecorded broker penalties."
        )
        return "DISCREPANCY", reasons, explanation
