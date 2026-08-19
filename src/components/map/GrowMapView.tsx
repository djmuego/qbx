import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { computeSpaceMetrics, type SpaceDimensions } from '../../domain/space/space.types';
import {
  clampPlacementToBounds,
  createEmptySpaceMap,
  createPlacement,
  nextZoneName,
} from '../../domain/map/space-map.geometry';
import { listUnboundPorts, type UnboundMapPort } from '../../domain/map/map-palette';
import type { MapObjectKind, MapPlacement, SpaceMap } from '../../domain/map/space-map.types';
import type { MapBlueprint } from '../../domain/map/map-blueprint.types';
import type { LayoutPreview } from '../../domain/map/map-blueprint.types';
import { layoutFromBlueprint } from '../../application/map/spatial-layout.engine';
import { generateMapBlueprint } from '../../application/map/map-generator.service';
import { matchBlueprintToDevices } from '../../application/map/device-matcher';
import { Map as MapIcon, Plus } from '../common/Icons';
import { GrowMapCanvas } from './GrowMapCanvas';
import { MapInspector } from './MapInspector';
import { MapToolbar, type SnapStepOption } from './MapToolbar';
import { MapAddMenu, type MapAddAction } from './MapAddMenu';
import { MapLayersPopover } from './MapLayersPopover';
import { MapContextToolbar } from './MapContextToolbar';
import { PlantCardModal } from './PlantCardModal';
import { MapSetupAssistant, MapAgentWizard } from './MapSetupAssistant';
import { BlueprintPreviewModal } from './BlueprintPreviewModal';
import { DEFAULT_SPATIAL_LAYERS, layerForKind, type SpatialLayerId } from '../../domain/map/spatial-layers';
import { migrateSpatialSchema } from '../../application/map/spatial-schema.migration';
import { SPACE_PRESETS } from '../../application/map/space-presets';
import { generateSpaceLayout } from '../../application/map/template-generator';
import { ZoneStateBar } from './ZoneStateBar';
import { MapMinimap } from './MapMinimap';
import { layersForMapViewMode, type MapViewModeId } from '../../domain/map/map-view-modes';
import { applyLibraryDefaults } from '../../domain/map/placement-defaults';
import { buildSpatialContext } from '../../application/map/build-spatial-context';
import { buildSpatialContext as buildIntelligenceSpatialContext } from '../../application/intelligence/spatial-context.builder';
import { createMapHistory } from '../../application/map/map-history';
import { snapValue } from '../../domain/map/spatial-snap';
import { plantGroupFootprintM } from '../../domain/map/plant-group-layout';
import { validateSpatialMap } from '../../domain/map/spatial-validation';
import { proposeLogicalPowerLinks } from '../../application/electrical/electrical-planner';
import { buildIrrigationGraph } from '../../application/irrigation/irrigation-graph';
import type { ObjectLibraryItem } from '../../domain/map/spatial-object-library';
import type { CameraPreset } from './spatial3d/Spatial3DView';
import { bindPlacement, unbindPlacement } from '../../domain/map/spatial-device-bind';
import type { BindCandidate } from '../../domain/map/spatial-device-bind';
import { buildLiveTwinLabel } from '../../domain/map/live-twin-label';
import { resolvePlacementIdForFocus } from '../../domain/map/spatial-focus';
import { resolveOutputTwinMode } from '../../domain/equipment/output-twin-mode';
import { resolveOutputControlStatus } from '../../domain/equipment/output-control-status';
import { NorthCompass } from './NorthCompass';
import { SpaceBreadcrumb } from './SpaceBreadcrumb';
import { isOutdoorPreset } from '../../domain/map/environment.types';
import { gridStepForScale } from '../../domain/map/space-map.geometry';
import { PlantSetupAgeField } from './PlantSetupAgeField';
import { MapSummaryBar } from './MapSummaryBar';
import { SpatialInsightsPanel } from './SpatialInsightsPanel';
import { TwinAiAdvisorWidget } from './TwinAiAdvisorWidget';
import { MapHeatmapBar, type HeatmapMetricOption } from './MapHeatmapBar';
import { buildHeatmap } from '../../application/intelligence/heatmap.service';
import { useSubscription } from '../../context/SubscriptionContext';
import { SubscriptionGuard } from '../commercial/SubscriptionGuard';

const Spatial3DView = React.lazy(() => import('./spatial3d/Spatial3DView'));

export const GrowMapView: React.FC = () => {
  const {
    currentSpace,
    currentSpaceDevices,
    currentSpaceMap,
    currentSpacePlants,
    growPhase,
    cropProfile,
    ensureSpaceMap,
    saveSpaceMap,
    updateSpaceDimensions,
    createPlant,
    updatePlant,
    createPlantGroup,
    applyMapLayout,
    aiSettings,
    growContext,
    setIsAgentOpen,
    askAgentQuestion,
    mapViewMode,
    setMapViewMode,
    isEmergencyActive,
    runtimeSnapshot,
    spatialFocus,
    setSpatialFocus,
    setSelectedDeviceDetail,
    theme,
    spaces,
    setCurrentSpaceId,
    isReadOnly,
    setOutputTwinMode,
    runtimeEvents,
  } = useApp();
  const { isFeatureAvailable, requestUpgrade } = useSubscription();

  const [draft, setDraft] = useState<SpaceMap | null>(null);
  const draftRef = React.useRef<SpaceMap | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [plantCardId, setPlantCardId] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [busyGen, setBusyGen] = useState(false);
  const [preview, setPreview] = useState<{ blueprint: MapBlueprint; layout: LayoutPreview } | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState(DEFAULT_SPATIAL_LAYERS);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('iso');
  const [show3dHint, setShow3dHint] = useState(true);
  const [editHint, setEditHint] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [spatialMode, setSpatialMode] = useState<MapViewModeId>('plan');
  const [showGrid, setShowGrid] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [ghostPlacement, setGhostPlacement] = useState<MapPlacement | null>(null);
  const fitCanvasRef = React.useRef<(() => void) | null>(null);
  const [snapStepM, setSnapStepM] = useState<SnapStepOption>(0.1);
  const [liveLabelsMode, setLiveLabelsMode] = useState<'off' | 'minimal' | 'all'>('off');
  const [focusTick, setFocusTick] = useState(0);
  const [groupForm, setGroupForm] = useState<{ rows: string; cols: string; spacing: string } | null>(null);
  const [pickTemplate, setPickTemplate] = useState(false);
  const [templatePlantAgeDays, setTemplatePlantAgeDays] = useState(0);
  const history = React.useRef(createMapHistory());
  const [lengthM, setLengthM] = useState(String(currentSpace?.dimensions?.lengthM ?? 4));
  const [widthM, setWidthM] = useState(String(currentSpace?.dimensions?.widthM ?? 6));
  const [heightM, setHeightM] = useState(String(currentSpace?.dimensions?.heightM ?? 2.8));
  const [growthPreviewDays, setGrowthPreviewDays] = useState<number | null>(null);
  const [growthPreviewPlaying, setGrowthPreviewPlaying] = useState(false);
  const [insightMarker, setInsightMarker] = useState<{ xM: number; yM: number; label?: string } | null>(null);
  const [heatmapMetric, setHeatmapMetric] = useState<HeatmapMetricOption>('off');

  useEffect(() => {
    setInsightMarker(null);
    setHeatmapMetric('off');
  }, [currentSpace?.id]);

  useEffect(() => {
    setGrowthPreviewDays(null);
    setGrowthPreviewPlaying(false);
  }, [selectedIds.join('|')]);

  const growthPreview = useMemo(() => {
    const id = selectedIds[0];
    if (!id || growthPreviewDays == null) return null;
    return { placementId: id, days: growthPreviewDays };
  }, [selectedIds, growthPreviewDays]);

  useEffect(() => {
    const q = window.matchMedia('(max-width: 639px)');
    if (q.matches) setLiveLabelsMode('off');
  }, []);

  useEffect(() => {
    if (currentSpace?.id && !currentSpaceMap) ensureSpaceMap(currentSpace.id);
  }, [currentSpace?.id, currentSpaceMap]);

  useEffect(() => {
    const next = currentSpaceMap
      ? { ...currentSpaceMap, placements: [...currentSpaceMap.placements], zones: [...currentSpaceMap.zones] }
      : null;
    setDraft(next);
    draftRef.current = next;
  }, [currentSpaceMap]);

  const bounds = currentSpace?.dimensions;
  const map = draft ?? currentSpaceMap ?? (currentSpace ? createEmptySpaceMap(currentSpace.id) : null);

  const unboundPorts = useMemo(
    () => (map ? listUnboundPorts(currentSpaceDevices, map) : []),
    [currentSpaceDevices, map],
  );

  const selected = useMemo(
    () => (map ? map.placements.filter((p) => selectedIds.includes(p.id)) : []),
    [map, selectedIds],
  );

  useEffect(() => {
    if (!spatialFocus || !map || !currentSpace) return;
    if (spatialFocus.spaceId !== currentSpace.id) return;
    const id = resolvePlacementIdForFocus(map, spatialFocus);
    if (id) {
      setSelectedIds([id]);
      setMapViewMode('3d');
      setFocusTick((n) => n + 1);
    }
    setSpatialFocus(null);
  }, [spatialFocus, map, currentSpace, setSpatialFocus, setMapViewMode]);

  useEffect(() => {
    if (!map) return;
    setSelectedIds((ids) =>
      ids.filter((id) => {
        const placement = map.placements.find((p) => p.id === id);
        if (!placement) return false;
        return layers[layerForKind(placement.kind, placement.role)];
      }),
    );
  }, [layers, map]);

  const commit = (next: SpaceMap, persist = true, record = persist) => {
    if (isReadOnly) return;
    if (record && draftRef.current) history.current.push(draftRef.current);
    setDraft(next);
    draftRef.current = next;
    if (persist) {
      setSaveState('saving');
      saveSpaceMap(next);
      setSaveState('saved');
    }
  };

  const persistDraft = () => {
    if (!draftRef.current) return;
    setSaveState('saving');
    try {
      saveSpaceMap(draftRef.current);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const applyBind = (target: BindCandidate) => {
    const item = selected[0];
    if (!item || !map) return;
    commit({
      ...map,
      placements: map.placements.map((p) => (p.id === item.id ? bindPlacement(p, target) : p)),
      updatedAt: new Date().toISOString(),
    });
  };

  const applyUnbind = () => {
    const item = selected[0];
    if (!item || !map) return;
    commit({
      ...map,
      placements: map.placements.map((p) => (p.id === item.id ? unbindPlacement(p) : p)),
      updatedAt: new Date().toISOString(),
    });
  };

  const undo = () => {
    if (!map) return;
    const prev = history.current.undo(map);
    if (!prev) return;
    setDraft(prev);
    draftRef.current = prev;
    saveSpaceMap(prev);
  };

  const redo = () => {
    if (!map) return;
    const next = history.current.redo(map);
    if (!next) return;
    setDraft(next);
    draftRef.current = next;
    saveSpaceMap(next);
  };

  const addPlacement = (partial: Parameters<typeof createPlacement>[0]) => {
    if (!currentSpace || !bounds) return;
    const base = draftRef.current ?? map;
    if (!base) return;
    const nextPlacement = clampPlacementToBounds(
      createPlacement({
        ...partial,
        xM: partial.xM ?? snapCenter(bounds.lengthM, 0.4),
        yM: partial.yM ?? snapCenter(bounds.widthM, 0.4),
      }),
      bounds,
      base.gridStepM,
    );
    commit({ ...map, placements: [...base.placements, nextPlacement], updatedAt: new Date().toISOString() });
    setSelectedIds([nextPlacement.id]);
  };

  const onAddKind = (kind: MapObjectKind) => {
    if (!currentSpace || !map) return;
    if (kind === 'plant') {
      void createPlant({ spaceId: currentSpace.id, name: nextPlantName(currentSpacePlants.length) }).then((plant) => {
        addPlacement({ kind: 'plant', plantId: plant.id, label: plant.name });
      });
      return;
    }
    addPlacement({ kind });
  };

  const addLibraryItem = (item: ObjectLibraryItem, at?: { xM: number; yM: number }) => {
    if (!bounds) return;
    const defaults = applyLibraryDefaults(item);
    addPlacement({
      kind: item.kind,
      ...defaults,
      label: item.label,
      xM: at?.xM,
      yM: at?.yM,
      rackLevels: item.role === 'rack' || item.role === 'grow_rack' ? 4 : undefined,
    });
  };

  const handleAddAction = (action: MapAddAction) => {
    if (action.type === 'kind') {
      if (action.kind === 'plant' || action.kind === 'plant_group') {
        onAddKind(action.kind);
        return;
      }
      const partial = createPlacement({ kind: action.kind, label: action.label });
      setGhostPlacement(partial);
      return;
    }
    if (action.type === 'library') {
      const defaults = applyLibraryDefaults(action.item);
      const partial = createPlacement({ kind: action.item.kind, ...defaults, label: action.item.label });
      setGhostPlacement(partial);
      return;
    }
    if (action.type === 'port') {
      const partial = createPlacement({
        kind: action.port.kind,
        deviceId: action.port.deviceId,
        sensorId: action.port.sensorId,
        outputId: action.port.outputId,
        label: action.port.label,
      });
      setGhostPlacement(partial);
    }
  };

  const placeGhost = (xM: number, yM: number) => {
    if (!ghostPlacement || !map) return;
    const next = clampPlacementToBounds({ ...ghostPlacement, xM, yM }, bounds!, snapStepM || map.gridStepM);
    commit({ ...map, placements: [...map.placements, next], updatedAt: new Date().toISOString() });
    setSelectedIds([next.id]);
    setGhostPlacement(null);
  };

  const duplicateSelected = () => {
    const item = selected[0];
    if (!item || !map) return;
    addPlacement({
      ...item,
      id: undefined,
      xM: item.xM + 0.2,
      yM: item.yM + 0.2,
      label: item.label ? `${item.label} copy` : item.kind,
    });
  };

  const onAddPort = (port: UnboundMapPort) => {
    addPlacement({
      kind: port.kind,
      deviceId: port.deviceId,
      sensorId: port.sensorId,
      outputId: port.outputId,
      label: port.label,
    });
  };

  const createZoneFromSelection = () => {
    if (!map || selected.length === 0) return;
    const xs = selected.map((p) => p.xM);
    const ys = selected.map((p) => p.yM);
    const x2 = selected.map((p) => p.xM + p.widthM);
    const y2 = selected.map((p) => p.yM + p.heightM);
    const zone = {
      id: `zone-${Date.now()}`,
      name: nextZoneName(map.zones),
      xM: Math.min(...xs) - 0.1,
      yM: Math.min(...ys) - 0.1,
      widthM: Math.max(...x2) - Math.min(...xs) + 0.2,
      heightM: Math.max(...y2) - Math.min(...ys) + 0.2,
    };
    const zoneId = zone.id;
    commit({
      ...map,
      zones: [...map.zones, zone],
      placements: map.placements.map((p) => (selectedIds.includes(p.id) ? { ...p, zoneId } : p)),
      updatedAt: new Date().toISOString(),
    });
  };

  const createGroupFromSelection = () => {
    if (!currentSpace) return;
    const plantIds = selected.map((p) => p.plantId).filter((id): id is string => Boolean(id));
    if (plantIds.length < 2) return;
    void createPlantGroup({ spaceId: currentSpace.id, name: nextZoneName([]).replace('Zone', 'Group'), plantIds });
  };

  useEffect(() => {
    if (mapViewMode !== '3d' || !map || !bounds) return;
    if (map.spatialSchemaVersion === 2 && map.heightsAreDefaults && map.placements.every((p) => p.zSource)) return;
    commit(migrateSpatialSchema(map, bounds));
  }, [mapViewMode]);

  useEffect(() => {
    setLayers(layersForMapViewMode(spatialMode));
  }, [spatialMode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!map || !bounds) return;
      if (e.key === 'Escape') {
        setSelectedIds([]);
        setGhostPlacement(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length && editMode) {
        const hasPlant = map.placements.some((p) => selectedIds.includes(p.id) && (p.kind === 'plant' || p.kind === 'plant_group'));
        if (hasPlant && !window.confirm('Удалить выбранные растения с карты?')) return;
        commit({ ...map, placements: map.placements.filter((p) => !selectedIds.includes(p.id)), updatedAt: new Date().toISOString() });
        setSelectedIds([]);
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (!editMode) return;
      const step = (e.shiftKey ? 5 : 1) * (snapStepM || 0.1);
      const ids = selectedIds.length ? selectedIds : [];
      if (!ids.length) return;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = step;
      else if (e.key === 'ArrowDown') dy = -step;
      else return;
      e.preventDefault();
      commit({
        ...map,
        placements: map.placements.map((p) =>
          ids.includes(p.id)
            ? clampPlacementToBounds(
                { ...p, xM: snapValue(p.xM + dx, snapStepM), yM: snapValue(p.yM + dy, snapStepM), zSource: 'user' },
                bounds,
                map.gridStepM,
              )
            : p,
        ),
        updatedAt: new Date().toISOString(),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, bounds, selectedIds, editMode, snapStepM]);

  if (!currentSpace) {
    return (
      <EmptyCard
        title="Нет пространства"
        body="Создайте помещение с размерами — QBX нарисует карту в масштабе."
      />
    );
  }

  if (!bounds) {
    return (
      <div className="space-y-4">
        <HeaderTitle name={currentSpace.name} />
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 max-w-lg">
          <h2 className="text-sm font-bold">Задайте размеры помещения</h2>
          <p className="text-xs text-slate-500 mt-1">Например 4 × 6 × 2.8 м — карта появится автоматически.</p>
          <form
            className="mt-4 grid grid-cols-3 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const dimensions: SpaceDimensions = {
                lengthM: Number(lengthM),
                widthM: Number(widthM),
                heightM: Number(heightM),
              };
              if (dimensions.lengthM > 0 && dimensions.widthM > 0 && dimensions.heightM > 0) {
                updateSpaceDimensions(currentSpace.id, dimensions);
              }
            }}
          >
            {[
              { label: 'Длина', value: lengthM, set: setLengthM },
              { label: 'Ширина', value: widthM, set: setWidthM },
              { label: 'Высота', value: heightM, set: setHeightM },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-[11px] font-bold text-slate-500">{field.label}, м</label>
                <input
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="mt-1 w-full px-2 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
                />
              </div>
            ))}
            <button type="submit" className="col-span-3 mt-2 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600">
              Нарисовать карту
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!map) return null;

  const metrics = computeSpaceMetrics(bounds);
  const activePlant = currentSpacePlants.find((p) => p.id === plantCardId) ?? null;
  const activePlacement = map.placements.find((p) => p.plantId === plantCardId);
  const empty = map.placements.length === 0 && !manualMode && !wizard;
  const is3d = mapViewMode === '3d';
  const liveLabels = useMemo(() => {
    const out: Record<string, import('../../domain/map/live-twin-label').LiveTwinLabel> = {};
    for (const p of map.placements) {
      const label = buildLiveTwinLabel(p, currentSpaceDevices, runtimeSnapshot, { emergencyOff: isEmergencyActive });
      if (label) out[p.id] = label;
    }
    return out;
  }, [map.placements, currentSpaceDevices, runtimeSnapshot, isEmergencyActive]);
  const intelligenceContext = useMemo(
    () =>
      buildIntelligenceSpatialContext({
        space: currentSpace,
        map,
        devices: currentSpaceDevices,
      }),
    [currentSpace, map, currentSpaceDevices],
  );
  const mapSensorCount = map.placements.filter((p) => p.kind === 'sensor').length;
  const mapPlantCount = map.placements.filter((p) => p.kind === 'plant' || p.kind === 'plant_group').length;
  const mapEquipmentCount = map.placements.filter(
    (p) => p.kind === 'equipment' || p.kind === 'light' || p.kind === 'hub',
  ).length;
  const activeHeatmap = useMemo(() => {
    if (heatmapMetric === 'off') return null;
    return buildHeatmap({
      metric: heatmapMetric,
      map,
      devices: currentSpaceDevices,
    });
  }, [heatmapMetric, map, currentSpaceDevices]);
  const liveTwin = selected[0] ? liveLabels[selected[0].id] ?? null : null;
  const liveLabel = liveTwin?.compact ?? null;
  const selectedPlacement = selected[0] ?? null;
  const boundOutput = selectedPlacement?.outputId && selectedPlacement.deviceId
    ? (() => {
        const device = currentSpaceDevices.find((d) => d.id === selectedPlacement.deviceId);
        const output = device?.outputs.find((o) => o.id === selectedPlacement.outputId);
        return device && output ? { device, output } : null;
      })()
    : null;
  const outputTwinMode = boundOutput ? resolveOutputTwinMode(boundOutput.output) : null;
  const outputControlStatus = boundOutput
    ? resolveOutputControlStatus({
        outputId: boundOutput.output.id,
        output: boundOutput.output,
        runtime: runtimeSnapshot?.outputStates[boundOutput.output.id],
        events: runtimeEvents,
      })
    : null;
  const mapOutputControlProps = boundOutput
    ? {
        outputTwinMode,
        outputControlStatus,
        onOutputTwinModeChange: (mode: import('../../domain/equipment/output-twin-mode').OutputTwinMode) =>
          setOutputTwinMode(boundOutput.device.id, boundOutput.output.id, mode),
        outputControlDisabled: isReadOnly,
      }
    : {};
  const electrical = proposeLogicalPowerLinks(map);
  const irrigation = buildIrrigationGraph(map);
  const warnings = validateSpatialMap(map, bounds);

  const outdoorSite = map.environmentPreset ? isOutdoorPreset(map.environmentPreset) : false;

  const handleMapViewModeChange = (mode: '2d' | '3d') => {
    if (mode === '3d' && !isFeatureAvailable('3D_DIGITAL_TWIN')) {
      requestUpgrade('3D_DIGITAL_TWIN');
      return;
    }
    setMapViewMode(mode);
  };

  const handleHeatmapMetricChange = (metric: HeatmapMetricOption) => {
    if (metric !== 'off' && !isFeatureAvailable('SPATIAL_HEATMAP')) {
      requestUpgrade('SPATIAL_HEATMAP');
      return;
    }
    setHeatmapMetric(metric);
  };

  return (
    <div className="space-y-4 overflow-x-hidden">
      <SpaceBreadcrumb spaces={spaces} currentSpaceId={currentSpace.id} onNavigate={setCurrentSpaceId} />
      <div className="flex items-start justify-between gap-3">
        <HeaderTitle
          name={currentSpace.name}
          subtitle={`${bounds.lengthM} × ${bounds.widthM} × ${bounds.heightM} м · ${metrics.areaM2} м²`}
        />
        <NorthCompass northAngleDeg={map.northOffsetDeg ?? 0} className="shrink-0 mt-1" />
      </div>
      {isReadOnly && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          Режим просмотра — редактирование карты и управление выходами недоступны.
        </p>
      )}
      <div className="relative">
        <MapToolbar
          mapViewMode={mapViewMode}
          onMapViewModeChange={handleMapViewModeChange}
          spatialMode={spatialMode}
          onSpatialModeChange={setSpatialMode}
          editMode={editMode}
          onEditModeChange={setEditMode}
          showGrid={showGrid}
          onShowGridChange={setShowGrid}
          snapStepM={snapStepM}
          onSnapStepChange={setSnapStepM}
          onFitToRoom={() => fitCanvasRef.current?.()}
          onOpenLayers={() => setLayersOpen((v) => !v)}
          onOpenAdd={() => setAddMenuOpen(true)}
          onUndo={undo}
          onRedo={redo}
          readOnly={isReadOnly}
          saveState={saveState}
        />
        <MapLayersPopover
          open={layersOpen}
          onClose={() => setLayersOpen(false)}
          layers={layers}
          onChange={(id, value) => setLayers((prev) => ({ ...prev, [id]: value }))}
        />
        <MapAddMenu open={addMenuOpen} onClose={() => setAddMenuOpen(false)} unboundPorts={unboundPorts} onSelect={handleAddAction} />
      </div>
      <MapSummaryBar
        bounds={bounds}
        zoneCount={map.zones.length}
        plantCount={mapPlantCount}
        sensorCount={mapSensorCount}
        equipmentCount={mapEquipmentCount}
        spatial={intelligenceContext}
        saveState={saveState}
      />
      <SubscriptionGuard feature="AI_GROW_ADVISOR">
        <TwinAiAdvisorWidget
          growContext={growContext}
          disabled={isReadOnly}
          onAsk={(prompt) => {
            if (!isFeatureAvailable('AI_GROW_ADVISOR')) {
              requestUpgrade('AI_GROW_ADVISOR');
              return;
            }
            setIsAgentOpen(true);
            void askAgentQuestion(prompt);
          }}
        />
      </SubscriptionGuard>
      <SubscriptionGuard feature="SPATIAL_INTELLIGENCE">
        <SpatialInsightsPanel
          context={intelligenceContext}
          readOnly={isReadOnly}
          onShowSuggestion={(position, insight) => {
            if (mapViewMode === '3d') handleMapViewModeChange('2d');
            setInsightMarker({ xM: position.xM, yM: position.yM, label: insight.title });
            fitCanvasRef.current?.();
          }}
          onAskAgent={(prompt) => {
            if (!isFeatureAvailable('AI_GROW_ADVISOR')) {
              requestUpgrade('AI_GROW_ADVISOR');
              return;
            }
            setIsAgentOpen(true);
            void askAgentQuestion(prompt);
          }}
        />
      </SubscriptionGuard>
      <MapHeatmapBar metric={heatmapMetric} onMetricChange={handleHeatmapMetricChange} heatmap={activeHeatmap} />
      {ghostPlacement && (
        <p className="text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-xl px-3 py-2">
          Кликните на карте, чтобы поставить «{ghostPlacement.label ?? ghostPlacement.kind}». Esc — отмена.
        </p>
      )}
      {is3d && show3dHint && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-100">
          Ваше пространство создано из 2D-карты.
          <button type="button" className="ml-2 font-semibold" onClick={() => setShow3dHint(false)}>
            Понятно
          </button>
        </div>
      )}
      {is3d && editMode && editHint && (
        <div className="rounded-xl bg-slate-50 dark:bg-zinc-900 px-3 py-2 text-xs text-slate-600">
          Перетащите объект, чтобы изменить его положение.
          <button type="button" className="ml-2 font-semibold" onClick={() => setEditHint(false)}>
            Понятно
          </button>
        </div>
      )}
      {groupForm && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 space-y-2 max-w-md">
          <p className="text-xs font-bold">Группа растений (одна сущность)</p>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-[11px]">Ряды<input value={groupForm.rows} onChange={(e) => setGroupForm({ ...groupForm, rows: e.target.value })} className="mt-1 w-full px-2 py-1.5 rounded-lg border text-sm" /></label>
            <label className="text-[11px]">Колонки<input value={groupForm.cols} onChange={(e) => setGroupForm({ ...groupForm, cols: e.target.value })} className="mt-1 w-full px-2 py-1.5 rounded-lg border text-sm" /></label>
            <label className="text-[11px]">Шаг, м<input value={groupForm.spacing} onChange={(e) => setGroupForm({ ...groupForm, spacing: e.target.value })} className="mt-1 w-full px-2 py-1.5 rounded-lg border text-sm" /></label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
              onClick={() => {
                const rows = Math.max(1, Number(groupForm.rows) || 1);
                const cols = Math.max(1, Number(groupForm.cols) || 1);
                const spacing = Number(groupForm.spacing) || 0.45;
                const foot = plantGroupFootprintM(rows, cols, spacing, spacing);
                addPlacement({
                  kind: 'plant_group',
                  label: `Группа ${rows}×${cols}`,
                  groupRows: rows,
                  groupCols: cols,
                  spacingXM: spacing,
                  spacingYM: spacing,
                  widthM: foot.widthM,
                  heightM: foot.heightM,
                  sizeZM: 0.5,
                  mounting: 'floor',
                });
                setGroupForm(null);
              }}
            >
              Создать
            </button>
            <button type="button" className="px-3 py-2 text-xs" onClick={() => setGroupForm(null)}>
              Отмена
            </button>
          </div>
        </div>
      )}
      {wizard && (
        <MapAgentWizard
          busy={busyGen}
          onCancel={() => setWizard(false)}
          onGenerate={(description) => {
            setBusyGen(true);
            void generateMapBlueprint(`${currentSpace.name}. ${bounds.lengthM}×${bounds.widthM}×${bounds.heightM} м. ${description}`, {
              settings: aiSettings,
            }).then((result) => {
              setBusyGen(false);
              if (result.ok) {
                setPreview({ blueprint: result.blueprint, layout: layoutFromBlueprint(result.blueprint, currentSpace.id) });
              }
            });
          }}
        />
      )}
      {pickTemplate && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 space-y-3">
          <p className="text-xs font-bold">Шаблон для этого помещения</p>
          <PlantSetupAgeField
            ageDays={templatePlantAgeDays}
            description={currentSpace.name}
            growMethod="pots"
            onChange={setTemplatePlantAgeDays}
            compact
          />
          <div className="flex flex-wrap gap-1.5">
            {SPACE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="px-2 py-1.5 rounded-lg text-[11px] bg-slate-100 dark:bg-zinc-800"
                onClick={() => {
                  void applyMapLayout(
                    generateSpaceLayout({
                      spaceId: currentSpace.id,
                      spaceType: p.spaceType,
                      dimensions: bounds,
                      growMethod: p.growMethod,
                      plantCount: p.plantCount,
                      equipment: p.equipment,
                      rackCount: p.rackCount,
                      templateId: p.id,
                      plantAgeDays: templatePlantAgeDays > 0 ? templatePlantAgeDays : undefined,
                    }),
                  );
                  setPickTemplate(false);
                  setManualMode(true);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          <button type="button" className="text-[11px] text-slate-500" onClick={() => setPickTemplate(false)}>
            Отмена
          </button>
        </div>
      )}
      {is3d ? (
        <div className="space-y-3 relative">
          <React.Suspense fallback={<div className="h-[380px] rounded-2xl bg-stone-100 animate-pulse" />}>
            <Spatial3DView
                  bounds={bounds}
                  map={map}
                  devices={currentSpaceDevices}
                  selectedIds={selectedIds}
                  onSelect={setSelectedIds}
                  layers={layers}
                  cameraPreset={cameraPreset}
                  onCameraPreset={setCameraPreset}
                  emergencyOff={isEmergencyActive}
                  spaceType={currentSpace.type}
                  editMode={editMode}
                  snapStepM={snapStepM}
                  focusId={focusTick ? selectedIds[0] : null}
                  electrical={electrical}
                  irrigation={irrigation}
                  growPhase={growPhase}
                  cropStartedAt={cropProfile?.startedAt}
                  plants={currentSpacePlants}
                  liveLabels={liveLabels}
                  liveLabelsMode={liveLabelsMode}
                  darkUi={theme === 'dark'}
                  growthPreview={growthPreview}
                  onPlacementChange={(placement) =>
                    commit(
                      {
                        ...map,
                        placements: map.placements.map((p) => (p.id === placement.id ? clampPlacementToBounds(placement, bounds, map.gridStepM) : p)),
                        updatedAt: new Date().toISOString(),
                      },
                      false,
                      false,
                    )
                  }
                  onDragEnd={persistDraft}
                />
          </React.Suspense>
          {warnings.length > 0 && (
            <p className="text-[11px] text-amber-700 mt-1">{warnings[0]?.message}{warnings.length > 1 ? ` · ещё ${warnings.length - 1}` : ''}</p>
          )}
          {layers.electrical && (
            <p className="text-[10px] text-amber-800 mt-1">{electrical.disclaimer}</p>
          )}
          <MapContextToolbar
            selected={selected}
            editMode={editMode && !isReadOnly}
            onDuplicate={duplicateSelected}
            onDelete={() => {
              commit({ ...map, placements: map.placements.filter((p) => !selectedIds.includes(p.id)), updatedAt: new Date().toISOString() });
              setSelectedIds([]);
            }}
            onInspect={() => {
              const item = selected[0];
              if (item?.plantId) setPlantCardId(item.plantId);
            }}
          />
          {selected.length > 0 && (
            <aside className="mt-3 lg:absolute lg:right-0 lg:top-0 lg:w-80 lg:z-10 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-20 max-lg:z-30 max-lg:max-h-[45vh] max-lg:overflow-auto">
              <MapInspector
                selected={selected}
                zones={map.zones}
                plants={currentSpacePlants}
                readOnly={!editMode || isReadOnly}
                growPhase={growPhase}
                cropStartedAt={cropProfile?.startedAt}
                liveLabel={liveLabel}
                liveTwin={liveTwin}
                devices={currentSpaceDevices}
                map={map}
                allowBind
                onBind={applyBind}
                onUnbind={applyUnbind}
                onOpenDevice={(id) => {
                  const device = currentSpaceDevices.find((d) => d.id === id);
                  if (device) setSelectedDeviceDetail(device);
                }}
                onOpenChildSpace={setCurrentSpaceId}
                onFocus={() => setFocusTick((n) => n + 1)}
                onDuplicate={duplicateSelected}
                onChange={(placement) =>
                  commit({
                    ...map,
                    placements: map.placements.map((p) => (p.id === placement.id ? clampPlacementToBounds(placement, bounds, snapStepM || map.gridStepM) : p)),
                    updatedAt: new Date().toISOString(),
                  })
                }
                onDelete={(ids) => {
                  commit({ ...map, placements: map.placements.filter((p) => !ids.includes(p.id)), updatedAt: new Date().toISOString() });
                  setSelectedIds([]);
                }}
                onCreateZone={createZoneFromSelection}
                onCreateGroup={createGroupFromSelection}
                onOpenPlant={setPlantCardId}
                onUpdatePlant={(id, updates) => updatePlant(id, updates)}
                growthPreviewDays={growthPreviewDays}
                growthPreviewPlaying={growthPreviewPlaying}
                onGrowthPreviewChange={setGrowthPreviewDays}
                onGrowthPreviewPlayingChange={setGrowthPreviewPlaying}
                onAskAgent={() => {
                  setIsAgentOpen(true);
                  void askAgentQuestion('Оцени 3D-конфигурацию пространства: зоны, датчики, свет. Не выдумывай показания.');
                }}
                {...mapOutputControlProps}
              />
              <MapMinimap bounds={bounds} map={map} selectedIds={selectedIds} />
            </aside>
          )}
          <ZoneStateBar
            devices={currentSpaceDevices}
            zoneName={map.zones.find((z) => selected.some((s) => s.zoneId === z.id))?.name ?? map.zones[0]?.name}
            emergencyOff={isEmergencyActive}
          />
        </div>
      ) : (
      <div className="relative">
        <GrowMapCanvas
          bounds={bounds}
          map={map}
          plants={currentSpacePlants}
          growPhase={growPhase}
          cropStartedAt={cropProfile?.startedAt}
          northAngleDeg={map.northOffsetDeg ?? 0}
          selectedIds={selectedIds}
          onSelect={(ids, additive) => {
            setInsightMarker(null);
            setSelectedIds(additive ? Array.from(new Set([...selectedIds, ...ids])) : ids);
          }}
          onPlacementsChange={(placements) => commit({ ...map, placements, updatedAt: new Date().toISOString() }, false)}
          onZonesChange={(zones) => commit({ ...map, zones, updatedAt: new Date().toISOString() })}
          onPlantActivate={setPlantCardId}
          onCommit={persistDraft}
          showGrid={showGrid}
          snapStepM={snapStepM}
          editMode={editMode && !isReadOnly}
          layers={layers}
          ghostPlacement={ghostPlacement}
          onGhostMove={(xM, yM) => ghostPlacement && setGhostPlacement({ ...ghostPlacement, xM, yM })}
          onGhostPlace={placeGhost}
          suggestionMarker={insightMarker}
          heatmap={activeHeatmap}
          growthPreview={growthPreview}
          onFitReady={(fit) => {
            fitCanvasRef.current = fit;
          }}
        />
        <MapContextToolbar
          selected={selected}
          editMode={editMode && !isReadOnly}
          onDuplicate={duplicateSelected}
          onDelete={() => {
            commit({ ...map, placements: map.placements.filter((p) => !selectedIds.includes(p.id)), updatedAt: new Date().toISOString() });
            setSelectedIds([]);
          }}
          onInspect={() => {
            const item = selected[0];
            if (item?.plantId) setPlantCardId(item.plantId);
          }}
        />
        {selected.length > 0 && (
          <aside className="mt-3 lg:mt-0 lg:absolute lg:right-0 lg:top-0 lg:w-80 lg:max-h-full lg:overflow-auto lg:z-10 max-lg:fixed max-lg:inset-x-3 max-lg:bottom-20 max-lg:z-30 max-lg:max-h-[45vh] max-lg:overflow-auto">
            <MapInspector
              selected={selected}
              zones={map.zones}
              plants={currentSpacePlants}
              readOnly={!editMode || isReadOnly}
              growPhase={growPhase}
              cropStartedAt={cropProfile?.startedAt}
              liveLabel={liveLabel}
              liveTwin={liveTwin}
              devices={currentSpaceDevices}
              map={map}
              allowBind
              onBind={applyBind}
              onUnbind={applyUnbind}
              onOpenDevice={(id) => {
                const device = currentSpaceDevices.find((d) => d.id === id);
                if (device) setSelectedDeviceDetail(device);
              }}
              onOpenChildSpace={setCurrentSpaceId}
              onChange={(placement) =>
                commit({
                  ...map,
                  placements: map.placements.map((p) => (p.id === placement.id ? clampPlacementToBounds(placement, bounds, snapStepM || map.gridStepM) : p)),
                  updatedAt: new Date().toISOString(),
                })
              }
              onDelete={(ids) => {
                commit({ ...map, placements: map.placements.filter((p) => !ids.includes(p.id)), updatedAt: new Date().toISOString() });
                setSelectedIds([]);
              }}
              onCreateZone={createZoneFromSelection}
              onCreateGroup={createGroupFromSelection}
              onOpenPlant={setPlantCardId}
              onUpdatePlant={(id, updates) => updatePlant(id, updates)}
              growthPreviewDays={growthPreviewDays}
              growthPreviewPlaying={growthPreviewPlaying}
              onGrowthPreviewChange={setGrowthPreviewDays}
              onGrowthPreviewPlayingChange={setGrowthPreviewPlaying}
              onAskAgent={() => {
                const ctx = buildSpatialContext({
                  space: currentSpace,
                  map,
                  plants: currentSpacePlants,
                  devices: currentSpaceDevices,
                  growPhase,
                  cropStartedAt: cropProfile?.startedAt,
                });
                setIsAgentOpen(true);
                void askAgentQuestion(
                  `Контекст карты: ${ctx.summary.plantCount} растений, ${ctx.summary.devicePlacementCount} объектов, ${ctx.summary.zoneCount} зон. Оцени геометрию и покрытие датчиками. Не выдумывай показания.`,
                );
              }}
              {...mapOutputControlProps}
            />
          </aside>
        )}
      </div>
      )}
      {preview && (
        <BlueprintPreviewModal
          open
          blueprint={preview.blueprint}
          layout={preview.layout}
          spaceId={currentSpace.id}
          matches={matchBlueprintToDevices(preview.blueprint, currentSpaceDevices)}
          onClose={() => setPreview(null)}
          onApply={(layout, links) => {
            const nextPlacements = layout.map.placements.map((p) => {
              const link = links[p.id];
              return link ? { ...p, ...link } : p;
            });
            void applyMapLayout({ ...layout, map: { ...layout.map, placements: nextPlacements } });
            setPreview(null);
            setWizard(false);
            setManualMode(true);
          }}
        />
      )}
      <PlantCardModal
        plant={activePlant}
        placement={activePlacement}
        onClose={() => setPlantCardId(null)}
        onSave={(plant) => {
          updatePlant(plant.id, plant);
          setPlantCardId(null);
        }}
      />
    </div>
  );
};

function snapCenter(span: number, size: number) {
  return Math.max(0, (span - size) / 2);
}

function nextPlantName(count: number) {
  return `Растение #${count + 1}`;
}

function HeaderTitle({ name, subtitle }: { name: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-zinc-800">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
        <MapIcon className="w-4 h-4" />
      </div>
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Карта</h1>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {name}
          {subtitle ? ` · ${subtitle}` : ''}
        </p>
      </div>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="py-14 px-4 rounded-2xl border border-dashed border-slate-300 dark:border-zinc-800 text-center bg-white dark:bg-zinc-900 max-w-lg mx-auto">
      <Plus className="w-5 h-5 mx-auto text-emerald-600 mb-2" />
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="text-xs text-slate-500 mt-1">{body}</p>
    </div>
  );
}
