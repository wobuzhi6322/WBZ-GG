export interface MapZoneLabel {
  name: string;
  xPercent: number;
  yPercent: number;
}

export const MAP_ZONE_LABELS: Record<string, MapZoneLabel[]> = {
  Baltic: [
    { name: "Georgopol", xPercent: 24, yPercent: 25 },
    { name: "Rozhok", xPercent: 45, yPercent: 35 },
    { name: "Pochinki", xPercent: 43, yPercent: 51 },
    { name: "School", xPercent: 53, yPercent: 49 },
    { name: "Yasnaya", xPercent: 67, yPercent: 30 },
    { name: "Mylta", xPercent: 77, yPercent: 58 },
    { name: "Primorsk", xPercent: 22, yPercent: 73 },
    { name: "Sosnovka", xPercent: 53, yPercent: 86 },
  ],
  Desert: [
    { name: "El Pozo", xPercent: 22, yPercent: 22 },
    { name: "San Martin", xPercent: 42, yPercent: 31 },
    { name: "Pecado", xPercent: 45, yPercent: 49 },
    { name: "Monte Nuevo", xPercent: 29, yPercent: 44 },
    { name: "Los Leones", xPercent: 77, yPercent: 73 },
    { name: "Impala", xPercent: 79, yPercent: 43 },
    { name: "Chumacera", xPercent: 21, yPercent: 69 },
    { name: "Puerto Paraiso", xPercent: 66, yPercent: 88 },
  ],
  Savage: [
    { name: "Paradise Resort", xPercent: 49, yPercent: 25 },
    { name: "Bootcamp", xPercent: 50, yPercent: 51 },
    { name: "Pai Nan", xPercent: 33, yPercent: 62 },
    { name: "Ruins", xPercent: 48, yPercent: 38 },
    { name: "Ha Tinh", xPercent: 20, yPercent: 33 },
    { name: "Sahmee", xPercent: 72, yPercent: 76 },
  ],
  DihorOtok: [
    { name: "Cosmodrome", xPercent: 50, yPercent: 20 },
    { name: "Castle", xPercent: 50, yPercent: 48 },
    { name: "Podvosto", xPercent: 80, yPercent: 41 },
    { name: "Volnova", xPercent: 19, yPercent: 55 },
    { name: "Villa", xPercent: 55, yPercent: 63 },
    { name: "Winery", xPercent: 34, yPercent: 74 },
  ],
  Tiger: [
    { name: "Army Base", xPercent: 48, yPercent: 10 },
    { name: "Yong Cheon", xPercent: 56, yPercent: 30 },
    { name: "Terminal", xPercent: 58, yPercent: 46 },
    { name: "Airport", xPercent: 87, yPercent: 30 },
    { name: "Kang Neung", xPercent: 79, yPercent: 58 },
    { name: "Song Am", xPercent: 51, yPercent: 90 },
  ],
  Kiki: [
    { name: "Ripton", xPercent: 58, yPercent: 44 },
    { name: "Arena", xPercent: 56, yPercent: 50 },
    { name: "Buxley", xPercent: 70, yPercent: 29 },
    { name: "Holston", xPercent: 29, yPercent: 35 },
    { name: "Turrita", xPercent: 80, yPercent: 66 },
    { name: "Los Arcos", xPercent: 29, yPercent: 73 },
  ],
  Chimera: [
    { name: "Laboratory", xPercent: 50, yPercent: 49 },
    { name: "Capaco", xPercent: 33, yPercent: 68 },
    { name: "Makalpa", xPercent: 67, yPercent: 58 },
  ],
  Summerland: [
    { name: "Al Habar", xPercent: 34, yPercent: 22 },
    { name: "Bashara", xPercent: 69, yPercent: 39 },
    { name: "Hadiqa Nemo", xPercent: 50, yPercent: 47 },
    { name: "Bahr Sahir", xPercent: 49, yPercent: 79 },
  ],
};
