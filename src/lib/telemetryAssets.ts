const DEFAULT_STATUS_ICON = "/images/icons/Death.png";

const STATUS_ICON_MAP: Record<string, string> = {
  headshot: "/images/icons/Headshot.png",
  dbno: "/images/icons/DBNO.png",
  death: DEFAULT_STATUS_ICON,
  bluezone: "/images/icons/Bluezone.png",
  fall: "/images/icons/Fall.png",
  roadkill: "/images/icons/Kill_Truck.png",
};

const WEAPON_ICON_ALIASES: Record<string, string> = {
  WeapAK47_C: "Item_Weapon_AK47_C",
  WeapAUG_C: "Item_Weapon_AUG_C",
  WeapAWM_C: "Item_Weapon_AWM_C",
  WeapBerylM762_C: "Item_Weapon_BerylM762_C",
  WeapBizonPP19_C: "Item_Weapon_BizonPP19_C",
  WeapCowbar_C: "Item_Weapon_Cowbar_C",
  WeapCrossbow_1_C: "Item_Weapon_Crossbow_C",
  WeapDesertEagle_C: "Item_Weapon_DesertEagle_C",
  WeapDP12_C: "Item_Weapon_DP12_C",
  WeapDP28_C: "Item_Weapon_DP28_C",
  WeapDragunov_C: "Item_Weapon_Dragunov_C",
  WeapFAMASG2_C: "Item_Weapon_FAMASG2_C",
  WeapFlareGun_C: "Item_Weapon_FlareGun_C",
  WeapFNFal_C: "Item_Weapon_FNFal_C",
  WeapG18_C: "Item_Weapon_G18_C",
  WeapG36C_C: "Item_Weapon_G36C_C",
  WeapGroza_C: "Item_Weapon_Groza_C",
  WeapHK416_C: "Item_Weapon_HK416_C",
  WeapK2_C: "Item_Weapon_K2_C",
  WeapKar98k_C: "Item_Weapon_Kar98k_C",
  WeapM16A4_C: "Item_Weapon_M16A4_C",
  WeapM1911_C: "Item_Weapon_M1911_C",
  WeapM24_C: "Item_Weapon_M24_C",
  WeapM249_C: "Item_Weapon_M249_C",
  WeapM9_C: "Item_Weapon_M9_C",
  WeapMachete_C: "Item_Weapon_Machete_C",
  WeapMG3_C: "Item_Weapon_MG3_C",
  WeapMini14_C: "Item_Weapon_Mini14_C",
  WeapMk12_C: "Item_Weapon_Mk12_C",
  WeapMk14_C: "Item_Weapon_Mk14_C",
  WeapMk47Mutant_C: "Item_Weapon_Mk47Mutant_C",
  WeapMosinNagant_C: "Item_Weapon_Mosin_C",
  WeapNagantM1895_C: "Item_Weapon_NagantM1895_C",
  WeapOriginS12_C: "Item_Weapon_OriginS12_C",
  WeapP90_C: "Item_Weapon_P90_C",
  WeapPan_C: "Item_Weapon_Pan_C",
  WeapPanzerFaust100M_C: "Item_Weapon_PanzerFaust100M_C",
  WeapQBU88_C: "Item_Weapon_QBU88_C",
  WeapQBZ95_C: "Item_Weapon_QBZ95_C",
  WeapRhino_C: "Item_Weapon_Rhino_C",
  WeapSaiga12_C: "Item_Weapon_Saiga12_C",
  WeapSawnoff_C: "Item_Weapon_Sawnoff_C",
  "WeapSCAR-L_C": "Item_Weapon_SCAR-L_C",
  WeapSickle_C: "Item_Weapon_Sickle_C",
  WeapSKS_C: "Item_Weapon_SKS_C",
  WeapThompson_C: "Item_Weapon_Thompson_C",
  WeapUMP_C: "Item_Weapon_UMP_C",
  WeapUZI_C: "Item_Weapon_UZI_C",
  WeapVector_C: "Item_Weapon_Vector_C",
  WeapVSS_C: "Item_Weapon_VSS_C",
  Weapvz61Skorpion_C: "Item_Weapon_vz61Skorpion_C",
  WeapWinchester_C: "Item_Weapon_Winchester_C",
  WeapWin94_C: "Item_Weapon_Win1894_C",
};

function normalizeWeaponIconId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return "";
  }

  if (WEAPON_ICON_ALIASES[trimmed]) {
    return WEAPON_ICON_ALIASES[trimmed];
  }

  if (trimmed.startsWith("Item_Weapon_")) {
    return trimmed.replace(/\.png$/i, "");
  }

  if (/^Weap.+_C$/i.test(trimmed)) {
    return `Item_Weapon_${trimmed.replace(/^Weap/i, "").replace(/\.png$/i, "")}`;
  }

  if (/^Weapon_.+_C$/i.test(trimmed)) {
    return `Item_${trimmed.replace(/\.png$/i, "")}`;
  }

  if (/^[A-Za-z0-9_-]+_C$/i.test(trimmed)) {
    return `Item_Weapon_${trimmed.replace(/\.png$/i, "")}`;
  }

  return trimmed.replace(/\.png$/i, "");
}

export function getIconPath(id?: string | null, type: "weapon" | "status" = "weapon"): string {
  if (!id) {
    return DEFAULT_STATUS_ICON;
  }

  if (type === "weapon") {
    const normalizedId = normalizeWeaponIconId(id);
    if (!normalizedId) {
      return DEFAULT_STATUS_ICON;
    }
    return `/images/weapons/${normalizedId}.png`;
  }

  return STATUS_ICON_MAP[id.toLowerCase()] || DEFAULT_STATUS_ICON;
}

const WEAPON_NAME_MAP: Record<string, string> = {
  "HK416": "M416",
  "BizonPP19": "PP-19 Bizon",
  "DP12": "DBS",
  "Dragunov": "Dragunov",
  "FAMASG2": "FAMAS",
  "FNFal": "SLR",
  "G18": "P18C",
  "NagantM1895": "R1895",
  "OriginS12": "O12",
  "PanzerFaust100M": "Panzerfaust",
  "QBU88": "QBU",
  "QBZ95": "QBZ",
  "Rhino": "R45",
  "Saiga12": "S12K",
  "Sawnoff": "Sawed-off",
  "Thompson": "Tommy Gun",
  "UMP": "UMP45",
  "UZI": "Micro UZI",
  "vz61Skorpion": "Skorpion",
  "Winchester": "S1897",
  "Win1894": "Win94",
  "L6": "Lynx AMR",
  "Cowbar": "Crowbar",
  "Mosin": "Mosin Nagant",
};

export function getWeaponInfo(damageCauser: string | null | undefined): { name: string; imagePath: string } {
  if (!damageCauser || damageCauser === "Unknown" || damageCauser === "-") {
    return { name: "알 수 없음", imagePath: DEFAULT_STATUS_ICON };
  }

  const normalizedId = normalizeWeaponIconId(damageCauser);
  if (!normalizedId) {
    return { name: "알 수 없음", imagePath: DEFAULT_STATUS_ICON };
  }

  let inferredName = normalizedId
    .replace(/^Item_Weapon_/i, "")
    .replace(/^Weap/i, "")
    .replace(/_C$/i, "")
    .trim();

  if (WEAPON_NAME_MAP[inferredName]) {
    inferredName = WEAPON_NAME_MAP[inferredName];
  }

  return {
    name: inferredName || "알 수 없음",
    imagePath: `/images/weapons/${normalizedId}.png`,
  };
}

export function getRelationColor(
  accountId: string | null | undefined,
  searchedId: string | null | undefined,
  teammates: ReadonlySet<string> | readonly string[],
): string {
  if (accountId && searchedId && accountId === searchedId) {
    return "#FBBF24";
  }

  const isTeammate = accountId
    ? Array.isArray(teammates)
      ? teammates.includes(accountId)
      : (teammates as ReadonlySet<string>).has(accountId)
    : false;

  if (isTeammate) {
    return "#22D3EE";
  }

  return "#EF4444";
}

