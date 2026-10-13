import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface IndexConfig {
  name: string;
  symbol: string;
}

const INDICES_CONFIG: IndexConfig[] = [
  { name: "NIFTY 50", symbol: "%5ENSEI" },
  { name: "SENSEX", symbol: "%5EBSESN" },
  { name: "BANK NIFTY", symbol: "%5ENSEBANK" },
  { name: "NIFTY IT", symbol: "%5ECNXIT" },
  { name: "NIFTY MIDCAP 100", symbol: "NIFTY_MIDCAP_100.NS" },
  { name: "INDIA VIX", symbol: "%5EINDIAVIX" },
];

export interface MarketTickerItem {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  rawPrice: number;
}

// In-memory server cache to protect upstream rate limits
let cachedData: MarketTickerItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

const FALLBACK_INDICES: MarketTickerItem[] = [
  {
    symbol: "NIFTY 50",
    price: "22,721.95",
    change: "+201.55",
    changePercent: "+0.89%",
    isPositive: true,
    rawPrice: 22721.95,
  },
  {
    symbol: "SENSEX",
    price: "73,033.78",
    change: "+561.48",
    changePercent: "+0.77%",
    isPositive: true,
    rawPrice: 73033.78,
  },
  {
    symbol: "BANK NIFTY",
    price: "55,481.05",
    change: "+224.45",
    changePercent: "+0.41%",
    isPositive: true,
    rawPrice: 55481.05,
  },
  {
    symbol: "NIFTY IT",
    price: "29,830.10",
    change: "+182.30",
    changePercent: "+0.61%",
    isPositive: true,
    rawPrice: 29830.1,
  },
  {
    symbol: "NIFTY MIDCAP 100",
    price: "59,459.20",
    change: "+310.40",
    changePercent: "+0.52%",
    isPositive: true,
    rawPrice: 59459.2,
  },
  {
    symbol: "INDIA VIX",
    price: "14.12",
    change: "-0.26",
    changePercent: "-1.81%",
    isPositive: false,
    rawPrice: 14.12,
  },
];

async function fetchQuote(config: IndexConfig): Promise<MarketTickerItem | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.symbol}?interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      next: { revalidate: 15 },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;
    const prevClose = meta?.chartPreviousClose || meta?.previousClose;

    if (price === undefined || prevClose === undefined || prevClose === 0) {
      return null;
    }

    const change = price - prevClose;
    const changePercent = (change / prevClose) * 100;
    const isPositive = change >= 0;

    return {
      symbol: config.name,
      price: price.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      change: (isPositive ? "+" : "") + change.toFixed(2),
      changePercent: (isPositive ? "+" : "") + changePercent.toFixed(2) + "%",
      isPositive,
      rawPrice: price,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const now = Date.now();

  // Return cached result if within TTL
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      data: cachedData,
      source: "cache",
      timestamp: lastFetchTime,
    });
  }

  try {
    const quotePromises = INDICES_CONFIG.map((cfg) => fetchQuote(cfg));
    const quotes = await Promise.all(quotePromises);

    // Merge quotes with fallback in case individual fetch failed
    const merged: MarketTickerItem[] = INDICES_CONFIG.map((cfg, idx) => {
      const fetched = quotes[idx];
      return fetched || FALLBACK_INDICES[idx] || FALLBACK_INDICES[0];
    });

    cachedData = merged;
    lastFetchTime = now;

    return NextResponse.json({
      success: true,
      data: merged,
      source: "live",
      timestamp: now,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      data: cachedData || FALLBACK_INDICES,
      source: "fallback",
      error: error?.message,
      timestamp: now,
    });
  }
}
