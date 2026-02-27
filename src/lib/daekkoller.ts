import { getLeaderboard, getMatches, getPlayer } from "@/lib/pubg";

type DaekkollerMode = "normal" | "competitive";

interface DaekkollerRule {
  minPlacement: number;
  maxPlacement: number;
  minAvgKills: number;
  maxAvgKills: number;
  minAvgDamage: number;
  maxAvgDamage: number;
  minAvgSurvivalSec: number;
  maxAvgSurvivalSec: number;
}

export interface DaekkollerEntry {
  rank: number;
  name: string;
  mode: DaekkollerMode;
  score: number;
  avgPlacement: number;
  avgKills: number;
  avgDamage: number;
  avgSurvivalSec: number;
  sampleMatches: number;
  maps: string[];
}

interface DaekkollerResponse {
  category: "대꼴러";
  mode: DaekkollerMode;
  title: string;
  rules: {
    placement: string;
    kills: string;
    damage: string;
    survival: string;
    maps: string;
  };
  updatedAt: string;
  entries: DaekkollerEntry[];
}

interface CandidateScore {
  name: string;
  mode: DaekkollerMode;
  score: number;
  avgPlacement: number;
  avgKills: number;
  avgDamage: number;
  avgSurvivalSec: number;
  sampleMatches: number;
  maps: string[];
  strict: boolean;
  distance: number;
}

const RULES: Record<DaekkollerMode, DaekkollerRule> = {
  normal: {
    minPlacement: 18,
    maxPlacement: 25,
    minAvgKills: 0.7,
    maxAvgKills: 2,
    minAvgDamage: 90,
    maxAvgDamage: 230,
    minAvgSurvivalSec: 10,
    maxAvgSurvivalSec: 240,
  },
  competitive: {
    minPlacement: 14,
    maxPlacement: 20,
    minAvgKills: 0.7,
    maxAvgKills: 2,
    minAvgDamage: 90,
    maxAvgDamage: 230,
    minAvgSurvivalSec: 10,
    maxAvgSurvivalSec: 240,
  },
};

const CACHE_TTL_MS = 1000 * 60 * 5;
const DAEKKOLLER_REGION = "pc-as";
const CANDIDATE_LIMIT = 120;

const cache: Record<DaekkollerMode, { expiresAt: number; payload: DaekkollerResponse } | null> = {
  normal: null,
  competitive: null,
};
const pending: Partial<Record<DaekkollerMode, Promise<DaekkollerResponse>>> = {};

function getScore(kdaLike: number, avgSurvivalSec: number, avgDamage: number): number {
  const survivalBonus = Math.max(0, 240 - avgSurvivalSec) / 8;
  const damageBonus = avgDamage / 20;
  return Number((kdaLike * 100 + survivalBonus + damageBonus).toFixed(2));
}

function boundDistance(value: number, min: number, max: number): number {
  if (value < min) return min - value;
  if (value > max) return value - max;
  return 0;
}

function formatRule(rule: DaekkollerRule): DaekkollerResponse["rules"] {
  return {
    placement: `${rule.minPlacement} ~ ${rule.maxPlacement}`,
    kills: `${rule.minAvgKills} ~ ${rule.maxAvgKills}`,
    damage: `${rule.minAvgDamage} ~ ${rule.maxAvgDamage}`,
    survival: `${rule.minAvgSurvivalSec} ~ ${rule.maxAvgSurvivalSec}초`,
    maps: "전체 맵",
  };
}

async function runWithConcurrency<T, R>(
  values: T[],
  limit: number,
  worker: (value: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;

  async function consume(): Promise<void> {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      const result = await worker(values[index]);
      results.push(result);
    }
  }

  const runners = Array.from({ length: Math.min(limit, values.length) }, () => consume());
  await Promise.all(runners);
  return results;
}

function uniqueNamesFromBoards(boards: Array<Array<{ name: string }>>, target = CANDIDATE_LIMIT): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const board of boards) {
    for (const player of board) {
      const name = player.name.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      names.push(name);
      if (names.length >= target) return names;
    }
  }

  return names;
}

function evaluateCandidate(
  name: string,
  mode: DaekkollerMode,
  rule: DaekkollerRule,
  sourceMatches: Array<{
    placement: number;
    kills: number;
    assists: number;
    damage: number;
    timeSurvivedSeconds: number;
    map: string;
  }>
): CandidateScore | null {
  if (sourceMatches.length < 2) return null;

  const totalKills = sourceMatches.reduce((sum, match) => sum + match.kills, 0);
  const totalAssists = sourceMatches.reduce((sum, match) => sum + match.assists, 0);
  const totalDamage = sourceMatches.reduce((sum, match) => sum + match.damage, 0);
  const totalPlacement = sourceMatches.reduce((sum, match) => sum + match.placement, 0);
  const totalSurvival = sourceMatches.reduce((sum, match) => sum + match.timeSurvivedSeconds, 0);

  const avgKills = totalKills / sourceMatches.length;
  const avgDamage = totalDamage / sourceMatches.length;
  const avgPlacement = totalPlacement / sourceMatches.length;
  const avgSurvival = totalSurvival / sourceMatches.length;
  const kdaLike = (totalKills + totalAssists) / sourceMatches.length;

  const placementDistance =
    boundDistance(avgPlacement, rule.minPlacement, rule.maxPlacement) /
    Math.max(1, rule.maxPlacement - rule.minPlacement);
  const killsDistance =
    boundDistance(avgKills, rule.minAvgKills, rule.maxAvgKills) /
    Math.max(0.1, rule.maxAvgKills - rule.minAvgKills);
  const damageDistance =
    boundDistance(avgDamage, rule.minAvgDamage, rule.maxAvgDamage) /
    Math.max(1, rule.maxAvgDamage - rule.minAvgDamage);
  const survivalDistance =
    boundDistance(avgSurvival, rule.minAvgSurvivalSec, rule.maxAvgSurvivalSec) /
    Math.max(1, rule.maxAvgSurvivalSec - rule.minAvgSurvivalSec);

  const distance = Number((placementDistance + killsDistance + damageDistance + survivalDistance).toFixed(4));
  const strict = distance === 0;

  const baseScore = getScore(kdaLike, avgSurvival, avgDamage);
  const score = Number((baseScore - distance * 15).toFixed(2));
  const maps = Array.from(new Set(sourceMatches.map((match) => match.map))).slice(0, 5);

  return {
    name,
    mode,
    score,
    avgPlacement: Number(avgPlacement.toFixed(1)),
    avgKills: Number(avgKills.toFixed(2)),
    avgDamage: Number(avgDamage.toFixed(1)),
    avgSurvivalSec: Number(avgSurvival.toFixed(1)),
    sampleMatches: sourceMatches.length,
    maps,
    strict,
    distance,
  };
}

async function buildDaekkoller(mode: DaekkollerMode, forceRefresh = false): Promise<DaekkollerResponse> {
  const rule = RULES[mode];

  const [boardA, boardB, boardC, boardD] = await Promise.all([
    getLeaderboard("squad-fpp", DAEKKOLLER_REGION, forceRefresh),
    getLeaderboard("duo-fpp", DAEKKOLLER_REGION, forceRefresh),
    getLeaderboard("squad", DAEKKOLLER_REGION, forceRefresh),
    getLeaderboard("duo", DAEKKOLLER_REGION, forceRefresh),
  ]);

  const candidates = uniqueNamesFromBoards([boardA, boardB, boardC, boardD], CANDIDATE_LIMIT);

  const analyzed = await runWithConcurrency(candidates, 6, async (name): Promise<CandidateScore | null> => {
    const player = await getPlayer(name, undefined, forceRefresh);
    if (!player) return null;

    const queueFilter = mode === "competitive" ? "competitive" : "normal";
    const matches = await getMatches(player.id, player.matchIds, 40, queueFilter, undefined, forceRefresh);
    if (matches.length === 0) return null;

    const strictSource = matches.filter((match) => {
      const placement = match.placement;
      const survivalSec = match.timeSurvivedSeconds;
      if (placement < rule.minPlacement || placement > rule.maxPlacement) return false;
      if (survivalSec < rule.minAvgSurvivalSec || survivalSec > rule.maxAvgSurvivalSec) return false;
      return true;
    });

    // If strict pre-filter has too few matches, fallback to recent queue matches so board never disappears.
    const sourceMatches = (strictSource.length >= 2 ? strictSource : matches).slice(0, 14);
    return evaluateCandidate(name, mode, rule, sourceMatches);
  });

  const valid = analyzed.filter((item): item is CandidateScore => item !== null);

  const strictSorted = valid
    .filter((item) => item.strict)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.avgSurvivalSec - b.avgSurvivalSec;
    });

  const relaxedSorted = valid
    .filter((item) => !item.strict)
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (b.score !== a.score) return b.score - a.score;
      return a.avgSurvivalSec - b.avgSurvivalSec;
    });

  const combined: CandidateScore[] = [...strictSorted];
  for (const item of relaxedSorted) {
    if (combined.length >= 20) break;
    combined.push(item);
  }

  const entries = combined.slice(0, 20).map((item, index) => ({
    rank: index + 1,
    name: item.name,
    mode: item.mode,
    score: item.score,
    avgPlacement: item.avgPlacement,
    avgKills: item.avgKills,
    avgDamage: item.avgDamage,
    avgSurvivalSec: item.avgSurvivalSec,
    sampleMatches: item.sampleMatches,
    maps: item.maps,
  }));

  return {
    category: "대꼴러",
    mode,
    title: mode === "normal" ? "대꼴러 :: 일반전 (ASIA)" : "대꼴러 :: 경쟁전 (ASIA)",
    rules: formatRule(rule),
    updatedAt: new Date().toISOString(),
    entries,
  };
}

export async function getDaekkollerLeaderboard(
  mode: DaekkollerMode,
  forceRefresh = false
): Promise<DaekkollerResponse> {
  const cached = cache[mode];
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  if (!forceRefresh && pending[mode]) {
    return pending[mode] as Promise<DaekkollerResponse>;
  }

  pending[mode] = buildDaekkoller(mode, forceRefresh)
    .then((payload) => {
      cache[mode] = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        payload,
      };
      return payload;
    })
    .finally(() => {
      delete pending[mode];
    });

  return pending[mode] as Promise<DaekkollerResponse>;
}
