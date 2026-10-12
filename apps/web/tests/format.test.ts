import { describe, expect, it } from "vitest";
import { formatCurrencyINR, formatIndianDenomination } from "../lib/utils/format";

describe("formatCurrencyINR", () => {
  it("formats standard amounts with Indian grouping and rupee sign", () => {
    const formatted = formatCurrencyINR(150000);
    expect(formatted).toContain("1,50,000");
  });

  it("handles zero gracefully", () => {
    const formatted = formatCurrencyINR(0);
    expect(formatted).toContain("0.00");
  });
});

describe("formatIndianDenomination", () => {
  it("formats amounts in Crores (Cr) when >= 1 Crore", () => {
    expect(formatIndianDenomination(24000000)).toBe("₹2.40 Cr");
  });

  it("formats amounts in Lakhs (L) when >= 1 Lakh", () => {
    expect(formatIndianDenomination(150000)).toBe("₹1.50 L");
  });

  it("handles negative amounts appropriately", () => {
    expect(formatIndianDenomination(-150000)).toBe("-₹1.50 L");
  });
});
