import "server-only";

export interface PubgJsonFetchOptions {
  endpoint: string;
  apiKey: string;
  ttl: number;
  maxRetries: number;
  retryBaseMs: number;
  quotaErrorMessage: string;
  baseUrl: string;
  shard?: string;
}

function buildFetchCacheOption(ttl: number): Pick<RequestInit, "cache" | "next"> {
  if (!Number.isFinite(ttl) || ttl <= 0) {
    return { cache: "no-store" };
  }
  return { next: { revalidate: ttl } };
}

function readRetryAfterMs(response: Response): number | null {
  const retryAfterHeader = response.headers.get("retry-after");
  if (!retryAfterHeader) return null;

  const retryAfterSeconds = Number.parseFloat(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.round(retryAfterSeconds * 1000);
  }

  const retryDateMs = Date.parse(retryAfterHeader);
  if (Number.isFinite(retryDateMs)) {
    const delta = retryDateMs - Date.now();
    return delta > 0 ? delta : null;
  }

  return null;
}

function computeRetryDelayMs(attempt: number, retryBaseMs: number, response?: Response): number {
  const retryAfterMs = response ? readRetryAfterMs(response) : null;
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(15000, retryAfterMs);
  }

  const exponential = retryBaseMs * (2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * 120);
  return Math.min(15000, exponential + jitter);
}

function shouldRetryPubgStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPubgShardJson<T>({
  endpoint,
  apiKey,
  ttl,
  maxRetries,
  retryBaseMs,
  quotaErrorMessage,
  baseUrl,
  shard,
}: PubgJsonFetchOptions): Promise<T | null> {
  const safeShard = shard?.trim();
  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const requestUrl = safeShard ? `${baseUrl}/${safeShard}${safeEndpoint}` : `${baseUrl}${safeEndpoint}`;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const res = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/vnd.api+json",
      },
      ...buildFetchCacheOption(ttl),
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    if (res.status === 404) return null;

    if (shouldRetryPubgStatus(res.status) && attempt < maxRetries) {
      const retryDelayMs = computeRetryDelayMs(attempt + 1, retryBaseMs, res);
      if (res.status === 429) {
        console.warn(`PUBG API rate limit hit. Retrying in ${retryDelayMs}ms...`);
      }
      await sleep(retryDelayMs);
      continue;
    }

    if (res.status === 429) {
      console.warn("PUBG API rate limit hit.");
      throw new Error(quotaErrorMessage);
    }

    try {
      const errorData = await res.json();
      console.error("PUBG API Error:", JSON.stringify(errorData, null, 2));
    } catch {
      console.error("PUBG API Error:", res.statusText);
    }
    throw new Error(`PUBG API failed: ${res.status}`);
  }

  return null;
}

export async function fetchPubgGlobalJson<T>({
  endpoint,
  apiKey,
  ttl,
  maxRetries,
  retryBaseMs,
  quotaErrorMessage,
  baseUrl,
}: Omit<PubgJsonFetchOptions, "shard">): Promise<T | null> {
  const safeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  return fetchPubgShardJson<T>({
    endpoint: safeEndpoint,
    apiKey,
    ttl,
    maxRetries,
    retryBaseMs,
    quotaErrorMessage,
    baseUrl,
  });
}

export async function fetchTelemetryEventsJson<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data as T[];
  } catch (error) {
    console.error("Failed to fetch telemetry URL:", error);
    return [];
  }
}
