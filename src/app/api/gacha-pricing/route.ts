import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ExchangeResult {
  usdToKrw: number;
  source: string;
  updatedAt: string;
}

const PER_DRAW_GCOIN = 1800;
const DRAW_COUNT_PER_ROLL = 10;
const PER_ROLL_GCOIN = PER_DRAW_GCOIN * DRAW_COUNT_PER_ROLL;

const GCOIN_PACK_REFERENCE = {
  title: "PUBG - 1,050 G-Coin",
  gcoin: 1050,
  usd: 9.99,
  sourceUrl: "https://store.epicgames.com/en-US/p/pubg-battlegrounds--1050-g-coin",
};

const SOURCES = [
  {
    label: "Contraband Open 10 Cost (PUBG Store Update Reference)",
    url: "https://pubg.com/en/news/6456",
  },
  {
    label: "G-Coin Pack Reference Price",
    url: GCOIN_PACK_REFERENCE.sourceUrl,
  },
  {
    label: "FX Rate Source (Frankfurter / ECB)",
    url: "https://api.frankfurter.app/latest?from=USD&to=KRW",
  },
];

async function fetchUsdKrwRate(): Promise<ExchangeResult> {
  try {
    const response = await fetch("https://api.frankfurter.app/latest?from=USD&to=KRW", {
      next: { revalidate: 60 },
    });

    if (response.ok) {
      const json = (await response.json()) as {
        date?: string;
        rates?: { KRW?: number };
      };
      const rate = json.rates?.KRW;
      if (typeof rate === "number" && Number.isFinite(rate)) {
        return {
          usdToKrw: rate,
          source: "frankfurter.app",
          updatedAt: json.date ? `${json.date}T00:00:00.000Z` : new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.error("Failed to fetch Frankfurter FX rate:", error);
  }

  try {
    const fallbackResponse = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 60 },
    });

    if (fallbackResponse.ok) {
      const fallbackJson = (await fallbackResponse.json()) as {
        rates?: { KRW?: number };
        time_last_update_utc?: string;
      };
      const fallbackRate = fallbackJson.rates?.KRW;
      if (typeof fallbackRate === "number" && Number.isFinite(fallbackRate)) {
        return {
          usdToKrw: fallbackRate,
          source: "open.er-api.com",
          updatedAt: fallbackJson.time_last_update_utc ?? new Date().toISOString(),
        };
      }
    }
  } catch (error) {
    console.error("Failed to fetch fallback FX rate:", error);
  }

  return {
    usdToKrw: 1430,
    source: "fallback",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const now = new Date();
  const exchangeRate = await fetchUsdKrwRate();
  const usdPerGcoin = GCOIN_PACK_REFERENCE.usd / GCOIN_PACK_REFERENCE.gcoin;

  return NextResponse.json({
    fetchedAt: now.toISOString(),
    exchangeRate,
    pricing: {
      perDrawGcoin: PER_DRAW_GCOIN,
      drawCountPerRoll: DRAW_COUNT_PER_ROLL,
      perRollGcoin: PER_ROLL_GCOIN,
      referencePack: {
        ...GCOIN_PACK_REFERENCE,
        usdPerGcoin,
      },
    },
    sources: SOURCES,
  });
}
