import { NextResponse } from "next/server";
import { getPubgApiKeyStatus } from "@/lib/pubg";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProbeState = "online" | "degraded" | "down";

interface ProbeSnapshot {
  timestamp: number;
  latencyMs: number;
  online: boolean;
  usagePercent: number;
}

const STATUS_ENDPOINT = "https://api.pubg.com/status";
const HISTORY_MAX = 40;
const history: ProbeSnapshot[] = [];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function estimateUsagePercent(latencyMs: number, errorRate: number): number {
  let base = 92;
  if (latencyMs <= 140) base = 22;
  else if (latencyMs <= 220) base = 35;
  else if (latencyMs <= 320) base = 48;
  else if (latencyMs <= 500) base = 62;
  else if (latencyMs <= 800) base = 78;

  const penalty = Math.round(errorRate * 18);
  return clamp(base + penalty, 10, 99);
}

function summarizeState(online: boolean, usagePercent: number, errorRate: number): ProbeState {
  if (!online) return "down";
  if (usagePercent >= 85 || errorRate >= 0.2) return "degraded";
  return "online";
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  try {
    return (await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout (${timeoutMs}ms)`)), timeoutMs);
      }),
    ])) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET() {
  const startedAt = Date.now();
  const { configured } = getPubgApiKeyStatus();
  const statusApiKey =
    process.env.PUBG_API_KEY?.trim() ||
    process.env.PUBG_API_KEY_KAKAO?.trim() ||
    process.env.PUBG_KAKAO_API_KEY?.trim() ||
    "";

  if (!statusApiKey) {
    return NextResponse.json(
      {
        error: "API Key Missing",
      },
      { status: 500 }
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.api+json",
    Authorization: `Bearer ${statusApiKey}`,
  };

  let online = false;
  let responseStatus = 0;
  let responseMessage = "";
  let gatewayPop: string | null = null;
  let requestId: string | null = null;
  let cacheTrace: string | null = null;

  try {
    const response = await withTimeout(fetch(STATUS_ENDPOINT, { headers, cache: "no-store" }), 7000, "PUBG status");
    responseStatus = response.status;
    gatewayPop = response.headers.get("x-amz-cf-pop");
    requestId = response.headers.get("x-request-id");
    cacheTrace = response.headers.get("x-cache");

    if (response.ok) {
      const payload = (await response.json()) as { data?: { type?: string; id?: string } };
      online = payload?.data?.type === "status" || payload?.data?.id === "pubg-api";
      responseMessage = online ? "PUBG API status 응답 정상" : "응답은 성공했지만 상태 데이터가 비정상입니다.";
    } else {
      responseMessage = `PUBG status HTTP ${response.status}`;
    }
  } catch (error) {
    responseMessage = error instanceof Error ? error.message : "Unknown error";
  }

  const latencyMs = Date.now() - startedAt;
  const recent = history.slice(-14);
  const recentErrors = recent.filter((item) => !item.online).length;
  const errorRate = recent.length > 0 ? recentErrors / recent.length : 0;
  const usagePercent = estimateUsagePercent(latencyMs, errorRate);
  const state = summarizeState(online, usagePercent, errorRate);

  history.push({
    timestamp: Date.now(),
    latencyMs,
    online,
    usagePercent,
  });
  if (history.length > HISTORY_MAX) {
    history.splice(0, history.length - HISTORY_MAX);
  }

  const historyWindow = history.slice(-12);
  const avgLatencyMs =
    historyWindow.length > 0
      ? Math.round(historyWindow.reduce((sum, item) => sum + item.latencyMs, 0) / historyWindow.length)
      : latencyMs;
  const avgUsagePercent =
    historyWindow.length > 0
      ? Math.round(historyWindow.reduce((sum, item) => sum + item.usagePercent, 0) / historyWindow.length)
      : usagePercent;
  const windowErrorRate =
    historyWindow.length > 0
      ? historyWindow.filter((item) => !item.online).length / historyWindow.length
      : online
        ? 0
        : 1;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    state,
    message: responseMessage,
    latencyMs,
    usagePercent,
    usageAveragePercent: avgUsagePercent,
    errorRatePercent: Number((windowErrorRate * 100).toFixed(1)),
    latencyAverageMs: avgLatencyMs,
    endpoint: STATUS_ENDPOINT,
    responseStatus,
    gateway: {
      pop: gatewayPop,
      requestId,
      cacheTrace,
    },
    apiKey: {
      configured,
    },
    samples: historyWindow.map((item) => ({
      at: new Date(item.timestamp).toISOString(),
      latencyMs: item.latencyMs,
      usagePercent: item.usagePercent,
      online: item.online,
    })),
  });
}
