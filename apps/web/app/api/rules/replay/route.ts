import { NextRequest, NextResponse } from "next/server";
import { simulateRuleReplay } from "@/lib/rules/replay-engine";
import { SAMPLE_REPLAY_TRADES } from "@/lib/rules/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = body?.rule;
    const trades = body?.trades && body.trades.length > 0 ? body.trades : SAMPLE_REPLAY_TRADES;
    const startingCapital = body?.starting_capital ? Number(body.starting_capital) : 100000;

    if (!rule) {
      return NextResponse.json(
        { error: "Rule definition is required" },
        { status: 400 }
      );
    }

    const result = simulateRuleReplay(rule, trades, startingCapital);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to execute rule replay backtest" },
      { status: 500 }
    );
  }
}
