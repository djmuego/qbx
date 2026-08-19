import type { SpaceMap } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';

/** Foundation only — no CFD / PPFD physics in this pass. */
export interface SpatialAnalyzer {
  id: string;
  analyze(map: SpaceMap, room: SpaceDimensions): string[];
}

export const CoverageAnalyzer: SpatialAnalyzer = {
  id: 'coverage',
  analyze(map, room) {
    const sensors = map.placements.filter((p) => p.kind === 'sensor');
    const area = room.lengthM * room.widthM;
    if (sensors.length === 0) return [`Нет датчиков на ${area.toFixed(1)} м².`];
    if (sensors.length === 1 && area >= 8) return ['Один датчик на большое помещение — сравнение зон невозможно.'];
    return [`Датчиков на карте: ${sensors.length}.`];
  },
};

export const SensorPlacementAdvisor: SpatialAnalyzer = {
  id: 'sensor-placement',
  analyze(map, room) {
    return CoverageAnalyzer.analyze(map, room);
  },
};

export const LightCoverageAdvisor: SpatialAnalyzer = {
  id: 'light-coverage',
  analyze(map) {
    const lights = map.placements.filter((p) => p.kind === 'light');
    if (!lights.length) return ['На карте нет светильников — PPFD карту не строим.'];
    return [`Светильников: ${lights.length}. Фотометрическая карта недоступна без измерений.`];
  },
};

export const AirflowAdvisor: SpatialAnalyzer = {
  id: 'airflow',
  analyze(map) {
    const fans = map.placements.filter((p) => p.role === 'exhaust' || p.role === 'circulation');
    if (!fans.length) return ['Нет вентиляторов на карте — поле потока не рисуем.'];
    return [`Вентиляторов: ${fans.length}. Ориентация видна, поле воздуха не моделируется.`];
  },
};

export const PlantSpacingAdvisor: SpatialAnalyzer = {
  id: 'plant-spacing',
  analyze(map, room) {
    const plants = map.placements.filter((p) => p.kind === 'plant');
    if (!plants.length) return ['Растений на карте нет.'];
    const density = plants.length / Math.max(room.lengthM * room.widthM, 0.01);
    return [`${plants.length} растений, ${density.toFixed(1)} шт/м² — оценка по геометрии, не агрономический оптимум.`];
  },
};
