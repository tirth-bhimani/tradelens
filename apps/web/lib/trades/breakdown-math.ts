import { type RoundTripTradeView } from "./trade-filters";

export interface HourlyBucket {
  window: string; // e.g. "09:15 - 10:00"
  label: string; // e.g. "Opening"
  netPnl: number;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
}

export interface WeekdayBucket {
  dayName: string; // "Monday", "Tuesday", etc.
  shortName: string; // "Mon", "Tue", etc.
  netPnl: number;
  tradesCount: number;
  winRate: number;
}

export interface CalendarHeatmapDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  isCurrentMonth: boolean;
  isTradingDay: boolean;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  netPnl: number;
  winRate: number;
  intensityTier: number; // -3 to +3 (0 = neutral)
}

/**
 * Computes hourly performance mapped to NSE/BSE regular market hours (IST).
 */
export function computeHourlyBreakdown(trades: RoundTripTradeView[]): HourlyBucket[] {
  const buckets: HourlyBucket[] = [
    { window: "09:15 - 10:00", label: "Open Rush", netPnl: 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, winRate: 0 },
    { window: "10:00 - 11:30", label: "Morning Session", netPnl: 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, winRate: 0 },
    { window: "11:30 - 13:30", label: "Midday Lull", netPnl: 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, winRate: 0 },
    { window: "13:30 - 14:45", label: "Afternoon Momentum", netPnl: 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, winRate: 0 },
    { window: "14:45 - 15:30", label: "Closing Bell", netPnl: 0, tradesCount: 0, winningTrades: 0, losingTrades: 0, winRate: 0 },
  ];

  trades.forEach((trade) => {
    const dateObj = new Date(trade.entryTime);
    // Convert to hour and minute (assuming input string or UTC/local timestamp)
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    let targetIdx = 1; // Default morning
    if (totalMinutes < 10 * 60) {
      targetIdx = 0; // 09:15 - 10:00
    } else if (totalMinutes < 11 * 60 + 30) {
      targetIdx = 1; // 10:00 - 11:30
    } else if (totalMinutes < 13 * 60 + 30) {
      targetIdx = 2; // 11:30 - 13:30
    } else if (totalMinutes < 14 * 60 + 45) {
      targetIdx = 3; // 13:30 - 14:45
    } else {
      targetIdx = 4; // 14:45 - 15:30
    }

    const b = buckets[targetIdx];
    b.netPnl += trade.netPnl;
    b.tradesCount += 1;
    if (trade.netPnl > 0) b.winningTrades += 1;
    if (trade.netPnl < 0) b.losingTrades += 1;
  });

  // Calculate win rate per bucket
  buckets.forEach((b) => {
    b.winRate = b.tradesCount > 0 ? (b.winningTrades / b.tradesCount) * 100 : 0;
  });

  return buckets;
}

/**
 * Computes day-of-week performance distribution (Monday through Friday).
 */
export function computeWeekdayBreakdown(trades: RoundTripTradeView[]): WeekdayBucket[] {
  const weekdays: WeekdayBucket[] = [
    { dayName: "Monday", shortName: "Mon", netPnl: 0, tradesCount: 0, winRate: 0 },
    { dayName: "Tuesday", shortName: "Tue", netPnl: 0, tradesCount: 0, winRate: 0 },
    { dayName: "Wednesday", shortName: "Wed", netPnl: 0, tradesCount: 0, winRate: 0 },
    { dayName: "Thursday", shortName: "Thu", netPnl: 0, tradesCount: 0, winRate: 0 },
    { dayName: "Friday", shortName: "Fri", netPnl: 0, tradesCount: 0, winRate: 0 },
  ];

  trades.forEach((trade) => {
    const d = new Date(trade.exitTime);
    const day = d.getDay(); // 0 is Sun, 1 is Mon ... 5 is Fri, 6 is Sat
    if (day >= 1 && day <= 5) {
      const bucket = weekdays[day - 1];
      bucket.netPnl += trade.netPnl;
      bucket.tradesCount += 1;
      if (trade.netPnl > 0) {
        // accumulate for win rate calculation
        (bucket as any)._wins = ((bucket as any)._wins || 0) + 1;
      }
    }
  });

  weekdays.forEach((w) => {
    const wins = (w as any)._wins || 0;
    w.winRate = w.tradesCount > 0 ? (wins / w.tradesCount) * 100 : 0;
    delete (w as any)._wins;
  });

  return weekdays;
}

/**
 * Computes the full monthly grid of calendar days with Net P&L heatmap color tiering.
 */
export function computeCalendarMonth(
  trades: RoundTripTradeView[],
  year: number,
  month: number // 1-indexed (1 to 12)
): CalendarHeatmapDay[] {
  // Aggregate trades by YYYY-MM-DD
  const dailyMap = new Map<string, { netPnl: number; count: number; wins: number; losses: number }>();

  trades.forEach((t) => {
    const dateKey = t.exitTime.slice(0, 10);
    const existing = dailyMap.get(dateKey) || { netPnl: 0, count: 0, wins: 0, losses: 0 };
    existing.netPnl += t.netPnl;
    existing.count += 1;
    if (t.netPnl > 0) existing.wins += 1;
    if (t.netPnl < 0) existing.losses += 1;
    dailyMap.set(dateKey, existing);
  });

  const firstDayOfMonth = new Date(year, month - 1, 1);
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  // Day of week for 1st of month (0 = Sun, 1 = Mon ... 6 = Sat)
  const startDayOfWeek = firstDayOfMonth.getDay();

  const days: CalendarHeatmapDay[] = [];

  // 1. Preceding padding days from previous month
  const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthTotalDays - i;
    const dateStr = `${year}-${String(month - 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      dayOfMonth: dayNum,
      dayOfWeek: (startDayOfWeek - 1 - i) % 7,
      isCurrentMonth: false,
      isTradingDay: false,
      tradesCount: 0,
      winningTrades: 0,
      losingTrades: 0,
      netPnl: 0,
      winRate: 0,
      intensityTier: 0,
    });
  }

  // Find max daily profit and max daily loss for relative tier scaling
  let maxAbsPnl = 1000;
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const stats = dailyMap.get(dateStr);
    if (stats && Math.abs(stats.netPnl) > maxAbsPnl) {
      maxAbsPnl = Math.abs(stats.netPnl);
    }
  }

  // 2. Days of current month
  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const stats = dailyMap.get(dateStr);

    let intensityTier = 0;
    if (stats && stats.count > 0 && stats.netPnl !== 0) {
      const ratio = Math.abs(stats.netPnl) / maxAbsPnl;
      const baseTier = ratio > 0.6 ? 3 : ratio > 0.25 ? 2 : 1;
      intensityTier = stats.netPnl > 0 ? baseTier : -baseTier;
    }

    days.push({
      date: dateStr,
      dayOfMonth: day,
      dayOfWeek,
      isCurrentMonth: true,
      isTradingDay: Boolean(stats && stats.count > 0),
      tradesCount: stats?.count ?? 0,
      winningTrades: stats?.wins ?? 0,
      losingTrades: stats?.losses ?? 0,
      netPnl: stats?.netPnl ?? 0,
      winRate: stats && stats.count > 0 ? (stats.wins / stats.count) * 100 : 0,
      intensityTier,
    });
  }

  // 3. Trailing padding days to fill 7-column grid (up to multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({
      date: dateStr,
      dayOfMonth: i,
      dayOfWeek: (days[days.length - 1].dayOfWeek + 1) % 7,
      isCurrentMonth: false,
      isTradingDay: false,
      tradesCount: 0,
      winningTrades: 0,
      losingTrades: 0,
      netPnl: 0,
      winRate: 0,
      intensityTier: 0,
    });
  }

  return days;
}
