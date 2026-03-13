import type { LanguageType } from "@/data/locales";

export interface MatchHistoryUi {
  noRecent: string;
  noFiltered: string;
  pageInfo: string;
  pageSize: string;
  prev: string;
  next: string;
  detailTitle: string;
  loadingTelemetry: string;
  noDetail: string;
  teamTitle: string;
  soloNotice: string;
  teamMembers: string;
  teamKills: string;
  teamDamage: string;
  firstCombat: string;
  botKills: string;
  playerKills: string;
  unknownKills: string;
  events: string;
  memberUnit: string;
  ace: string;
  myDeathLog: string;
  unknown: string;
  pause: string;
  play: string;
  selectedEvent: string;
  mapOptions: string;
  bluezone: string;
  route: string;
  allLog: string;
  myCombat: string;
  myKills: string;
  myDeaths: string;
  noLogs: string;
  weaponUsage: string;
  noWeaponLogs: string;
  hitZone: string;
  noLocationLogs: string;
  mapOverlayUnsupported: string;
  miniMapZoomOut: string;
  miniMapZoomIn: string;
  miniMapGuide: string;
  zoneLabels: {
    NW: string;
    NE: string;
    SW: string;
    SE: string;
  };
}

const UI_BY_LANGUAGE: Record<LanguageType, MatchHistoryUi> = {
  ko: {
    noRecent: "최근 매치 기록이 없습니다.",
    noFiltered: "현재 필터 조건과 일치하는 매치가 없습니다.",
    pageInfo: "최근 6개월 전적",
    pageSize: "페이지당 표시",
    prev: "이전",
    next: "다음",
    detailTitle: "상세 전적",
    loadingTelemetry: "매치 텔레메트리 분석 중...",
    noDetail: "매치 상세 데이터가 없습니다.",
    teamTitle: "함께한 플레이어",
    soloNotice: "솔로 매치이거나 팀원 정보가 없습니다.",
    teamMembers: "팀 인원",
    teamKills: "팀 총킬",
    teamDamage: "팀 총딜",
    firstCombat: "첫 교전",
    botKills: "봇 킬",
    playerKills: "유저 킬",
    unknownKills: "미확인 킬",
    events: "이벤트",
    memberUnit: "명",
    ace: "에이스",
    myDeathLog: "내 사망 로그",
    unknown: "알 수 없음",
    pause: "일시정지",
    play: "재생",
    selectedEvent: "선택 이벤트",
    mapOptions: "맵 오버레이 옵션",
    bluezone: "블루존",
    route: "이동 경로",
    allLog: "전체",
    myCombat: "내 교전",
    myKills: "내 킬",
    myDeaths: "내 데스",
    noLogs: "해당 조건의 로그가 없습니다.",
    weaponUsage: "무기 사용 빈도",
    noWeaponLogs: "무기 로그가 없습니다.",
    hitZone: "교전 구역",
    noLocationLogs: "위치 로그가 없습니다.",
    mapOverlayUnsupported: "현재 맵은 상세 오버레이를 지원하지 않습니다.",
    miniMapZoomOut: "미니맵 축소",
    miniMapZoomIn: "미니맵 확대",
    miniMapGuide: "휠로 확대/축소, 드래그로 이동",
    zoneLabels: { NW: "북서", NE: "북동", SW: "남서", SE: "남동" },
  },
  en: {
    noRecent: "No recent match history.",
    noFiltered: "No matches match the current filter.",
    pageInfo: "last 6 months",
    pageSize: "Per Page",
    prev: "Prev",
    next: "Next",
    detailTitle: "Match Detail",
    loadingTelemetry: "Analyzing match telemetry...",
    noDetail: "No match detail data.",
    teamTitle: "Teammates",
    soloNotice: "Solo match or no teammate information.",
    teamMembers: "Members",
    teamKills: "Team Kills",
    teamDamage: "Team Damage",
    firstCombat: "First Combat",
    botKills: "Bot Kills",
    playerKills: "Player Kills",
    unknownKills: "Unknown Kills",
    events: "Events",
    memberUnit: "",
    ace: "Ace",
    myDeathLog: "My Death Log",
    unknown: "Unknown",
    pause: "Pause",
    play: "Play",
    selectedEvent: "Selected Event",
    mapOptions: "Map Overlay Options",
    bluezone: "Bluezone",
    route: "Route",
    allLog: "All",
    myCombat: "My Combat",
    myKills: "My Kills",
    myDeaths: "My Deaths",
    noLogs: "No logs for this filter.",
    weaponUsage: "Weapon Usage",
    noWeaponLogs: "No weapon logs.",
    hitZone: "Combat Zone",
    noLocationLogs: "No location logs.",
    mapOverlayUnsupported: "This map does not support detailed overlay.",
    miniMapZoomOut: "Minimap zoom out",
    miniMapZoomIn: "Minimap zoom in",
    miniMapGuide: "Wheel zoom / drag to move",
    zoneLabels: { NW: "North-West", NE: "North-East", SW: "South-West", SE: "South-East" },
  },
  ja: {
    noRecent: "最近のマッチ履歴がありません。",
    noFiltered: "現在のフィルター条件に一致するマッチがありません。",
    pageInfo: "直近6か月の戦績",
    pageSize: "表示件数",
    prev: "前へ",
    next: "次へ",
    detailTitle: "詳細戦績",
    loadingTelemetry: "マッチのテレメトリを分析中...",
    noDetail: "マッチ詳細データがありません。",
    teamTitle: "一緒にプレイしたメンバー",
    soloNotice: "ソロマッチ、またはチーム情報がありません。",
    teamMembers: "チーム人数",
    teamKills: "チームキル",
    teamDamage: "チームダメージ",
    firstCombat: "初交戦",
    botKills: "Botキル",
    playerKills: "プレイヤーキル",
    unknownKills: "不明キル",
    events: "イベント",
    memberUnit: "人",
    ace: "ACE",
    myDeathLog: "自分のデスログ",
    unknown: "不明",
    pause: "一時停止",
    play: "再生",
    selectedEvent: "選択したイベント",
    mapOptions: "マップ表示オプション",
    bluezone: "ブルーゾーン",
    route: "移動ルート",
    allLog: "全体",
    myCombat: "自分の交戦",
    myKills: "自分のキル",
    myDeaths: "自分のデス",
    noLogs: "該当条件のログがありません。",
    weaponUsage: "武器使用頻度",
    noWeaponLogs: "武器ログがありません。",
    hitZone: "交戦エリア",
    noLocationLogs: "位置ログがありません。",
    mapOverlayUnsupported: "このマップは詳細オーバーレイに対応していません。",
    miniMapZoomOut: "ミニマップ縮小",
    miniMapZoomIn: "ミニマップ拡大",
    miniMapGuide: "ホイールで拡大/縮小、ドラッグで移動",
    zoneLabels: { NW: "北西", NE: "北東", SW: "南西", SE: "南東" },
  },
  zh: {
    noRecent: "暂无最近比赛记录。",
    noFiltered: "没有符合当前筛选条件的比赛。",
    pageInfo: "最近6个月战绩",
    pageSize: "每页显示",
    prev: "上一页",
    next: "下一页",
    detailTitle: "详细战绩",
    loadingTelemetry: "正在分析比赛遥测数据...",
    noDetail: "没有比赛详细数据。",
    teamTitle: "一起游玩的队友",
    soloNotice: "单排比赛或没有队友信息。",
    teamMembers: "队伍人数",
    teamKills: "队伍总击杀",
    teamDamage: "队伍总伤害",
    firstCombat: "首次交战",
    botKills: "机器人击杀",
    playerKills: "玩家击杀",
    unknownKills: "未知击杀",
    events: "事件",
    memberUnit: "人",
    ace: "ACE",
    myDeathLog: "我的死亡记录",
    unknown: "未知",
    pause: "暂停",
    play: "播放",
    selectedEvent: "选中事件",
    mapOptions: "地图图层选项",
    bluezone: "蓝圈",
    route: "移动路线",
    allLog: "全部",
    myCombat: "我的交战",
    myKills: "我的击杀",
    myDeaths: "我的死亡",
    noLogs: "没有符合条件的日志。",
    weaponUsage: "武器使用频率",
    noWeaponLogs: "没有武器日志。",
    hitZone: "交战区域",
    noLocationLogs: "没有位置日志。",
    mapOverlayUnsupported: "当前地图不支持详细图层。",
    miniMapZoomOut: "缩小小地图",
    miniMapZoomIn: "放大小地图",
    miniMapGuide: "滚轮缩放 / 拖拽移动",
    zoneLabels: { NW: "西北", NE: "东北", SW: "西南", SE: "东南" },
  },
};

export function getMatchHistoryUi(language: LanguageType): MatchHistoryUi {
  return UI_BY_LANGUAGE[language] ?? UI_BY_LANGUAGE.ko;
}
