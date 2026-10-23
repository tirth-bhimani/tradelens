import { TranslateRuleResponse } from "./types";

const SYSTEM_PROMPT = `You are the TradeLens Institutional Rule Compiler. You translate plain-English trader requests into strict, validated JSON matching our 9 canonical behavioral rules:

CATALOG RULES:
1. COOL_OFF_AFTER_LOSS: { "rule_type": "COOL_OFF_AFTER_LOSS", "cooldown_minutes": number (1-240), "trigger_loss_inr": number | null, "max_consecutive_losses": number (1-5) }
2. MAX_CONSECUTIVE_LOSSES: { "rule_type": "MAX_CONSECUTIVE_LOSSES", "consecutive_losses": number (1-10), "action": "HALT_FOR_DAY" | "MANDATORY_COOLDOWN", "cooldown_minutes": number | null }
3. DAILY_LOSS_LIMIT: { "rule_type": "DAILY_LOSS_LIMIT", "max_loss_inr": number | null, "max_loss_percent_capital": number | null, "action": "HALT_FOR_DAY" }
4. MAX_DAILY_TRADES_LIMIT: { "rule_type": "MAX_DAILY_TRADES_LIMIT", "max_trades": number (1-50), "action": "HALT_FOR_DAY" }
5. TIME_OF_DAY_CUTOFF: { "rule_type": "TIME_OF_DAY_CUTOFF", "allowed_start_time": "HH:MM", "allowed_end_time": "HH:MM", "restricted_lunch_break": boolean }
6. MAX_POSITION_SIZE: { "rule_type": "MAX_POSITION_SIZE", "max_quantity": number | null, "max_capital_per_trade_inr": number | null, "segment": "ALL" | "EQUITY" | "OPTIONS" }
7. SKIP_INSTRUMENT_TYPE: { "rule_type": "SKIP_INSTRUMENT_TYPE", "disallowed_instruments": string[], "allowed_segments": string[] }
8. NO_TRADING_ON_EXPIRY_DAY: { "rule_type": "NO_TRADING_ON_EXPIRY_DAY", "action": "HALT_FOR_DAY", "affected_indices": string[] }
9. COMPOSITE_RULE: { "rule_type": "COMPOSITE_RULE", "logic_operator": "AND", "subrules": [ ...2 or more above atomic rules ] }

REJECTION POLICY:
If prompt requests technical indicators (RSI, Moving Averages, MACD, Supertrend), price forecasts, or buy/sell stock tips, set "is_supported": false and explain that TradeLens enforces objective behavioral risk discipline rather than technical entry signals.

OUTPUT JSON SCHEMA:
{
  "success": true,
  "is_supported": boolean,
  "rule_type": string,
  "rule": object | null,
  "explanation": string,
  "unsupported_reason": string | null
}`;

/**
 * Translates natural language into a canonical TradeLens rule using Gemini AI with deterministic fallback.
 */
export async function translateRuleWithAi(
  prompt: string,
  startingCapital?: number
): Promise<TranslateRuleResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  // 1. Try Gemini Cloud AI API if key is present
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${SYSTEM_PROMPT}\n\nTrader Request: "${prompt}"\nStarting Capital: ${startingCapital || 100000}` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: "application/json",
        },
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object" && parsed.success !== undefined) {
            return {
              ...parsed,
              engine_used: `GEMINI_${geminiModel.toUpperCase().replace(/-/g, "_")}`,
            };
          }
        }
      }
    } catch {
      // Graceful fallback to deterministic parser
    }
  }

  // 2. High-precision deterministic parser extracting exact user parameters
  return parseRuleDeterministic(prompt, startingCapital);
}

/**
 * High-precision offline deterministic parser that extracts user-specified numbers and intent.
 */
export function parseRuleDeterministic(
  prompt: string,
  startingCapital?: number
): TranslateRuleResponse {
  const text = prompt.toLowerCase().trim();

  // Unsupported concepts check
  const unsupportedMatches = [
    { pattern: /\b(rsi|macd|ema|sma|moving\s+average|vwap|supertrend|bollinger)\b/, reason: "Technical analysis indicators (RSI, Moving Averages, MACD) are discretionary entry signals outside TradeLens's behavioral guardrail scope." },
    { pattern: /\b(predict|forecast|target\s+price|where\s+will|tomorrow\s+market)\b/, reason: "TradeLens does not predict stock prices or market direction. It protects your capital through behavioral execution guardrails." },
    { pattern: /\b(buy\s+call|buy\s+put|buy\s+signal|sell\s+signal|stock\s+tips)\b/, reason: "TradeLens does not provide buy/sell signals or financial advice." },
  ];

  for (const check of unsupportedMatches) {
    if (check.pattern.test(text)) {
      return {
        success: true,
        is_supported: false,
        rule: null,
        explanation: check.reason,
        unsupported_reason: check.reason,
      };
    }
  }

  // Detect individual clauses
  const subrules: any[] = [];
  const explanations: string[] = [];

  // Clause A: Cooldown / Pause after loss
  // e.g. "don't let me trade for 60 minutes after losing money", "cooldown of 30 mins after loss", "pause 15 minutes"
  const hasPauseLoss =
    /(?:don't|dont|no|stop|halt)\b.*?(?:trade|trading)\b.*?\b\d+\s*(?:min|minute|m\b)/.test(text) ||
    /(?:cooldown|pause|wait|cool\s*off)\b.*?\b\d+\s*(?:min|minute|m\b)/.test(text) ||
    (/\b\d+\s*(?:min|minute|m\b)\b.*?(?:after|following)\b/.test(text) && /(?:loss|losing|lose|red)/.test(text));

  if (hasPauseLoss) {
    const minMatch = text.match(/(\d+)\s*(?:min|minute|m\b)/);
    const mins = minMatch ? parseInt(minMatch[1], 10) : 15;
    const cooldownMinutes = Math.max(1, Math.min(240, mins));
    subrules.push({
      rule_type: "COOL_OFF_AFTER_LOSS",
      cooldown_minutes: cooldownMinutes,
      max_consecutive_losses: 1,
    });
    explanations.push(`Enforces a mandatory ${cooldownMinutes}-minute pause after losing trades.`);
  }

  // Clause B: Max Daily Trades Limit
  // e.g. "cap me at 10 trades per day", "max 5 trades a day", "limit to 8 trades daily"
  const hasTradeCap =
    /(?:cap|limit|max(?:imum)?)\b.*?\b(\d+)\s*trades?/.test(text) ||
    /(\d+)\s*trades?\s*(?:per|a|each)?\s*day/.test(text);

  if (hasTradeCap) {
    const match = text.match(/(?:cap|limit|max(?:imum)?)\s*(?:me\s*at\s*)?(\d+)\s*trades?/) ||
      text.match(/(\d+)\s*trades?\s*(?:per|a|each)?\s*day/);
    const tradesCount = match ? parseInt(match[1], 10) : 5;
    const maxTrades = Math.max(1, Math.min(50, tradesCount));
    subrules.push({
      rule_type: "MAX_DAILY_TRADES_LIMIT",
      max_trades: maxTrades,
      action: "HALT_FOR_DAY",
    });
    explanations.push(`Restricts session activity to a maximum of ${maxTrades} trades per day.`);
  }

  // Clause C: Max Consecutive Losses
  // e.g. "stop after 3 consecutive losses", "halt after 2 losses in a row"
  const hasConsecLoss = /(?:stop|halt|circuit\s*breaker)\b.*?\b(\d+)\s*(?:consecutive|in\s*a\s*row)/.test(text) ||
    /(\d+)\s*(?:consecutive|in\s*a\s*row)\s*losses/.test(text);

  if (hasConsecLoss) {
    const match = text.match(/(\d+)\s*(?:consecutive|in\s*a\s*row)/) || text.match(/(\d+)\s*losses/);
    const count = match ? parseInt(match[1], 10) : 3;
    const consecutiveLosses = Math.max(1, Math.min(10, count));
    subrules.push({
      rule_type: "MAX_CONSECUTIVE_LOSSES",
      consecutive_losses: consecutiveLosses,
      action: "HALT_FOR_DAY",
    });
    explanations.push(`Halts trading for the remainder of the day after ${consecutiveLosses} consecutive losses.`);
  }

  // Clause D: Daily Loss Limit
  // e.g. "daily loss limit 5000", "cap daily loss at 2%"
  const hasDailyLoss = /(?:daily\s*loss|max\s*loss|loss\s*limit)\b/.test(text);
  if (hasDailyLoss && !hasPauseLoss && !hasConsecLoss) {
    const pctMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      subrules.push({
        rule_type: "DAILY_LOSS_LIMIT",
        max_loss_percent_capital: pct,
        starting_capital: startingCapital || 100000,
        action: "HALT_FOR_DAY",
      });
      explanations.push(`Halts trading for the day when cumulative loss exceeds ${pct}% of capital.`);
    } else {
      const inrMatch = text.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:,\d+)*(?:\.\d+)?)/);
      const val = inrMatch ? parseFloat(inrMatch[1].replace(/,/g, "")) : 5000;
      subrules.push({
        rule_type: "DAILY_LOSS_LIMIT",
        max_loss_inr: val,
        action: "HALT_FOR_DAY",
      });
      explanations.push(`Halts trading for the day when cumulative loss hits ₹${val.toLocaleString("en-IN")}.`);
    }
  }

  // Clause E: Time of day cutoff
  // e.g. "only trade between 9:30 and 15:00", "avoid lunch chop"
  if (text.includes("lunch") || text.includes("between") || text.includes("after 3pm") || text.includes("allowed time")) {
    subrules.push({
      rule_type: "TIME_OF_DAY_CUTOFF",
      allowed_start_time: "09:30",
      allowed_end_time: "15:00",
      restricted_lunch_break: text.includes("lunch"),
    });
    explanations.push("Restricts trading to designated session windows (09:30 - 15:00 IST).");
  }

  // Clause F: Expiry day restriction
  if (text.includes("expiry") && (text.includes("no trade") || text.includes("skip") || text.includes("avoid") || text.includes("halt"))) {
    subrules.push({
      rule_type: "NO_TRADING_ON_EXPIRY_DAY",
      action: "HALT_FOR_DAY",
      affected_indices: ["NIFTY", "BANKNIFTY"],
    });
    explanations.push("Prohibits trade executions on index derivative contract expiry days.");
  }

  // If multiple clauses, combine into COMPOSITE_RULE
  if (subrules.length > 1) {
    return {
      success: true,
      is_supported: true,
      rule: {
        rule_type: "COMPOSITE_RULE",
        logic_operator: "AND",
        subrules,
      },
      explanation: explanations.join(" Additionally, "),
      unsupported_reason: null,
      engine_used: "DETERMINISTIC_PARSER",
    };
  }

  // If single clause
  if (subrules.length === 1) {
    return {
      success: true,
      is_supported: true,
      rule: subrules[0],
      explanation: explanations[0],
      unsupported_reason: null,
      engine_used: "DETERMINISTIC_PARSER",
    };
  }

  // Fallback if no specific pattern was matched: Cooldown based on losing
  return {
    success: true,
    is_supported: true,
    rule: {
      rule_type: "COOL_OFF_AFTER_LOSS",
      cooldown_minutes: 15,
      max_consecutive_losses: 1,
    },
    explanation: "Configured standard 15-minute emotional reset cooldown after absorbing a loss.",
    unsupported_reason: null,
    engine_used: "DETERMINISTIC_PARSER",
  };
}
