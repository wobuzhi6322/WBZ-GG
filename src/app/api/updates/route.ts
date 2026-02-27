import { NextRequest, NextResponse } from "next/server";
import { getPubgPcOfficialUpdates } from "@/lib/pubgUpdates";
import { clampInteger } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = clampInteger(request.nextUrl.searchParams.get("limit"), { min: 1, max: 20, fallback: 10 });
  const langParam = request.nextUrl.searchParams.get("lang");
  const language = langParam === "en" ? "en" : "ko";

  try {
    const updates = await getPubgPcOfficialUpdates(limit, language);
    return NextResponse.json(Array.isArray(updates) ? updates : []);
  } catch (error) {
    console.error("Updates API failed:", error);
    return NextResponse.json([], { status: 200 });
  }
}
