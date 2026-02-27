import { MAP_INTEL_MAPS, getMapIntelDefinition } from "@/data/mapIntelMaps";

const SOURCE_HOME_URL = "https://battlegrounds.party/map/";
const SOURCE_BASE_URL = "https://battlegrounds.party/map/data";
const SOURCE_BUILD_ID_FALLBACK = "352747a17877";
const BUILD_ID_REGEX = /\/map\/js\/app\.js\?([a-z0-9]+)/i;
const BUILD_ID_CACHE_TTL_MS = 1000 * 60 * 15;

let buildIdCache: { value: string; fetchedAt: number } | null = null;

const ENCODE_XOR = 3122512141;
const DECODE_OFFSET = 42044;
const DECODE_SCALE = 0.788;
const Y_BIAS_BY_DECIMAL = [201029, 255880, 315876, 196809, 282172, 270304, 50578, 234400, 331944, 111170];

const BOAT_TOKENS = ["boat", "ship", "water", "ocean", "river", "dam", "sea", "ferry", "jetski", "jet"];
const GLIDER_TOKENS = ["glider", "motorglider", "airfield", "air"];
const FIXED_VEHICLE_TOKENS = ["garage", "w_garage", "d_garage"];
const SPAWN_VEHICLE_TOKENS = [
  "road",
  "offroad",
  "roadplus",
  "start",
  "sports",
  "foodtruck",
  "police",
  "houses",
  "hacienda",
];

interface RawVehicleGroup {
  originalCategories?: unknown;
}

type RawVehicles = Record<string, RawVehicleGroup>;
type RawVehicleSpots = Record<string, unknown>;

export interface MapIntelPoint {
  id: string;
  sourceGroup: string;
  xPercent: number;
  yPercent: number;
  xMeter: number;
  yMeter: number;
}

interface MapIntelCategory {
  key: "fixedVehicles" | "spawnVehicles" | "boats" | "secretRooms" | "gliders";
  labelKo: string;
  count: number;
  points: MapIntelPoint[];
}

export interface MapIntelPayload {
  source: string;
  sourceBuildId: string;
  fetchedAt: string;
  map: {
    id: string;
    nameKo: string;
    nameEn: string;
    sizeKm: number;
    imageUrl: string;
  };
  maps: Array<{
    id: string;
    nameKo: string;
    nameEn: string;
    sizeKm: number;
    imageUrl: string;
  }>;
  categories: {
    fixedVehicles: MapIntelCategory;
    spawnVehicles: MapIntelCategory;
    boats: MapIntelCategory;
    secretRooms: MapIntelCategory;
    gliders: MapIntelCategory;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function decodeEncodedValue(value: number): number {
  return (ENCODE_XOR ^ value) / 10;
}

function decodeSpot(encodedSpot: unknown): { xCm: number; yCm: number } | null {
  if (!Array.isArray(encodedSpot) || encodedSpot.length < 2) return null;

  const encodedX = Number(encodedSpot[0]);
  const encodedY = Number(encodedSpot[1]);
  if (!Number.isFinite(encodedX) || !Number.isFinite(encodedY)) return null;

  const xRaw = decodeEncodedValue(encodedX);
  const yRaw = decodeEncodedValue(encodedY);
  const xCm = (xRaw - DECODE_OFFSET) / DECODE_SCALE;
  const decimalIndex = Math.floor((10 * xRaw) % 10);
  const yCm = (yRaw - DECODE_OFFSET + Y_BIAS_BY_DECIMAL[decimalIndex]) / DECODE_SCALE;

  if (!Number.isFinite(xCm) || !Number.isFinite(yCm)) return null;
  return { xCm, yCm };
}

function isWithinMapBounds(
  xCm: number,
  yCm: number,
  map: NonNullable<ReturnType<typeof getMapIntelDefinition>>
): boolean {
  const mapWidthMeters = map.projection.width * map.projection.sizeScale;
  const mapHeightMeters = map.projection.height * map.projection.sizeScale;
  const marginMeters = Math.max(60, Math.min(mapWidthMeters, mapHeightMeters) * 0.02);

  const xMeters = xCm / 100;
  const yMeters = yCm / 100;

  return (
    xMeters >= -marginMeters &&
    xMeters <= mapWidthMeters + marginMeters &&
    yMeters >= -marginMeters &&
    yMeters <= mapHeightMeters + marginMeters
  );
}

function projectToPercent(
  xCm: number,
  yCm: number,
  map: NonNullable<ReturnType<typeof getMapIntelDefinition>>
): { xPercent: number; yPercent: number } {
  const { width, height, sizeScale, adjustX, adjustY } = map.projection;
  const scaleFactor = 1 / sizeScale;

  const mapX = (xCm / 100) * scaleFactor + adjustX;
  const mapY = height - (yCm / 100) * scaleFactor - adjustY;

  return {
    xPercent: clamp((mapX / width) * 100, 0, 100),
    yPercent: clamp((mapY / height) * 100, 0, 100),
  };
}

function parseCategoryTokens(group: RawVehicleGroup | undefined): string[] {
  const raw = group?.originalCategories;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => String(item).trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function hasAnyToken(tokens: string[], keywords: string[]): boolean {
  return tokens.some((token) => keywords.some((keyword) => token.includes(keyword)));
}

function isVehicleGroupKey(groupKey: string): boolean {
  return groupKey.toLowerCase().startsWith("ethingspotgrouptype::group");
}

function classifyGroup(
  groupKey: string,
  tokens: string[]
): "fixedVehicles" | "spawnVehicles" | "boats" | "secretRooms" | "gliders" | null {
  const groupLower = groupKey.toLowerCase();

  if (groupLower.includes("lockeddoor") || hasAnyToken(tokens, ["lockeddoor", "secret"])) {
    return "secretRooms";
  }

  if (groupLower.includes("glider") || groupLower.includes("motorglider") || hasAnyToken(tokens, GLIDER_TOKENS)) {
    return "gliders";
  }

  if (
    groupLower.includes("boat") ||
    groupLower.includes("ship") ||
    groupLower.includes("jetski") ||
    groupLower.includes("ferry") ||
    hasAnyToken(tokens, BOAT_TOKENS)
  ) {
    return "boats";
  }

  if (hasAnyToken(tokens, FIXED_VEHICLE_TOKENS)) {
    return "fixedVehicles";
  }

  const isDeployedVehicle = groupLower.startsWith("deployed");
  if (hasAnyToken(tokens, SPAWN_VEHICLE_TOKENS) || isDeployedVehicle || isVehicleGroupKey(groupKey)) {
    return "spawnVehicles";
  }

  return null;
}

function buildPoint(
  mapId: string,
  sourceGroup: string,
  index: number,
  xCm: number,
  yCm: number,
  xPercent: number,
  yPercent: number
): MapIntelPoint {
  return {
    id: `${mapId}-${sourceGroup}-${index}`,
    sourceGroup,
    xPercent: Number(xPercent.toFixed(4)),
    yPercent: Number(yPercent.toFixed(4)),
    xMeter: Number((xCm / 100).toFixed(1)),
    yMeter: Number((yCm / 100).toFixed(1)),
  };
}

function dedupePoints(points: MapIntelPoint[], precisionMeters: number): MapIntelPoint[] {
  const safePrecision = Math.max(1, precisionMeters);
  const seen = new Set<string>();
  const deduped: MapIntelPoint[] = [];

  for (const point of points) {
    const key = `${Math.round(point.xMeter / safePrecision)}:${Math.round(point.yMeter / safePrecision)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(point);
  }

  return deduped;
}

async function resolveSourceBuildId(): Promise<string> {
  const now = Date.now();
  if (buildIdCache && now - buildIdCache.fetchedAt < BUILD_ID_CACHE_TTL_MS) {
    return buildIdCache.value;
  }

  try {
    const response = await fetch(SOURCE_HOME_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 300 },
    });

    if (response.ok) {
      const html = await response.text();
      const matchedBuildId = html.match(BUILD_ID_REGEX)?.[1];
      if (matchedBuildId) {
        buildIdCache = { value: matchedBuildId, fetchedAt: now };
        return matchedBuildId;
      }
    }
  } catch (error) {
    console.error("Failed to resolve map build id:", error);
  }

  buildIdCache = { value: SOURCE_BUILD_ID_FALLBACK, fetchedAt: now };
  return SOURCE_BUILD_ID_FALLBACK;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error("Failed to fetch map intel JSON:", error);
    return null;
  }
}

async function fetchVehicleSpots(mapId: string, buildId: string): Promise<RawVehicleSpots> {
  const candidateUrls = [
    `${SOURCE_BASE_URL}/${mapId}/vehicleSpots-condensed.json?${buildId}`,
    `${SOURCE_BASE_URL}/${mapId}/vehicleSpots-condensed.json`,
    `${SOURCE_BASE_URL}/${mapId}/vehicleSpots.json?${buildId}`,
    `${SOURCE_BASE_URL}/${mapId}/vehicleSpots.json`,
  ];

  for (const url of candidateUrls) {
    const data = await fetchJson<RawVehicleSpots>(url);
    if (data && Object.keys(data).length > 0) {
      return data;
    }
  }

  return {};
}

async function fetchVehiclesMeta(mapId: string, buildId: string): Promise<RawVehicles> {
  const candidateUrls = [`${SOURCE_BASE_URL}/${mapId}/vehicles.json?${buildId}`, `${SOURCE_BASE_URL}/${mapId}/vehicles.json`];

  for (const url of candidateUrls) {
    const data = await fetchJson<RawVehicles>(url);
    if (data && Object.keys(data).length > 0) {
      return data;
    }
  }

  return {};
}

export async function getMapIntel(mapId: string): Promise<MapIntelPayload | null> {
  const selectedMap = getMapIntelDefinition(mapId);
  if (!selectedMap) return null;

  const buildId = await resolveSourceBuildId();
  const [spots, vehicleGroups] = await Promise.all([fetchVehicleSpots(mapId, buildId), fetchVehiclesMeta(mapId, buildId)]);

  const fixedVehicles: MapIntelPoint[] = [];
  const spawnVehicles: MapIntelPoint[] = [];
  const boats: MapIntelPoint[] = [];
  const secretRooms: MapIntelPoint[] = [];
  const gliders: MapIntelPoint[] = [];

  for (const [groupKey, rawList] of Object.entries(spots)) {
    if (!Array.isArray(rawList)) continue;

    const normalizedGroup = String(groupKey);
    const tokens = parseCategoryTokens(vehicleGroups[normalizedGroup]);
    const category = classifyGroup(normalizedGroup, tokens);
    if (!category) continue;

    for (let index = 0; index < rawList.length; index += 1) {
      const decoded = decodeSpot(rawList[index]);
      if (!decoded) continue;
      if (!isWithinMapBounds(decoded.xCm, decoded.yCm, selectedMap)) continue;

      const percent = projectToPercent(decoded.xCm, decoded.yCm, selectedMap);
      const point = buildPoint(
        selectedMap.id,
        normalizedGroup,
        index,
        decoded.xCm,
        decoded.yCm,
        percent.xPercent,
        percent.yPercent
      );

      if (category === "fixedVehicles") {
        fixedVehicles.push(point);
      } else if (category === "boats") {
        boats.push(point);
      } else if (category === "secretRooms") {
        secretRooms.push(point);
      } else if (category === "gliders") {
        gliders.push(point);
      } else {
        spawnVehicles.push(point);
      }
    }
  }

  const dedupeUnit = selectedMap.sizeKm >= 8 ? 5 : 3;

  const fixedVehiclesClean = dedupePoints(fixedVehicles, dedupeUnit);
  const spawnVehiclesClean = dedupePoints(spawnVehicles, dedupeUnit);
  const boatsClean = dedupePoints(boats, dedupeUnit);
  const secretRoomsClean = dedupePoints(secretRooms, dedupeUnit);
  const glidersClean = dedupePoints(gliders, dedupeUnit);

  return {
    source: SOURCE_HOME_URL,
    sourceBuildId: buildId,
    fetchedAt: new Date().toISOString(),
    map: {
      id: selectedMap.id,
      nameKo: selectedMap.nameKo,
      nameEn: selectedMap.nameEn,
      sizeKm: selectedMap.sizeKm,
      imageUrl: selectedMap.imageUrl,
    },
    maps: MAP_INTEL_MAPS.map((map) => ({
      id: map.id,
      nameKo: map.nameKo,
      nameEn: map.nameEn,
      sizeKm: map.sizeKm,
      imageUrl: map.imageUrl,
    })),
    categories: {
      fixedVehicles: {
        key: "fixedVehicles",
        labelKo: "고정 차량",
        count: fixedVehiclesClean.length,
        points: fixedVehiclesClean,
      },
      spawnVehicles: {
        key: "spawnVehicles",
        labelKo: "스폰 차량",
        count: spawnVehiclesClean.length,
        points: spawnVehiclesClean,
      },
      boats: {
        key: "boats",
        labelKo: "선박",
        count: boatsClean.length,
        points: boatsClean,
      },
      secretRooms: {
        key: "secretRooms",
        labelKo: "비밀의 방",
        count: secretRoomsClean.length,
        points: secretRoomsClean,
      },
      gliders: {
        key: "gliders",
        labelKo: "글라이더",
        count: glidersClean.length,
        points: glidersClean,
      },
    },
  };
}
