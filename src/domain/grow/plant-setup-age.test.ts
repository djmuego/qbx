import { describe, expect, it } from 'vitest';
import {
  ageDaysFromPreset,
  enrichLayoutWithPlantAge,
  parsePlantAgeFromText,
  plantedAtFromAgeDays,
  suggestPlantAgeDays,
} from './plant-setup-age';
import { plantAgeDays } from './plant-growth-visual';
import { createEmptySpaceMap } from '../map/space-map.geometry';

describe('plant-setup-age', () => {
  const now = new Date('2026-08-19T12:00:00Z');

  it('plantedAtFromAgeDays offsets correctly', () => {
    expect(plantAgeDays(plantedAtFromAgeDays(10, now), undefined, now)).toBe(10);
  });

  it('parses Russian age phrases', () => {
    expect(parsePlantAgeFromText('взрослые томаты', 90)).toBe(90);
    expect(parsePlantAgeFromText('45 дней вегетации', 90)).toBe(45);
    expect(parsePlantAgeFromText('2 месяца', 90)).toBe(60);
    expect(parsePlantAgeFromText('новая посадка', 90)).toBe(0);
  });

  it('preset maps to cycle fraction', () => {
    expect(ageDaysFromPreset('mature', 100)).toBe(100);
    expect(ageDaysFromPreset('seedling', 100)).toBe(12);
  });

  it('suggest uses description', () => {
    const s = suggestPlantAgeDays({ description: 'теплица, растения уже взрослые', cycleDays: 90 });
    expect(s.ageDays).toBe(90);
  });

  it('enrichLayoutWithPlantAge sets plantedAt on plants', () => {
    const layout = enrichLayoutWithPlantAge(
      {
        map: createEmptySpaceMap('s1'),
        plants: [{ id: 'p1', spaceId: 's1', name: 'Basil' }],
        groups: [],
      },
      30,
      now,
    );
    expect(plantAgeDays(layout.plants[0]?.plantedAt, undefined, now)).toBe(30);
  });
});
