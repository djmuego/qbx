import { describe, expect, it } from 'vitest';
import {
  buildProceduralPlantSpec,
  hashSeed,
  mulberry32,
  resolvePlantType,
} from './procedural-plant-engine';

describe('procedural-plant-engine', () => {
  it('produces deterministic geometry for the same seed', () => {
    const a = buildProceduralPlantSpec('vegetative', 0.5, 0.35, 'plant-abc', 'herb');
    const b = buildProceduralPlantSpec('vegetative', 0.5, 0.35, 'plant-abc', 'herb');
    expect(a).toEqual(b);
  });

  it('varies geometry across different seeds', () => {
    const a = buildProceduralPlantSpec('vegetative', 0.5, 0.35, 'plant-1');
    const b = buildProceduralPlantSpec('vegetative', 0.5, 0.35, 'plant-2');
    expect(a.leaves[0]?.x).not.toBe(b.leaves[0]?.x);
  });

  it('scales from placement height and canopy, not room constants', () => {
    const small = buildProceduralPlantSpec('seedling', 0.2, 0.12, 'p-small');
    const large = buildProceduralPlantSpec('mature', 1.1, 0.9, 'p-large');
    expect(small.heightM).toBeLessThan(large.heightM);
    expect(small.canopyRadiusM).toBeLessThan(large.canopyRadiusM);
  });

  it('germination has minimal branching', () => {
    const germ = buildProceduralPlantSpec('germination', 0.12, 0.08, 'g1');
    expect(germ.branches.length).toBe(0);
    expect(germ.leaves.length).toBe(0);
  });

  it('seedling has stem leaves but no branches', () => {
    const seedling = buildProceduralPlantSpec('seedling', 0.25, 0.16, 's1');
    expect(seedling.branches.length).toBe(0);
    expect(seedling.leaves.length).toBeGreaterThanOrEqual(2);
    expect(seedling.leaves.length).toBeLessThanOrEqual(4);
  });

  it('flowering adds flower clusters', () => {
    const flowering = buildProceduralPlantSpec('flowering', 0.7, 0.5, 'f-fixed-seed-42');
    expect(flowering.branches.length).toBeGreaterThan(2);
    expect(flowering.flowers.length).toBeGreaterThan(0);
  });

  it('tree role biases plant type', () => {
    expect(resolvePlantType('any', 'orchard_tree')).toBe('tree');
  });

  it('mulberry32 is stable for a seed', () => {
    const rngA = mulberry32(hashSeed('stable'));
    const rngB = mulberry32(hashSeed('stable'));
    expect(rngA()).toBe(rngB());
    expect(rngA()).toBe(rngB());
  });
});
