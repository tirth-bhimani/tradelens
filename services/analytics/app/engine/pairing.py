"""TradeLens FIFO Trade Fill Pairing Engine.

Implements deterministic First-In, First-Out (FIFO) lot accounting to match
individual BUY and SELL execution fills into closed round-trip trades.
Handles partial scale-outs, multiple scale-ins, short-selling, position flips,
multi-day positional holdings, and cross-notation contract key matching.
"""

from __future__ import annotations

from collections import deque
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from app.engine.instruments import InstrumentNormalizer
from app.models.fills import RawFillCreate
from app.models.instruments import NormalizedInstrument
from app.models.trade import (
    OpenPosition,
    PairedTrade,
    PairingResult,
    PositionSide,
    TradeInstrumentType,
    TradeSegment,
)


def map_instrument_to_trade_type(norm: NormalizedInstrument) -> TradeInstrumentType:
    """Map NormalizedInstrument classification to PostgreSQL CHECK constraint."""
    if norm.instrument_type == "EQUITY":
        return "EQ"
    if norm.instrument_type == "FUTURE":
        return "FUT"
    if norm.instrument_type == "OPTION":
        return "CE" if norm.option_type == "CE" else "PE"
    # Fallback for commodities or unclassified: treat as EQ default
    return "EQ"


def derive_trade_segment(inst_type: TradeInstrumentType, is_intraday: bool) -> TradeSegment:
    """Derive tax and brokerage segment classification."""
    if inst_type == "EQ":
        return "EQUITY_INTRADAY" if is_intraday else "EQUITY_DELIVERY"
    if inst_type == "FUT":
        return "FUTURES"
    return "OPTIONS"


class LotItem:
    """Internal lot tranche tracking open quantity, price, timestamp, and lineage."""

    def __init__(
        self,
        fill_id: str,
        timestamp: datetime,
        side: str,  # "BUY" or "SELL"
        quantity: Decimal,
        price: Decimal,
        order_id: str | None = None,
        user_id: UUID | None = None,
        import_id: UUID | None = None,
        trade_date: date | None = None,
    ):
        self.fill_id = fill_id
        self.timestamp = timestamp
        self.side = side
        self.original_quantity = quantity
        self.remaining_quantity = quantity
        self.price = price
        self.order_id = order_id
        self.user_id = user_id
        self.import_id = import_id
        self.trade_date = trade_date or timestamp.date()


class InstrumentLotQueue:
    """Manages FIFO lot queues for a single financial contract."""

    def __init__(self, symbol: str, norm: NormalizedInstrument | None = None):
        self.symbol = symbol
        self.norm = norm or InstrumentNormalizer.normalize(symbol)
        self.open_lots: deque[LotItem] = deque()

    def process_fill(self, fill: RawFillCreate) -> list[PairedTrade]:
        """Processes a single chronological fill against the open lot queue."""
        if fill.quantity <= 0:
            return []

        # If queue is empty, push this fill as open inventory
        if not self.open_lots:
            self.open_lots.append(
                LotItem(
                    fill_id=fill.trade_id,
                    timestamp=fill.fill_time,
                    side=fill.trade_type,
                    quantity=fill.quantity,
                    price=fill.price,
                    order_id=fill.order_id,
                    user_id=fill.user_id,
                    import_id=fill.import_id,
                    trade_date=fill.trade_date,
                )
            )
            return []

        current_open_side = self.open_lots[0].side

        # If incoming fill is on the same side (scaling in), append to queue
        if fill.trade_type == current_open_side:
            self.open_lots.append(
                LotItem(
                    fill_id=fill.trade_id,
                    timestamp=fill.fill_time,
                    side=fill.trade_type,
                    quantity=fill.quantity,
                    price=fill.price,
                    order_id=fill.order_id,
                    user_id=fill.user_id,
                    import_id=fill.import_id,
                    trade_date=fill.trade_date,
                )
            )
            return []

        # Incoming fill is on opposite side: execute FIFO matching
        trades: list[PairedTrade] = []
        fill_remaining_qty = fill.quantity

        while fill_remaining_qty > 0 and self.open_lots:
            oldest_lot = self.open_lots[0]
            matched_qty = min(fill_remaining_qty, oldest_lot.remaining_quantity)

            # Determine trade direction and P&L
            if oldest_lot.side == "BUY":
                # Long Trade closed by SELL fill
                is_short = False
                entry_price = oldest_lot.price
                exit_price = fill.price
                entry_time = oldest_lot.timestamp
                exit_time = fill.fill_time
                gross_pnl = (exit_price - entry_price) * matched_qty
            else:
                # Short Trade closed by BUY fill
                is_short = True
                entry_price = oldest_lot.price
                exit_price = fill.price
                entry_time = oldest_lot.timestamp
                exit_time = fill.fill_time
                gross_pnl = (entry_price - exit_price) * matched_qty

            # Intraday classification: matching trading calendar dates
            is_intraday = oldest_lot.trade_date == fill.trade_date
            duration_seconds = max(0, int((exit_time - entry_time).total_seconds()))
            inst_type = map_instrument_to_trade_type(self.norm)
            segment = derive_trade_segment(inst_type, is_intraday)

            quantized_pnl = gross_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            user_id = fill.user_id or oldest_lot.user_id
            import_id = fill.import_id or oldest_lot.import_id

            trade = PairedTrade(
                user_id=user_id,
                import_id=import_id,
                symbol=self.symbol,
                segment=segment,
                instrument_type=inst_type,
                is_short=is_short,
                is_intraday=is_intraday,
                entry_time=entry_time,
                exit_time=exit_time,
                trade_duration_seconds=duration_seconds,
                quantity=matched_qty,
                entry_price=entry_price,
                exit_price=exit_price,
                gross_pnl=quantized_pnl,
                charges=Decimal("0.00"),
                net_pnl=quantized_pnl,
                entry_fill_ids=[oldest_lot.fill_id],
                exit_fill_ids=[fill.trade_id],
            )
            trades.append(trade)

            # Deduct matched quantity
            oldest_lot.remaining_quantity -= matched_qty
            fill_remaining_qty -= matched_qty

            if oldest_lot.remaining_quantity <= 0:
                self.open_lots.popleft()

        # If incoming fill had excess quantity after closing the entire position,
        # the trader flipped position direction (e.g. Long 50 -> Sell 150 -> Short 100).
        if fill_remaining_qty > 0:
            self.open_lots.append(
                LotItem(
                    fill_id=fill.trade_id,
                    timestamp=fill.fill_time,
                    side=fill.trade_type,
                    quantity=fill_remaining_qty,
                    price=fill.price,
                    order_id=fill.order_id,
                    user_id=fill.user_id,
                    import_id=fill.import_id,
                    trade_date=fill.trade_date,
                )
            )

        return trades

    def get_open_position(self) -> OpenPosition | None:
        """Returns OpenPosition model if residual unclosed inventory exists."""
        if not self.open_lots:
            return None

        total_remaining = sum((lot.remaining_quantity for lot in self.open_lots), Decimal(0))
        if total_remaining <= 0:
            return None

        total_cost = sum((lot.remaining_quantity * lot.price for lot in self.open_lots), Decimal(0))
        average_price = (total_cost / total_remaining).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)

        side: PositionSide = "LONG" if self.open_lots[0].side == "BUY" else "SHORT"
        first_fill_time = self.open_lots[0].timestamp
        fill_ids = [lot.fill_id for lot in self.open_lots]
        user_id = self.open_lots[0].user_id
        import_id = self.open_lots[0].import_id

        is_expired = False
        if self.norm.is_derivative and self.norm.expiry_date:
            is_expired = self.norm.expiry_date < date.today()

        return OpenPosition(
            symbol=self.symbol,
            side=side,
            quantity=total_remaining,
            average_price=average_price,
            first_fill_time=first_fill_time,
            fill_ids=fill_ids,
            is_expired=is_expired,
            user_id=user_id,
            import_id=import_id,
        )


class FifoPairingEngine:
    """Deterministic FIFO Trade Pairing Engine for Indian Equities and Derivatives."""

    @classmethod
    def pair_fills(cls, fills: list[RawFillCreate]) -> PairingResult:
        """Pairs a chronological stream of raw fills into closed round-trip trades.

        Partitions queues by canonical contract_key so notation differences
        (e.g. NSE:RELIANCE vs RELIANCE-EQ) pair seamlessly.
        """
        if not fills:
            return PairingResult(
                total_fills_processed=0,
                total_trades_created=0,
                trades=[],
                open_positions=[],
                unmatched_symbols=[],
            )

        # 1. Sort fills in strict chronological order
        # Primary: fill_time, Secondary: trade_date, Tertiary: order_id, Quaternary: trade_id
        sorted_fills = sorted(
            fills,
            key=lambda f: (
                f.fill_time,
                f.trade_date,
                f.order_id or "",
                f.trade_id,
            ),
        )

        queues: dict[str, InstrumentLotQueue] = {}
        all_trades: list[PairedTrade] = []

        # 2. Process fills through contract_key scoped FIFO queues
        for fill in sorted_fills:
            norm = InstrumentNormalizer.normalize(fill.symbol)
            contract_key = norm.contract_key

            if contract_key not in queues:
                queues[contract_key] = InstrumentLotQueue(symbol=norm.normalized_symbol, norm=norm)

            queue = queues[contract_key]
            new_trades = queue.process_fill(fill)
            all_trades.extend(new_trades)

        # 3. Collect open residual positions
        open_positions: list[OpenPosition] = []
        unmatched_symbols: list[str] = []

        for queue in queues.values():
            pos = queue.get_open_position()
            if pos:
                open_positions.append(pos)
                unmatched_symbols.append(pos.symbol)

        # 4. Sort emitted trades chronologically by exit_time
        all_trades.sort(key=lambda t: t.exit_time)

        return PairingResult(
            total_fills_processed=len(sorted_fills),
            total_trades_created=len(all_trades),
            trades=all_trades,
            open_positions=open_positions,
            unmatched_symbols=unmatched_symbols,
        )

    @classmethod
    def settle_expired_contracts(
        cls,
        open_positions: list[OpenPosition],
        as_of_date: date | None = None,
    ) -> tuple[list[PairedTrade], list[OpenPosition]]:
        """Optional settlement helper for expired out-of-the-money options.

        Closes expired options at exit_price = Decimal("0.00") on expiry date at 15:30 IST.
        Returns a tuple of (settlement_trades, remaining_open_positions).
        """
        ref_date = as_of_date or date.today()
        settlement_trades: list[PairedTrade] = []
        remaining_positions: list[OpenPosition] = []

        for pos in open_positions:
            norm = InstrumentNormalizer.normalize(pos.symbol)
            if norm.instrument_type == "OPTION" and norm.expiry_date and norm.expiry_date <= ref_date:
                # Option expired OTM: settle at 0.00
                exit_time = datetime(
                    norm.expiry_date.year,
                    norm.expiry_date.month,
                    norm.expiry_date.day,
                    15,
                    30,
                    0,
                    tzinfo=pos.first_fill_time.tzinfo,
                )
                entry_time = pos.first_fill_time
                is_short = pos.side == "SHORT"
                entry_price = pos.average_price
                exit_price = Decimal("0.00")

                if is_short:
                    # Sold option that expired worthless -> full premium profit
                    gross_pnl = (entry_price - exit_price) * pos.quantity
                else:
                    # Bought option that expired worthless -> total loss of premium
                    gross_pnl = (exit_price - entry_price) * pos.quantity

                is_intraday = entry_time.date() == exit_time.date()
                duration = max(0, int((exit_time - entry_time).total_seconds()))
                inst_type = map_instrument_to_trade_type(norm)
                segment = derive_trade_segment(inst_type, is_intraday)
                quantized_pnl = gross_pnl.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                trade = PairedTrade(
                    user_id=pos.user_id,
                    import_id=pos.import_id,
                    symbol=pos.symbol,
                    segment=segment,
                    instrument_type=inst_type,
                    is_short=is_short,
                    is_intraday=is_intraday,
                    entry_time=entry_time,
                    exit_time=exit_time,
                    trade_duration_seconds=duration,
                    quantity=pos.quantity,
                    entry_price=entry_price,
                    exit_price=exit_price,
                    gross_pnl=quantized_pnl,
                    charges=Decimal("0.00"),
                    net_pnl=quantized_pnl,
                    entry_fill_ids=pos.fill_ids,
                    exit_fill_ids=["EXPIRY_SETTLEMENT"],
                    tags=["EXPIRED_UNEXERCISED"],
                    notes="Contract expired and cash-settled out of the money at 0.00",
                )
                settlement_trades.append(trade)
            else:
                remaining_positions.append(pos)

        return settlement_trades, remaining_positions
