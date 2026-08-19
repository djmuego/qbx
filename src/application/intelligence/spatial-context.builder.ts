import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { SpatialContext } from '../../domain/map/spatial-intelligence.types';
import { analyzeSpatialLayout } from './spatial-insight.engine';
import { isPlacementInZone } from '../../domain/map/space-map.geometry';
import { environmentTypeFromSpace, isOutdoorPreset } from '../../domain/map/environment.types';
import { buildSolarContext } from '../../domain/map/solar-context';

export function buildSpatialContext(input: { space: Space; map: SpaceMap; devices: Device[] }): SpatialContext {
  const insights = analyzeSpatialLayout(input);
  const attention = insights.some((i) =>
    ['zone_without_sensor', 'zone_temperature_difference', 'device_offline'].includes(i.kind),
  );
  const coverageLabel: SpatialContext['coverageLabel'] =
    input.map.placements.filter((p) => p.kind === 'sensor').length === 0
      ? 'Недостаточно данных'
      : attention
        ? 'Требует внимания'
        : 'Хорошее';

  const zoneSummaries = input.map.zones.map((zone) => {
    const inZone = input.map.placements.filter((p) => p.zoneId === zone.id || isPlacementInZone(p, zone));
    return {
      zoneId: zone.id,
      name: zone.name,
      plantCount: inZone.filter((p) => p.kind === 'plant' || p.kind === 'plant_group').length,
      sensorCount: inZone.filter((p) => p.kind === 'sensor').length,
      avgTemperatureC: null,
      avgRhPercent: null,
      temperatureKind: 'UNKNOWN' as const,
    };
  });

  const envType = environmentTypeFromSpace(input.space.type);
  const outdoor = input.map.environmentPreset ? isOutdoorPreset(input.map.environmentPreset) : false;
  const beds = input.map.placements.filter((p) => p.role === 'grow_bed');
  const rows = input.map.placements.filter((p) => p.role === 'row' || p.role === 'crop_row');
  const paths = input.map.placements.filter((p) => p.role === 'path');
  const structures = input.map.placements.filter(
    (p) => p.kind === 'structure' && p.role !== 'grow_bed' && p.role !== 'path',
  );
  const weather = input.map.placements.find((p) => p.role === 'weather_station');

  return {
    coverageLabel,
    insightCount: insights.length,
    insights,
    zoneSummaries,
    bounds: input.space.dimensions,
    scale: input.space.spatialScale,
    plants: input.map.placements
      .filter((p) => p.kind === 'plant' || p.kind === 'plant_group')
      .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
    equipmentPositions: input.map.placements
      .filter((p) => p.kind === 'equipment' || p.kind === 'light' || p.kind === 'hub')
      .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
    sensorPositions: input.map.placements
      .filter((p) => p.kind === 'sensor')
      .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, zM: p.zM ?? 0 })),
    mounting: input.map.placements.map((p) => ({ id: p.id, mounting: p.mounting, zM: p.zM ?? 0 })),
    relationships: input.map.relationships ?? [],
    liveReadings: input.devices.flatMap((d) =>
      d.isOnline
        ? d.inputs
            .filter((s) => Number.isFinite(s.currentValue))
            .map((s) => {
              const placement = input.map.placements.find((p) => p.sensorId === s.id);
              return placement ? { placementId: placement.id, value: `${s.currentValue}${s.unit}` } : null;
            })
            .filter((x): x is { placementId: string; value: string } => Boolean(x))
        : [],
    ),
    environmentType: envType,
    terrain: input.map.terrainProfile,
    northAngleDeg: input.map.northOffsetDeg,
    bedCount: beds.length,
    rowCount: rows.length,
    pathCount: paths.length,
    structureCount: structures.length,
    outdoorSensorPositions: outdoor
      ? input.map.placements
          .filter((p) => p.kind === 'sensor')
          .map((p) => ({ id: p.id, xM: p.xM, yM: p.yM, role: p.role }))
      : undefined,
    weatherStationId: weather?.id,
    childSpaceIds: input.map.placements.map((p) => p.childSpaceId).filter((id): id is string => Boolean(id)),
    solar: buildSolarContext(input.map.northOffsetDeg),
  };
}
