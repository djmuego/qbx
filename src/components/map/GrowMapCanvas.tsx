import React, { useMemo, useRef, useState, useEffect } from 'react';
import type { MapPlacement, MapZone, SpaceMap } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { Plant } from '../../domain/grow/plant.types';
import type { GrowPhaseId } from '../../domain/grow/grow-phase.types';
import { clampPlacementToBounds, snapToGrid } from '../../domain/map/space-map.geometry';
import {
  growthDisplayBounds,
  resolvePlacementGrowthVisual,
} from '../../domain/grow/plant-growth-visual';
import {
  formatGridLabel,
  gridAxisValues,
  isGridMultiple,
  shouldLabelGridValue,
  visualGridSteps,
} from '../../domain/map/visual-grid';
import { layerForKind, type SpatialLayerId } from '../../domain/map/spatial-layers';
import { useMapViewport } from './use-map-viewport';
import { MapPlacement2D } from './MapPlacement2D';
import { MapCanvasControls } from './MapCanvasControls';
import { MapHeatmapLayer } from './MapHeatmapLayer';
import type { HeatmapResult } from '../../domain/map/spatial-intelligence.types';

interface GrowMapCanvasProps {
  bounds: SpaceDimensions;
  map: SpaceMap;
  plants: Plant[];
  selectedIds: string[];
  onSelect: (ids: string[], additive: boolean) => void;
  onPlacementsChange: (placements: MapPlacement[]) => void;
  onZonesChange: (zones: MapZone[]) => void;
  onPlantActivate: (plantId: string) => void;
  onCommit?: () => void;
  growPhase?: GrowPhaseId;
  cropStartedAt?: string;
  northAngleDeg?: number;
  showGrid?: boolean;
  snapStepM?: number;
  editMode?: boolean;
  layers?: Record<SpatialLayerId, boolean>;
  ghostPlacement?: MapPlacement | null;
  onGhostMove?: (xM: number, yM: number) => void;
  onGhostPlace?: (xM: number, yM: number) => void;
  suggestionMarker?: { xM: number; yM: number; label?: string } | null;
  heatmap?: HeatmapResult | null;
  onFitReady?: (fit: () => void) => void;
  growthPreview?: { placementId: string; days: number } | null;
}

type DragMode = 'move' | 'resize' | 'rotate' | 'marquee' | 'pan' | null;

export const GrowMapCanvas: React.FC<GrowMapCanvasProps> = ({
  bounds,
  map,
  plants,
  selectedIds,
  onSelect,
  onPlacementsChange,
  onPlantActivate,
  onCommit,
  growPhase,
  cropStartedAt,
  northAngleDeg = 0,
  showGrid = true,
  snapStepM = 0.1,
  editMode = true,
  layers,
  ghostPlacement,
  onGhostMove,
  onGhostPlace,
  suggestionMarker,
  heatmap,
  onFitReady,
  growthPreview,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { containerRef, ppm, svgW, svgH, PAD, viewport, fitToRoom, onWheel, startPan, movePan, endPan, zoomBy } =
    useMapViewport(bounds);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [spacePan, setSpacePan] = useState(false);
  const drag = useRef<{
    mode: DragMode;
    id?: string;
    startX: number;
    startY: number;
    origins?: Map<string, MapPlacement>;
    marquee?: { xM: number; yM: number };
  } | null>(null);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        setSpacePan(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  React.useEffect(() => {
    onFitReady?.(fitToRoom);
  }, [fitToRoom, onFitReady]);

  const snapM = snapStepM > 0 ? snapStepM : map.gridStepM;

  const plantName = useMemo(() => {
    const names = new Map(plants.map((p) => [p.id, p.name]));
    return (id?: string) => (id ? names.get(id) : undefined);
  }, [plants]);

  const meterToSvg = (xM: number, yM: number) => ({
    x: PAD + xM * ppm,
    y: PAD + (bounds.widthM - yM) * ppm,
  });

  const clientToMeters = (clientX: number, clientY: number, snap = true) => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return { xM: 0, yM: 0 };
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left - viewport.panX;
    const y = clientY - rect.top - viewport.panY;
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;
    const svgX = x * scaleX;
    const svgY = y * scaleY;
    const rawX = (svgX - PAD) / ppm;
    const rawY = bounds.widthM - (svgY - PAD) / ppm;
    if (!snap || snapM <= 0) return { xM: rawX, yM: rawY };
    return {
      xM: snapToGrid(rawX, snapM),
      yM: snapToGrid(rawY, snapM),
    };
  };

  const commitPlacements = (next: MapPlacement[]) => {
    const byId = new Map(next.map((p) => [p.id, clampPlacementToBounds(p, bounds, snapM)]));
    onPlacementsChange(map.placements.map((p) => byId.get(p.id) ?? p));
  };

  const commitPlacement = (next: MapPlacement) => {
    commitPlacements([next]);
  };

  const gridPlan = visualGridSteps(bounds, viewport.zoom);
  const gridLines: React.ReactNode[] = [];
  if (showGrid) {
    for (const x of gridAxisValues(bounds.lengthM, gridPlan.minorM)) {
      const p1 = meterToSvg(x, 0);
      const p2 = meterToSvg(x, bounds.widthM);
      const major = isGridMultiple(x, gridPlan.majorM) || x === 0;
      if (!major && viewport.zoom < 0.75) continue;
      gridLines.push(
        <line
          key={`vx${x}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={major ? '#e4e4e7' : '#f4f4f5'}
          className={major ? 'dark:stroke-zinc-600' : 'dark:stroke-zinc-800/80'}
          strokeWidth={major ? 1 : 0.5}
        />,
      );
      if (major && shouldLabelGridValue(x, bounds.lengthM, gridPlan.labelM)) {
        gridLines.push(
          <text key={`lx${x}`} x={p1.x} y={svgH - 10} textAnchor="middle" className="fill-zinc-400 dark:fill-zinc-500" fontSize={9}>
            {formatGridLabel(x)}
          </text>,
        );
      }
    }
    for (const y of gridAxisValues(bounds.widthM, gridPlan.minorM)) {
      const p1 = meterToSvg(0, y);
      const p2 = meterToSvg(bounds.lengthM, y);
      const major = isGridMultiple(y, gridPlan.majorM) || y === 0;
      if (!major && viewport.zoom < 0.75) continue;
      gridLines.push(
        <line
          key={`hy${y}`}
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          stroke={major ? '#e4e4e7' : '#f4f4f5'}
          className={major ? 'dark:stroke-zinc-600' : 'dark:stroke-zinc-800/80'}
          strokeWidth={major ? 1 : 0.5}
        />,
      );
      if (major && y > 0 && shouldLabelGridValue(y, bounds.widthM, gridPlan.labelM)) {
        gridLines.push(
          <text key={`ly${y}`} x={10} y={p1.y + 3} className="fill-zinc-400 dark:fill-zinc-500" fontSize={9}>
            {formatGridLabel(y)}
          </text>,
        );
      }
    }
  }

  const onPointerDownFloor = (e: React.PointerEvent) => {
    if (ghostPlacement && onGhostPlace) {
      const pt = clientToMeters(e.clientX, e.clientY);
      onGhostPlace(pt.xM, pt.yM);
      return;
    }
    if (e.button === 1 || e.button === 2 || e.altKey || e.metaKey || spacePan) {
      startPan(e.clientX, e.clientY);
      drag.current = { mode: 'pan', startX: e.clientX, startY: e.clientY };
      return;
    }
    if (e.target !== e.currentTarget && (e.target as Element).getAttribute('data-floor') !== 'true') return;
    const start = clientToMeters(e.clientX, e.clientY, false);
    drag.current = { mode: 'marquee', startX: e.clientX, startY: e.clientY, marquee: start };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    if (!e.shiftKey) onSelect([], false);
  };

  const onPointerDownObject = (e: React.PointerEvent, placement: MapPlacement, mode: DragMode) => {
    if (!editMode) {
      if (placement.plantId) onPlantActivate(placement.plantId);
      else onSelect([placement.id], e.shiftKey);
      return;
    }
    e.stopPropagation();
    const additive = e.shiftKey;
    const activeIds = selectedIds.includes(placement.id) ? selectedIds : [placement.id];
    if (!selectedIds.includes(placement.id)) onSelect([placement.id], additive);
    const origins = new Map<string, MapPlacement>();
    for (const id of activeIds) {
      const p = map.placements.find((x) => x.id === id);
      if (p) origins.set(id, { ...p });
    }
    drag.current = { mode, id: placement.id, startX: e.clientX, startY: e.clientY, origins };
    setDraggingIds([...origins.keys()]);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const state = drag.current;
    if (!state) {
      if (ghostPlacement && onGhostMove) {
        const pt = clientToMeters(e.clientX, e.clientY);
        onGhostMove(pt.xM, pt.yM);
      }
      return;
    }
    if (state.mode === 'pan') {
      movePan(e.clientX, e.clientY);
      return;
    }
    const now = clientToMeters(e.clientX, e.clientY, false);
    if (state.mode === 'marquee' && state.marquee) {
      setMarquee({ x1: state.marquee.xM, y1: state.marquee.yM, x2: now.xM, y2: now.yM });
      return;
    }
    const origins = state.origins;
    if (!origins?.size || !editMode) return;
    const originClick = clientToMeters(state.startX, state.startY, false);
    const dx = now.xM - originClick.xM;
    const dy = now.yM - originClick.yM;
    if (state.mode === 'move') {
      commitPlacements(
        [...origins.values()].map((orig) => ({
          ...orig,
          xM: orig.xM + dx,
          yM: orig.yM + dy,
          zSource: 'user' as const,
        })),
      );
    } else if (state.mode === 'resize' && state.id) {
      const orig = origins.get(state.id);
      if (!orig) return;
      commitPlacement({
        ...orig,
        widthM: Math.max(snapM || 0.05, now.xM - orig.xM),
        heightM: Math.max(snapM || 0.05, now.yM - orig.yM),
      });
    } else if (state.mode === 'rotate' && state.id) {
      const orig = origins.get(state.id);
      if (!orig) return;
      const cx = orig.xM + orig.widthM / 2;
      const cy = orig.yM + orig.heightM / 2;
      const deg = (Math.atan2(cx - now.xM, now.yM - cy) * 180) / Math.PI;
      commitPlacement({ ...orig, rotationDeg: Math.round(deg / 15) * 15 });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const state = drag.current;
    if (state?.mode === 'pan') {
      endPan();
      drag.current = null;
      return;
    }
    if (state?.mode === 'marquee' && state.marquee) {
      const end = clientToMeters(e.clientX, e.clientY, false);
      const minX = Math.min(state.marquee.xM, end.xM);
      const maxX = Math.max(state.marquee.xM, end.xM);
      const minY = Math.min(state.marquee.yM, end.yM);
      const maxY = Math.max(state.marquee.yM, end.yM);
      const ids = map.placements
        .filter((p) => {
          const cx = p.xM + p.widthM / 2;
          const cy = p.yM + p.heightM / 2;
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        })
        .map((p) => p.id);
      onSelect(ids, e.shiftKey);
      setMarquee(null);
    } else if (state?.mode === 'move' && state.origins?.size) {
      if (snapM > 0) {
        commitPlacements(
          [...state.origins.values()].map((orig) => {
            const current = map.placements.find((p) => p.id === orig.id) ?? orig;
            return {
              ...current,
              xM: snapToGrid(current.xM, snapM),
              yM: snapToGrid(current.yM, snapM),
            };
          }),
        );
      }
      const moved = Math.hypot(e.clientX - state.startX, e.clientY - state.startY);
      const primary = state.id ? state.origins.get(state.id) : undefined;
      if (moved < 6 && primary?.plantId) onPlantActivate(primary.plantId);
    } else if ((state?.mode === 'resize' || state?.mode === 'rotate') && state.id && snapM > 0) {
      const current = map.placements.find((p) => p.id === state.id);
      if (current) commitPlacement(current);
    }
    if (state?.mode === 'move' || state?.mode === 'resize' || state?.mode === 'rotate') onCommit?.();
    setDraggingIds([]);
    drag.current = null;
  };

  const floor = meterToSvg(0, bounds.widthM);
  const edgeLabels = (
    <g className="pointer-events-none">
      <text x={PAD + (bounds.lengthM * ppm) / 2} y={14} textAnchor="middle" className="fill-zinc-500" fontSize={10} fontWeight={600}>
        {bounds.lengthM.toFixed(1)} м
      </text>
      <text x={12} y={PAD + (bounds.widthM * ppm) / 2} textAnchor="middle" className="fill-zinc-500" fontSize={10} fontWeight={600} transform={`rotate(-90 12 ${PAD + (bounds.widthM * ppm) / 2})`}>
        {bounds.widthM.toFixed(1)} м
      </text>
    </g>
  );

  const visiblePlacements = map.placements.filter((p) => !layers || layers[layerForKind(p.kind, p.role)]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[min(72vh,680px)] min-h-[320px] sm:min-h-[380px] rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-gradient-to-b from-zinc-50 to-zinc-100/80 dark:from-zinc-950 dark:to-zinc-900 shadow-sm overflow-hidden ${spacePan ? 'cursor-grab' : ''}`}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="w-full h-full touch-none select-none"
        style={{ transform: `translate(${viewport.panX}px, ${viewport.panY}px)` }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-full"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <rect
            data-floor="true"
            x={floor.x}
            y={floor.y}
            width={bounds.lengthM * ppm}
            height={bounds.widthM * ppm}
            fill="#ffffff"
            className="dark:fill-zinc-900/95"
            stroke="#e4e4e7"
            strokeWidth={1}
            rx={4}
            onPointerDown={onPointerDownFloor}
          />
          {gridLines}
          {edgeLabels}

          {heatmap?.available && (
            <MapHeatmapLayer heatmap={heatmap} bounds={bounds} ppm={ppm} meterToSvg={meterToSvg} />
          )}

          {layers?.zones !== false &&
            map.zones.map((zone) => {
              const topLeft = meterToSvg(zone.xM, zone.yM + zone.heightM);
              const selectedZone = selectedIds.some((id) => map.placements.find((p) => p.id === id)?.zoneId === zone.id);
              return (
                <g key={zone.id} opacity={selectedZone ? 1 : 0.55}>
                  <rect
                    x={topLeft.x}
                    y={topLeft.y}
                    width={zone.widthM * ppm}
                    height={zone.heightM * ppm}
                    fill="#10b98118"
                    stroke="#10b981"
                    strokeDasharray="6 4"
                    rx={8}
                  />
                  {selectedZone && (
                    <text x={topLeft.x + 8} y={topLeft.y + 14} fontSize={10} fill="#047857" fontWeight={700}>
                      {zone.name}
                    </text>
                  )}
                </g>
              );
            })}

          {visiblePlacements.map((placement) => {
            const plant = placement.plantId ? plants.find((p) => p.id === placement.plantId) : undefined;
            const previewAgeDays =
              growthPreview?.placementId === placement.id ? growthPreview.days : undefined;
            const growth =
              placement.kind === 'plant' || placement.kind === 'plant_group'
                ? resolvePlacementGrowthVisual(placement, plant, {
                    growPhase,
                    cropStartedAt,
                    previewAgeDays,
                  })
                : null;
            const display = growth
              ? growthDisplayBounds(placement, growth)
              : {
                  xM: placement.xM,
                  yM: placement.yM,
                  widthM: placement.widthM,
                  heightM: placement.heightM,
                };
            const selected = selectedIds.includes(placement.id);
            const hovered = hoveredId === placement.id;
            const unbound =
              placement.kind !== 'plant' &&
              placement.kind !== 'plant_group' &&
              !placement.deviceId &&
              !placement.sensorId &&
              !placement.outputId;
            return (
              <g
                key={placement.id}
                opacity={draggingIds.includes(placement.id) ? 0.88 : 1}
                onPointerEnter={() => setHoveredId(placement.id)}
                onPointerLeave={() => setHoveredId((id) => (id === placement.id ? null : id))}
              >
                <MapPlacement2D
                  placement={placement}
                  display={display}
                  ppm={ppm}
                  bounds={bounds}
                  meterToSvg={meterToSvg}
                  selected={selected}
                  hovered={hovered}
                  dragging={draggingIds.includes(placement.id)}
                  growth={growth}
                  plantName={plantName(placement.plantId)}
                  unbound={unbound}
                  editMode={editMode}
                  onPointerDown={(e, mode) => onPointerDownObject(e, placement, mode)}
                />
              </g>
            );
          })}

          {ghostPlacement && (
            <g opacity={0.55} pointerEvents="none">
              <MapPlacement2D
                placement={ghostPlacement}
                display={{
                  xM: ghostPlacement.xM,
                  yM: ghostPlacement.yM,
                  widthM: ghostPlacement.widthM,
                  heightM: ghostPlacement.heightM,
                }}
                ppm={ppm}
                bounds={bounds}
                meterToSvg={meterToSvg}
                selected={false}
                hovered={false}
                growth={null}
                editMode={false}
                onPointerDown={() => {}}
              />
            </g>
          )}

          {suggestionMarker && (
            <g pointerEvents="none">
              {(() => {
                const center = meterToSvg(suggestionMarker.xM + 0.2, suggestionMarker.yM + 0.2);
                return (
                  <>
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r={14}
                      fill="#8b5cf622"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                    />
                    <circle cx={center.x} cy={center.y} r={4} fill="#8b5cf6" />
                    {suggestionMarker.label && (
                      <text
                        x={center.x}
                        y={center.y - 18}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={700}
                        fill="#6d28d9"
                      >
                        {suggestionMarker.label}
                      </text>
                    )}
                  </>
                );
              })()}
            </g>
          )}

          {marquee && (
            <rect
              x={meterToSvg(Math.min(marquee.x1, marquee.x2), Math.max(marquee.y1, marquee.y2)).x}
              y={meterToSvg(Math.min(marquee.x1, marquee.x2), Math.max(marquee.y1, marquee.y2)).y}
              width={Math.abs(marquee.x2 - marquee.x1) * ppm}
              height={Math.abs(marquee.y2 - marquee.y1) * ppm}
              fill="#10b98122"
              stroke="#10b981"
              strokeDasharray="4 3"
            />
          )}
          <g transform={`translate(${svgW - PAD - 8}, ${PAD + 8}) rotate(${northAngleDeg})`}>
            <circle r={12} fill="#f4f4f5" stroke="#d4d4d8" strokeWidth={1} />
            <polygon points="0,-8 3,-2 0,-3 -3,-2" fill="#ef4444" />
          </g>
        </svg>
      </div>
      <MapCanvasControls
        onZoomIn={() => zoomBy(1, (containerRef.current?.getBoundingClientRect().left ?? 0) + (containerRef.current?.clientWidth ?? 0) / 2, (containerRef.current?.getBoundingClientRect().top ?? 0) + (containerRef.current?.clientHeight ?? 0) / 2)}
        onZoomOut={() => zoomBy(-1, (containerRef.current?.getBoundingClientRect().left ?? 0) + (containerRef.current?.clientWidth ?? 0) / 2, (containerRef.current?.getBoundingClientRect().top ?? 0) + (containerRef.current?.clientHeight ?? 0) / 2)}
        onFit={fitToRoom}
        panHint={editMode && spacePan}
      />
    </div>
  );
};
