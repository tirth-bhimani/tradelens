/**
 * Formats a numeric value into standard Indian currency representation (INR).
 *
 * Example:
 * formatCurrencyINR(150000) => "₹1,50,000.00"
 */
export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats large amounts in Indian numbering format (Lakhs and Crores).
 *
 * Example:
 * formatIndianDenomination(24000000) => "₹2.40 Cr"
 * formatIndianDenomination(150000) => "₹1.50 L"
 */
export function formatIndianDenomination(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10_000_000) {
    return `${sign}₹${(abs / 10_000_000).toFixed(2)} Cr`;
  }
  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(2)} L`;
  }
  return formatCurrencyINR(amount);
}
