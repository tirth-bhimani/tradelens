import { NextRequest, NextResponse } from "next/server";
import { simulateRuleReplay } from "@/lib/rules/replay-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rule = body?.rule;
    const trades = body?.trades;
    const startingCapital = body?.starting_capital ? Number(body.starting_capital) : 100000;

    if (!rule) {
      return NextResponse.json(
        { error: "Rule definition is required" },
        { status: 400 }
      );
    }

    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json(
        { error: "No tradebook data provided. Please import your trades before running backtest simulations." },
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
