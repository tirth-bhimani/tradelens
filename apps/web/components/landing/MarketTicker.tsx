"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";

export interface IndexItem {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
  rawPrice?: number;
}

const INITIAL_INDICES: IndexItem[] = [
  {
    symbol: "NIFTY 50",
    price: "22,721.95",
    change: "+201.55",
    changePercent: "+0.89%",
    isPositive: true,
  },
  {
    symbol: "SENSEX",
    price: "73,033.78",
    change: "+561.48",
    changePercent: "+0.77%",
    isPositive: true,
  },
  {
    symbol: "BANK NIFTY",
    price: "55,481.05",
    change: "+224.45",
    changePercent: "+0.41%",
    isPositive: true,
  },
  {
    symbol: "NIFTY IT",
    price: "29,830.10",
    change: "+1,255.20",
    changePercent: "+4.39%",
    isPositive: true,
  },
  {
    symbol: "NIFTY MIDCAP 100",
    price: "59,459.20",
    change: "+624.65",
    changePercent: "+1.06%",
    isPositive: true,
  },
  {
    symbol: "INDIA VIX",
    price: "14.12",
    change: "-0.26",
    changePercent: "-1.81%",
    isPositive: false,
  },
];

export function MarketTicker() {
  const [indices, setIndices] = useState<IndexItem[]>(INITIAL_INDICES);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("Live");

  useEffect(() => {
    let isMounted = true;

    async function fetchLiveQuotes() {
      try {
        setIsUpdating(true);
        const res = await fetch("/api/market/ticker");
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data) && json.data.length > 0) {
          setIndices(json.data);
          const date = new Date(json.timestamp || Date.now());
          setLastUpdated(
            date.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          );
        }
      } catch {
        // Silently preserve current rates on network hiccup
      } finally {
        if (isMounted) {
          setTimeout(() => setIsUpdating(false), 600);
        }
      }
    }

    // Initial fetch
    fetchLiveQuotes();

    // Poll every 20 seconds for continuous real-time market data
    const interval = setInterval(fetchLiveQuotes, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Double array to create an infinite, seamless continuous marquee track
  const marqueeList = [...indices, ...indices];

  return (
    <div className="w-full bg-slate-50/95 border-b border-slate-200/80 overflow-hidden py-1.5 select-none relative z-20">
      <div className="max-w-7xl mx-auto flex items-center">
        {/* Pinned NSE Live Beacon with Real-time pulse indicator */}
        <div className="flex items-center space-x-2 shrink-0 px-4 py-0.5 bg-slate-50 border-r border-slate-200/80 z-20 shadow-[2px_0_6px_rgba(0,0,0,0.02)]">
          <span className="radar-indicator w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
            NSE Realtime
          </span>
          {isUpdating && (
            <RefreshCw className="w-2.5 h-2.5 text-[#387ed1] animate-spin" />
          )}
        </div>

        {/* Continuous Infinite Sliding Marquee Track */}
        <div className="relative flex-1 overflow-hidden flex items-center">
          {/* Subtle edge fade gradients */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent z-10 pointer-events-none" />

          <div className="animate-ticker-marquee flex items-center space-x-8 px-4">
            {marqueeList.map((item, idx) => (
              <div
                key={`${item.symbol}-${idx}`}
                className="flex items-center space-x-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <span className="text-xs font-bold text-slate-700">{item.symbol}</span>
                <span className="text-xs font-semibold text-slate-900">{item.price}</span>
                <span
                  className={`text-[11px] font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] transition-colors ${
                    item.isPositive
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-200/60"
                      : "text-rose-700 bg-rose-50 border border-rose-200/60"
                  }`}
                >
                  {item.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-emerald-600 inline" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-rose-600 inline" />
                  )}
                  {item.changePercent}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle Right Timestamp on desktop */}
        <div className="shrink-0 px-4 border-l border-slate-200/80 hidden xl:flex items-center space-x-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 z-20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Updated: {lastUpdated}</span>
        </div>
      </div>
    </div>
  );
}
