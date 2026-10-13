-- TradeLens Seed Data
-- Regulatory Indian statutory charge rates (NSE / SEBI standard defaults)

INSERT INTO charge_rates (
    segment,
    effective_from,
    stt_rate_buy,
    stt_rate_sell,
    brokerage_per_order,
    exchange_turnover_rate,
    sebi_turnover_rate,
    gst_rate,
    stamp_duty_rate_buy
) VALUES
-- 1. Equity Delivery
(
    'EQUITY_DELIVERY',
    '2024-01-01',
    0.001000, -- 0.1% on buy
    0.001000, -- 0.1% on sell
    0.00,     -- Zero brokerage for delivery on discount brokers
    0.0000345, -- NSE turnover fee 0.00345%
    0.0000010, -- SEBI fee 0.0001%
    0.1800,    -- 18% GST
    0.000150   -- Stamp duty 0.015% on buy
),
-- 2. Equity Intraday
(
    'EQUITY_INTRADAY',
    '2024-01-01',
    0.000000, -- 0% on buy
    0.000250, -- 0.025% on sell
    20.00,    -- Flat ₹20 per executed order
    0.0000345, -- NSE turnover fee 0.00345%
    0.0000010, -- SEBI fee 0.0001%
    0.1800,    -- 18% GST
    0.000030   -- Stamp duty 0.003% on buy
),
-- 3. Futures
(
    'FUTURES',
    '2024-01-01',
    0.000000, -- 0% on buy
    0.000200, -- 0.02% on sell turnover
    20.00,    -- Flat ₹20 per executed order
    0.0000200, -- NSE turnover fee 0.002%
    0.0000010, -- SEBI fee 0.0001%
    0.1800,    -- 18% GST
    0.000020   -- Stamp duty 0.002% on buy
),
-- 4. Options
(
    'OPTIONS',
    '2024-01-01',
    0.000000, -- 0% on buy
    0.001000, -- 0.1% on premium on sell
    20.00,    -- Flat ₹20 per executed order
    0.0005300, -- NSE turnover fee 0.053% on premium
    0.0000010, -- SEBI fee 0.0001%
    0.1800,    -- 18% GST
    0.000030   -- Stamp duty 0.003% on buy
)
ON CONFLICT DO NOTHING;
