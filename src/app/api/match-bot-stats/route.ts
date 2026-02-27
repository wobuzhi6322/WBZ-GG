import { NextRequest, NextResponse } from "next/server";
import {
  getMatchDetail,
  isPubgApiConfigured,
  isPubgApiKeyMissingError,
  isPubgApiQuotaExceededError,
  sanitizePlatformShard,
  summarizeMatchBotKills,
} from "@/lib/pubg";
import { sanitizeAccountId, sanitizeMatchId, sanitizeTextInput } from "@/lib/requestValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BOT_STATS_MAX_MATCH_IDS = Math.min(
  20,
  Math.max(1, Number.parseInt(process.env.PUBG_BOT_STATS_MAX_MATCH_IDS ?? "8", 10) || 8)
);
const BOT_STATS_CONCURRENCY = Math.min(
  4,
  Math.max(1, Number.parseInt(process.env.PUBG_BOT_STATS_CONCURRENCY ?? "1", 10) || 1)
);

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>
): Promise<R[]> {
  if (values.length === 0) return [];
  const safeConcurrency = Math.max(1, Math.min(concurrency, values.length));
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function consume(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(values[index]);
    }
  }

  await Promise.all(Array.from({ length: safeConcurrency }, () => consume()));
  return results;
}

export async function GET(request: NextRequest) {
  const rawAccountId = request.nextUrl.searchParams.get("accountId") ?? "";
  const rawMatchIds = sanitizeTextInput(request.nextUrl.searchParams.get("matchIds") ?? "", 2000);
  const accountId = sanitizeAccountId(rawAccountId);
  const platform = sanitizePlatformShard(request.nextUrl.searchParams.get("platform"));
  const forceRefresh = request.nextUrl.searchParams.has("refresh");

  if (!isPubgApiConfigured(platform)) {
    return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
  }

  if (!accountId || !rawMatchIds) {
    return NextResponse.json({ error: "Missing accountId or matchIds" }, { status: 400 });
  }

  const matchIds = Array.from(
    new Set(
      rawMatchIds
        .split(",")
        .map((id) => sanitizeMatchId(id))
        .filter((id): id is string => Boolean(id))
    )
  ).slice(0, BOT_STATS_MAX_MATCH_IDS);

  if (matchIds.length === 0) {
    return NextResponse.json({ error: "No valid matchIds" }, { status: 400 });
  }

  try {
    const failures: string[] = [];
    const rawItems = await mapWithConcurrency(matchIds, BOT_STATS_CONCURRENCY, async (matchId) => {
      try {
        const detail = await getMatchDetail(matchId, accountId, platform, forceRefresh);
        if (!detail) {
          failures.push(matchId);
          return null;
        }
        return summarizeMatchBotKills(detail, accountId);
      } catch (error) {
        console.error("Failed to build match bot stats:", matchId, error);
        failures.push(matchId);
        return null;
      }
    });

    const items = rawItems.filter((item): item is NonNullable<typeof item> => item !== null);

    return NextResponse.json(
      {
        accountId,
        platform,
        items,
        failedMatchIds: failures,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    if (isPubgApiQuotaExceededError(error)) {
      return NextResponse.json({ error: "API 할당량 오류" }, { status: 429 });
    }
    if (isPubgApiKeyMissingError(error)) {
      return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
    }
    console.error("Match bot stats API failed:", error);
    return NextResponse.json(
      {
        error: "봇 집계 데이터를 불러오는 중입니다.",
      },
      { status: 502 }
    );
  }
}
