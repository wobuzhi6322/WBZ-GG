import { NextRequest, NextResponse } from "next/server";
import { getLatestPubgMapRotation } from "@/lib/pubgMapRotation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";
  let payload = null;
  try {
    payload = await getLatestPubgMapRotation(forceRefresh);
  } catch (error) {
    console.error("Map rotation API failed:", error);
  }

  if (!payload) {
    return NextResponse.json(
      {
        error: "Failed to load latest PUBG map rotation.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
