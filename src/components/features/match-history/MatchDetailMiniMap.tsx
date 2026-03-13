"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAP_INTEL_MAPS } from "@/data/mapIntelMaps";
import {
  clampPanOffset,
  clampValue,
  resolveMiniMapTileZoom,
} from "@/components/features/match-history/detailUtils";
import type {
  MatchBlueZoneState,
  MatchRoutePoint,
  MiniMapMarker,
} from "@/components/features/match-history/types";
import type { MatchHistoryUi } from "@/components/features/match-history/i18n";

interface MatchDetailMiniMapProps {
  ui: Pick<
    MatchHistoryUi,
    "mapOverlayUnsupported" | "miniMapZoomOut" | "miniMapZoomIn" | "miniMapGuide"
  >;
  mapId: string | null;
  mapSizeKm: number | null;
  imageUrl: string | null;
  label: string;
  markers: MiniMapMarker[];
  routePoints: MatchRoutePoint[];
  blueZoneStates: MatchBlueZoneState[];
  showRoute: boolean;
  showBlueZone: boolean;
  currentTimeSec: number;
}

export function MatchDetailMiniMap({
  ui,
  mapId,
  mapSizeKm,
  imageUrl,
  label,
  markers,
  routePoints,
  blueZoneStates,
  showRoute,
  showBlueZone,
  currentTimeSec,
}: MatchDetailMiniMapProps) {
  const mapDefinition = useMemo(() => {
    if (!mapId) return null;
    return MAP_INTEL_MAPS.find((map) => map.id === mapId) ?? null;
  }, [mapId]);

  const hasTileSource = Boolean(mapDefinition?.tileBaseUrl);
  const effectiveMapSizeKm = mapDefinition?.sizeKm ?? mapSizeKm ?? null;
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportEl(node);
  }, []);

  useEffect(() => {
    zoomRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    panRef.current = panOffset;
  }, [panOffset]);

  useEffect(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setIsDragging(false);
    dragStateRef.current.active = false;
  }, [mapId]);

  const tileZoom = useMemo(() => {
    if (!mapDefinition) return 0;
    return resolveMiniMapTileZoom(mapDefinition, zoomLevel);
  }, [mapDefinition, zoomLevel]);

  const tileCount = useMemo(() => {
    if (!mapDefinition || tileZoom <= 0) return 0;
    return 2 ** tileZoom;
  }, [mapDefinition, tileZoom]);

  const visibleTileBounds = useMemo(() => {
    if (tileCount <= 0 || viewportSize.width <= 0 || viewportSize.height <= 0) {
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

    const minXPercent = clampValue((Math.min(worldLeft, worldRight) / width) * 100, 0, 100);
    const maxXPercent = clampValue((Math.max(worldLeft, worldRight) / width) * 100, 0, 100);
    const minYPercent = clampValue((Math.min(worldTop, worldBottom) / height) * 100, 0, 100);
    const maxYPercent = clampValue((Math.max(worldTop, worldBottom) / height) * 100, 0, 100);

    const startX = Math.max(0, Math.floor((minXPercent / 100) * tileCount) - 1);
    const endX = Math.min(tileCount - 1, Math.ceil((maxXPercent / 100) * tileCount) + 1);
    const startY = Math.max(0, Math.floor((minYPercent / 100) * tileCount) - 1);
    const endY = Math.min(tileCount - 1, Math.ceil((maxYPercent / 100) * tileCount) + 1);

    return { startX, endX, startY, endY };
  }, [tileCount, viewportSize.width, viewportSize.height, panOffset.x, panOffset.y, zoomLevel]);

  const visibleTiles = useMemo(() => {
    if (!mapDefinition || tileCount <= 0) return [];

    const sizePercent = 100 / tileCount;
    const tiles: Array<{ key: string; url: string; left: number; top: number; size: number }> = [];
    for (let y = visibleTileBounds.startY; y <= visibleTileBounds.endY; y += 1) {
      for (let x = visibleTileBounds.startX; x <= visibleTileBounds.endX; x += 1) {
        tiles.push({
          key: `${tileZoom}-${x}-${y}`,
          url: `${mapDefinition.tileBaseUrl}/${tileZoom}/${x}/${y}.webp`,
          left: x * sizePercent,
          top: y * sizePercent,
          size: sizePercent,
        });
      }
    }
    return tiles;
  }, [mapDefinition, tileCount, tileZoom, visibleTileBounds.startX, visibleTileBounds.endX, visibleTileBounds.startY, visibleTileBounds.endY]);

  const applyZoom = useCallback((delta: number, anchor?: { clientX: number; clientY: number }) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const prevZoom = zoomRef.current;
    const nextZoom = clampValue(Number((prevZoom + delta).toFixed(2)), 1, 3);
    if (nextZoom === prevZoom) return;

    const prevPan = panRef.current;
    let nextPan = clampPanOffset(prevPan.x, prevPan.y, nextZoom, rect.width, rect.height);

    if (anchor) {
      const anchorX = clampValue(anchor.clientX - rect.left, 0, rect.width);
      const anchorY = clampValue(anchor.clientY - rect.top, 0, rect.height);

      const worldX = (anchorX - prevPan.x - rect.width / 2) / prevZoom + rect.width / 2;
      const worldY = (anchorY - prevPan.y - rect.height / 2) / prevZoom + rect.height / 2;

      const scaledX = (worldX - rect.width / 2) * nextZoom + rect.width / 2;
      const scaledY = (worldY - rect.height / 2) * nextZoom + rect.height / 2;
      nextPan = clampPanOffset(anchorX - scaledX, anchorY - scaledY, nextZoom, rect.width, rect.height);
    }

    zoomRef.current = nextZoom;
    panRef.current = nextPan;
    setZoomLevel(nextZoom);
    setPanOffset(nextPan);
  }, []);

  useEffect(() => {
    if (!viewportEl || !hasTileSource) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      applyZoom(event.deltaY < 0 ? 0.15 : -0.15, { clientX: event.clientX, clientY: event.clientY });
    };

    viewportEl.addEventListener("wheel", onWheel, { passive: false });
    return () => viewportEl.removeEventListener("wheel", onWheel);
  }, [viewportEl, hasTileSource, applyZoom]);

  useEffect(() => {
    if (!viewportEl) return;

    const updateViewport = () => {
      const rect = viewportEl.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
      setPanOffset((prev) => {
        const next = clampPanOffset(prev.x, prev.y, zoomRef.current, rect.width, rect.height);
        panRef.current = next;
        return next;
      });
    };

    updateViewport();
    const observer = new ResizeObserver(updateViewport);
    observer.observe(viewportEl);
    return () => observer.disconnect();
  }, [viewportEl]);

  const stopDrag = useCallback(() => {
    if (!dragStateRef.current.active) return;
    dragStateRef.current.active = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const onWindowMouseUp = () => stopDrag();
    window.addEventListener("mouseup", onWindowMouseUp);
    return () => window.removeEventListener("mouseup", onWindowMouseUp);
  }, [stopDrag]);

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if (zoomRef.current <= 1) return;

    dragStateRef.current.active = true;
    dragStateRef.current.startX = event.clientX;
    dragStateRef.current.startY = event.clientY;
    dragStateRef.current.startPanX = panRef.current.x;
    dragStateRef.current.startPanY = panRef.current.y;
    setIsDragging(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    const nextPan = clampPanOffset(
      dragStateRef.current.startPanX + deltaX,
      dragStateRef.current.startPanY + deltaY,
      zoomRef.current,
      rect.width,
      rect.height,
    );

    panRef.current = nextPan;
    setPanOffset(nextPan);
  };

  const markerClassByTone: Record<MiniMapMarker["tone"], string> = {
    death: "bg-rose-400 border-rose-100",
    kill: "bg-emerald-400 border-emerald-100",
    teamKill: "bg-blue-500 border-blue-100",
    neutral: "bg-cyan-300 border-white",
  };

  const timelineMarkers = useMemo(
    () => markers.filter((marker) => marker.elapsedSec === null || marker.elapsedSec <= currentTimeSec),
    [markers, currentTimeSec],
  );

  const selfRoutePolyline = useMemo(() => {
    if (!showRoute) return "";
    const points = routePoints
      .filter((point) => point.isSelf)
      .filter((point) => point.xPercent !== null && point.yPercent !== null)
      .filter((point) => point.elapsedSec === null || point.elapsedSec <= currentTimeSec)
      .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0));
    if (points.length < 2) return "";
    return points
      .map((point) => `${Number(point.xPercent).toFixed(3)},${Number(point.yPercent).toFixed(3)}`)
      .join(" ");
  }, [showRoute, routePoints, currentTimeSec]);

  const activeBlueZone = useMemo(() => {
    if (!showBlueZone) return null;
    const sorted = [...blueZoneStates]
      .filter((state) => state.xPercent !== null && state.yPercent !== null && state.radius !== null)
      .filter((state) => state.elapsedSec === null || state.elapsedSec <= currentTimeSec)
      .sort((a, b) => (a.elapsedSec ?? 0) - (b.elapsedSec ?? 0));
    return sorted.length ? sorted[sorted.length - 1] : null;
  }, [showBlueZone, blueZoneStates, currentTimeSec]);

  const blueZoneRadiusPercent = useMemo(() => {
    if (!activeBlueZone || !effectiveMapSizeKm) return null;
    const mapUnits = effectiveMapSizeKm * 1000 * 100;
    if (!Number.isFinite(mapUnits) || mapUnits <= 0) return null;
    const radiusValue = activeBlueZone.radius ?? 0;
    if (!Number.isFinite(radiusValue) || radiusValue <= 0) return null;
    return clampValue((radiusValue / mapUnits) * 100, 0, 100);
  }, [activeBlueZone, effectiveMapSizeKm]);

  if (!imageUrl && !hasTileSource) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-wbz-mute dark:border-white/10 dark:bg-dark-surface">
        {ui.mapOverlayUnsupported}
      </div>
    );
  }

  if (!hasTileSource) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-white/10">
        <img src={imageUrl ?? ""} alt={label} className="pointer-events-none h-full w-full select-none object-cover" />
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {selfRoutePolyline ? (
            <polyline points={selfRoutePolyline} fill="none" stroke="#eab308" strokeWidth={0.6 / zoomLevel} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          ) : null}
          {activeBlueZone && blueZoneRadiusPercent !== null ? (
            <circle
              cx={Number(activeBlueZone.xPercent)}
              cy={Number(activeBlueZone.yPercent)}
              r={blueZoneRadiusPercent}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth={0.35}
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0">
          {timelineMarkers.map((marker) =>
            marker.tone === "death" ? (
              <span
                key={marker.id}
                className="absolute h-3 w-3"
                style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%`, transform: "translate(-50%, -50%)" }}
              >
                <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-rose-400" />
                <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-rose-400" />
              </span>
            ) : (
              <span
                key={marker.id}
                className={`absolute h-2.5 w-2.5 rounded-full border ${markerClassByTone[marker.tone]}`}
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: marker.active ? "0 0 12px rgba(250, 204, 21, 0.95)" : undefined,
                }}
              />
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setViewportNode}
      className={`relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-white/10 ${
        isDragging ? "cursor-grabbing" : zoomLevel > 1 ? "cursor-grab" : "cursor-default"
      }`}
      style={{ touchAction: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
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
              className="pointer-events-none absolute select-none object-cover"
              style={{
                left: `${tile.left}%`,
                top: `${tile.top}%`,
                width: `${tile.size}%`,
                height: `${tile.size}%`,
              }}
              loading={index < 40 ? "eager" : "lazy"}
              decoding="async"
            />
          ))}
        </div>

        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {selfRoutePolyline ? (
            <polyline points={selfRoutePolyline} fill="none" stroke="#eab308" strokeWidth={0.6 / zoomLevel} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
          ) : null}
          {activeBlueZone && blueZoneRadiusPercent !== null ? (
            <circle
              cx={Number(activeBlueZone.xPercent)}
              cy={Number(activeBlueZone.yPercent)}
              r={blueZoneRadiusPercent}
              fill="rgba(59, 130, 246, 0.08)"
              stroke="rgba(59, 130, 246, 0.8)"
              strokeWidth={0.35}
            />
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-0">
          {timelineMarkers.map((marker) =>
            marker.tone === "death" ? (
              <span
                key={marker.id}
                className="absolute h-3 w-3"
                style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%`, transform: "translate(-50%, -50%)" }}
              >
                <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded-full bg-rose-400" />
                <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-rose-400" />
              </span>
            ) : (
              <span
                key={marker.id}
                className={`absolute h-2.5 w-2.5 rounded-full border ${markerClassByTone[marker.tone]}`}
                style={{
                  left: `${marker.xPercent}%`,
                  top: `${marker.yPercent}%`,
                  transform: "translate(-50%, -50%)",
                  boxShadow: marker.active ? "0 0 12px rgba(250, 204, 21, 0.95)" : undefined,
                }}
              />
            ),
          )}
        </div>
      </div>

      <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/60 px-2 py-1">
        <button
          type="button"
          onClick={() => applyZoom(-0.2)}
          className="h-6 w-6 rounded border border-white/20 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-200"
          aria-label={ui.miniMapZoomOut}
        >
          -
        </button>
        <span className="w-[44px] text-center font-mono text-[11px] text-white">{Math.round(zoomLevel * 100)}%</span>
        <button
          type="button"
          onClick={() => applyZoom(0.2)}
          className="h-6 w-6 rounded border border-white/20 text-white transition-colors hover:border-cyan-300/60 hover:text-cyan-200"
          aria-label={ui.miniMapZoomIn}
        >
          +
        </button>
      </div>

      <div className="absolute bottom-2.5 left-2.5 z-10 rounded-md border border-white/10 bg-black/50 px-2 py-1 text-[10px] text-wbz-mute">
        {ui.miniMapGuide}
      </div>
    </div>
  );
}
