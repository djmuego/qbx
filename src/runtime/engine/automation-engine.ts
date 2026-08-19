import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Clock } from '../clock';
import type {
  AutomationRuntimeState,
  OutputRuntimeState,
  SensorReading,
  SpaceRuntimeState,
  TimerRuntimeState,
} from '../types/runtime-state.types';
import { isScheduleActive } from './schedule-utils';

export interface AutomationEngineInput {
  clock: Clock;
  devices: Device[];
  automations: Automation[];
  sensorReadings: Record<string, SensorReading>;
  outputStates: Record<string, OutputRuntimeState>;
  spaceStates: Record<string, SpaceRuntimeState>;
  timerStates: Record<string, TimerRuntimeState>;
  simulationEnabled: boolean;
}

export interface OutputCommand {
  outputId: string;
  deviceId: string;
  spaceId: string;
  desiredState: boolean;
  automationId: string;
  automationName: string;
  priority: number;
}

export interface AutomationEngineResult {
  outputCommands: OutputCommand[];
  automationStates: Record<string, AutomationRuntimeState>;
  timerStates: Record<string, TimerRuntimeState>;
}

export class AutomationEngine {
  evaluate(input: AutomationEngineInput): AutomationEngineResult {
    const automationStates: Record<string, AutomationRuntimeState> = {};
    const timerStates: Record<string, TimerRuntimeState> = { ...input.timerStates };
    const commandsByOutput = new Map<string, OutputCommand[]>();

    for (const automation of input.automations) {
      if (!automation.isEnabled) {
        automationStates[automation.id] = { automationId: automation.id, runtimeStatus: 'disabled' };
        continue;
      }

      const spaceState = input.spaceStates[automation.spaceId];
      if (spaceState?.emergencyActive) {
        automationStates[automation.id] = { automationId: automation.id, runtimeStatus: 'waiting' };
        continue;
      }

      const output = input.outputStates[automation.targetOutputId];
      if (!output) {
        automationStates[automation.id] = {
          automationId: automation.id,
          runtimeStatus: 'error',
          lastError: 'Target output not found',
        };
        continue;
      }

      if (output.spaceId !== automation.spaceId) {
        automationStates[automation.id] = {
          automationId: automation.id,
          runtimeStatus: 'error',
          lastError: 'Output belongs to another space',
        };
        continue;
      }

      if (output.controlMode === 'manual') {
        automationStates[automation.id] = { automationId: automation.id, runtimeStatus: 'waiting' };
        continue;
      }

      const evaluation = evaluateAutomation(automation, input, timerStates);
      timerStates[automation.id] = evaluation.timerState ?? timerStates[automation.id];
      automationStates[automation.id] = {
        automationId: automation.id,
        runtimeStatus: evaluation.runtimeStatus,
        lastError: evaluation.lastError,
      };

      if (evaluation.desiredState === null) continue;

      const desiredState = automation.actionType === 'turn_on' ? evaluation.desiredState : !evaluation.desiredState;
      if (output.state === desiredState) continue;

      const list = commandsByOutput.get(automation.targetOutputId) ?? [];
      list.push({
        outputId: automation.targetOutputId,
        deviceId: automation.targetDeviceId,
        spaceId: automation.spaceId,
        desiredState,
        automationId: automation.id,
        automationName: automation.name,
        priority: automation.priority ?? 0,
      });
      commandsByOutput.set(automation.targetOutputId, list);
    }

    const outputCommands: OutputCommand[] = [];
    for (const [, commands] of commandsByOutput.entries()) {
      commands.sort((a, b) => b.priority - a.priority);
      outputCommands.push(commands[0]);
    }

    return { outputCommands, automationStates, timerStates };
  }
}

interface EvaluationResult {
  desiredState: boolean | null;
  runtimeStatus: AutomationRuntimeState['runtimeStatus'];
  lastError?: string;
  timerState?: TimerRuntimeState;
}

function evaluateAutomation(
  automation: Automation,
  input: AutomationEngineInput,
  timerStates: Record<string, TimerRuntimeState>,
): EvaluationResult {
  switch (automation.type) {
    case 'sensor':
      return evaluateSensorAutomation(automation, input);
    case 'schedule':
      return evaluateScheduleAutomation(automation, input);
    case 'timer':
      return evaluateTimerAutomation(automation, input, timerStates[automation.id]);
    default:
      return { desiredState: null, runtimeStatus: 'error', lastError: 'Unknown automation type' };
  }
}

function evaluateSensorAutomation(automation: Automation, input: AutomationEngineInput): EvaluationResult {
  const sensorId = automation.sensorInputId;
  if (!sensorId) {
    return { desiredState: null, runtimeStatus: 'error', lastError: 'Missing sensor reference' };
  }

  const reading = input.sensorReadings[sensorId];
  if (!reading) {
    return { desiredState: null, runtimeStatus: 'error', lastError: 'Sensor unavailable' };
  }

  if (reading.quality === 'stale' || reading.quality === 'error') {
    return { desiredState: null, runtimeStatus: 'error', lastError: 'Sensor unavailable' };
  }

  const threshold = automation.threshold ?? 0;
  const stopThreshold = automation.stopThreshold ?? threshold;
  const currentOutput = input.outputStates[automation.targetOutputId];
  const currentlyOn = currentOutput?.state ?? false;
  const condition = automation.condition ?? 'below';

  if (condition === 'below') {
    if (reading.value < threshold) {
      return { desiredState: true, runtimeStatus: 'running' };
    }
    if (reading.value >= stopThreshold) {
      return { desiredState: false, runtimeStatus: 'waiting' };
    }
    return { desiredState: currentlyOn, runtimeStatus: currentlyOn ? 'running' : 'waiting' };
  }

  if (reading.value > threshold) {
    return { desiredState: true, runtimeStatus: 'running' };
  }
  if (reading.value <= stopThreshold) {
    return { desiredState: false, runtimeStatus: 'waiting' };
  }
  return { desiredState: currentlyOn, runtimeStatus: currentlyOn ? 'running' : 'waiting' };
}

function evaluateScheduleAutomation(automation: Automation, input: AutomationEngineInput): EvaluationResult {
  const onTime = automation.onTime ?? '07:00';
  const offTime = automation.offTime ?? '21:00';
  const active = isScheduleActive(onTime, offTime, automation.scheduleDays, input.clock);
  return {
    desiredState: active,
    runtimeStatus: active ? 'running' : 'waiting',
  };
}

function evaluateTimerAutomation(
  automation: Automation,
  input: AutomationEngineInput,
  existing?: TimerRuntimeState,
): EvaluationResult {
  const now = input.clock.nowMs();
  const intervalMs = (automation.intervalMinutes ?? 60) * 60_000;
  const durationMs = (automation.durationSeconds ?? 30) * 1000;
  const timerState = existing ?? {
    automationId: automation.id,
    nextTriggerMs: now,
    activeUntilMs: null,
  };

  if (timerState.activeUntilMs && now < timerState.activeUntilMs) {
    return {
      desiredState: true,
      runtimeStatus: 'running',
      timerState,
    };
  }

  if (now >= timerState.nextTriggerMs) {
    return {
      desiredState: true,
      runtimeStatus: 'running',
      timerState: {
        automationId: automation.id,
        nextTriggerMs: now + intervalMs,
        activeUntilMs: now + durationMs,
      },
    };
  }

  return {
    desiredState: false,
    runtimeStatus: 'waiting',
    timerState: {
      ...timerState,
      activeUntilMs: null,
    },
  };
}

export function evaluateSensorStatus(reading: SensorReading): 'normal' | 'low' | 'high' {
  if (reading.value < reading.optimalMin) return 'low';
  if (reading.value > reading.optimalMax) return 'high';
  return 'normal';
}

export function markStaleSensors(
  readings: Record<string, SensorReading>,
  nowMs: number,
  staleAfterMs: number,
): Record<string, SensorReading> {
  const next: Record<string, SensorReading> = {};
  for (const [id, reading] of Object.entries(readings)) {
    next[id] =
      nowMs - reading.timestampMs > staleAfterMs
        ? { ...reading, quality: 'stale' }
        : reading;
  }
  return next;
}
