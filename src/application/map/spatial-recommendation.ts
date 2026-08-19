import type { SpaceMap } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { PlacementBasis } from '../../domain/map/map-blueprint.types';

export interface SpatialRecommendation {
  type: 'sensor-placement' | 'add-sensor' | 'move-light' | 'move-fan' | 'plant-spacing' | 'uncontrolled-zone';
  targetObjectId?: string;
  title: string;
  reason: string;
  suggestedPosition: { xM: number; yM: number; zM: number };
  confidence: 'high' | 'medium' | 'low';
  basis: PlacementBasis;
}

/** Advisory only. Never writes the map. */
export function proposeSpatialRecommendations(map: SpaceMap, room: SpaceDimensions): SpatialRecommendation[] {
  const recs: SpatialRecommendation[] = [];
  const sensors = map.placements.filter((p) => p.kind === 'sensor');
  if (sensors.length < 2 && room.lengthM * room.widthM >= 4) {
    recs.push({
      type: 'add-sensor',
      title: 'Добавить климатический датчик',
      reason: 'Один датчик или меньше на площадь помещения — геометрия не покрывает дальнюю зону.',
      suggestedPosition: { xM: Number((room.lengthM * 0.75).toFixed(2)), yM: Number((room.widthM * 0.75).toFixed(2)), zM: 0.45 },
      confidence: 'medium',
      basis: 'GEOMETRY_BASED',
    });
  }
  const firstSensor = sensors[0];
  if (firstSensor && sensors.length === 1) {
    recs.push({
      type: 'sensor-placement',
      targetObjectId: firstSensor.id,
      title: 'Сместить датчик к центру кроны',
      reason: 'При одном датчике точка ближе к центру растений информативнее угла.',
      suggestedPosition: {
        xM: Number((room.lengthM / 2 - firstSensor.widthM / 2).toFixed(2)),
        yM: Number((room.widthM / 2 - firstSensor.heightM / 2).toFixed(2)),
        zM: firstSensor.zM ?? 0.45,
      },
      confidence: 'medium',
      basis: 'GEOMETRY_BASED',
    });
  }
  return recs;
}
