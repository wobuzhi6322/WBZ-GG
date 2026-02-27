interface RawPatchNote {
  postId: string;
  title: string;
  summary: string;
  displayStartTime: string;
  createdAt: string;
  imageUrl?: string;
}

export interface PubgUpdateItem {
  id: string;
  title: string;
  summary: string;
  publishedAt: string;
  imageUrl?: string;
  url: string;
  source: "PUBG Official" | "Steam Official";
}

export type UpdateLanguage = "ko" | "en";

const PUBG_NEWS_URLS: Record<UpdateLanguage, string> = {
  ko: "https://pubg.com/ko/news?category=patch_notes",
  en: "https://pubg.com/en/news?category=patch_notes",
};
const STEAM_NEWS_URL =
  "https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=578080&count=20&maxlength=300&format=json";

const UPDATE_KEYWORDS = [
  "patch note",
  "update",
  "hotfix",
  "maintenance",
  "패치",
  "업데이트",
  "핫픽스",
  "점검",
];

function decodeNuxtText(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => {
      return String.fromCharCode(Number.parseInt(hex, 16));
    })
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractPostChunks(html: string): string[] {
  const marker = "news:{posts:[";
  const start = html.indexOf(marker);
  if (start < 0) return [];

  const chunks: string[] = [];
  let depth = 0;
  let current = "";
  let inString = false;
  let escaped = false;

  for (let i = start + marker.length; i < html.length; i += 1) {
    const ch = html[i];

    if (depth === 0) {
      if (ch === "]") break;
      if (ch === "{") {
        depth = 1;
        current = "{";
      }
      continue;
    }

    current += ch;

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        chunks.push(current);
        current = "";
      }
    }
  }

  return chunks;
}

function parseRawPost(chunk: string): RawPatchNote | null {
  const postId = chunk.match(/postId:(\d+)/)?.[1];
  const title = chunk.match(/title:"((?:\\.|[^"\\])*)"/)?.[1];
  const summary = chunk.match(/summary:"((?:\\.|[^"\\])*)"/)?.[1];
  const displayStartTime = chunk.match(/displayStartTime:"((?:\\.|[^"\\])*)"/)?.[1];
  const createdAt = chunk.match(/createdAt:"((?:\\.|[^"\\])*)"/)?.[1];
  const imageUrl =
    chunk.match(/thumbUrl:"((?:\\.|[^"\\])*)"/)?.[1] ??
    chunk.match(/imageUrl:"((?:\\.|[^"\\])*)"/)?.[1];

  if (!postId || !title || !summary) {
    return null;
  }

  return {
    postId,
    title: decodeNuxtText(title),
    summary: decodeNuxtText(summary),
    displayStartTime: decodeNuxtText(displayStartTime ?? ""),
    createdAt: decodeNuxtText(createdAt ?? ""),
    imageUrl: decodeNuxtText(imageUrl ?? ""),
  };
}

function normalizeDate(primary: string, fallback: string): string {
  const candidate = primary || fallback;
  if (!candidate) return "";

  const parsed = new Date(candidate.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return candidate;
  return parsed.toISOString();
}

function isUpdateNews(title: string): boolean {
  const lower = title.toLowerCase();
  return UPDATE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function getPreferredLanguages(language: UpdateLanguage): UpdateLanguage[] {
  return language === "ko" ? ["ko", "en"] : ["en", "ko"];
}

async function fetchOfficialPatchNotes(
  limit: number,
  language: UpdateLanguage
): Promise<PubgUpdateItem[]> {
  try {
    const pageUrl = PUBG_NEWS_URLS[language];
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": language === "ko" ? "ko-KR,ko;q=0.9,en;q=0.8" : "en-US,en;q=0.9,ko;q=0.8",
        Referer: pageUrl,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const postChunks = extractPostChunks(html);
    if (!postChunks.length) return [];

    const parsed = postChunks
      .map(parseRawPost)
      .filter((item): item is RawPatchNote => item !== null)
      .slice(0, limit);

    return parsed.map((item) => ({
      id: item.postId,
      title: item.title,
      summary: item.summary,
      publishedAt: normalizeDate(item.displayStartTime, item.createdAt),
      imageUrl: item.imageUrl || undefined,
      url: `https://pubg.com/${language}/news/${item.postId}`,
      source: "PUBG Official",
    }));
  } catch (error) {
    console.error(`Failed to fetch official PUBG patch notes (${language}):`, error);
    return [];
  }
}

async function fetchSteamUpdates(limit: number): Promise<PubgUpdateItem[]> {
  try {
    const res = await fetch(STEAM_NEWS_URL, { next: { revalidate: 300 } });
    if (!res.ok) return [];

    const data = (await res.json()) as {
      appnews?: {
        newsitems?: Array<{
          gid?: string;
          title?: string;
          url?: string;
          date?: number;
          contents?: string;
        }>;
      };
    };

    const items = data.appnews?.newsitems ?? [];
    return items
      .filter((item) => Boolean(item.title && isUpdateNews(item.title)))
      .slice(0, limit)
      .map((item) => ({
        id: item.gid ?? `steam-${item.date ?? 0}`,
        title: item.title ?? "Update",
        summary: (item.contents ?? "").replace(/\{[^}]+\}/g, "").trim() || "공식 공지 바로가기",
        publishedAt: item.date ? new Date(item.date * 1000).toISOString() : "",
        url: item.url ?? "https://store.steampowered.com/app/578080/PUBG_BATTLEGROUNDS/",
        source: "Steam Official",
      }));
  } catch (error) {
    console.error("Failed to fetch Steam PUBG updates:", error);
    return [];
  }
}

export async function getPubgPcOfficialUpdates(
  limit = 10,
  language: UpdateLanguage = "ko"
): Promise<PubgUpdateItem[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 20);
  const preferred = getPreferredLanguages(language);

  for (const lang of preferred) {
    const official = await fetchOfficialPatchNotes(safeLimit, lang);
    if (official.length > 0) return official;
  }

  return fetchSteamUpdates(safeLimit);
}
