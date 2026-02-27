import { NextRequest, NextResponse } from "next/server";
import { getDaekkollerLeaderboard } from "@/lib/daekkoller";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode") === "competitive" ? "competitive" : "normal";
  try {
    const payload = await getDaekkollerLeaderboard(mode);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Daekkoller API failed:", error);
    return NextResponse.json(
      {
        mode,
        entries: [],
        warning: "대꼴러 데이터를 불러오는 중입니다.",
      },
      { status: 200 }
    );
  }
}
