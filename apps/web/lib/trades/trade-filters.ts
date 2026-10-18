/**
 * TradeLens Psychological Tag Taxonomy & Trade Filter Utilities
 */

export type PsychologicalTag =
  | "Rule Followed"
  | "Planned Setup"
  | "Good Risk/Reward"
  | "FOMO"
  | "Revenge Trade"
  | "Overtrading"
  | "Premature Exit"
  | "Held Loser"
  | "Size Creep";

export interface TagMetadata {
  tag: PsychologicalTag;
  label: string;
  category: "disciplined" | "leak" | "neutral";
  description: string;
}

export const PSYCHOLOGICAL_TAGS: Record<PsychologicalTag, TagMetadata> = {
  "Rule Followed": {
    tag: "Rule Followed",
    label: "Rule Followed",
    category: "disciplined",
    description: "Executed strictly according to trading plan and entry criteria",
  },
  "Planned Setup": {
    tag: "Planned Setup",
    label: "Planned Setup",
    category: "disciplined",
    description: "Pre-market or high-conviction planned entry zone",
  },
  "Good Risk/Reward": {
    tag: "Good Risk/Reward",
    label: "Good Risk/Reward",
    category: "disciplined",
    description: "Targeted >= 1:2 risk to reward ratio with defined stop-loss",
  },
  "FOMO": {
    tag: "FOMO",
    label: "FOMO",
    category: "leak",
    description: "Fear of missing out, entered extended green/red candle",
  },
  "Revenge Trade": {
    tag: "Revenge Trade",
    label: "Revenge Trade",
    category: "leak",
    description: "Impulsive re-entry to recover previous loss quickly",
  },
  "Overtrading": {
    tag: "Overtrading",
    label: "Overtrading",
    category: "leak",
    description: "Traded beyond max daily frequency limits without clear edge",
  },
  "Premature Exit": {
    tag: "Premature Exit",
    label: "Premature Exit",
    category: "leak",
    description: "Cut winning trade early before price reached profit target",
  },
  "Held Loser": {
    tag: "Held Loser",
    label: "Held Loser",
    category: "leak",
    description: "Failed to honor stop-loss, held losing trade hoping for bounce",
  },
  "Size Creep": {
    tag: "Size Creep",
    label: "Size Creep",
    category: "leak",
    description: "Exceeded max allowed position sizing or lot count limit",
  },
};

export interface RoundTripTradeView {
  id: string;
  symbol: string;
  segment: "EQUITY" | "FNO" | "COMMODITY" | "CURRENCY";
  entryTime: string; // ISO string or YYYY-MM-DD HH:MM
  exitTime: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  grossPnl: number;
  charges: number;
  netPnl: number;
  returnPct: number;
  tags: PsychologicalTag[];
  notes?: string;
}

export type OutcomeFilter = "ALL" | "WINNERS" | "LOSERS";
export type SortColumn = "exitTime" | "netPnl" | "symbol" | "returnPct" | "quantity";
export type SortDirection = "asc" | "desc";

export interface TradeFilterCriteria {
  searchQuery?: string;
  segment?: string;
  outcome?: OutcomeFilter;
  selectedTag?: PsychologicalTag | "ALL";
  date?: string; // YYYY-MM-DD
}

/**
 * Filters a list of round-trip trades based on search query, outcome, tag, and date.
 */
export function filterTrades(
  trades: RoundTripTradeView[],
  criteria: TradeFilterCriteria
): RoundTripTradeView[] {
  if (!trades) return [];

  return trades.filter((trade) => {
    // 1. Search Query (Symbol or Notes)
    if (criteria.searchQuery && criteria.searchQuery.trim().length > 0) {
      const q = criteria.searchQuery.toLowerCase().trim();
      const matchSymbol = trade.symbol.toLowerCase().includes(q);
      const matchNotes = trade.notes?.toLowerCase().includes(q) ?? false;
      if (!matchSymbol && !matchNotes) return false;
    }

    // 2. Segment
    if (criteria.segment && criteria.segment !== "ALL") {
      if (trade.segment !== criteria.segment) return false;
    }

    // 3. Outcome
    if (criteria.outcome === "WINNERS" && trade.netPnl <= 0) return false;
    if (criteria.outcome === "LOSERS" && trade.netPnl >= 0) return false;

    // 4. Psychological Tag
    if (criteria.selectedTag && criteria.selectedTag !== "ALL") {
      if (!trade.tags || !trade.tags.includes(criteria.selectedTag)) return false;
    }

    // 5. Date match (YYYY-MM-DD)
    if (criteria.date) {
      const tradeDate = trade.exitTime.slice(0, 10);
      if (tradeDate !== criteria.date) return false;
    }

    return true;
  });
}

/**
 * Sorts trades by the chosen column and direction.
 */
export function sortTrades(
  trades: RoundTripTradeView[],
  sortBy: SortColumn = "exitTime",
  direction: SortDirection = "desc"
): RoundTripTradeView[] {
  const dirMultiplier = direction === "asc" ? 1 : -1;

  return [...trades].sort((a, b) => {
    if (sortBy === "exitTime") {
      return (
        dirMultiplier * (new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime())
      );
    }
    if (sortBy === "netPnl") {
      return dirMultiplier * (a.netPnl - b.netPnl);
    }
    if (sortBy === "returnPct") {
      return dirMultiplier * (a.returnPct - b.returnPct);
    }
    if (sortBy === "quantity") {
      return dirMultiplier * (a.quantity - b.quantity);
    }
    if (sortBy === "symbol") {
      return dirMultiplier * a.symbol.localeCompare(b.symbol);
    }
    return 0;
  });
}
