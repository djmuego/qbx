import type { SensorHistoryPoint } from '../../domain/sensor/sensor.types';

export class HistoryBuffer {
  private samples: Map<string, SensorHistoryPoint[]> = new Map();

  constructor(private readonly limitPerSensor: number) {}

  push(sensorId: string, timestampMs: number, value: number): void {
    const label = formatHistoryLabel(timestampMs);
    const current = this.samples.get(sensorId) ?? [];
    const next = [...current, { time: label, value: Number(value.toFixed(2)) }];
    if (next.length > this.limitPerSensor) {
      next.splice(0, next.length - this.limitPerSensor);
    }
    this.samples.set(sensorId, next);
  }

  get(sensorId: string): SensorHistoryPoint[] {
    return [...(this.samples.get(sensorId) ?? [])];
  }

  seed(sensorId: string, points: SensorHistoryPoint[]): void {
    this.samples.set(sensorId, [...points].slice(-this.limitPerSensor));
  }
}

function formatHistoryLabel(timestampMs: number): string {
  const date = new Date(timestampMs);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
