import { describe, expect, it } from "vitest";
import {
  formatCurrencyINR,
  formatIndianDenomination,
  formatSignedCurrency,
  formatPercentage,
  formatIndianCurrency,
} from "../lib/utils/format";

describe("formatCurrencyINR", () => {
  it("formats standard amounts with Indian grouping and rupee sign", () => {
    const formatted = formatCurrencyINR(150000);
    expect(formatted).toBe("₹1,50,000.00");
  });

  it("formats negative amounts with minus sign before rupee symbol", () => {
    const formatted = formatCurrencyINR(-150000);
    expect(formatted).toBe("-₹1,50,000.00");
  });

  it("handles zero gracefully", () => {
    const formatted = formatCurrencyINR(0);
    expect(formatted).toBe("₹0.00");
  });

  it("supports hiding decimals when showDecimals: false", () => {
    const formatted = formatCurrencyINR(150000, { showDecimals: false });
    expect(formatted).toBe("₹1,50,000");
  });

  it("handles NaN and undefined inputs safely", () => {
    expect(formatCurrencyINR(NaN)).toBe("₹0.00");
    // @ts-expect-error testing invalid inputs
    expect(formatCurrencyINR(null)).toBe("₹0.00");
  });

  it("supports backwards-compatible formatIndianCurrency alias", () => {
    expect(formatIndianCurrency(48520.5)).toBe("₹48,520.50");
  });
});

describe("formatIndianDenomination", () => {
  it("formats amounts in Crores (Cr) when >= 1 Crore", () => {
    expect(formatIndianDenomination(24000000)).toBe("₹2.40 Cr");
    expect(formatIndianDenomination(10000000)).toBe("₹1.00 Cr");
  });

  it("formats amounts in Lakhs (L) when >= 1 Lakh and < 1 Crore", () => {
    expect(formatIndianDenomination(1550000)).toBe("₹15.50 L");
    expect(formatIndianDenomination(100000)).toBe("₹1.00 L");
  });

  it("formats amounts < 1 Lakh using full standard currency grouping", () => {
    expect(formatIndianDenomination(99999)).toBe("₹99,999.00");
    expect(formatIndianDenomination(48520.5)).toBe("₹48,520.50");
  });

  it("handles negative amounts in Crores and Lakhs", () => {
    expect(formatIndianDenomination(-24000000)).toBe("-₹2.40 Cr");
    expect(formatIndianDenomination(-150000)).toBe("-₹1.50 L");
    expect(formatIndianDenomination(-48520.5)).toBe("-₹48,520.50");
  });

  it("supports custom precision", () => {
    expect(formatIndianDenomination(1567890, { precision: 1 })).toBe("₹15.7 L");
    expect(formatIndianDenomination(24560000, { precision: 3 })).toBe("₹2.456 Cr");
  });

  it("supports omitting rupee symbol when showSymbol: false", () => {
    expect(formatIndianDenomination(150000, { showSymbol: false })).toBe("1.50 L");
  });
});

describe("formatSignedCurrency", () => {
  it("adds explicit '+' sign for positive amounts", () => {
    expect(formatSignedCurrency(45200)).toBe("+₹45,200.00");
  });

  it("preserves '-' sign for negative amounts without double signs", () => {
    expect(formatSignedCurrency(-12450)).toBe("-₹12,450.00");
  });

  it("renders zero without a plus or minus sign", () => {
    expect(formatSignedCurrency(0)).toBe("₹0.00");
  });

  it("supports compact denomination formatting with sign", () => {
    expect(formatSignedCurrency(150000, { compact: true })).toBe("+₹1.50 L");
    expect(formatSignedCurrency(-24000000, { compact: true })).toBe("-₹2.40 Cr");
  });
});

describe("formatPercentage", () => {
  it("formats standard percentage with 2 decimal places by default", () => {
    expect(formatPercentage(57.1428)).toBe("57.14%");
  });

  it("formats with explicit '+' and '-' signs when includeSign: true", () => {
    expect(formatPercentage(57.1428, { includeSign: true })).toBe("+57.14%");
    expect(formatPercentage(-12.5, { includeSign: true })).toBe("-12.50%");
    expect(formatPercentage(0, { includeSign: true })).toBe("0.00%");
  });

  it("supports custom precision for percentages", () => {
    expect(formatPercentage(66.666, { precision: 1 })).toBe("66.7%");
    expect(formatPercentage(66.666, { precision: 1, includeSign: true })).toBe("+66.7%");
  });

  it("handles NaN and null gracefully", () => {
    expect(formatPercentage(NaN)).toBe("0.00%");
    // @ts-expect-error testing invalid inputs
    expect(formatPercentage(null)).toBe("0.00%");
  });
});
