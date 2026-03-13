"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type {
  MatchDetailPayload,
  MatchKillActor,
  MatchKillLogEntry,
  MatchSummary,
  PubgPlatformShard,
} from "@/entities/pubg/types";

interface EncounterTrackerPanelProps {
  matches: MatchSummary[];
  accountId: string;
  playerName: string;
  platform?: PubgPlatformShard;
  refreshToken?: string;
}

interface EncounterRow {
  key: string;
  name: string;
  accountId: string | null;
  matchCount: number;
  killDeathCount: number;
}

const DETAIL_FETCH_LIMIT = 15;

function normalizePlatform(platform?: PubgPlatformShard): PubgPlatformShard {
  return platform === "kakao" ? "kakao" : "steam";
}

function buildEncounterKey(actor: { accountId?: string | null; name?: string | null }): string | null {
  if (actor.accountId && actor.accountId.trim().length > 0) return `id:${actor.accountId.trim()}`;
  if (actor.name && actor.name.trim().length > 0) return `name:${actor.name.trim().toLowerCase()}`;
  return null;
}

function isSamePerson(actor: MatchKillActor | null, searchedId: string, playerName: string): boolean {
  if (!actor) return false;
  if (actor.accountId && actor.accountId === searchedId) return true;
  return actor.name.trim().toLowerCase() === playerName.trim().toLowerCase();
}

function buildFriendlyLookup(match: MatchSummary, searchedId: string, playerName: string) {
  const teammateIds = new Set<string>();
  const teammateNames = new Set<string>();

  teammateIds.add(searchedId);
  teammateNames.add(playerName.trim().toLowerCase());

  for (const teammate of match.teammates) {
    if (teammate.accountId && teammate.accountId.trim().length > 0) {
      teammateIds.add(teammate.accountId.trim());
    }
    if (teammate.name && teammate.name.trim().length > 0) {
      teammateNames.add(teammate.name.trim().toLowerCase());
    }
  }

  return { teammateIds, teammateNames };
}

function isFriendlyCounterpart(
  actor: MatchKillActor | null,
  teammateIds: ReadonlySet<string>,
  teammateNames: ReadonlySet<string>
): boolean {
  if (!actor) return false;
  if (actor.accountId && teammateIds.has(actor.accountId)) return true;
  return teammateNames.has(actor.name.trim().toLowerCase());
}

function normalizeCounterpart(actor: MatchKillActor | null): { key: string; name: string; accountId: string | null } | null {
  if (!actor || actor.isBot || actor.actorType !== "player") return null;
  const key = buildEncounterKey({ accountId: actor.accountId, name: actor.name });
  if (!key) return null;

  return {
    key,
    name: actor.name?.trim() || "UNKNOWN",
    accountId: actor.accountId ?? null,
  };
}

export default function EncounterTrackerPanel({
  matches,
  accountId,
  playerName,
  platform = "steam",
  refreshToken,
}: EncounterTrackerPanelProps) {
  const { t } = useLanguage();
  const copy = t.encounters;
  const [killLogsByMatchId, setKillLogsByMatchId] = useState<Record<string, MatchKillLogEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const recentMatches = matches.slice(0, DETAIL_FETCH_LIMIT);

    async function loadEncounterDetails() {
      if (!accountId || recentMatches.length === 0) {
        setKillLogsByMatchId({});
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          recentMatches.map(async (match) => {
            const params = new URLSearchParams({
              matchId: match.id,
              accountId,
              platform: normalizePlatform(platform),
            });

            if (refreshToken === "true") {
              params.set("refresh", "true");
            }

            const response = await fetch(`/api/match-detail?${params.toString()}`, { cache: "no-store" });
            if (!response.ok) {
              throw new Error(`detail fetch failed: ${match.id}`);
            }

            const payload = (await response.json()) as MatchDetailPayload;
            return [match.id, Array.isArray(payload.killLogs) ? payload.killLogs : []] as const;
          })
        );

        if (cancelled) return;

        const nextState: Record<string, MatchKillLogEntry[]> = {};
        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          const [matchId, killLogs] = result.value;
          nextState[matchId] = killLogs;
        }

        setKillLogsByMatchId(nextState);
      } catch (fetchError) {
        if (cancelled) return;
        console.error("Encounter tracker failed to load match details:", fetchError);
        setError(copy.loadingSlow);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadEncounterDetails();
    return () => {
      cancelled = true;
    };
  }, [accountId, copy.loadingSlow, matches, platform, refreshToken]);

  const { rivals, familiars } = useMemo(() => {
    const encounterMap = new Map<string, EncounterRow>();

    const ensureEntry = (key: string, name: string, actorAccountId: string | null) => {
      const existing = encounterMap.get(key);
      if (existing) {
        if (!existing.accountId && actorAccountId) existing.accountId = actorAccountId;
        if (existing.name === "UNKNOWN" && name) existing.name = name;
        return existing;
      }

      const created: EncounterRow = {
        key,
        name,
        accountId: actorAccountId,
        matchCount: 0,
        killDeathCount: 0,
      };
      encounterMap.set(key, created);
      return created;
    };

    for (const match of matches) {
      const { teammateIds, teammateNames } = buildFriendlyLookup(match, accountId, playerName);
      const perMatchSeen = new Set<string>();
      const matchKillLogs = killLogsByMatchId[match.id] ?? [];

      for (const log of matchKillLogs) {
        const killer = normalizeCounterpart(log.killer);
        const victim = normalizeCounterpart(log.victim);

        if (killer && !isFriendlyCounterpart(log.killer, teammateIds, teammateNames)) {
          perMatchSeen.add(killer.key);
          ensureEntry(killer.key, killer.name, killer.accountId);
        }

        if (victim && !isFriendlyCounterpart(log.victim, teammateIds, teammateNames)) {
          perMatchSeen.add(victim.key);
          ensureEntry(victim.key, victim.name, victim.accountId);
        }

        const selfAsKiller = isSamePerson(log.killer, accountId, playerName);
        const selfAsVictim = isSamePerson(log.victim, accountId, playerName);
        if (!selfAsKiller && !selfAsVictim) continue;

        const counterpart = selfAsKiller ? victim : killer;
        const counterpartActor = selfAsKiller ? log.victim : log.killer;
        if (!counterpart || isFriendlyCounterpart(counterpartActor, teammateIds, teammateNames)) continue;

        const entry = ensureEntry(counterpart.key, counterpart.name, counterpart.accountId);
        entry.killDeathCount += 1;
      }

      for (const key of Array.from(perMatchSeen)) {
        const entry = encounterMap.get(key);
        if (!entry) continue;
        entry.matchCount += 1;
      }
    }

    const entries = Array.from(encounterMap.values());
    return {
      rivals: entries
        .filter((entry) => entry.killDeathCount >= 2)
        .sort((left, right) => right.killDeathCount - left.killDeathCount || right.matchCount - left.matchCount),
      familiars: entries
        .filter((entry) => entry.matchCount >= 2 && entry.killDeathCount === 0)
        .sort((left, right) => right.matchCount - left.matchCount || left.name.localeCompare(right.name)),
    };
  }, [accountId, killLogsByMatchId, matches, playerName]);

  const handleExportCSV = useCallback(() => {
    const sanitizeCsvValue = (value: string) => value.replace(/[\r\n,]+/g, " ").trim();
    const header = "구분,닉네임,함께한 매치 수,교전 횟수\n";
    const rivalsRows = rivals
      .map((entry) => `악연,${sanitizeCsvValue(entry.name)},${entry.matchCount},${entry.killDeathCount}\n`)
      .join("");
    const familiarsRows = familiars
      .map((entry) => `인연,${sanitizeCsvValue(entry.name)},${entry.matchCount},${entry.killDeathCount}\n`)
      .join("");

    const csvContent = `\uFEFF${header}${rivalsRows}${familiarsRows}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "WBZ_Encounters.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, [familiars, rivals]);

  const summaryText = useMemo(() => {
    if (loading) return copy.loading;
    return copy.recentBasis.replace("{{count}}", String(Math.min(matches.length, DETAIL_FETCH_LIMIT)));
  }, [copy.loading, copy.recentBasis, loading, matches.length]);

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/90 p-5 shadow-[0_24px_90px_-56px_rgba(0,0,0,0.75)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">{copy.title}</h2>
          <p className="text-xs text-zinc-500">{summaryText}</p>
        </div>
        <div className="flex items-center gap-2">
          {error ? <span className="text-[11px] text-amber-400">{error}</span> : null}
          <button
            type="button"
            onClick={handleExportCSV}
            className="rounded bg-green-600 px-3 py-1 text-sm font-bold text-white transition-colors hover:bg-green-500"
          >
            {copy.exportCsv}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <EncounterColumn
          title={copy.rivals}
          entries={rivals}
          emptyText={copy.noRivals}
          tone="red"
          formatter={(entry) => `${entry.killDeathCount}${copy.fought}`}
          platform={platform}
        />
        <EncounterColumn
          title={copy.familiars}
          entries={familiars}
          emptyText={copy.noFamiliars}
          tone="blue"
          formatter={(entry) => `${entry.matchCount}${copy.seen}`}
          platform={platform}
        />
      </div>
    </section>
  );
}

function EncounterColumn({
  title,
  entries,
  emptyText,
  tone,
  formatter,
  platform,
}: {
  title: string;
  entries: EncounterRow[];
  emptyText: string;
  tone: "red" | "blue";
  formatter: (entry: EncounterRow) => string;
  platform: PubgPlatformShard;
}) {
  const toneClass =
    tone === "red"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : "border-blue-500/30 bg-blue-500/10 text-blue-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="mb-3 text-sm font-black text-white">{title}</h3>
      <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-zinc-500">{emptyText}</div>
        ) : (
          entries.map((entry) => {
            const href =
              entry.accountId && entry.accountId.trim().length > 0
                ? `/profile/${encodeURIComponent(entry.name)}?platform=${platform}&id=${encodeURIComponent(entry.accountId)}`
                : `/profile/${encodeURIComponent(entry.name)}?platform=${platform}`;

            return (
              <Link
                key={entry.key}
                href={href}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors hover:bg-white/5 ${toneClass}`}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{entry.name}</div>
                </div>
                <div className="shrink-0 text-xs font-bold">{formatter(entry)}</div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
