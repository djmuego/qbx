import { getRuntimeMode } from '../../config/runtime-mode';
import { GROW_PHASES } from '../../domain/grow/grow-phase.types';
import type {
  QbxAutomationSnapshot,
  QbxOutputSnapshot,
  QbxSensorSnapshot,
  QbxSystemSnapshot,
} from '../../domain/ai/agent.types';
import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { GrowPhaseId } from '../../domain/grow/grow-phase.types';
import type { Space } from '../../domain/space/space.types';

export interface BuildAgentContextInput {
  space: Space | undefined;
  growPhase: GrowPhaseId;
  devices: Device[];
  automations: Automation[];
  isEmergencyActive: boolean;
}

export function buildSystemSnapshot(input: BuildAgentContextInput): QbxSystemSnapshot {
  const phase = GROW_PHASES[input.growPhase] ?? GROW_PHASES.vegetation;
  const spaceDevices = input.space ? input.devices.filter((d) => d.spaceId === input.space!.id) : [];

  const sensors: QbxSensorSnapshot[] = [];
  for (const device of spaceDevices) {
    for (const sensor of device.inputs) {
      if (sensor.type === 'unused') continue;
      const hasLiveData = Number.isFinite(sensor.currentValue);
      sensors.push({
        id: sensor.id,
        name: sensor.customName,
        type: sensor.type,
        value: hasLiveData ? sensor.currentValue : null,
        unit: sensor.unit,
        status: hasLiveData ? sensor.status : 'no_data',
        optimalMin: sensor.optimalMin,
        optimalMax: sensor.optimalMax,
        hasLiveData,
      });
    }
  }

  const outputs: QbxOutputSnapshot[] = [];
  for (const device of spaceDevices) {
    for (const output of device.outputs) {
      if (output.type === 'unused') continue;
      outputs.push({
        id: output.id,
        name: output.customName,
        type: output.type,
        state: device.isOnline ? output.state : null,
        isAuto: output.isAuto ?? output.controlMode === 'auto',
        deviceOnline: device.isOnline,
      });
    }
  }

  const automationSnapshots: QbxAutomationSnapshot[] = input.automations
    .filter((a) => !input.space || a.spaceId === input.space.id)
    .map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      enabled: a.isEnabled,
      runtimeStatus: a.runtimeStatus,
    }));

  const online = spaceDevices.filter((d) => d.isOnline).length;

  return {
    capturedAtMs: Date.now(),
    runtimeMode: getRuntimeMode(),
    space: input.space
      ? {
          id: input.space.id,
          name: input.space.name,
          type: input.space.type,
          areaM2: input.space.areaM2,
          volumeM3: input.space.volumeM3,
          description: input.space.description,
        }
      : null,
    growPhase: input.growPhase,
    growPhaseName: phase.name,
    growPhaseTargets: {
      lightCycle: phase.lightCycle,
      targetTemp: phase.targetTemp,
      targetHumidity: phase.targetHumidity,
    },
    emergencyActive: input.isEmergencyActive,
    devices: {
      total: spaceDevices.length,
      online,
      offline: spaceDevices.length - online,
      names: spaceDevices.map((d) => d.customName),
    },
    sensors,
    outputs,
    automations: automationSnapshots,
    dataAvailability: {
      hasDevices: spaceDevices.length > 0,
      hasLiveSensorData: sensors.some((s) => s.hasLiveData),
      hasOutputs: outputs.length > 0,
      hasAutomations: automationSnapshots.length > 0,
    },
  };
}

export function formatSnapshotForPrompt(snapshot: QbxSystemSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
