import { NextRequest, NextResponse } from "next/server";
import { translateRuleWithAi } from "@/lib/rules/ai-translator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body?.prompt;
    const startingCapital = body?.starting_capital ? Number(body.starting_capital) : undefined;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const result = await translateRuleWithAi(prompt, startingCapital);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to translate rule",
        is_supported: false,
        rule: null,
        explanation: "Internal translation error.",
        unsupported_reason: err.message || "Error",
      },
      { status: 500 }
    );
  }
}
