import type { Device } from '../../domain/device/device.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { Space } from '../../domain/space/space.types';
import { isPlacementInZone, nearestPlacement, placementCenter } from '../../domain/map/space-map.geometry';
import type { SpatialInsight } from '../../domain/map/spatial-intelligence.types';

export interface SpatialLayoutInput {
  space: Space;
  map: SpaceMap;
  devices: Device[];
}

function allSensors(devices: Device[]) {
  return devices.flatMap((d) =>
    d.inputs
      .filter((s) => s.type !== 'unused')
      .map((s) => ({ device: d, sensor: s })),
  );
}

function freshTemp(devices: Device[]) {
  return allSensors(devices).filter(
    (x) => x.sensor.type === 'temperature' && x.device.isOnline && Number.isFinite(x.sensor.currentValue),
  );
}

function historyAvg(sensor: Device['inputs'][number]): number | null {
  const values = (sensor.history ?? []).map((h) => h.value).filter((v) => Number.isFinite(v));
  if (values.length >= 4) return values.reduce((a, b) => a + b, 0) / values.length;
  return Number.isFinite(sensor.currentValue) ? sensor.currentValue : null;
}

export function analyzeSpatialLayout(input: SpatialLayoutInput): SpatialInsight[] {
  const { map, devices, space } = input;
  const insights: SpatialInsight[] = [];
  const sensorPlacements = map.placements.filter((p) => p.kind === 'sensor' && p.sensorId);
  const plantPlacements = map.placements.filter((p) => p.kind === 'plant' || p.kind === 'plant_group');

  for (const zone of map.zones) {
    const sensorsInZone = sensorPlacements.filter((p) => isPlacementInZone(p, zone));
    if (sensorsInZone.length === 0) {
      insights.push({
        kind: 'zone_without_sensor',
        title: `Нет датчика в ${zone.name}`,
        detail: `${zone.name} не имеет собственного climate sensor.`,
        dataKind: 'FACT',
        confidence: 'high',
        evidence: ['geometry'],
        zoneId: zone.id,
      });
    }
  }

  for (const plant of plantPlacements) {
    const nearest = nearestPlacement(plant, sensorPlacements);
    if (nearest) {
      const d = Math.hypot(
        placementCenter(plant).xM - placementCenter(nearest).xM,
        placementCenter(plant).yM - placementCenter(nearest).yM,
      );
      if (d > 2.5) {
        insights.push({
          kind: 'plant_without_nearby_sensor',
          title: 'Растения далеко от датчика',
          detail: `${plant.label ?? 'Растения'} в ${d.toFixed(1)} м от ближайшего датчика.`,
          dataKind: 'DERIVED',
          confidence: 'medium',
          evidence: ['geometry'],
        });
      }
    }
  }

  for (const device of devices) {
    if (!device.isOnline) {
      insights.push({
        kind: 'device_offline',
        title: `${device.customName} не на связи`,
        detail: 'Показания с этого модуля сейчас недоступны.',
        dataKind: 'FACT',
        confidence: 'high',
        evidence: ['connection'],
      });
    }
  }

  if (map.zones.length >= 2) {
    const zoneAvgs = map.zones.map((zone) => {
      const ids = sensorPlacements.filter((p) => isPlacementInZone(p, zone)).map((p) => p.sensorId);
      const samples = allSensors(devices)
        .filter((x) => ids.includes(x.sensor.id) && x.device.isOnline && x.sensor.type === 'temperature')
        .map((x) => historyAvg(x.sensor))
        .filter((v): v is number => v != null);
      const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : null;
      return { zone, avg, samples: samples.length };
    });
    const withData = zoneAvgs.filter((z) => z.avg != null && z.samples >= 1);
    if (withData.length >= 2) {
      const sorted = [...withData].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
      const delta = (sorted[0]!.avg ?? 0) - (sorted[sorted.length - 1]!.avg ?? 0);
      if (delta >= 1.5) {
        insights.push({
          kind: 'zone_temperature_difference',
          title: `${sorted[0]!.zone.name} теплее`,
          detail: `${sorted[0]!.zone.name} в среднем на ${delta.toFixed(1)}°C теплее ${sorted[sorted.length - 1]!.zone.name} по окну телеметрии. Причина неизвестна.`,
          dataKind: 'DERIVED',
          confidence: 'medium',
          evidence: ['telemetry_window', 'geometry'],
          zoneId: sorted[0]!.zone.id,
        });
      }
    }
  }

  const area = space.areaM2 ?? (space.dimensions ? space.dimensions.lengthM * space.dimensions.widthM : 0);
  const climateCount = sensorPlacements.length;
  if (area >= 12 && climateCount < 2) {
    const cx = (space.dimensions?.lengthM ?? 4) * 0.75;
    const cy = (space.dimensions?.widthM ?? 3) * 0.75;
    insights.push({
      kind: 'placement_recommendation',
      title: 'Куда поставить ещё один датчик',
      detail: `Сейчас ${climateCount} датчик(а) на ${area.toFixed(0)} м². Геометрия: противоположная зона почти не покрыта.`,
      dataKind: 'AI_INFERENCE',
      basis: 'GEOMETRY_BASED',
      confidence: 'medium',
      evidence: ['geometry', 'sensor_count'],
      suggestedPosition: { xM: Number(cx.toFixed(1)), yM: Number(cy.toFixed(1)) },
    });
  } else if (sensorPlacements.length >= 2 && space.dimensions) {
    const cx = sensorPlacements.reduce((s, p) => s + placementCenter(p).xM, 0) / sensorPlacements.length;
    const cy = sensorPlacements.reduce((s, p) => s + placementCenter(p).yM, 0) / sensorPlacements.length;
    const suggested = {
      xM: Number((space.dimensions.lengthM - cx).toFixed(1)),
      yM: Number((space.dimensions.widthM - cy).toFixed(1)),
    };
    insights.push({
      kind: 'placement_recommendation',
      title: 'Распределение датчиков',
      detail: 'Датчики смещены в одну сторону. Для покрытия неоднородности логична точка напротив кластера.',
      dataKind: 'AI_INFERENCE',
      basis: 'GEOMETRY_BASED',
      confidence: 'medium',
      evidence: ['geometry'],
      suggestedPosition: suggested,
    });
  }

  if (freshTemp(devices).length === 0 && sensorPlacements.length === 0) {
    insights.push({
      kind: 'data_gap',
      title: 'Нет климатических датчиков на карте',
      detail: 'Добавьте датчик или привяжите существующий порт.',
      dataKind: 'UNKNOWN',
      confidence: 'high',
      evidence: ['map'],
    });
  }

  return insights;
}
