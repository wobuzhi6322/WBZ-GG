export interface MapIntelDefinition {
  id: string;
  nameKo: string;
  nameEn: string;
  sizeKm: number;
  imageUrl: string;
  previewImageUrl: string;
  tileBaseUrl: string;
  tileMinZoom: number;
  tileMaxZoom: number;
  projection: {
    width: number;
    height: number;
    sizeScale: number;
    adjustX: number;
    adjustY: number;
  };
}

export const MAP_INTEL_MAPS: MapIntelDefinition[] = [
  {
    id: "Baltic",
    nameKo: "에란겔",
    nameEn: "Erangel",
    sizeKm: 8,
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/590dba7.webp",
    previewImageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/590dba7.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Baltic/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8192,
      height: 8192,
      sizeScale: 1,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Desert",
    nameKo: "미라마",
    nameEn: "Miramar",
    sizeKm: 8,
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/24a088e.webp",
    previewImageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/24a088e.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Desert/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 1,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Savage",
    nameKo: "사녹",
    nameEn: "Sanhok",
    sizeKm: 4,
    imageUrl: "https://battlegrounds.party/map/map/Savage/tiles/0/0/0.webp",
    previewImageUrl: "https://battlegrounds.party/map/map/Savage/tiles/0/0/0.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Savage/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 0.5,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "DihorOtok",
    nameKo: "비켄디",
    nameEn: "Vikendi",
    sizeKm: 8,
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/d1080a6.webp",
    previewImageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/d1080a6.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/DihorOtok/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 1,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Tiger",
    nameKo: "태이고",
    nameEn: "Taego",
    sizeKm: 8,
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp",
    previewImageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/19581ee.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Tiger/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 1,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Kiki",
    nameKo: "데스턴",
    nameEn: "Deston",
    sizeKm: 8,
    imageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/e2bdf1e.webp",
    previewImageUrl: "https://wstatic-prod.pubg.com/web/live/main_7e1f0ba/img/e2bdf1e.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Kiki/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 1,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Chimera",
    nameKo: "파라모",
    nameEn: "Paramo",
    sizeKm: 3,
    imageUrl: "https://battlegrounds.party/map/map/Chimera/tiles/0/0/0.webp",
    previewImageUrl: "https://battlegrounds.party/map/map/Chimera/tiles/0/0/0.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Chimera/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 0.375,
      adjustX: 0,
      adjustY: 0,
    },
  },
  {
    id: "Summerland",
    nameKo: "카라킨",
    nameEn: "Karakin",
    sizeKm: 2,
    imageUrl: "https://battlegrounds.party/map/map/Summerland/tiles/0/0/0.webp",
    previewImageUrl: "https://battlegrounds.party/map/map/Summerland/tiles/0/0/0.webp",
    tileBaseUrl: "https://battlegrounds.party/map/map/Summerland/tiles",
    tileMinZoom: 3,
    tileMaxZoom: 5,
    projection: {
      width: 8160,
      height: 8160,
      sizeScale: 0.25,
      adjustX: 0,
      adjustY: 0,
    },
  },
];

export function getMapIntelDefinition(mapId: string): MapIntelDefinition | null {
  return MAP_INTEL_MAPS.find((map) => map.id === mapId) ?? null;
}
