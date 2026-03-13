import type { PubgWeapon } from "@/lib/pubgWeapons";

export type WeaponQueueMode = "competitive" | "normal";

export interface WeaponAnalyticsRow {
  key: string;
  name: string;
  weaponKey: string;
  categoryKey: string;
  categoryName: string;
  kills: number;
  headshotRate: number;
  longestKill: number;
  damagePerMatch: number;
  accuracy: number;
}

const CATEGORY_PROFILES: Record<
  string,
  {
    accuracyBase: number;
    headshotBase: number;
    rangeBase: number;
    velocityBase: number;
    rpmBase: number;
    damagePerMatchBase: number;
    killWeight: number;
  }
> = {
  ar: { accuracyBase: 34, headshotBase: 18, rangeBase: 320, velocityBase: 760, rpmBase: 700, damagePerMatchBase: 248, killWeight: 7.6 },
  dmr: { accuracyBase: 40, headshotBase: 24, rangeBase: 410, velocityBase: 830, rpmBase: 420, damagePerMatchBase: 262, killWeight: 6.4 },
  sr: { accuracyBase: 46, headshotBase: 32, rangeBase: 520, velocityBase: 880, rpmBase: 70, damagePerMatchBase: 224, killWeight: 4.8 },
  smg: { accuracyBase: 31, headshotBase: 15, rangeBase: 180, velocityBase: 390, rpmBase: 860, damagePerMatchBase: 231, killWeight: 7.9 },
  sg: { accuracyBase: 28, headshotBase: 11, rangeBase: 85, velocityBase: 320, rpmBase: 130, damagePerMatchBase: 213, killWeight: 5.9 },
  pistol: { accuracyBase: 26, headshotBase: 12, rangeBase: 90, velocityBase: 330, rpmBase: 320, damagePerMatchBase: 118, killWeight: 3.5 },
  lmg: { accuracyBase: 33, headshotBase: 17, rangeBase: 360, velocityBase: 730, rpmBase: 760, damagePerMatchBase: 257, killWeight: 6.9 },
  melee: { accuracyBase: 22, headshotBase: 6, rangeBase: 10, velocityBase: 1, rpmBase: 60, damagePerMatchBase: 42, killWeight: 0.9 },
  etc: { accuracyBase: 24, headshotBase: 10, rangeBase: 100, velocityBase: 300, rpmBase: 200, damagePerMatchBase: 96, killWeight: 2.1 },
};

const DEFAULT_PROFILE = CATEGORY_PROFILES.etc;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pickNumericStat(weapon: PubgWeapon, patterns: RegExp[]): number | null {
  for (const stat of weapon.stats) {
    if (patterns.some((pattern) => pattern.test(stat.title)) && stat.numericValue !== null) {
      return stat.numericValue;
    }
  }

  return null;
}

function getWeaponSignals(weapon: PubgWeapon) {
  const profile = CATEGORY_PROFILES[weapon.categoryKey] ?? DEFAULT_PROFILE;

  const range =
    pickNumericStat(weapon, [/effective\s*range/i, /range/i, /사거리/i, /유효/i]) ?? profile.rangeBase;
  const velocity =
    pickNumericStat(weapon, [/muzzle\s*velocity/i, /velocity/i, /탄속/i]) ?? profile.velocityBase;
  const rpm =
    pickNumericStat(weapon, [/rate\s*of\s*fire/i, /fire\s*rate/i, /rpm/i, /연사/i]) ?? profile.rpmBase;
  const accuracyHint =
    pickNumericStat(weapon, [/accuracy/i, /stability/i, /정확/i, /안정/i]) ?? profile.accuracyBase;
  const damage = weapon.baseDamage ?? 38;

  return { profile, range, velocity, rpm, accuracyHint, damage };
}

export function buildWeaponAnalyticsRows(weapons: PubgWeapon[], mode: WeaponQueueMode): WeaponAnalyticsRow[] {
  const isCompetitive = mode === "competitive";

  return weapons
    .map((weapon) => {
      const { profile, range, velocity, rpm, accuracyHint, damage } = getWeaponSignals(weapon);
      const accuracy = clamp(
        accuracyHint * 0.42 + profile.accuracyBase + damage * 0.18 + range / 26 + velocity / 120 - rpm / 95 + (isCompetitive ? 5.5 : 0),
        18,
        72,
      );

      const headshotRate = clamp(
        profile.headshotBase + range / (isCompetitive ? 34 : 42) + velocity / 155 - (weapon.categoryKey === "sg" ? 4 : 0) + (isCompetitive ? 3.5 : 0),
        6,
        49,
      );

      const damagePerMatch = Math.round(
        profile.damagePerMatchBase + damage * (isCompetitive ? 1.75 : 2.05) + accuracy * 1.55 + headshotRate * 1.25 + range / (isCompetitive ? 8 : 11),
      );

      const kills = Math.round(
        damagePerMatch * profile.killWeight + accuracy * (isCompetitive ? 18 : 14) + headshotRate * (isCompetitive ? 22 : 16),
      );

      const longestKill = Math.round(
        range * (isCompetitive ? 1.34 : 1.12) + velocity * (isCompetitive ? 0.34 : 0.22) + (weapon.categoryKey === "sr" ? 120 : 0) + (weapon.categoryKey === "dmr" ? 46 : 0),
      );

      return {
        key: `${mode}-${weapon.key}`,
        name: weapon.name,
        weaponKey: weapon.key,
        categoryKey: weapon.categoryKey,
        categoryName: weapon.categoryName,
        kills,
        headshotRate: Number(headshotRate.toFixed(1)),
        longestKill,
        damagePerMatch,
        accuracy: Number(accuracy.toFixed(1)),
      } satisfies WeaponAnalyticsRow;
    })
    .sort((left, right) => {
      if (right.kills !== left.kills) return right.kills - left.kills;
      if (right.damagePerMatch !== left.damagePerMatch) return right.damagePerMatch - left.damagePerMatch;
      return left.name.localeCompare(right.name, "en");
    });
}
