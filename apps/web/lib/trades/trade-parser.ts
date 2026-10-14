/**
 * Fallback Universal Tradebook CSV Parser in TypeScript.
 * Provides resilient client/server parsing when the Python microservice is unreachable.
 */

export interface ParsedFill {
  trade_date: string;
  fill_time: string;
  symbol: string;
  trade_type: "BUY" | "SELL";
  quantity: number;
  price: number;
  order_id?: string | null;
  trade_id: string;
  raw_data?: Record<string, unknown>;
}

export interface ParseResultTs {
  broker: string;
  fills: ParsedFill[];
  error_report: Array<{
    row_index?: number;
    issue_type: string;
    message: string;
    trade_id?: string;
    raw_snippet?: Record<string, unknown> | string;
  }>;
}

const SYNONYMS: Record<string, string[]> = {
  symbol: [
    "symbol", "scrip", "stock", "instrument", "ticker", "tradingsymbol",
    "security", "underlying", "scripsymbol", "instrumentname", "stockname",
  ],
  trade_date: [
    "tradedate", "date", "orderdate", "executiondate", "transactiondate",
    "dealdate", "filldate", "transdate", "tradingdate", "datetime", "timestamp",
  ],
  fill_time: [
    "orderexecutiontime", "executiontime", "tradetime", "filltime", "time", "ordertime",
  ],
  trade_type: [
    "tradetype", "type", "buy/sell", "buysell", "side", "action", "transactiontype",
    "orderside", "transaction",
  ],
  quantity: [
    "quantity", "qty", "tradedqty", "shares", "filledqty", "units", "executedqty", "volume",
  ],
  price: [
    "price", "tradeprice", "averageprice", "avgprice", "rate", "executionprice", "fillprice",
  ],
  trade_id: [
    "tradeid", "tradeno", "fillid", "executionid", "dealid", "transid", "ticketno",
  ],
  order_id: [
    "orderid", "orderno", "orderref", "referenceno",
  ],
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseCsvLines(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  for (const line of rawLines) {
    const row: string[] = [];
    let insideQuote = false;
    let currentCell = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === "," && !insideQuote) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    lines.push(row);
  }

  return lines;
}

function cleanCell(val: string): string {
  let res = val.trim();
  if (res.startsWith("'") && (res.length > 1 && "=+-@\t\r".includes(res[1]))) {
    res = res.substring(1);
  }
  if (res.startsWith('"') && res.endsWith('"') && res.length >= 2) {
    res = res.slice(1, -1).trim();
  }
  return res;
}

function normalizeDate(dateStr: string, timeStr?: string): { date: string; isoDateTime: string } {
  let cleanD = cleanCell(dateStr);
  const cleanT = timeStr ? cleanCell(timeStr) : "";

  // Check formats: DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  let y = "2026";
  let m = "01";
  let d = "01";

  if (cleanD.includes(" ")) {
    const parts = cleanD.split(" ");
    cleanD = parts[0];
  }

  const slashParts = cleanD.split(/[-/.]/);
  if (slashParts.length === 3) {
    if (slashParts[0].length === 4) {
      // YYYY-MM-DD
      y = slashParts[0];
      m = slashParts[1].padStart(2, "0");
      d = slashParts[2].padStart(2, "0");
    } else {
      // DD-MM-YYYY
      d = slashParts[0].padStart(2, "0");
      m = slashParts[1].padStart(2, "0");
      y = slashParts[2].length === 2 ? `20${slashParts[2]}` : slashParts[2];
    }
  }

  const dateOnly = `${y}-${m}-${d}`;
  let timeVal = "09:15:00";

  if (cleanT && cleanT.includes(":")) {
    const tParts = cleanT.split(":");
    const hh = (tParts[0] || "09").padStart(2, "0");
    const mm = (tParts[1] || "15").padStart(2, "0");
    const ss = (tParts[2] || "00").split(".")[0].padStart(2, "0");
    timeVal = `${hh}:${mm}:${ss}`;
  }

  return {
    date: dateOnly,
    isoDateTime: `${dateOnly}T${timeVal}+05:30`,
  };
}

function detectBrokerName(headers: string[]): string {
  const norm = headers.map(normalizeHeader);
  if (norm.includes("tradingsymbol") && norm.includes("orderid") && norm.includes("tradeid")) {
    return "ZERODHA";
  }
  if (norm.includes("stockname") || (norm.includes("groww") || norm.includes("type"))) {
    return "GROWW";
  }
  if (norm.includes("scripname") || norm.includes("instrumentname")) {
    return "UPSTOX";
  }
  return "GENERAL";
}

export function parseTradeCsvFallback(
  csvContent: string,
  fileName: string,
  customMapping?: Record<string, string> | null
): ParseResultTs {
  const rows = parseCsvLines(csvContent);
  if (rows.length < 2) {
    return {
      broker: "UNKNOWN",
      fills: [],
      error_report: [
        {
          issue_type: "INVALID_FORMAT",
          message: "CSV file is empty or missing data rows.",
        },
      ],
    };
  }

  const rawHeaders = rows[0];
  const broker = detectBrokerName(rawHeaders);
  const columnMap: Record<string, number> = {};

  // Map header indexes
  rawHeaders.forEach((header, index) => {
    const norm = normalizeHeader(header);
    for (const [canonical, synonymList] of Object.entries(SYNONYMS)) {
      if (norm === canonical || synonymList.includes(norm)) {
        if (columnMap[canonical] === undefined) {
          columnMap[canonical] = index;
        }
      }
    }
  });

  // Apply custom mapping overrides if provided
  if (customMapping) {
    for (const [canonical, userCol] of Object.entries(customMapping)) {
      const idx = rawHeaders.findIndex((h) => h.trim().toLowerCase() === userCol.trim().toLowerCase());
      if (idx !== -1) {
        columnMap[canonical] = idx;
      }
    }
  }

  const fills: ParsedFill[] = [];
  const errorReport: ParseResultTs["error_report"] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 0 || row.every((c) => c.trim().length === 0)) {
      continue;
    }

    try {
      const getVal = (col: string) => {
        const idx = columnMap[col];
        return idx !== undefined && idx < row.length ? cleanCell(row[idx]) : "";
      };

      const rawSymbol = getVal("symbol");
      const rawDate = getVal("trade_date");
      const rawTime = getVal("fill_time");
      const rawType = getVal("trade_type").toUpperCase();
      const rawQty = getVal("quantity");
      const rawPrice = getVal("price");
      let tradeId = getVal("trade_id");
      const orderId = getVal("order_id");

      if (!rawSymbol) {
        errorReport.push({
          row_index: rowIndex + 1,
          issue_type: "INVALID_FORMAT",
          message: "Missing symbol in trade row",
          raw_snippet: row.join(","),
        });
        continue;
      }

      const tradeType: "BUY" | "SELL" =
        rawType.startsWith("B") || rawType === "1" ? "BUY" : "SELL";

      const qty = Math.abs(parseFloat(rawQty));
      const price = parseFloat(rawPrice);

      if (isNaN(qty) || qty <= 0) {
        errorReport.push({
          row_index: rowIndex + 1,
          issue_type: "INVALID_FORMAT",
          message: `Invalid quantity '${rawQty}'`,
          raw_snippet: row.join(","),
        });
        continue;
      }

      if (isNaN(price) || price < 0) {
        errorReport.push({
          row_index: rowIndex + 1,
          issue_type: "INVALID_FORMAT",
          message: `Invalid price '${rawPrice}'`,
          raw_snippet: row.join(","),
        });
        continue;
      }

      const { date, isoDateTime } = normalizeDate(rawDate, rawTime);

      if (!tradeId) {
        tradeId = `TL_${rawSymbol}_${date}_${tradeType}_${qty}_${price}_${rowIndex}`;
      }

      fills.push({
        trade_date: date,
        fill_time: isoDateTime,
        symbol: rawSymbol.toUpperCase().replace(/^EQ\s*:\s*/, ""),
        trade_type: tradeType,
        quantity: qty,
        price,
        order_id: orderId || null,
        trade_id: tradeId,
        raw_data: { row_index: rowIndex + 1, raw: row },
      });
    } catch (err) {
      errorReport.push({
        row_index: rowIndex + 1,
        issue_type: "CORRUPT_DATA",
        message: err instanceof Error ? err.message : "Failed to parse trade row",
        raw_snippet: row.join(","),
      });
    }
  }

  return {
    broker,
    fills,
    error_report: errorReport,
  };
}
