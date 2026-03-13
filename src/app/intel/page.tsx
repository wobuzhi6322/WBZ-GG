"use client";
/* eslint-disable @next/next/no-img-element */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import { MAP_INTEL_MAPS, MapIntelDefinition } from "@/data/mapIntelMaps";
import { MAP_ZONE_LABELS } from "@/data/mapZoneLabels";

interface MapIntelPoint {
  id: string;
  sourceGroup: string;
  xPercent: number;
  yPercent: number;
  xMeter: number;
  yMeter: number;
}

interface MapIntelCategory {
  key: "fixedVehicles" | "spawnVehicles" | "boats" | "secretRooms" | "gliders";
  labelKo: string;
  count: number;
  points: MapIntelPoint[];
}

interface MapIntelResponse {
  source: string;
  sourceBuildId?: string;
  fetchedAt: string;
  map: {
    id: string;
    nameKo: string;
    nameEn: string;
    sizeKm: number;
    imageUrl: string;
  };
  categories: {
    fixedVehicles: MapIntelCategory;
    spawnVehicles: MapIntelCategory;
    boats: MapIntelCategory;
    secretRooms: MapIntelCategory;
    gliders: MapIntelCategory;
  };
}

interface DrawPoint {
  xPercent: number;
  yPercent: number;
}

interface DropZone {
  id: string;
  pinId: string;
  center: DrawPoint;
  radiusMeters: number;
}

const DROP_RADIUS_PRESETS = [100, 200, 300, 400, 500, 600, 700, 800, 1000, 1100, 1200, 1250];
const WHEEL_ZOOM_FACTOR = 1.15;
const BUTTON_ZOOM_IN_FACTOR = 1.25;
const BUTTON_ZOOM_OUT_FACTOR = 0.8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toWorldMeters(point: DrawPoint, map: MapIntelDefinition): { x: number; y: number } {
  const { width, height, sizeScale, adjustX, adjustY } = map.projection;

  const mapX = (point.xPercent / 100) * width;
  const mapY = (point.yPercent / 100) * height;

  const xMeters = (mapX - adjustX) * sizeScale;
  const yMeters = (height - mapY - adjustY) * sizeScale;

  return { x: xMeters, y: yMeters };
}

function distanceMeters(from: DrawPoint, to: DrawPoint, map: MapIntelDefinition): number {
  const a = toWorldMeters(from, map);
  const b = toWorldMeters(to, map);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function formatFetchedAt(value: string, locale: "ko-KR" | "en-US"): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getGridRef(point: DrawPoint, gridCells: number): string {
  const safeCells = Math.max(1, gridCells);
  const step = 100 / safeCells;
  const col = clamp(Math.floor(point.xPercent / step), 0, safeCells - 1);
  const row = clamp(Math.floor(point.yPercent / step), 0, safeCells - 1);

  const letterCode = 65 + col;
  const letter = letterCode <= 90 ? String.fromCharCode(letterCode) : `A${String.fromCharCode(65 + (col % 26))}`;
  return `${letter}${row + 1}`;
}

function radiusMetersToPercent(radiusMeters: number, sizeKm: number): number {
  const mapMeters = Math.max(1, sizeKm * 1000);
  return clamp((radiusMeters / mapMeters) * 100, 0, 100);
}

function clampPanOffset(
  panX: number,
  panY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  if (zoom <= 1 || viewportWidth <= 0 || viewportHeight <= 0) {
    return { x: 0, y: 0 };
  }

  const maxX = (viewportWidth * (zoom - 1)) / 2;
  const maxY = (viewportHeight * (zoom - 1)) / 2;

  return {
    x: clamp(panX, -maxX, maxX),
    y: clamp(panY, -maxY, maxY),
  };
}

function resolveTileZoom(map: MapIntelDefinition, zoomLevel: number): number {
  const minZoom = map.tileMinZoom;
  const maxZoom = map.tileMaxZoom;
  if (maxZoom <= minZoom) return minZoom;

  const zoomStep = Math.floor(Math.log2(Math.max(1, zoomLevel)));
  return clamp(minZoom + zoomStep, minZoom, maxZoom);
}

function resolveMaxUiZoom(map: MapIntelDefinition): number {
  const zoomSpan = Math.max(0, map.tileMaxZoom - map.tileMinZoom);
  return Math.max(2, 2 ** zoomSpan);
}

export default function IntelPage() {
  const { language, t } = useLanguage();
  const locale = language === "ko" ? "ko-KR" : "en-US";
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const [mapViewportEl, setMapViewportEl] = useState<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const suppressClickRef = useRef(false);

  const [selectedMapId, setSelectedMapId] = useState<string>(MAP_INTEL_MAPS[0].id);
  const [payload, setPayload] = useState<MapIntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const showFixedVehicles = false;
  const showSpawnVehicles = false;
  const showBoats = false;
  const showSecretRooms = false;
  const showGliders = false;
  const [showGrid, setShowGrid] = useState(true);
  const [showZoneLabels, setShowZoneLabels] = useState(true);
  const [showFlightPath, setShowFlightPath] = useState(false);
  const [showDistanceMeasure, setShowDistanceMeasure] = useState(false);
  const [showDropPlanner, setShowDropPlanner] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [dropOpacityPercent, setDropOpacityPercent] = useState(30);

  const [flightPathStart, setFlightPathStart] = useState<DrawPoint | null>(null);
  const [flightPathEnd, setFlightPathEnd] = useState<DrawPoint | null>(null);
  const [measurePoints, setMeasurePoints] = useState<DrawPoint[]>([]);
  const [cursorPoint, setCursorPoint] = useState<DrawPoint | null>(null);
  const [dropZones, setDropZones] = useState<DropZone[]>([]);
  const [selectedDropRadii, setSelectedDropRadii] = useState<number[]>([700, 800, 1000, 1100, 1200]);
  const [dropConfigError, setDropConfigError] = useState("");

  const zoomLevelRef = useRef(zoomLevel);
  const panOffsetRef = useRef(panOffset);

  const setMapViewportNode = useCallback((node: HTMLDivElement | null) => {
    mapViewportRef.current = node;
    setMapViewportEl(node);
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setViewportSize({ width: rect.width, height: rect.height });
  }, []);

  const selectedMapDefinition = useMemo(() => {
    return MAP_INTEL_MAPS.find((map) => map.id === selectedMapId) ?? MAP_INTEL_MAPS[0];
  }, [selectedMapId]);
  const maxZoomLevel = useMemo(() => resolveMaxUiZoom(selectedMapDefinition), [selectedMapDefinition]);

  const gridCells = useMemo(() => Math.max(2, Math.round(selectedMapDefinition.sizeKm)), [selectedMapDefinition.sizeKm]);

  const text = t.mapIntel;

  const fetchMapIntel = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/map-intel?mapId=${encodeURIComponent(selectedMapId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch map intel: ${response.status}`);
      }

      const data = (await response.json()) as MapIntelResponse;
      setPayload(data);
    } catch (fetchError) {
      console.error(fetchError);
      setPayload(null);
      setError(text.refreshError);
    } finally {
      setLoading(false);
    }
  }, [selectedMapId, text.refreshError]);

  useEffect(() => {
    fetchMapIntel();
  }, [fetchMapIntel]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    setFlightPathStart(null);
    setFlightPathEnd(null);
    setMeasurePoints([]);
    setCursorPoint(null);
    setDropZones([]);
    setDropConfigError("");
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    zoomLevelRef.current = 1;
    panOffsetRef.current = { x: 0, y: 0 };
    setIsDraggingMap(false);
    dragStateRef.current.active = false;
    dragStateRef.current.moved = false;
    suppressClickRef.current = false;
  }, [selectedMapId]);

  const visibleLayers = useMemo(() => {
    if (!payload) return [];

    const layers: Array<MapIntelCategory & { color: string; keyName: string }> = [];

    return layers;
  }, [payload]);

  const zoneLabels = useMemo(() => MAP_ZONE_LABELS[selectedMapId] ?? [], [selectedMapId]);

  const tileZoom = useMemo(() => resolveTileZoom(selectedMapDefinition, zoomLevel), [selectedMapDefinition, zoomLevel]);

  const tileCount = useMemo(() => 2 ** tileZoom, [tileZoom]);

  const visibleTileBounds = useMemo(() => {
    if (tileCount <= 0) {
      return { startX: 0, endX: 0, startY: 0, endY: 0 };
    }

    if (viewportSize.width <= 0 || viewportSize.height <= 0) {
      return {
        startX: 0,
        endX: Math.max(0, tileCount - 1),
        startY: 0,
        endY: Math.max(0, tileCount - 1),
      };
    }

    const width = viewportSize.width;
    const height = viewportSize.height;

    const worldLeft = (0 - panOffset.x - width / 2) / zoomLevel + width / 2;
    const worldRight = (width - panOffset.x - width / 2) / zoomLevel + width / 2;
    const worldTop = (0 - panOffset.y - height / 2) / zoomLevel + height / 2;
    const worldBottom = (height - panOffset.y - height / 2) / zoomLevel + height / 2;

    const minXPercent = clamp((Math.min(worldLeft, worldRight) / width) * 100, 0, 100);
    const maxXPercent = clamp((Math.max(worldLeft, worldRight) / width) * 100, 0, 100);
    const minYPercent = clamp((Math.min(worldTop, worldBottom) / height) * 100, 0, 100);
    const maxYPercent = clamp((Math.max(worldTop, worldBottom) / height) * 100, 0, 100);

    const startX = Math.max(0, Math.floor((minXPercent / 100) * tileCount) - 1);
    const endX = Math.min(tileCount - 1, Math.ceil((maxXPercent / 100) * tileCount) + 1);
    const startY = Math.max(0, Math.floor((minYPercent / 100) * tileCount) - 1);
    const endY = Math.min(tileCount - 1, Math.ceil((maxYPercent / 100) * tileCount) + 1);

    return { startX, endX, startY, endY };
  }, [tileCount, viewportSize, panOffset, zoomLevel]);

  const visibleTiles = useMemo(() => {
    if (tileCount <= 0) return [];

    const tileSize = 100 / tileCount;
    const items: Array<{ key: string; left: number; top: number; size: number; url: string }> = [];

    for (let y = visibleTileBounds.startY; y <= visibleTileBounds.endY; y += 1) {
      for (let x = visibleTileBounds.startX; x <= visibleTileBounds.endX; x += 1) {
        items.push({
          key: `${tileZoom}-${x}-${y}`,
          left: x * tileSize,
          top: y * tileSize,
          size: tileSize,
          url: `${selectedMapDefinition.tileBaseUrl}/${tileZoom}/${x}/${y}.webp`,
        });
      }
    }

    return items;
  }, [tileCount, visibleTileBounds, selectedMapDefinition.tileBaseUrl, tileZoom]);

  const flightDistanceKm = useMemo(() => {
    if (!flightPathStart || !flightPathEnd) return 0;
    const distance = distanceMeters(flightPathStart, flightPathEnd, selectedMapDefinition);
    return distance / 1000;
  }, [flightPathStart, flightPathEnd, selectedMapDefinition]);

  const measuredDistanceKm = useMemo(() => {
    if (measurePoints.length < 2) return 0;

    let sum = 0;
    for (let index = 1; index < measurePoints.length; index += 1) {
      sum += distanceMeters(measurePoints[index - 1], measurePoints[index], selectedMapDefinition);
    }
    return sum / 1000;
  }, [measurePoints, selectedMapDefinition]);

  const flightLine = useMemo(() => {
    if (!flightPathStart || !flightPathEnd) return "";
    return `${flightPathStart.xPercent},${flightPathStart.yPercent} ${flightPathEnd.xPercent},${flightPathEnd.yPercent}`;
  }, [flightPathStart, flightPathEnd]);

  const measurePolyline = useMemo(() => {
    return measurePoints.map((point) => `${point.xPercent},${point.yPercent}`).join(" ");
  }, [measurePoints]);

  const gridLinePercents = useMemo(() => {
    return Array.from({ length: gridCells + 1 }, (_, index) => (index / gridCells) * 100);
  }, [gridCells]);

  const minorGridCells = useMemo(() => {
    return Math.max(10, Math.round(selectedMapDefinition.sizeKm * 10));
  }, [selectedMapDefinition.sizeKm]);

  const minorGridLinePercents = useMemo(() => {
    return Array.from({ length: minorGridCells + 1 }, (_, index) => (index / minorGridCells) * 100);
  }, [minorGridCells]);

  const majorStepInMinor = useMemo(() => {
    return Math.max(1, Math.round(minorGridCells / Math.max(1, gridCells)));
  }, [minorGridCells, gridCells]);

  const onlyMinorGridLinePercents = useMemo(() => {
    return minorGridLinePercents.filter((_, index) => index % majorStepInMinor !== 0);
  }, [minorGridLinePercents, majorStepInMinor]);

  const getPercentFromPointer = (event: React.MouseEvent<HTMLDivElement>): DrawPoint | null => {
    if (!mapViewportRef.current) return null;

    const rect = mapViewportRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const zoom = zoomLevelRef.current;
    const pan = panOffsetRef.current;
    const xInViewport = clamp(event.clientX - rect.left, 0, rect.width);
    const yInViewport = clamp(event.clientY - rect.top, 0, rect.height);

    const worldX = (xInViewport - pan.x - rect.width / 2) / zoom + rect.width / 2;
    const worldY = (yInViewport - pan.y - rect.height / 2) / zoom + rect.height / 2;
    const xPercent = clamp((worldX / rect.width) * 100, 0, 100);
    const yPercent = clamp((worldY / rect.height) * 100, 0, 100);

    return { xPercent, yPercent };
  };

  const applyZoom = useCallback((factor: number, anchor?: { clientX: number; clientY: number }) => {
    const viewport = mapViewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const prevZoom = zoomLevelRef.current;
    const nextZoom = clamp(Number((prevZoom * factor).toFixed(4)), 1, maxZoomLevel);
    if (nextZoom === prevZoom) return;

    const prevPan = panOffsetRef.current;
    let nextPan = clampPanOffset(prevPan.x, prevPan.y, nextZoom, rect.width, rect.height);

    // Keep the mouse position anchored while zooming.
    if (anchor) {
      const anchorX = clamp(anchor.clientX - rect.left, 0, rect.width);
      const anchorY = clamp(anchor.clientY - rect.top, 0, rect.height);

      const worldX = (anchorX - prevPan.x - rect.width / 2) / prevZoom + rect.width / 2;
      const worldY = (anchorY - prevPan.y - rect.height / 2) / prevZoom + rect.height / 2;

      const scaledX = (worldX - rect.width / 2) * nextZoom + rect.width / 2;
      const scaledY = (worldY - rect.height / 2) * nextZoom + rect.height / 2;
      nextPan = clampPanOffset(anchorX - scaledX, anchorY - scaledY, nextZoom, rect.width, rect.height);
    }

    zoomLevelRef.current = nextZoom;
    panOffsetRef.current = nextPan;
    setZoomLevel(nextZoom);
    setPanOffset(nextPan);
  }, [maxZoomLevel]);

  useEffect(() => {
    if (!mapViewportEl) return;

    const syncViewport = () => {
      const rect = mapViewportEl.getBoundingClientRect();
      const width = Math.max(0, Math.round(rect.width));
      const height = Math.max(0, Math.round(rect.height));

      setViewportSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });

      setPanOffset((prev) => {
        const nextPan = clampPanOffset(prev.x, prev.y, zoomLevelRef.current, rect.width, rect.height);
        panOffsetRef.current = nextPan;
        return nextPan;
      });
    };

    syncViewport();

    const observer = new ResizeObserver(() => {
      syncViewport();
    });

    observer.observe(mapViewportEl);
    return () => observer.disconnect();
  }, [mapViewportEl]);

  useEffect(() => {
    const clampedZoom = clamp(zoomLevelRef.current, 1, maxZoomLevel);
    if (clampedZoom === zoomLevelRef.current) return;

    const rect = mapViewportRef.current?.getBoundingClientRect();
    const nextPan = rect
      ? clampPanOffset(panOffsetRef.current.x, panOffsetRef.current.y, clampedZoom, rect.width, rect.height)
      : panOffsetRef.current;

    zoomLevelRef.current = clampedZoom;
    panOffsetRef.current = nextPan;
    setZoomLevel(clampedZoom);
    setPanOffset(nextPan);
  }, [maxZoomLevel]);

  const stopMapDrag = useCallback(() => {
    const drag = dragStateRef.current;
    if (!drag.active) return;

    if (drag.moved) {
      suppressClickRef.current = true;
    }
    drag.active = false;
    setIsDraggingMap(false);
  }, []);

  useEffect(() => {
    const onWindowMouseUp = () => stopMapDrag();
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [stopMapDrag]);

  const handleMapMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (zoomLevelRef.current <= 1) return;

    const drag = dragStateRef.current;
    drag.active = true;
    drag.moved = false;
    drag.startX = event.clientX;
    drag.startY = event.clientY;
    drag.startPanX = panOffsetRef.current.x;
    drag.startPanY = panOffsetRef.current.y;
    setIsDraggingMap(true);
  };

  const handleMapWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    applyZoom(event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const toggleDropRadiusPreset = (radius: number, checked: boolean) => {
    setSelectedDropRadii((prev) => {
      if (checked) {
        if (prev.includes(radius)) return prev;
        return [...prev, radius].sort((a, b) => a - b);
      }
      return prev.filter((value) => value !== radius);
    });
    setDropConfigError("");
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    const nextPoint = getPercentFromPointer(event);
    if (!nextPoint) return;

    if (showDropPlanner) {
      if (selectedDropRadii.length === 0) {
        setDropConfigError(text.dropPresetEmpty);
        return;
      }

      const pinId = `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const newZones: DropZone[] = selectedDropRadii.map((radiusMeters) => ({
        id: `${pinId}-${radiusMeters}`,
        pinId,
        center: nextPoint,
        radiusMeters,
      }));

      setDropZones((prev) => [...prev, ...newZones]);
      setDropConfigError("");
      return;
    }

    if (showDistanceMeasure) {
      setMeasurePoints((prev) => [...prev, nextPoint]);
      return;
    }

    if (showFlightPath) {
      if (!flightPathStart || flightPathEnd) {
        setFlightPathStart(nextPoint);
        setFlightPathEnd(null);
      } else {
        setFlightPathEnd(nextPoint);
      }
    }
  };

  const handleMapContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!showDistanceMeasure) return;
    event.preventDefault();
    setMeasurePoints((prev) => prev.slice(0, -1));
  };

  const handleMapMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (drag.active && mapViewportRef.current) {
      const rect = mapViewportRef.current.getBoundingClientRect();
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const hasMoved = Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3;
      if (hasMoved) {
        drag.moved = true;
      }

      const nextPan = clampPanOffset(
        drag.startPanX + deltaX,
        drag.startPanY + deltaY,
        zoomLevelRef.current,
        rect.width,
        rect.height
      );
      panOffsetRef.current = nextPan;
      setPanOffset(nextPan);
    }

    const point = getPercentFromPointer(event);
    if (!point) return;
    setCursorPoint(point);
  };

  const cursorInfo = useMemo(() => {
    if (!cursorPoint) return null;
    const world = toWorldMeters(cursorPoint, selectedMapDefinition);
    return {
      xKm: world.x / 1000,
      yKm: world.y / 1000,
      gridRef: getGridRef(cursorPoint, gridCells),
    };
  }, [cursorPoint, selectedMapDefinition, gridCells]);

  const dropPins = useMemo(() => {
    const pinMap = new Map<string, DrawPoint>();
    for (const zone of dropZones) {
      if (!pinMap.has(zone.pinId)) {
        pinMap.set(zone.pinId, zone.center);
      }
    }
    return Array.from(pinMap.entries()).map(([pinId, center]) => ({ pinId, center }));
  }, [dropZones]);

  const latestDropPinRadii = useMemo(() => {
    if (!dropPins.length) return [];
    const latestPin = dropPins[dropPins.length - 1];
    return dropZones
      .filter((zone) => zone.pinId === latestPin.pinId)
      .map((zone) => zone.radiusMeters)
      .sort((a, b) => a - b);
  }, [dropPins, dropZones]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-4xl font-black text-white mb-2">{text.title}</h1>
        <p className="text-wbz-mute">{text.subtitle}</p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm text-wbz-mute mb-3 font-bold">{text.mapList}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MAP_INTEL_MAPS.map((map) => (
            <motion.button
              key={map.id}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMapId(map.id)}
              className={`relative overflow-hidden rounded-xl border transition-colors text-left ${
                selectedMapId === map.id ? "border-wbz-gold" : "border-white/10 hover:border-white/30"
              }`}
            >
              <div className="relative h-24 bg-black/30">
                <Image src={map.previewImageUrl} alt={map.nameEn} fill className="object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute bottom-2 left-2">
                  <p className="text-sm font-black text-white leading-none">{map.nameKo}</p>
                  <p className="text-[11px] text-wbz-mute">{map.nameEn}</p>
                </div>
                <div className="absolute top-2 right-2 text-[11px] font-bold text-wbz-gold bg-black/50 px-2 py-1 rounded">
                  {map.sizeKm}x{map.sizeKm}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="bg-wbz-card border border-white/10 rounded-2xl p-10 text-center text-wbz-mute">
          {text.loading}
        </div>
      ) : error ? (
        <div className="bg-wbz-card border border-red-500/30 rounded-2xl p-10 text-center text-red-300">{error}</div>
      ) : !payload ? (
        <div className="bg-wbz-card border border-white/10 rounded-2xl p-10 text-center text-wbz-mute">{text.refreshError}</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-9">
            <div
              ref={setMapViewportNode}
              className={`relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black overscroll-contain ${
                isDraggingMap ? "cursor-grabbing" : zoomLevel > 1 ? "cursor-grab" : "cursor-crosshair"
              }`}
              style={{ touchAction: "none" }}
              onClick={handleMapClick}
              onMouseDown={handleMapMouseDown}
              onMouseUp={stopMapDrag}
              onWheel={handleMapWheel}
              onContextMenu={handleMapContextMenu}
              onMouseMove={handleMapMouseMove}
              onMouseLeave={() => {
                setCursorPoint(null);
                stopMapDrag();
              }}
            >
              <div
                className="absolute inset-0 origin-center will-change-transform"
                style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` }}
              >
                <div className="absolute inset-0">
                  {visibleTiles.map((tile, index) => (
                    <img
                      key={tile.key}
                      src={tile.url}
                      alt=""
                      draggable={false}
                      className="absolute object-cover pointer-events-none select-none"
                      style={{
                        left: `${tile.left}%`,
                        top: `${tile.top}%`,
                        width: `${tile.size}%`,
                        height: `${tile.size}%`,
                      }}
                      loading={index < 24 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  ))}
                </div>

                {showGrid && (
                  <div className="absolute inset-0 pointer-events-none">
                    {onlyMinorGridLinePercents.map((value) => (
                      <span
                        key={`mv-${value.toFixed(4)}`}
                        className="absolute top-0 bottom-0 border-l border-white/10"
                        style={{ left: `${value}%` }}
                      />
                    ))}
                    {onlyMinorGridLinePercents.map((value) => (
                      <span
                        key={`mh-${value.toFixed(4)}`}
                        className="absolute left-0 right-0 border-t border-white/10"
                        style={{ top: `${value}%` }}
                      />
                    ))}

                    {gridLinePercents.map((value) => (
                      <span
                        key={`v-${value.toFixed(4)}`}
                        className="absolute top-0 bottom-0 border-l border-white/30"
                        style={{ left: `${value}%` }}
                      />
                    ))}
                    {gridLinePercents.map((value) => (
                      <span
                        key={`h-${value.toFixed(4)}`}
                        className="absolute left-0 right-0 border-t border-white/30"
                        style={{ top: `${value}%` }}
                      />
                    ))}
                  </div>
                )}

                {showZoneLabels && zoneLabels.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {zoneLabels.map((label) => (
                      <span
                        key={`${selectedMapId}-${label.name}`}
                        className="absolute text-[11px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]"
                        style={{
                          left: `${label.xPercent}%`,
                          top: `${label.yPercent}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 pointer-events-none">
                  {visibleLayers.map((layer) =>
                    layer.points.map((point) => {
                      const markerClass =
                        layer.keyName === "fixedVehicles"
                          ? "absolute w-2.5 h-2.5 rounded-sm border border-black/60"
                          : layer.keyName === "secretRooms"
                            ? "absolute w-3 h-3 rounded-[2px] border border-black/60"
                            : layer.keyName === "gliders"
                              ? "absolute w-3 h-3 rounded-full border border-black/60"
                              : "absolute w-2 h-2 rounded-full border border-black/50";
                      const markerTransform =
                        layer.keyName === "secretRooms"
                          ? "translate(-50%, -50%) rotate(45deg)"
                          : "translate(-50%, -50%)";

                      return (
                        <span
                          key={point.id}
                          className={markerClass}
                          style={{
                            left: `${point.xPercent}%`,
                            top: `${point.yPercent}%`,
                            transform: markerTransform,
                            backgroundColor: layer.color,
                            boxShadow: `0 0 8px ${layer.color}`,
                          }}
                        />
                      );
                    })
                  )}
                </div>

                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  {showFlightPath && flightLine && (
                    <>
                      <polyline
                        points={flightLine}
                        fill="none"
                        stroke="#FBBF24"
                        strokeOpacity={0.3}
                        strokeWidth={1.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <polyline
                        points={flightLine}
                        fill="none"
                        stroke="#FDE047"
                        strokeWidth={1.05}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="2.2 1.4"
                        vectorEffect="non-scaling-stroke"
                      />
                    </>
                  )}

                  {showDistanceMeasure && measurePolyline && (
                    <polyline
                      points={measurePolyline}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth={0.35}
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {dropZones.map((zone) => (
                    <g key={`zone-ring-${zone.id}`}>
                      <circle
                        cx={zone.center.xPercent}
                        cy={zone.center.yPercent}
                        r={radiusMetersToPercent(zone.radiusMeters, selectedMapDefinition.sizeKm)}
                        fill="none"
                        stroke="#22D3EE"
                        strokeOpacity={0.22}
                        strokeWidth={1.45}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={zone.center.xPercent}
                        cy={zone.center.yPercent}
                        r={radiusMetersToPercent(zone.radiusMeters, selectedMapDefinition.sizeKm)}
                        fill={`rgba(34, 211, 238, ${Math.max(0.18, Math.min(0.55, dropOpacityPercent / 100))})`}
                        stroke="#22D3EE"
                        strokeWidth={0.8}
                        strokeDasharray="2.1 1.1"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  ))}
                </svg>

                <div className="absolute inset-0 pointer-events-none">
                  {showFlightPath && flightPathStart && (
                    <span
                      className="absolute w-4 h-4 rounded-full border border-white bg-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.95)]"
                      style={{
                        left: `${flightPathStart.xPercent}%`,
                        top: `${flightPathStart.yPercent}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  )}
                  {showFlightPath && flightPathEnd && (
                    <span
                      className="absolute w-4 h-4 rounded-full border border-white bg-yellow-200 shadow-[0_0_14px_rgba(253,224,71,0.95)]"
                      style={{
                        left: `${flightPathEnd.xPercent}%`,
                        top: `${flightPathEnd.yPercent}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  )}
                  {showDistanceMeasure &&
                    measurePoints.map((point, index) => (
                      <span
                        key={`distance-${index}`}
                        className="absolute w-2.5 h-2.5 rounded-full bg-orange-400 border border-white"
                        style={{
                          left: `${point.xPercent}%`,
                          top: `${point.yPercent}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      />
                    ))}

                  {dropPins.map((pin) => (
                    <span
                      key={`zone-pin-${pin.pinId}`}
                      className="absolute w-3 h-3 rounded-full bg-amber-300 border border-black"
                      style={{
                        left: `${pin.center.xPercent}%`,
                        top: `${pin.center.yPercent}%`,
                        transform: "translate(-50%, -50%)",
                        boxShadow: "0 0 10px rgba(245, 158, 11, 0.9)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div
                className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-2 py-1"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => applyZoom(BUTTON_ZOOM_OUT_FACTOR)}
                  className="w-7 h-7 rounded border border-white/20 text-white hover:border-wbz-gold/60 hover:text-wbz-gold transition-colors"
                  aria-label="Zoom out"
                >
                  -
                </button>
                <span className="text-xs text-white font-mono w-[52px] text-center">{Math.round(zoomLevel * 100)}%</span>
                <button
                  type="button"
                  onClick={() => applyZoom(BUTTON_ZOOM_IN_FACTOR)}
                  className="w-7 h-7 rounded border border-white/20 text-white hover:border-wbz-gold/60 hover:text-wbz-gold transition-colors"
                  aria-label="Zoom in"
                >
                  +
                </button>
              </div>

            </div>
          </section>

          <aside className="xl:col-span-3">
            <div className="bg-wbz-card border border-white/10 rounded-2xl p-5 space-y-5 xl:sticky xl:top-24">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">{payload.map.nameKo}</h3>
                <p className="text-sm text-wbz-mute">{payload.map.nameEn}</p>
                <p className="text-xs text-wbz-mute">
                  {text.mapSize}: {payload.map.sizeKm}x{payload.map.sizeKm}
                </p>
              </div>

              <div className="space-y-2 border-y border-white/5 py-3">
                <div className="text-xs text-wbz-mute">
                  {text.source}:{" "}
                  <span className="font-mono break-all">
                    {payload.source}
                    {payload.sourceBuildId ? ` (build ${payload.sourceBuildId})` : ""}
                  </span>
                </div>
                <div className="text-xs text-wbz-mute">
                  {text.syncedAt}: <span className="font-mono">{formatFetchedAt(payload.fetchedAt, locale)}</span>
                </div>
                {cursorInfo && (
                  <div className="text-xs text-wbz-mute">
                    {text.cursor}:{" "}
                    <span className="font-mono text-white">
                      X {cursorInfo.xKm.toFixed(2)}km / Y {cursorInfo.yKm.toFixed(2)}km
                    </span>{" "}
                    <span className="font-mono text-wbz-gold">
                      ({text.gridRef} {cursorInfo.gridRef})
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-black text-white mb-2">{text.options}</h4>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center justify-between gap-2 text-wbz-mute opacity-50 cursor-not-allowed">
                    <span className="flex items-center gap-1.5">
                      <span>{text.fixedVehicles}</span>
                        <span className="text-[11px] text-zinc-500">({text.updating})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-red-300">{payload.categories.fixedVehicles.count}</span>
                      <input type="checkbox" checked={showFixedVehicles} disabled={true} readOnly />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute opacity-50 cursor-not-allowed">
                    <span className="flex items-center gap-1.5">
                      <span>{text.spawnVehicles}</span>
                        <span className="text-[11px] text-zinc-500">({text.updating})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-amber-300">{payload.categories.spawnVehicles.count}</span>
                      <input type="checkbox" checked={showSpawnVehicles} disabled={true} readOnly />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute opacity-50 cursor-not-allowed">
                    <span className="flex items-center gap-1.5">
                      <span>{text.boats}</span>
                        <span className="text-[11px] text-zinc-500">({text.updating})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-cyan-300">{payload.categories.boats.count}</span>
                      <input type="checkbox" checked={showBoats} disabled={true} readOnly />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute opacity-50 cursor-not-allowed">
                    <span className="flex items-center gap-1.5">
                      <span>{text.secretRooms}</span>
                        <span className="text-[11px] text-zinc-500">({text.updating})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-green-300">{payload.categories.secretRooms.count}</span>
                      <input type="checkbox" checked={showSecretRooms} disabled={true} readOnly />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute opacity-50 cursor-not-allowed">
                    <span className="flex items-center gap-1.5">
                      <span>{text.gliders}</span>
                        <span className="text-[11px] text-zinc-500">({text.updating})</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-sky-300">{payload.categories.gliders.count}</span>
                      <input type="checkbox" checked={showGliders} disabled={true} readOnly />
                    </div>
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute pt-2 border-t border-white/5">
                    <span>{text.zoneLabels}</span>
                    <input type="checkbox" checked={showZoneLabels} onChange={(e) => setShowZoneLabels(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute">
                    <span>{text.grid}</span>
                    <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute">
                    <span>{text.flightPath}</span>
                    <input type="checkbox" checked={showFlightPath} onChange={(e) => setShowFlightPath(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute">
                    <span>{text.distance}</span>
                    <input type="checkbox" checked={showDistanceMeasure} onChange={(e) => setShowDistanceMeasure(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-wbz-mute">
                    <span>{text.dropPlanner}</span>
                    <input
                      type="checkbox"
                      checked={showDropPlanner}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setShowDropPlanner(enabled);
                        if (enabled) setDropConfigError("");
                      }}
                    />
                  </label>
                </div>
              </div>

              {showDropPlanner && (
                <div className="space-y-3 border border-white/10 rounded-xl p-3 bg-black/20">
                  <div>
                    <p className="text-xs font-black text-white mb-1">{text.dropPresetTitle}</p>
                    <p className="text-[11px] text-wbz-mute">{text.dropPresetHint}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DROP_RADIUS_PRESETS.map((radius) => {
                      const checked = selectedDropRadii.includes(radius);
                      return (
                        <label
                          key={`drop-preset-${radius}`}
                          className={`flex items-center gap-1.5 text-[11px] rounded px-2 py-1 border ${
                            checked
                              ? "border-emerald-400/70 bg-emerald-400/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-wbz-mute"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => toggleDropRadiusPreset(radius, event.target.checked)}
                          />
                          <span className="font-mono">{radius}m</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-wbz-mute">
                      <span>{text.dropOpacity}</span>
                      <span className="font-mono text-emerald-300">{dropOpacityPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={1}
                      value={dropOpacityPercent}
                      onChange={(event) => setDropOpacityPercent(Number.parseInt(event.target.value, 10) || 30)}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  {dropConfigError && <p className="text-xs text-rose-300">{dropConfigError}</p>}
                </div>
              )}

              <div className="space-y-2 text-xs text-wbz-mute">
                <p>{text.optionHint}</p>
                <p>{text.interactionHint}</p>
                <p>{text.zoomHint}</p>
                <p>{text.panHint}</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setFlightPathStart(null);
                    setFlightPathEnd(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-wbz-mute hover:text-white hover:border-sky-400/50 transition-colors"
                >
                  {text.clearFlightPath}
                </button>
                <button
                  type="button"
                  onClick={() => setMeasurePoints([])}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-wbz-mute hover:text-white hover:border-orange-400/50 transition-colors"
                >
                  {text.clearDistance}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDropZones([]);
                    setDropConfigError("");
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-wbz-mute hover:text-white hover:border-amber-400/50 transition-colors"
                >
                  {text.clearDropZones}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                    zoomLevelRef.current = 1;
                    panOffsetRef.current = { x: 0, y: 0 };
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm text-wbz-mute hover:text-white hover:border-wbz-gold/50 transition-colors"
                >
                  {text.resetZoom}
                </button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="rounded-lg border border-wbz-gold/30 bg-wbz-gold/5 px-3 py-2">
                  <p className="text-wbz-gold text-xs">{text.zoom}</p>
                  <p className="text-white font-black">{Math.round(zoomLevel * 100)}%</p>
                </div>

                <div className="rounded-lg border border-sky-400/30 bg-sky-400/5 px-3 py-2">
                  <p className="text-sky-300 text-xs">{text.flightDistance}</p>
                  <p className="text-white font-black">{flightDistanceKm > 0 ? `${flightDistanceKm.toFixed(2)} km` : "-"}</p>
                  {showFlightPath && !flightPathEnd && <p className="text-[11px] text-wbz-mute mt-1">{text.noFlightPath}</p>}
                </div>

                <div className="rounded-lg border border-orange-400/30 bg-orange-400/5 px-3 py-2">
                  <p className="text-orange-300 text-xs">{text.totalDistance}</p>
                  <p className="text-white font-black">{measuredDistanceKm > 0 ? `${measuredDistanceKm.toFixed(2)} km` : "-"}</p>
                </div>

                <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2">
                  <p className="text-amber-300 text-xs">{text.dropZonesTitle}</p>
                  {dropZones.length === 0 ? (
                    <p className="text-[12px] text-wbz-mute">{text.dropZonesEmpty}</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs text-white font-mono">
                        PIN {dropPins.length} / RING {dropZones.length}
                      </p>
                      <p className="text-xs text-white font-mono">
                        {latestDropPinRadii.map((radius) => `${radius}m`).join(" | ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
