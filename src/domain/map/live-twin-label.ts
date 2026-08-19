import type { Device } from '../device/device.types';
import type { Sensor } from '../sensor/sensor.types';
import type { RuntimeSnapshot, SensorReading } from '../../runtime/types/runtime-state.types';
import type { MapPlacement } from './space-map.types';

export type LiveTwinVisualState = 'unbound' | 'online' | 'active' | 'manual' | 'offline' | 'error';

export interface LiveTwinLabel {
  bound: boolean;
  title: string;
  readingLine: string | null;
  statusLine: string;
  connection: 'online' | 'offline' | 'unbound';
  visualState: LiveTwinVisualState;
  compact: string;
  full: string[];
}

function titleOf(placement: MapPlacement, device?: Device, sensor?: Sensor): string {
  if (placement.label?.trim()) return placement.label.trim();
  if (sensor) return sensor.customName || sensor.name;
  if (device) return device.customName || device.name;
  if (placement.kind === 'sensor') return 'Датчик';
  if (placement.kind === 'light') return 'Grow Light';
  if (placement.kind === 'hub') return 'QBX Hub';
  if (placement.kind === 'irrigation') return placement.role === 'pump' ? 'Pump' : 'Бак';
  if (placement.role === 'exhaust') return 'Exhaust Fan';
  return placement.kind;
}

function formatReading(reading: SensorReading): string {
  const n = reading.value;
  const text = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return `${text}${reading.unit}`;
}

function siblingClimateLine(device: Device, snapshot: RuntimeSnapshot | null, boundSensorId: string): string | null {
  const parts: string[] = [];
  const bound = snapshot?.sensorReadings[boundSensorId];
  const consider = device.inputs.filter((s) => s.type === 'temperature' || s.type === 'humidity');
  const ordered = [...consider].sort((a, b) => (a.type === 'temperature' ? -1 : 1) - (b.type === 'temperature' ? -1 : 1));
  for (const s of ordered) {
    const reading = snapshot?.sensorReadings[s.id];
    if (!reading || reading.quality !== 'ok') continue;
    if (s.id !== boundSensorId && bound?.quality !== 'ok') continue;
    parts.push(formatReading(reading));
  }
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

export function buildLiveTwinLabel(
  placement: MapPlacement,
  devices: Device[],
  snapshot: RuntimeSnapshot | null,
  options?: { emergencyOff?: boolean },
): LiveTwinLabel | null {
  if (placement.kind === 'plant' || placement.kind === 'plant_group' || placement.kind === 'structure') {
    return null;
  }

  const device = devices.find((d) => d.id === placement.deviceId);
  const sensor = device?.inputs.find((s) => s.id === placement.sensorId);
  const output = device?.outputs.find((o) => o.id === placement.outputId);
  const bound = Boolean(placement.deviceId);
  const title = titleOf(placement, device, sensor);

  if (!bound) {
    if (placement.kind !== 'sensor' && placement.kind !== 'light' && placement.kind !== 'equipment' && placement.kind !== 'irrigation' && placement.kind !== 'hub') {
      return null;
    }
    return {
      bound: false,
      title,
      readingLine: placement.kind === 'sensor' ? 'Не связан с устройством' : 'Не связан с устройством',
      statusLine: '',
      connection: 'unbound',
      visualState: 'unbound',
      compact: 'Не связан',
      full: [title, 'Не связан с устройством'],
    };
  }

  if (!device || !device.isOnline) {
    return {
      bound: true,
      title,
      readingLine: 'Нет связи',
      statusLine: 'Нет связи',
      connection: 'offline',
      visualState: 'offline',
      compact: 'Нет связи',
      full: [title, 'Нет связи'],
    };
  }

  if (placement.sensorId) {
    const reading = snapshot?.sensorReadings[placement.sensorId];
    if (!reading) {
      return {
        bound: true,
        title,
        readingLine: 'Нет данных',
        statusLine: 'ONLINE',
        connection: 'online',
        visualState: 'online',
        compact: 'Нет данных',
        full: [title, 'Нет данных', 'ONLINE'],
      };
    }
    if (reading.quality === 'stale') {
      return {
        bound: true,
        title,
        readingLine: 'Данные устарели',
        statusLine: 'ONLINE',
        connection: 'online',
        visualState: 'online',
        compact: 'Данные устарели',
        full: [title, 'Данные устарели', 'ONLINE'],
      };
    }
    if (reading.quality === 'error') {
      return {
        bound: true,
        title,
        readingLine: 'Нет связи',
        statusLine: 'Нет связи',
        connection: 'offline',
        visualState: 'error',
        compact: 'Нет связи',
        full: [title, 'Нет связи'],
      };
    }
    const climate = siblingClimateLine(device, snapshot, placement.sensorId) ?? formatReading(reading);
    return {
      bound: true,
      title,
      readingLine: climate,
      statusLine: 'ONLINE',
      connection: 'online',
      visualState: 'online',
      compact: climate,
      full: [title, climate, 'ONLINE'],
    };
  }

  if (placement.outputId) {
    const runtime = snapshot?.outputStates[placement.outputId];
    const reported = runtime ? runtime.reportedState : device.isOnline ? Boolean(output?.state) : null;
    const command = runtime?.commandStatus;
    const manual = (runtime?.controlMode ?? output?.controlMode) === 'manual';
    if (command === 'pending') {
      return {
        bound: true,
        title,
        readingLine: null,
        statusLine: 'Проверяется...',
        connection: 'online',
        visualState: manual ? 'manual' : 'online',
        compact: 'Проверяется...',
        full: [title, 'Проверяется...'],
      };
    }
    if (command === 'failed' || command === 'timeout') {
      return {
        bound: true,
        title,
        readingLine: null,
        statusLine: 'Ошибка команды',
        connection: 'online',
        visualState: 'error',
        compact: 'Ошибка команды',
        full: [title, 'Ошибка команды'],
      };
    }
    const on = Boolean(reported) && !options?.emergencyOff;
    const mode = manual ? 'Ручной' : 'Авто';
    const statusLine = `${on ? 'ON' : 'OFF'} · ${mode}`;
    return {
      bound: true,
      title,
      readingLine: null,
      statusLine,
      connection: 'online',
      visualState: manual ? 'manual' : on ? 'active' : 'online',
      compact: statusLine,
      full: [title, statusLine],
    };
  }

  return {
    bound: true,
    title,
    readingLine: null,
    statusLine: 'ONLINE',
    connection: 'online',
    visualState: 'online',
    compact: 'ONLINE',
    full: [title, 'ONLINE'],
  };
}

export function liveTwinAccent(state: LiveTwinVisualState): string {
  switch (state) {
    case 'active':
      return '#22c55e';
    case 'manual':
      return '#f59e0b';
    case 'offline':
      return '#94a3b8';
    case 'error':
      return '#ef4444';
    default:
      return '#10b981';
  }
}
