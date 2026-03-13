export interface WeaponAssetCandidates {
  detail: string | null;
  fallback: string | null;
}

const WEAPON_ASSET_MAP: Record<string, string> = {
  ace32: "Item_Weapon_ACE32_C",
  ak47: "Item_Weapon_AK47_C",
  akm: "Item_Weapon_AK47_C",
  aug: "Item_Weapon_AUG_C",
  auga3: "Item_Weapon_AUG_C",
  awm: "Item_Weapon_AWM_C",
  s686: "Item_Weapon_Berreta686_C",
  berretta686: "Item_Weapon_Berreta686_C",
  berylm762: "Item_Weapon_BerylM762_C",
  beryl: "Item_Weapon_BerylM762_C",
  m762: "Item_Weapon_BerylM762_C",
  bizonpp19: "Item_Weapon_BizonPP19_C",
  pp19bizon: "Item_Weapon_BizonPP19_C",
  bizon: "Item_Weapon_BizonPP19_C",
  crossbow: "Item_Weapon_Crossbow_C",
  dbs: "Item_Weapon_DP12_C",
  dp12: "Item_Weapon_DP12_C",
  dp28: "Item_Weapon_DP28_C",
  dragunov: "Item_Weapon_Dragunov_C",
  famasg2: "Item_Weapon_FAMASG2_C",
  famas: "Item_Weapon_FAMASG2_C",
  fnfal: "Item_Weapon_FNFAL_C",
  slr: "Item_Weapon_FNFAL_C",
  g36c: "Item_Weapon_G36C_C",
  groza: "Item_Weapon_GROZA_C",
  hk416: "Item_Weapon_HK416_C",
  m416: "Item_Weapon_HK416_C",
  k2: "Item_Weapon_K2_C",
  kar98k: "Item_Weapon_Kar98k_C",
  lynxamr: "Item_Weapon_L6_C",
  lynx: "Item_Weapon_L6_C",
  l6: "Item_Weapon_L6_C",
  m16a4: "Item_Weapon_M16A4_C",
  m249: "Item_Weapon_M249_C",
  m24: "Item_Weapon_M24_C",
  mg3: "Item_Weapon_MG3_C",
  mini14: "Item_Weapon_Mini14_C",
  mk12: "Item_Weapon_Mk12_C",
  mk14: "Item_Weapon_Mk14_C",
  mutant: "Item_Weapon_Mk47Mutant_C",
  mk47mutant: "Item_Weapon_Mk47Mutant_C",
  mosin: "Item_Weapon_Mosin_C",
  mosinnagant: "Item_Weapon_Mosin_C",
  mp5k: "Item_Weapon_MP5K_C",
  mp9: "Item_Weapon_MP9_C",
  origins12: "Item_Weapon_OriginS12_C",
  origins12shotgun: "Item_Weapon_OriginS12_C",
  o12: "Item_Weapon_OriginS12_C",
  p90: "Item_Weapon_P90_C",
  panzerfaust: "Item_Weapon_PanzerFaust100M_C",
  qbu: "Item_Weapon_QBU88_C",
  qbu88: "Item_Weapon_QBU88_C",
  qbz: "Item_Weapon_QBZ95_C",
  qbz95: "Item_Weapon_QBZ95_C",
  s12k: "Item_Weapon_Saiga12_C",
  saiga12: "Item_Weapon_Saiga12_C",
  scarl: "Item_Weapon_SCAR-L_C",
  scarl556: "Item_Weapon_SCAR-L_C",
  scar: "Item_Weapon_SCAR-L_C",
  sks: "Item_Weapon_SKS_C",
  tommygun: "Item_Weapon_Thompson_C",
  thompson: "Item_Weapon_Thompson_C",
  ump: "Item_Weapon_UMP_C",
  ump45: "Item_Weapon_UMP_C",
  microuzi: "Item_Weapon_UZI_C",
  uzi: "Item_Weapon_UZI_C",
  vector: "Item_Weapon_Vector_C",
  vss: "Item_Weapon_VSS_C",
  win94: "Item_Weapon_Win1894_C",
  win1894: "Item_Weapon_Win1894_C",
  winchester: "Item_Weapon_Winchester_C",
};

function normalizeWeaponToken(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function resolveWeaponAssetBaseName(weaponName?: string | null, weaponKey?: string | null): string | null {
  const candidates = [weaponKey, weaponName]
    .map((value) => normalizeWeaponToken(value))
    .filter(Boolean);

  for (const candidate of candidates) {
    if (WEAPON_ASSET_MAP[candidate]) return WEAPON_ASSET_MAP[candidate];
  }

  return null;
}

export function getWeaponDetailImage(weaponName?: string | null, weaponKey?: string | null): string | null {
  const baseName = resolveWeaponAssetBaseName(weaponName, weaponKey);
  return baseName ? `/images/weapons_detail/${baseName}_h.png` : null;
}

export function getWeaponFallbackImage(weaponName?: string | null, weaponKey?: string | null): string | null {
  const baseName = resolveWeaponAssetBaseName(weaponName, weaponKey);
  return baseName ? `/images/weapons/${baseName}.png` : null;
}

export function getWeaponImageCandidates(weaponName?: string | null, weaponKey?: string | null): WeaponAssetCandidates {
  return {
    detail: getWeaponDetailImage(weaponName, weaponKey),
    fallback: getWeaponFallbackImage(weaponName, weaponKey),
  };
}
