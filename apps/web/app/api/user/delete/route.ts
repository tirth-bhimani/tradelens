import { NextRequest, NextResponse } from "next/server";
import { deleteAccountAction } from "@/lib/privacy/deletion-actions";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/user/delete
 * High-stakes endpoint to permanently wipe the authenticated user's account and data.
 */
export async function DELETE(req: NextRequest) {
  try {
    let confirmation = "";
    try {
      const body = await req.json();
      confirmation = body?.confirmation || "";
    } catch {
      confirmation = "";
    }

    const result = await deleteAccountAction(confirmation);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Your TradeLens account and all associated data have been permanently erased.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Account deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
