import React, { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { SpaceDimensions } from '../../../domain/space/space.types';
import type { MapPlacement, SpaceMap } from '../../../domain/map/space-map.types';
import type { Device } from '../../../domain/device/device.types';
import type { EnvironmentPresetId } from '../../../domain/map/environment.types';
import { layerForKind, type SpatialLayerId } from '../../../domain/map/spatial-layers';
import { environmentPresetForSpaceType } from '../../../application/map/environment-generator';
import { isOutdoorPreset } from '../../../domain/map/environment.types';
import { snapValue } from '../../../domain/map/spatial-snap';
import { estimatedLightFootprint } from '../../../domain/map/coverage-overlays';
import { RoomEnvironment } from './RoomEnvironment';
import { SpatialObjectView } from '../../../features/map3d/components/SpatialObjectView';
import type { TwinVisual } from './ProceduralObject';
import type { ElectricalPlan } from '../../../domain/electrical/electrical.types';
import type { IrrigationGraph } from '../../../application/irrigation/irrigation-graph';
import type { GrowPhaseId } from '../../../domain/grow/grow-phase.types';
import type { Plant } from '../../../domain/grow/plant.types';
import type { LiveTwinLabel } from '../../../domain/map/live-twin-label';
import { liveTwinAccent } from '../../../domain/map/live-twin-label';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side' | 'fit' | 'fitSite' | 'northUp' | 'reset';
export type LiveLabelsMode = 'off' | 'minimal' | 'all';

interface Spatial3DViewProps {
  bounds: SpaceDimensions;
  map: SpaceMap;
  devices: Device[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  layers: Record<SpatialLayerId, boolean>;
  cameraPreset: CameraPreset;
  onCameraPreset?: (preset: CameraPreset) => void;
  emergencyOff?: boolean;
  spaceType?: string;
  editMode?: boolean;
  snapStepM?: number;
  onPlacementChange?: (placement: MapPlacement) => void;
  onDragEnd?: () => void;
  focusId?: string | null;
  electrical?: ElectricalPlan | null;
  irrigation?: IrrigationGraph | null;
  growPhase?: GrowPhaseId;
  cropStartedAt?: string;
  plants?: Plant[];
  liveLabels?: Record<string, LiveTwinLabel>;
  liveLabelsMode?: LiveLabelsMode;
  darkUi?: boolean;
  growthPreview?: { placementId: string; days: number } | null;
}

function twinFor(placement: MapPlacement, label?: LiveTwinLabel, emergencyOff?: boolean): TwinVisual {
  return {
    online: label ? label.connection === 'online' : undefined,
    outputOn: label?.statusLine.startsWith('ON'),
    emergencyOff,
    reading: label?.readingLine,
    visualState: label?.visualState,
  };
}

function shouldShowLabel(
  label: LiveTwinLabel | undefined,
  mode: LiveLabelsMode,
  selected: boolean,
  hovered: boolean,
): 'full' | 'compact' | null {
  if (!label) return null;
  if (mode === 'off') {
    if (label.visualState === 'offline' || label.visualState === 'error') return 'compact';
    return null;
  }
  if (selected) return 'full';
  if (hovered) return 'compact';
  if (label.visualState === 'offline' || label.visualState === 'error') return 'compact';
  if (mode === 'all' && label.bound) return 'compact';
  return null;
}

function cameraPos(
  preset: CameraPreset,
  bounds: SpaceDimensions,
  focus?: [number, number, number],
  northDeg = 0,
): [number, number, number] {
  const t = focus ?? [bounds.lengthM / 2, bounds.heightM * 0.3, bounds.widthM / 2];
  const span = Math.max(bounds.lengthM, bounds.widthM, bounds.heightM);
  switch (preset) {
    case 'top':
    case 'northUp':
      return [t[0], bounds.heightM * 2.6, t[2] + 0.02];
    case 'front':
      return [t[0], t[1] + 0.4, -span * 0.35];
    case 'side':
      return [-span * 0.25, t[1] + 0.35, t[2]];
    case 'fit':
      return [bounds.lengthM * 1.45, bounds.heightM * 1.7, bounds.widthM * 1.55];
    case 'fitSite':
      return [bounds.lengthM * 0.85, Math.max(bounds.heightM * 2.2, span * 0.55), bounds.widthM * 0.85];
    default:
      return [bounds.lengthM * 1.05, bounds.heightM * 1.15, bounds.widthM * 1.2];
  }
}

export default function Spatial3DView({
  bounds,
  map,
  devices,
  selectedIds,
  onSelect,
  layers,
  cameraPreset,
  onCameraPreset,
  emergencyOff,
  spaceType,
  editMode,
  snapStepM = 0.1,
  onPlacementChange,
  onDragEnd,
  focusId,
  electrical,
  irrigation,
  growPhase,
  cropStartedAt,
  plants = [],
  liveLabels = {},
  liveLabelsMode = 'minimal',
  darkUi = false,
  growthPreview,
}: Spatial3DViewProps) {
  const controls = useRef<{ enabled: boolean } | null>(null);
  const preset = (map.environmentPreset ?? environmentPresetForSpaceType(spaceType as never)) as EnvironmentPresetId;
  const siteScale = isOutdoorPreset(preset);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrigins, setDragOrigins] = useState<Map<string, { xM: number; yM: number }>>(new Map());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const env = darkUi ? '#1c1917' : '#f4f4f5';

  const target: [number, number, number] = [bounds.lengthM / 2, bounds.heightM * 0.28, bounds.widthM / 2];
  const selected = map.placements.find((p) => p.id === (focusId || selectedIds[0]));
  const focus: [number, number, number] | undefined = selected
    ? [selected.xM + selected.widthM / 2, (selected.zM ?? 0) + 0.4, selected.yM + selected.heightM / 2]
    : undefined;

  const visible = useMemo(
    () => map.placements.filter((p) => layers[layerForKind(p.kind, p.role)]),
    [map.placements, layers],
  );

  const circuitIds = useMemo(() => {
    if (!electrical || selectedIds.length === 0) return new Set<string>();
    const ids = new Set<string>();
    for (const id of selectedIds) {
      ids.add(id);
      for (const link of electrical.links) {
        if (link.fromId === id || link.toId === id) {
          ids.add(link.fromId);
          ids.add(link.toId);
        }
      }
    }
    return ids;
  }, [electrical, selectedIds]);

  return (
    <div className={`relative w-full h-[min(70vh,640px)] min-h-[360px] rounded-2xl overflow-hidden border ${darkUi ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-stone-100'}`}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop="always"
        gl={{ antialias: true, powerPreference: 'low-power' }}
        onPointerMissed={() => {
          if (!dragId) onSelect([]);
        }}
      >
        <color attach="background" args={[env]} />
        <ambientLight intensity={darkUi ? 0.62 : 0.72} />
        <hemisphereLight args={darkUi ? ['#e7e5e4', '#44403c', 0.7] : ['#f8fafc', '#d6d3d1', 0.55]} />
        <directionalLight
          position={[bounds.lengthM * 0.3, bounds.heightM * 2.4, bounds.widthM * 0.15]}
          intensity={darkUi ? 0.95 : 1.05}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <PerspectiveCamera
          key={cameraPreset}
          makeDefault
          position={cameraPos(cameraPreset, bounds, focus, map.northOffsetDeg)}
          fov={42}
        />
        <OrbitControls
          ref={controls as never}
          makeDefault
          target={focus ?? target}
          enableDamping
          enabled={!dragId}
          minDistance={0.5}
          maxDistance={Math.max(bounds.lengthM, bounds.widthM, bounds.heightM) * 9}
          maxPolarAngle={Math.PI * 0.49}
        />
        <Suspense fallback={null}>
          <RoomEnvironment
            bounds={bounds}
            preset={preset}
            placements={map.placements}
            darkUi={darkUi}
            terrainProfile={map.terrainProfile}
          />
          {layers.zones &&
            map.zones.map((zone) => (
              <mesh key={zone.id} position={[zone.xM + zone.widthM / 2, 0.025, zone.yM + zone.heightM / 2]}>
                <boxGeometry args={[zone.widthM, 0.012, zone.heightM]} />
                <meshStandardMaterial color="#10b981" transparent opacity={0.16} />
              </mesh>
            ))}
          {visible.map((placement) => (
            <SpatialObjectView
              key={placement.id}
              placement={placement}
              selected={selectedIds.includes(placement.id) || circuitIds.has(placement.id)}
              twin={twinFor(placement, liveLabels[placement.id], emergencyOff)}
              resolveCtx={{
                growPhase,
                cropStartedAt,
                plant: placement.plantId ? plants.find((p) => p.id === placement.plantId) ?? null : null,
                previewAgeDays:
                  growthPreview?.placementId === placement.id ? growthPreview.days : undefined,
              }}
              onSelect={() => onSelect([placement.id])}
              onHover={(hover) => setHoveredId(hover ? placement.id : null)}
              onPointerDown={() => {
                if (!editMode) return;
                const activeIds =
                  selectedIds.includes(placement.id) && selectedIds.length > 1 ? selectedIds : [placement.id];
                if (!selectedIds.includes(placement.id)) onSelect([placement.id]);
                const origins = new Map<string, { xM: number; yM: number }>();
                for (const id of activeIds) {
                  const p = map.placements.find((x) => x.id === id);
                  if (p) origins.set(id, { xM: p.xM, yM: p.yM });
                }
                setDragOrigins(origins);
                setDragId(placement.id);
              }}
            />
          ))}
          {visible.map((placement) => {
            const label = liveLabels[placement.id];
            const mode = shouldShowLabel(
              label,
              liveLabelsMode,
              selectedIds.includes(placement.id),
              hoveredId === placement.id,
            );
            if (!label || !mode) return null;
            const accent = liveTwinAccent(label.visualState);
            const h = (placement.sizeZM ?? 0.2) + 0.16;
            return (
              <Html
                key={`lbl-${placement.id}`}
                position={[placement.xM + placement.widthM / 2, (placement.zM ?? 0) + h, placement.yM + placement.heightM / 2]}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  className="rounded-lg px-2 py-1 shadow-sm border text-left max-w-[160px]"
                  style={{
                    background: darkUi ? 'rgba(24,24,27,0.88)' : 'rgba(255,255,255,0.92)',
                    borderColor: accent,
                    color: darkUi ? '#fafafa' : '#18181b',
                  }}
                >
                  {mode === 'full' ? (
                    <>
                      <div className="text-[10px] font-bold leading-tight">{label.title}</div>
                      {label.readingLine && <div className="text-[10px] leading-tight opacity-90">{label.readingLine}</div>}
                      {label.statusLine && <div className="text-[9px] font-semibold" style={{ color: accent }}>{label.statusLine}</div>}
                    </>
                  ) : (
                    <div className="text-[10px] font-semibold leading-tight">{label.compact}</div>
                  )}
                </div>
              </Html>
            );
          })}
          {dragId && editMode && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[bounds.lengthM / 2, 0.03, bounds.widthM / 2]}
              onPointerMove={(e) => {
                e.stopPropagation();
                const anchor = map.placements.find((p) => p.id === dragId);
                if (!anchor || !onPlacementChange) return;
                const anchorOrigin = dragOrigins.get(dragId) ?? { xM: anchor.xM, yM: anchor.yM };
                const newAnchorX = snapValue(e.point.x - anchor.widthM / 2, snapStepM);
                const newAnchorY = snapValue(e.point.z - anchor.heightM / 2, snapStepM);
                const dx = newAnchorX - anchorOrigin.xM;
                const dy = newAnchorY - anchorOrigin.yM;
                const moveIds = dragOrigins.size ? [...dragOrigins.keys()] : [dragId];
                for (const id of moveIds) {
                  const item = map.placements.find((p) => p.id === id);
                  const origin = dragOrigins.get(id);
                  if (!item || !origin) continue;
                  onPlacementChange({
                    ...item,
                    xM: snapValue(origin.xM + dx, snapStepM),
                    yM: snapValue(origin.yM + dy, snapStepM),
                    zSource: 'user',
                  });
                }
              }}
              onPointerUp={(e) => {
                e.stopPropagation();
                setDragId(null);
                setDragOrigins(new Map());
                onDragEnd?.();
              }}
              onPointerOut={() => {
                setDragId(null);
                setDragOrigins(new Map());
                onDragEnd?.();
              }}
            >
              <planeGeometry args={[bounds.lengthM * 6, bounds.widthM * 6]} />
              <meshBasicMaterial transparent opacity={0} />
            </mesh>
          )}
          {layers.analysis &&
            visible
              .filter((p) => p.kind === 'light')
              .map((p) => {
                const fp = estimatedLightFootprint(p);
                return (
                  <mesh key={`fp-${p.id}`} position={[p.xM + p.widthM / 2, 0.03, p.yM + p.heightM / 2]}>
                    <boxGeometry args={[fp.widthM, 0.01, fp.depthM]} />
                    <meshStandardMaterial color="#fbbf24" transparent opacity={0.12} />
                  </mesh>
                );
              })}
          {layers.analysis &&
            visible
              .filter((p) => p.kind === 'camera')
              .map((p) => (
                <mesh key={`fov-${p.id}`} position={[p.xM + p.widthM / 2, (p.zM ?? 0) + 0.05, p.yM + p.heightM / 2]} rotation={[Math.PI / 2, 0, (p.rotationDeg * Math.PI) / 180]}>
                  <coneGeometry args={[0.45, 1.1, 12, 1, true]} />
                  <meshStandardMaterial color="#c026d3" transparent opacity={0.12} side={THREE.DoubleSide} />
                </mesh>
              ))}
          {layers.electrical &&
            electrical?.links.map((link) => {
              const a = map.placements.find((p) => p.id === link.fromId);
              const b = map.placements.find((p) => p.id === link.toId);
              if (!a || !b) return null;
              const start = new THREE.Vector3(a.xM + a.widthM / 2, (a.zM ?? 0) + 0.05, a.yM + a.heightM / 2);
              const end = new THREE.Vector3(b.xM + b.widthM / 2, (b.zM ?? 0) + 0.05, b.yM + b.heightM / 2);
              const mid = start.clone().lerp(end, 0.5);
              mid.y = Math.max(start.y, end.y, bounds.heightM * 0.85);
              const curve = new THREE.CatmullRomCurve3([start, mid, end]);
              return (
                <mesh key={`${link.fromId}-${link.toId}`}>
                  <tubeGeometry args={[curve, 12, 0.012, 5, false]} />
                  <meshStandardMaterial color={circuitIds.has(link.fromId) ? '#f59e0b' : '#ca8a04'} />
                </mesh>
              );
            })}
          {layers.irrigation &&
            irrigation?.edges.map((edge) => {
              const a = map.placements.find((p) => p.id === edge.fromId) ?? map.zones.find((z) => z.id === edge.fromId);
              const b = map.placements.find((p) => p.id === edge.toId) ?? map.zones.find((z) => z.id === edge.toId);
              if (!a || !b) return null;
              const ax = 'widthM' in a ? a.xM + a.widthM / 2 : 0;
              const ay = 'heightM' in a && 'yM' in a ? a.yM + a.heightM / 2 : 0;
              const bx = 'widthM' in b ? b.xM + b.widthM / 2 : 0;
              const by = 'heightM' in b && 'yM' in b ? b.yM + b.heightM / 2 : 0;
              const start = new THREE.Vector3(ax, 0.08, ay);
              const end = new THREE.Vector3(bx, 0.08, by);
              const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(end, 0.5), end]);
              return (
                <mesh key={`${edge.fromId}-${edge.toId}`}>
                  <tubeGeometry args={[curve, 8, 0.01, 4, false]} />
                  <meshStandardMaterial color="#2563eb" />
                </mesh>
              );
            })}
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-3 py-2">
        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${darkUi ? 'bg-zinc-900/80 text-zinc-300' : 'bg-white/80 text-zinc-500'}`}>
          {editMode ? 'Редактирование' : 'Просмотр'}
        </span>
        <span className={`rounded-md px-2 py-1 text-[10px] font-mono ${darkUi ? 'bg-zinc-900/80 text-zinc-300' : 'bg-white/80 text-zinc-500'}`}>
          {bounds.lengthM.toFixed(1)} × {bounds.widthM.toFixed(1)} × {bounds.heightM.toFixed(1)} m
        </span>
      </div>
      {onCameraPreset && (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="text-[10px] text-zinc-400">{editMode ? 'Перетащите объект · стрелки — точно' : 'Orbit · pinch zoom'}</p>
          <div className={`flex flex-wrap gap-1 rounded-lg p-1 ${darkUi ? 'bg-zinc-900/90' : 'bg-white/90'}`}>
            {(siteScale
              ? (['top', 'iso', 'fitSite', 'northUp', 'fit', 'reset'] as const)
              : (['iso', 'top', 'front', 'side', 'fit', 'reset'] as const)
            ).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onCameraPreset(p === 'reset' ? (siteScale ? 'top' : 'iso') : p)}
                className={`px-2 py-1 text-[10px] font-semibold rounded-md min-h-[32px] ${cameraPreset === p || (p === 'reset' && (siteScale ? cameraPreset === 'top' : cameraPreset === 'iso')) ? 'bg-emerald-600 text-white' : 'text-zinc-500'}`}
              >
                {p === 'iso'
                  ? 'Iso'
                  : p === 'top'
                    ? 'Сверху'
                    : p === 'front'
                      ? 'Спереди'
                      : p === 'side'
                        ? 'Сбоку'
                        : p === 'fit'
                          ? 'Вписать'
                          : p === 'fitSite'
                            ? 'Участок'
                            : p === 'northUp'
                              ? 'Север ↑'
                              : 'Сброс'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
