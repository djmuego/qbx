import { getRuntimeMode } from '../../config/runtime-mode';
import type { GrowContext, SensorObservation } from '../../domain/ai/grow-context.types';
import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { CropProfile } from '../../domain/grow/crop-profile.types';
import { GROW_PHASES, type GrowPhaseId } from '../../domain/grow/grow-phase.types';
import type { GrowRun } from '../../domain/grow/grow-run.types';
import { mapGrowPhaseToStage, GROW_STAGE_LABELS, type GrowStageId } from '../../domain/grow/grow-stage.types';
import { buildGrowProfileTargets } from './grow-profile.catalog';
import type { GrowTargets } from '../../domain/grow/grow-targets.types';
import type { Space } from '../../domain/space/space.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { Plant } from '../../domain/grow/plant.types';
import type { SensorHistoryPoint } from '../../domain/sensor/sensor.types';
import type { RuntimeEvent } from '../../runtime/types/events.types';
import { QBX_GROW_AGENT_PROMPT_VERSION } from './prompts/grow-agent.system';
import { calculateDewPoint, calculateDliPlaceholder, calculateVpd } from './derived-metrics';
import { summarizeSensorHistory } from './telemetry-summary';
import { toGeometrySnapshot } from '../../domain/map/space-map.geometry';
import { spatialScaleForType } from '../../domain/map/spatial-hierarchy';

export interface BuildGrowContextInput {
  space: Space | undefined;
  growPhase: GrowPhaseId;
  cropProfile?: CropProfile | null;
  growRun?: GrowRun | null;
  devices: Device[];
  automations: Automation[];
  isEmergencyActive: boolean;
  getSensorHistory: (sensorId: string) => SensorHistoryPoint[];
  recentEvents?: RuntimeEvent[];
  userNotes?: string;
  spaceMap?: SpaceMap | null;
  plants?: Plant[];
}

function buildTargets(growPhase: GrowPhaseId, cropProfile?: CropProfile | null): GrowTargets {
  const phase = GROW_PHASES[growPhase] ?? GROW_PHASES.vegetation;
  const stageId = mapGrowPhaseToStage(growPhase);
  const source = cropProfile?.commonName ? 'crop' : 'stage';

  const parseRange = (text: string): { min?: number; max?: number } => {
    const nums = text.match(/[\d.]+/g)?.map(Number) ?? [];
    if (nums.length >= 2) return { min: nums[0], max: nums[1] };
    if (nums.length === 1) return { preferred: nums[0] } as { min?: number; max?: number };
    return {};
  };

  const base: GrowTargets = {
    temperatureDay: { ...parseRange(phase.targetTemp), unit: '°C' },
    humidity: { ...parseRange(phase.targetHumidity), unit: '%' },
    photoperiod: phase.lightCycle,
    source,
  };

  if (cropProfile?.cropId) {
    return buildGrowProfileTargets(cropProfile.cropId, stageId, base);
  }
  return base;
}

function buildSensorObservation(
  device: Device,
  sensor: Device['inputs'][number],
  capturedAtMs: number,
): SensorObservation {
  const hasLive = device.isOnline && Number.isFinite(sensor.currentValue);
  let quality: SensorObservation['quality'] = 'missing';
  if (!device.isOnline) quality = 'error';
  else if (hasLive) quality = 'fresh';
  else if (Number.isFinite(sensor.value)) quality = 'stale';

  return {
    id: sensor.id,
    name: sensor.customName,
    type: sensor.type,
    available: sensor.type !== 'unused',
    value: hasLive ? sensor.currentValue : null,
    unit: sensor.unit,
    quality,
    timestampMs: hasLive ? capturedAtMs : null,
    optimalMin: sensor.optimalMin,
    optimalMax: sensor.optimalMax,
    status: hasLive ? sensor.status : 'no_data',
    dataKind: hasLive ? 'FACT' : quality === 'stale' ? 'FACT' : 'UNKNOWN',
    deviceId: device.id,
    deviceOnline: device.isOnline,
  };
}

export function buildGrowContext(input: BuildGrowContextInput): GrowContext {
  const capturedAtMs = Date.now();
  const runtimeMode = getRuntimeMode();
  const dataSource = runtimeMode === 'simulator' ? 'simulator' : 'hardware';
  const spaceDevices = input.space ? input.devices.filter((d) => d.spaceId === input.space!.id) : [];

  const sensors: SensorObservation[] = [];
  for (const device of spaceDevices) {
    for (const sensor of device.inputs) {
      if (sensor.type === 'unused') continue;
      sensors.push(buildSensorObservation(device, sensor, capturedAtMs));
    }
  }

  const telemetrySummary = sensors
    .filter((s) => s.available)
    .map((s) => {
      const history = input.getSensorHistory(s.id);
      return summarizeSensorHistory(
        s.id,
        s.type,
        history,
        s.value,
        s.optimalMin,
        s.optimalMax,
      );
    });

  const stageId = input.growRun?.stage ?? mapGrowPhaseToStage(input.growPhase);
  const phase = GROW_PHASES[input.growPhase] ?? GROW_PHASES.vegetation;
  const targets = buildTargets(input.growPhase, input.cropProfile);

  const tempSensor = sensors.find((s) => s.type === 'temperature' && s.value != null);
  const rhSensor = sensors.find((s) => s.type === 'humidity' && s.value != null);

  const derivedMetrics = [
    calculateVpd(tempSensor?.value ?? null, rhSensor?.value ?? null, targets.vpd),
    calculateDewPoint(tempSensor?.value ?? null, rhSensor?.value ?? null),
    calculateDliPlaceholder(),
  ];

  const equipment = spaceDevices.flatMap((device) =>
    device.outputs
      .filter((o) => o.type !== 'unused')
      .map((output) => ({
        deviceId: device.id,
        deviceName: device.customName,
        outputId: output.id,
        name: output.customName,
        type: output.type,
        role: output.type,
        reportedState: device.isOnline ? output.state : null,
        controlMode: output.isAuto ? ('auto' as const) : ('manual' as const),
        deviceOnline: device.isOnline,
        activeAutomationName: output.activeAutomationName,
        dataKind: 'FACT' as const,
      })),
  );

  const automationItems = input.automations
    .filter((a) => !input.space || a.spaceId === input.space.id)
    .map((a) => {
      let conditionSummary = '';
      let actionSummary = `${a.actionType === 'turn_on' ? 'Включить' : 'Выключить'} ${a.equipmentName}`;
      if (a.type === 'sensor') {
        conditionSummary = `${a.sensorName ?? 'Датчик'} ${a.condition === 'below' ? '<' : '>'} ${a.threshold}${a.thresholdUnit ?? ''}`;
      } else if (a.type === 'schedule') {
        conditionSummary = `${a.onTime ?? '07:00'}–${a.offTime ?? '21:00'}`;
      } else {
        conditionSummary = `Каждые ${a.intervalMinutes ?? 60} мин`;
      }
      return {
        id: a.id,
        name: a.name,
        type: a.type,
        enabled: a.isEnabled,
        runtimeStatus: a.runtimeStatus,
        conditionSummary,
        actionSummary,
        dataKind: 'FACT' as const,
      };
    });

  const missingSensorTypes = ['temperature', 'humidity', 'soil_moisture', 'co2', 'light', 'ph', 'ec'].filter(
    (type) => !sensors.some((s) => s.type === type && s.available),
  );

  const staleSensors = sensors.filter((s) => s.quality === 'stale').map((s) => s.name);
  const hasLive = sensors.some((s) => s.quality === 'fresh' && s.value != null);
  const offlineDevices = spaceDevices.filter((d) => !d.isOnline).length;

  let confidenceHint: 'high' | 'medium' | 'low' = 'low';
  if (!input.space || spaceDevices.length === 0) confidenceHint = 'low';
  else if (!hasLive) confidenceHint = 'low';
  else if (missingSensorTypes.length <= 2 && offlineDevices === 0) confidenceHint = 'high';
  else confidenceHint = 'medium';

  const recentEvents = (input.recentEvents ?? [])
    .filter((e) => !input.space?.id || !e.spaceId || e.spaceId === input.space.id)
    .slice(-20)
    .map((e) => ({
      id: e.id,
      type: e.type,
      timestampMs: e.timestampMs,
      message: e.message,
      deviceId: e.deviceId,
      sensorId: e.sensorId,
      outputId: e.outputId,
      automationId: e.automationId,
      dataKind: 'FACT' as const,
    }));

  return {
    meta: {
      capturedAtMs,
      promptVersion: QBX_GROW_AGENT_PROMPT_VERSION,
      dataSource,
      runtimeMode,
      agentMode: 'advise',
    },
    space: input.space
      ? {
          id: input.space.id,
          name: input.space.name,
          type: input.space.type,
          lengthM: input.space.dimensions?.lengthM,
          widthM: input.space.dimensions?.widthM,
          heightM: input.space.dimensions?.heightM,
          areaM2: input.space.areaM2,
          volumeM3: input.space.volumeM3,
          timezone: input.space.timezone,
          description: input.space.description,
          geometry: input.space.dimensions
            ? toGeometrySnapshot(input.space.dimensions, input.spaceMap)
            : undefined,
        }
      : null,
    crop: input.cropProfile
      ? {
          cropId: input.cropProfile.cropId,
          commonName: input.cropProfile.commonName,
          scientificName: input.cropProfile.scientificName,
          cultivar: input.cropProfile.cultivar,
          medium: input.cropProfile.medium,
          startedAt: input.cropProfile.startedAt,
          notes: input.cropProfile.notes,
          dataKind: 'FACT',
        }
      : { dataKind: 'UNKNOWN' },
    growStage: {
      stageId,
      stageName: GROW_STAGE_LABELS[stageId],
      legacyGrowPhase: phase.name,
      dataKind: 'FACT',
    },
    growRun: input.growRun
      ? {
          id: input.growRun.id,
          commonName: input.growRun.commonName,
          startedAt: input.growRun.startedAt,
          dataKind: 'FACT',
        }
      : { dataKind: 'UNKNOWN' },
    environment: {
      sensors: sensors.filter((s) => ['temperature', 'humidity', 'co2', 'light', 'pressure'].includes(s.type)),
      derivedMetrics,
      telemetrySummary,
    },
    substrate: {
      soilMoistureSensors: sensors.filter((s) => s.type === 'soil_moisture'),
    },
    lighting: {
      lightSensors: sensors.filter((s) => s.type === 'light'),
      photoperiodHint: phase.lightCycle,
    },
    irrigation: {
      waterLevelSensors: sensors.filter((s) => s.type === 'water_level'),
      wateringOutputs: equipment.filter((e) => e.type === 'watering' || e.type === 'valve'),
    },
    equipment,
    automations: automationItems,
    alerts: {
      emergencyActive: input.isEmergencyActive,
      dataKind: 'FACT',
    },
    targets,
    recentEvents,
    userNotes: input.userNotes,
    plants: (input.plants ?? []).map((plant) => ({
      id: plant.id,
      name: plant.name,
      cultivar: plant.cultivar,
      potVolumeL: plant.potVolumeL,
      medium: plant.medium,
      plantedAt: plant.plantedAt,
      zoneId: plant.zoneId,
      growRunId: plant.growRunId,
    })),
    dataQuality: {
      hasSpace: Boolean(input.space),
      hasDevices: spaceDevices.length > 0,
      hasLiveSensorData: hasLive,
      hasOutputs: equipment.length > 0,
      hasAutomations: automationItems.length > 0,
      hasCropProfile: Boolean(input.cropProfile?.commonName),
      hasGrowRun: Boolean(input.growRun),
      missingSensors: missingSensorTypes,
      staleSensors,
      offlineDevices,
      confidenceHint,
    },
    spatialTwin: input.spaceMap && input.space?.dimensions
      ? {
          scale: input.space.spatialScale ?? spatialScaleForType(input.space.type, input.space.areaM2),
          roomDimensions: input.space.dimensions,
          plants: input.spaceMap.placements
            .filter((p) => p.kind === 'plant' || p.kind === 'plant_group')
            .map((p) => ({ id: p.id, name: p.label, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
          plantGroups: (input.plants ?? []).length
            ? [{ id: 'all', name: 'Растения', count: (input.plants ?? []).length }]
            : [],
          equipmentPositions: input.spaceMap.placements
            .filter((p) => p.kind === 'equipment' || p.kind === 'hub')
            .map((p) => ({ id: p.id, role: p.role, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
          sensorPositions: input.spaceMap.placements
            .filter((p) => p.kind === 'sensor')
            .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
          lightPositions: input.spaceMap.placements
            .filter((p) => p.kind === 'light')
            .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
          irrigationPositions: input.spaceMap.placements
            .filter((p) => p.kind === 'irrigation')
            .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
          zones: input.spaceMap.zones.map((z) => ({ id: z.id, name: z.name })),
          relationships: input.spaceMap.relationships ?? [],
          mounting: input.spaceMap.placements.map((p) => ({ id: p.id, mounting: p.mounting, zM: p.zM ?? 0 })),
          electrical: input.spaceMap.electrical
            ? { totalRatedW: input.spaceMap.electrical.totalRatedW, linkCount: input.spaceMap.electrical.links.length, disclaimer: input.spaceMap.electrical.disclaimer }
            : undefined,
        }
      : undefined,
  };
}

export { formatGrowContextForPrompt as formatSnapshotForPrompt } from './telemetry-summary';
