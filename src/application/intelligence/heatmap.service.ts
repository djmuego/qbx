import type { Device } from '../../domain/device/device.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import { placementCenter } from '../../domain/map/space-map.geometry';
import type { HeatmapResult } from '../../domain/map/spatial-intelligence.types';

export function buildHeatmap(input: {
  metric: 'temperature' | 'humidity' | 'vpd';
  map: SpaceMap;
  devices: Device[];
}): HeatmapResult {
  if (input.metric === 'vpd') {
    return {
      metric: 'vpd',
      available: false,
      reason: 'VPD heatmap только при паре свежих temp+RH на нескольких точках.',
      dataKind: 'UNKNOWN',
      measured: [],
    };
  }

  const wanted = input.metric === 'temperature' ? 'temperature' : 'humidity';
  const measured = input.map.placements
    .filter((p) => p.kind === 'sensor' && p.sensorId)
    .flatMap((p) => {
      const found = input.devices.flatMap((d) =>
        d.inputs
          .filter((s) => s.id === p.sensorId)
          .map((s) => ({ device: d, sensor: s, placement: p })),
      );
      return found;
    })
    .filter((x) => x.sensor.type === wanted && x.device.isOnline && Number.isFinite(x.sensor.currentValue))
    .map((x) => {
      const c = placementCenter(x.placement);
      return {
        xM: c.xM,
        yM: c.yM,
        value: x.sensor.currentValue,
        sensorId: x.sensor.id,
        label: x.sensor.customName || x.sensor.name,
      };
    });

  if (measured.length < 2) {
    return {
      metric: input.metric,
      available: false,
      reason: 'Недостаточно измеренных точек для карты. Нужны минимум два свежих датчика.',
      dataKind: 'UNKNOWN',
      measured,
    };
  }

  return {
    metric: input.metric,
    available: true,
    dataKind: 'INTERPOLATED',
    measured,
    interpolationNote: 'Цвет между точками — интерполяция, не измерение. Измеренные точки отмечены.',
  };
}
