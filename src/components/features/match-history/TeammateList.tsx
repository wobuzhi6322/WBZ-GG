import { useLanguage } from "@/context/LanguageContext";
import type { LineupMember, MatchBotStatsItem, PlatformType } from "@/components/features/match-history/types";
import { buildPlayerProfileHref, resolvePlayerBotKills } from "@/components/features/match-history/utils";

interface TeammateListProps {
  matchId: string;
  members: LineupMember[];
  hiddenMemberCount: number;
  botStats: MatchBotStatsItem | null;
  accountId?: string;
  playerName?: string;
  platform: PlatformType;
}

export function TeammateList({
  matchId,
  members,
  hiddenMemberCount,
  botStats,
  accountId,
  playerName,
  platform,
}: TeammateListProps) {
  const { language } = useLanguage();

  if (members.length === 0) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {language === "en"
          ? "No teammate info"
          : language === "ja"
            ? "チーム情報なし"
            : language === "zh"
              ? "无队友信息"
              : "팀원 정보 없음"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {members.map((member) => {
        const memberBotKills = member.isSelf
          ? resolvePlayerBotKills(botStats, accountId, member.name) ?? botStats?.botKills ?? null
          : resolvePlayerBotKills(botStats, member.accountId, member.name);
        const isMe =
          member.isSelf ||
          (accountId && member.accountId && accountId === member.accountId) ||
          (!!playerName && member.name.toLowerCase() === playerName.toLowerCase());

        return (
          <a
            key={`${matchId}-member-${member.accountId ?? member.name}`}
            href={buildPlayerProfileHref(member.name, platform)}
            className="min-w-0 text-[11px] leading-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 truncate"
            title={
              language === "en"
                ? `View ${member.name} profile`
                : language === "ja"
                  ? `${member.name} の戦績を見る`
                  : language === "zh"
                    ? `查看 ${member.name} 战绩`
                    : `${member.name} 전적 보기`
            }
          >
            <span className={`truncate ${isMe ? "font-bold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
              {member.name}
            </span>{" "}
            <span className="text-gray-500 dark:text-gray-400">
              {formatMemberStat(language, member.kills, memberBotKills)}
            </span>
          </a>
        );
      })}
      {hiddenMemberCount > 0 ? (
        <div className="text-[10px] text-gray-500 dark:text-gray-400">+{hiddenMemberCount}</div>
      ) : null}
    </div>
  );
}

function formatMemberStat(
  language: "ko" | "en" | "ja" | "zh",
  kills: number,
  botKills: number | null
): string {
  if (language === "en") {
    return `${kills}K (Bot ${botKills && botKills > 0 ? botKills : "X"})`;
  }
  if (language === "ja") {
    return `${kills}キル(ボット${botKills && botKills > 0 ? botKills : "X"})`;
  }
  if (language === "zh") {
    return `${kills}杀(机器人${botKills && botKills > 0 ? botKills : "X"})`;
  }
  return `${kills}킬(봇${botKills && botKills > 0 ? botKills : "X"})`;
}
