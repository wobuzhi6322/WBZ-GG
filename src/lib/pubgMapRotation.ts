interface RawMapServicePost {
  postId: string;
  title: string;
  displayStartTime: string;
  createdAt: string;
}

interface RawScheduleRow {
  week: number;
  pcStartLabel: string;
}

interface RawWeekRow {
  week: number;
  maps: string[];
}

interface MapCatalogEntry {
  id: string;
  nameEn: string;
  nameKo: string;
  aliases: string[];
  imageUrl: string;
  sizeKm: number;
}

export interface RotationMapItem {
  id: string;
  nameEn: string;
  nameKo: string;
  imageUrl: string;
  sizeKm: number;
}

export interface RotationWeekItem {
  week: number;
  label: string;
  startAt: string | null;
  maps: RotationMapItem[];
}

export interface RankedRotationItem extends RotationMapItem {
  probability: string | null;
}

export interface PubgMapRotationPayload {
  fetchedAt: string;
  source: {
    postId: string;
    title: string;
    publishedAt: string;
    officialUrlKo: string;
    officialUrlEn: string;
  };
  region: "AS";
  platform: "PC";
  currentWeek: RotationWeekItem | null;
  normal: {
    weeks: RotationWeekItem[];
    rotationPool: RotationMapItem[];
  };
  ranked: {
    maps: RankedRotationItem[];
  };
}

const NEWS_PAGE_SCAN_LIMIT = 8;
const CACHE_TTL_MS = 1000 * 60 * 10;
const NEWS_LIST_BASE_URL = "https://pubg.com/en/news";
const NEWS_DETAIL_BASE_URL = "https://pubg.com/en/news";
const MAP_SERVICE_REPORT_KEYWORD = "map service report";

const MAP_CATALOG: MapCatalogEntry[] = [
  {
    id: "erangel",
    nameEn: "Erangel",
    nameKo: "에란겔",
    aliases: ["Erangel"],
    imageUrl: "/maps/rotation/erangel.webp",
    sizeKm: 8,
  },
  {
    id: "miramar",
    nameEn: "Miramar",
    nameKo: "미라마",
    aliases: ["Miramar"],
    imageUrl: "/maps/rotation/miramar.webp",
    sizeKm: 8,
  },
  {
    id: "sanhok",
    nameEn: "Sanhok",
    nameKo: "사녹",
    aliases: ["Sanhok"],
    imageUrl: "https://battlegrounds.party/map/map/Savage/tiles/0/0/0.webp",
    sizeKm: 4,
  },
  {
    id: "taego",
    nameEn: "Taego",
    nameKo: "태이고",
    aliases: ["Taego"],
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp",
    sizeKm: 8,
  },
  {
    id: "deston",
    nameEn: "Deston",
    nameKo: "데스턴",
    aliases: ["Deston"],
    imageUrl: "/maps/rotation/deston.webp",
    sizeKm: 8,
  },
  {
    id: "vikendi",
    nameEn: "Vikendi",
    nameKo: "비켄디",
    aliases: ["Vikendi"],
    imageUrl: "/maps/rotation/vikendi.webp",
    sizeKm: 8,
  },
  {
    id: "karakin",
    nameEn: "Karakin",
    nameKo: "카라킨",
    aliases: ["Karakin"],
    imageUrl: "https://battlegrounds.party/map/map/Summerland/tiles/0/0/0.webp",
    sizeKm: 2,
  },
  {
    id: "paramo",
    nameEn: "Paramo",
    nameKo: "파라모",
    aliases: ["Paramo"],
    imageUrl: "https://battlegrounds.party/map/map/Chimera/tiles/0/0/0.webp",
    sizeKm: 3,
  },
  {
    id: "rondo",
    nameEn: "Rondo",
    nameKo: "론도",
    aliases: ["Rondo"],
    imageUrl: "/maps/rotation/rondo.webp",
    sizeKm: 8,
  },
  {
    id: "haven",
    nameEn: "Haven",
    nameKo: "헤이븐",
    aliases: ["Haven"],
    imageUrl: "https://battlegrounds.party/map/map/Heaven/tiles/0/0/0.webp",
    sizeKm: 1,
  },
];

const MAP_NAME_LOOKUP = new Map<string, MapCatalogEntry>();

for (const map of MAP_CATALOG) {
  MAP_NAME_LOOKUP.set(normalizeMapKey(map.nameEn), map);
  for (const alias of map.aliases) {
    MAP_NAME_LOOKUP.set(normalizeMapKey(alias), map);
  }
}

let mapRotationCache: { expiresAt: number; value: PubgMapRotationPayload } | null = null;
let mapRotationPending: Promise<PubgMapRotationPayload | null> | null = null;

function normalizeMapKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function decodeNuxtText(value: string | undefined): string {
  if (!value) return "";

  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
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

function parseRawPost(chunk: string): RawMapServicePost | null {
  const postId = chunk.match(/postId:(\d+)/)?.[1];
  const title = chunk.match(/title:"((?:\\.|[^"\\])*)"/)?.[1];
  const displayStartTime = chunk.match(/displayStartTime:"((?:\\.|[^"\\])*)"/)?.[1];
  const createdAt = chunk.match(/createdAt:"((?:\\.|[^"\\])*)"/)?.[1];

  if (!postId || !title) return null;

  return {
    postId,
    title: decodeNuxtText(title),
    displayStartTime: decodeNuxtText(displayStartTime ?? ""),
    createdAt: decodeNuxtText(createdAt ?? ""),
  };
}

function normalizeDate(primary: string, fallback: string): string {
  const candidate = primary || fallback;
  if (!candidate) return "";

  const parsed = new Date(candidate.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return candidate;
  return parsed.toISOString();
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseScheduleRows(text: string): RawScheduleRow[] {
  const block = text.match(/Schedule Start Date PC Console\s+([\s\S]*?)\s+Normal Match/i)?.[1];
  if (!block) return [];

  const rows: RawScheduleRow[] = [];
  const weekRegex = /Week\s+(\d+)\s+([A-Za-z]+\s+\d{1,2})\s+([A-Za-z]+\s+\d{1,2})/g;

  let matched: RegExpExecArray | null;
  while ((matched = weekRegex.exec(block)) !== null) {
    rows.push({
      week: Number.parseInt(matched[1], 10),
      pcStartLabel: matched[2],
    });
  }

  return rows;
}

function parseAsWeekRows(text: string): RawWeekRow[] {
  const asSection = text.match(
    /Map Select Regions\s+AS\s+Fixed Favored Etc\.\s+([\s\S]*?)\s+SEA\s+Fixed Favored Etc\./i
  )?.[1];
  if (!asSection) return [];

  const rows: RawWeekRow[] = [];
  const weekRegex = /Week\s+(\d+)\s+(.+?)(?=\s+Week\s+\d+\s+|$)/g;

  let matched: RegExpExecArray | null;
  while ((matched = weekRegex.exec(asSection)) !== null) {
    const week = Number.parseInt(matched[1], 10);
    const rowText = matched[2].trim();
    const maps = extractMapsFromRow(rowText);
    rows.push({ week, maps });
  }

  return rows;
}

function parseRankedRows(text: string): Array<{ mapName: string; probability: string | null }> {
  const rankedBody = text.match(
    /Ranked\s+([\s\S]*?)(?:\s+The map service has been prepared|\s+The map service report is available|\s+Thanks for your continuous support|$)/i
  )?.[1];

  if (!rankedBody) return [];

  const rows: Array<{ mapName: string; probability: string | null }> = [];
  const withProbabilityRegex = /([A-Za-z][A-Za-z0-9\s]+?)\s*\((\d+%?)\)/g;

  let matched: RegExpExecArray | null;
  while ((matched = withProbabilityRegex.exec(rankedBody)) !== null) {
    rows.push({
      mapName: matched[1].trim(),
      probability: matched[2].trim(),
    });
  }

  if (rows.length > 0) return rows;

  for (const mapName of extractMapsFromRow(rankedBody)) {
    rows.push({ mapName, probability: null });
  }

  return rows;
}

function parseArticleDateLabel(text: string): string | null {
  return text.match(/ANNOUNCEMENT\s+(\d{4}\.\d{2}\.\d{2})/i)?.[1] ?? null;
}

function parseMonthDayToUtcIso(monthDay: string, year: number): string | null {
  const parsed = new Date(`${monthDay}, ${year} 02:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function buildScheduleStartByWeek(rows: RawScheduleRow[], baseYear: number): Map<number, string> {
  const result = new Map<number, string>();
  let previousTimestamp = Number.NaN;
  let year = baseYear;

  for (const row of rows) {
    let startAt = parseMonthDayToUtcIso(row.pcStartLabel, year);
    if (!startAt) continue;

    let timestamp = new Date(startAt).getTime();
    if (!Number.isNaN(previousTimestamp) && timestamp < previousTimestamp) {
      year += 1;
      startAt = parseMonthDayToUtcIso(row.pcStartLabel, year);
      if (!startAt) continue;
      timestamp = new Date(startAt).getTime();
    }

    result.set(row.week, startAt);
    previousTimestamp = timestamp;
  }

  return result;
}

function extractMapsFromRow(rowText: string): string[] {
  const matches: Array<{ mapName: string; index: number }> = [];
  const lowered = rowText.toLowerCase();

  for (const map of MAP_CATALOG) {
    for (const alias of map.aliases) {
      const index = lowered.indexOf(alias.toLowerCase());
      if (index < 0) continue;
      matches.push({ mapName: map.nameEn, index });
      break;
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const item of matches) {
    const key = normalizeMapKey(item.mapName);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item.mapName);
  }

  return deduped;
}

function mapToRotationItem(mapName: string): RotationMapItem {
  const normalized = normalizeMapKey(mapName);
  const found = MAP_NAME_LOOKUP.get(normalized);

  if (found) {
    return {
      id: found.id,
      nameEn: found.nameEn,
      nameKo: found.nameKo,
      imageUrl: found.imageUrl,
      sizeKm: found.sizeKm,
    };
  }

  return {
    id: normalized || "unknown-map",
    nameEn: mapName,
    nameKo: mapName,
    imageUrl: `https://placehold.co/640x360/0f172a/e2e8f0?text=${encodeURIComponent(mapName)}`,
    sizeKm: 8,
  };
}

function buildWeekItems(rows: RawWeekRow[], scheduleByWeek: Map<number, string>): RotationWeekItem[] {
  return rows.map((row) => ({
    week: row.week,
    label: `Week ${row.week}`,
    startAt: scheduleByWeek.get(row.week) ?? null,
    maps: row.maps.map(mapToRotationItem),
  }));
}

function resolveCurrentWeek(weeks: RotationWeekItem[]): RotationWeekItem | null {
  if (weeks.length === 0) return null;

  const now = Date.now();
  let current = weeks[0];

  for (const week of weeks) {
    if (!week.startAt) continue;
    const timestamp = new Date(week.startAt).getTime();
    if (!Number.isNaN(timestamp) && now >= timestamp) {
      current = week;
    }
  }

  return current;
}

function buildRotationPool(weeks: RotationWeekItem[]): RotationMapItem[] {
  const pool: RotationMapItem[] = [];
  const seen = new Set<string>();

  for (const week of weeks) {
    for (const map of week.maps) {
      if (seen.has(map.id)) continue;
      seen.add(map.id);
      pool.push(map);
    }
  }

  return pool;
}

function buildRankedItems(rows: Array<{ mapName: string; probability: string | null }>): RankedRotationItem[] {
  return rows.map((row) => {
    const base = mapToRotationItem(row.mapName);
    return { ...base, probability: row.probability };
  });
}

async function fetchMapServiceReportPost(): Promise<RawMapServicePost | null> {
  for (let page = 1; page <= NEWS_PAGE_SCAN_LIMIT; page += 1) {
    const url = `${NEWS_LIST_BASE_URL}?page=${page}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) continue;

    const html = await response.text();
    const posts = extractPostChunks(html)
      .map(parseRawPost)
      .filter((item): item is RawMapServicePost => item !== null);

    const found = posts.find((post) => post.title.toLowerCase().includes(MAP_SERVICE_REPORT_KEYWORD));
    if (found) return found;
  }

  return null;
}

async function fetchLatestMapRotationUncached(): Promise<PubgMapRotationPayload | null> {
  const post = await fetchMapServiceReportPost();
  if (!post) return null;

  const detailUrl = `${NEWS_DETAIL_BASE_URL}/${post.postId}`;
  const detailRes = await fetch(detailUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,ko;q=0.8",
    },
    next: { revalidate: 300 },
  });

  if (!detailRes.ok) return null;

  const detailHtml = await detailRes.text();
  const detailText = stripHtmlToText(detailHtml);

  const announcementDate = parseArticleDateLabel(detailText);
  const baseYear = announcementDate ? Number.parseInt(announcementDate.split(".")[0], 10) : new Date().getUTCFullYear();
  const scheduleByWeek = buildScheduleStartByWeek(parseScheduleRows(detailText), baseYear);
  const normalWeeks = buildWeekItems(parseAsWeekRows(detailText), scheduleByWeek);
  const rankedMaps = buildRankedItems(parseRankedRows(detailText));
  const currentWeek = resolveCurrentWeek(normalWeeks);

  return {
    fetchedAt: new Date().toISOString(),
    source: {
      postId: post.postId,
      title: post.title,
      publishedAt: normalizeDate(post.displayStartTime, post.createdAt),
      officialUrlKo: `https://pubg.com/ko/news/${post.postId}`,
      officialUrlEn: `https://pubg.com/en/news/${post.postId}`,
    },
    region: "AS",
    platform: "PC",
    currentWeek,
    normal: {
      weeks: normalWeeks,
      rotationPool: buildRotationPool(normalWeeks),
    },
    ranked: {
      maps: rankedMaps,
    },
  };
}

export async function getLatestPubgMapRotation(forceRefresh = false): Promise<PubgMapRotationPayload | null> {
  const now = Date.now();
  if (!forceRefresh && mapRotationCache && mapRotationCache.expiresAt > now) {
    return mapRotationCache.value;
  }

  if (!forceRefresh && mapRotationPending) {
    return mapRotationPending;
  }

  mapRotationPending = fetchLatestMapRotationUncached()
    .then((payload) => {
      if (payload) {
        mapRotationCache = {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: payload,
        };
        return payload;
      }

      if (mapRotationCache) {
        return mapRotationCache.value;
      }

      return null;
    })
    .catch((error) => {
      console.error("Failed to fetch latest PUBG map rotation:", error);
      if (mapRotationCache) {
        return mapRotationCache.value;
      }
      return null;
    })
    .finally(() => {
      mapRotationPending = null;
    });

  return mapRotationPending;
}
