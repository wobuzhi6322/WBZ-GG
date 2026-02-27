export type MatchType = "ranked" | "normal";
export type MatchDifficultyLevel = "Low" | "Middle" | "High";

export interface MatchDifficultyPlayerInput {
  tier?: string | null;
  game_count?: number | null;
  avg_damage?: number | null;
}

export interface MatchDifficultyInput {
  match_type: MatchType;
  players?: Array<MatchDifficultyPlayerInput | null | undefined> | null;
  high_skill_threshold_percent?: number;
  casual_dominant_threshold_percent?: number;
}

export interface MatchDifficultyResult {
  match_difficulty: MatchDifficultyLevel;
  avg_tier_score?: number;
  high_skill_ratio?: number;
  description: string;
}

type TierFamily = "bronze" | "silver" | "gold" | "platinum" | "crystal" | "diamond" | "master" | "survivor";

const TIER_BASE_SCORE: Record<Exclude<TierFamily, "master" | "survivor">, number> = {
  bronze: 1000,
  silver: 2000,
  gold: 3000,
  platinum: 4000,
  crystal: 4600,
  diamond: 5100,
};

const DIVISION_STEP = 100;
const DEFAULT_DIVISION = 3;

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[_\-./]/g, " ").replace(/\s+/g, " ").trim();
}

function parseDivision(normalizedTier: string): number | null {
  const arabic = normalizedTier.match(/(?:^|\s)([1-5])(?:\s|$)/);
  if (arabic?.[1]) return Number.parseInt(arabic[1], 10);

  const roman = normalizedTier.match(/(?:^|\s)(i|ii|iii|iv|v)(?:\s|$)/i);
  if (!roman?.[1]) return null;

  const map: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
  };
  return map[roman[1].toLowerCase()] ?? null;
}

function parseTierFamily(tierText: string): TierFamily | null {
  const text = normalizeText(tierText);
  if (!text) return null;

  if (text.includes("survivor")) return "survivor";
  if (text.includes("master")) return "master";
  if (text.includes("diamond")) return "diamond";
  if (text.includes("crystal")) return "crystal";
  if (text.includes("platinum")) return "platinum";
  if (text.includes("gold")) return "gold";
  if (text.includes("silver")) return "silver";
  if (text.includes("bronze")) return "bronze";
  return null;
}

function tierScoreFromText(tierText: string | null | undefined): number | null {
  if (!tierText) return null;
  const family = parseTierFamily(tierText);
  if (!family) return null;

  if (family === "survivor") return 6200;
  if (family === "master") return 5600;

  const normalized = normalizeText(tierText);
  const division = clamp(parseDivision(normalized) ?? DEFAULT_DIVISION, 1, 5);
  const base = TIER_BASE_SCORE[family];
  const offset = (5 - division) * DIVISION_STEP;
  return base + offset;
}

function inferTierNameFromScore(score: number): string {
  if (!Number.isFinite(score) || score <= 0) return "Unknown";
  if (score >= 6200) return "Survivor";
  if (score >= 5600) return "Master";

  const groups: Array<{ name: Exclude<TierFamily, "master" | "survivor">; base: number }> = [
    { name: "diamond", base: 5100 },
    { name: "crystal", base: 4600 },
    { name: "platinum", base: 4000 },
    { name: "gold", base: 3000 },
    { name: "silver", base: 2000 },
    { name: "bronze", base: 1000 },
  ];

  for (const group of groups) {
    if (score >= group.base) {
      const step = clamp(Math.round((score - group.base) / DIVISION_STEP), 0, 4);
      const division = 5 - step;
      const label = `${group.name[0].toUpperCase()}${group.name.slice(1)} ${division}`;
      return label;
    }
  }

  return "Bronze 5";
}

export function calculateMatchDifficulty(input: MatchDifficultyInput): MatchDifficultyResult {
  const players = Array.isArray(input.players) ? input.players : [];
  const highSkillThreshold = safeNumber(input.high_skill_threshold_percent) ?? 30;
  const casualDominantThreshold = safeNumber(input.casual_dominant_threshold_percent) ?? 50;

  if (input.match_type === "ranked") {
    const tierScores = players
      .map((player) => tierScoreFromText(player?.tier))
      .filter((score): score is number => typeof score === "number" && Number.isFinite(score));

    if (tierScores.length === 0) {
      return {
        match_difficulty: "Low",
        avg_tier_score: 0,
        description: "No valid ranked tier data. Defaulted to Low queue.",
      };
    }

    const averageScore = tierScores.reduce((sum, score) => sum + score, 0) / tierScores.length;
    const roundedAverage = Number(averageScore.toFixed(2));

    let matchDifficulty: MatchDifficultyLevel = "Low";
    if (roundedAverage >= 5200) matchDifficulty = "High";
    else if (roundedAverage >= 4000) matchDifficulty = "Middle";

    const approxTier = inferTierNameFromScore(roundedAverage);
    return {
      match_difficulty: matchDifficulty,
      avg_tier_score: roundedAverage,
      description: `Average tier score is ${roundedAverage} (approx ${approxTier}).`,
    };
  }

  if (input.match_type === "normal") {
    const validPlayers = players
      .map((player) => {
        const gameCount = safeNumber(player?.game_count);
        const avgDamage = safeNumber(player?.avg_damage);
        if (gameCount === null || avgDamage === null) return null;
        return { gameCount, avgDamage };
      })
      .filter((player): player is { gameCount: number; avgDamage: number } => player !== null);

    if (validPlayers.length === 0) {
      return {
        match_difficulty: "Low",
        high_skill_ratio: 0,
        description: "No valid normal-match player data. Defaulted to Low queue.",
      };
    }

    const highSkillCount = validPlayers.filter((player) => player.gameCount >= 100 && player.avgDamage >= 300).length;
    const casualCount = validPlayers.filter((player) => player.gameCount < 100).length;

    const highSkillRatio = Number(((highSkillCount / validPlayers.length) * 100).toFixed(2));
    const casualRatio = Number(((casualCount / validPlayers.length) * 100).toFixed(2));

    if (highSkillRatio > highSkillThreshold) {
      return {
        match_difficulty: "High",
        high_skill_ratio: highSkillRatio,
        description: `High skilled players ratio is ${highSkillRatio}% (${highSkillCount}/${validPlayers.length}).`,
      };
    }

    if (casualRatio > casualDominantThreshold) {
      return {
        match_difficulty: "Low",
        high_skill_ratio: highSkillRatio,
        description: `New/Casual players ratio is dominant at ${casualRatio}% (${casualCount}/${validPlayers.length}).`,
      };
    }

    return {
      match_difficulty: "Low",
      high_skill_ratio: highSkillRatio,
      description: `High skilled players ratio is ${highSkillRatio}%, below ${highSkillThreshold}% threshold.`,
    };
  }

  return {
    match_difficulty: "Low",
    description: "Unknown match type. Supported values are ranked and normal.",
  };
}
