/**
 * TradeLens Financial Formatting Utilities
 *
 * Implements standard Indian financial numbering (en-IN), Lakh/Crore compact
 * denominations, signed currencies, and percentage formatting for trading metrics.
 */

export interface CurrencyFormatOptions {
  showDecimals?: boolean;
  compact?: boolean;
  precision?: number;
}

export interface DenominationOptions {
  precision?: number;
  showSymbol?: boolean;
}

export interface PercentageFormatOptions {
  includeSign?: boolean;
  precision?: number;
}

/**
 * Formats a numeric value into standard Indian currency representation (INR).
 * Uses the Indian numbering system (2, 2, 3 comma grouping pattern).
 *
 * Examples:
 * formatCurrencyINR(150000) => "₹1,50,000.00"
 * formatCurrencyINR(150000, { showDecimals: false }) => "₹1,50,000"
 * formatCurrencyINR(-150000) => "-₹1,50,000.00"
 */
export function formatCurrencyINR(
  amount: number,
  options?: CurrencyFormatOptions
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0.00";
  }

  const showDecimals = options?.showDecimals ?? true;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  const formattedNum = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(abs);

  return `${sign}₹${formattedNum}`;
}

/**
 * Formats large amounts in Indian numbering format (Lakhs and Crores).
 *
 * Examples:
 * formatIndianDenomination(24000000) => "₹2.40 Cr"
 * formatIndianDenomination(150000) => "₹1.50 L"
 * formatIndianDenomination(-150000) => "-₹1.50 L"
 * formatIndianDenomination(99999) => "₹99,999.00"
 */
export function formatIndianDenomination(
  amount: number,
  options?: DenominationOptions
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0.00";
  }

  const precision = options?.precision ?? 2;
  const showSymbol = options?.showSymbol ?? true;
  const sym = showSymbol ? "₹" : "";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10_000_000) {
    return `${sign}${sym}${(abs / 10_000_000).toFixed(precision)} Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}${sym}${(abs / 100_000).toFixed(precision)} L`;
  }

  return formatCurrencyINR(amount, { showDecimals: precision > 0 });
}

/**
 * Formats an amount with an explicit plus (+) or minus (-) sign.
 * Useful for P&L indicators, returns, and variances.
 *
 * Examples:
 * formatSignedCurrency(45200) => "+₹45,200.00"
 * formatSignedCurrency(-12450) => "-₹12,450.00"
 * formatSignedCurrency(0) => "₹0.00"
 * formatSignedCurrency(150000, { compact: true }) => "+₹1.50 L"
 */
export function formatSignedCurrency(
  amount: number,
  options?: CurrencyFormatOptions
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "₹0.00";
  }

  if (amount === 0) {
    return formatCurrencyINR(0, options);
  }

  const formatted = options?.compact
    ? formatIndianDenomination(amount, { precision: options.precision ?? 2 })
    : formatCurrencyINR(amount, options);

  if (amount > 0) {
    return `+${formatted}`;
  }

  // formatCurrencyINR or formatIndianDenomination already includes leading '-'
  return formatted;
}

/**
 * Formats a decimal or percentage number into a standard percentage string.
 *
 * Examples:
 * formatPercentage(57.1428) => "57.14%"
 * formatPercentage(57.1428, { includeSign: true }) => "+57.14%"
 * formatPercentage(-12.5, { includeSign: true }) => "-12.50%"
 * formatPercentage(0, { includeSign: true }) => "0.00%"
 */
export function formatPercentage(
  value: number,
  options?: PercentageFormatOptions
): string {
  if (isNaN(value) || value === null || value === undefined) {
    return "0.00%";
  }

  const precision = options?.precision ?? 2;
  const formattedVal = Math.abs(value).toFixed(precision);

  if (options?.includeSign) {
    if (value > 0) {
      return `+${formattedVal}%`;
    }
    if (value < 0) {
      return `-${formattedVal}%`;
    }
    return `${(0).toFixed(precision)}%`;
  }

  const sign = value < 0 ? "-" : "";
  return `${sign}${formattedVal}%`;
}

/**
 * Backwards compatibility alias
 */
export const formatIndianCurrency = formatCurrencyINR;
