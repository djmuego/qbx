import type { PlantVisualStage } from '../../../domain/grow/plant-growth-visual';

export type ProceduralPlantType = 'compact' | 'bush' | 'tree';

export interface PlantBranchSpec {
  id: string;
  startY: number;
  length: number;
  radiusTop: number;
  radiusBottom: number;
  yaw: number;
  pitch: number;
  depth: number;
}

export interface PlantLeafSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  length: number;
  width: number;
  shade: number;
}

export interface PlantFlowerSpec {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
}

export interface ProceduralPlantSpec {
  stage: PlantVisualStage;
  plantType: ProceduralPlantType;
  heightM: number;
  canopyRadiusM: number;
  potRadiusM: number;
  potHeightM: number;
  stemHeightM: number;
  stemRadiusTop: number;
  stemRadiusBottom: number;
  branches: PlantBranchSpec[];
  leaves: PlantLeafSpec[];
  flowers: PlantFlowerSpec[];
  leafColorBase: string;
  leafColorAccent: string;
  stemColor: string;
  potColor: string;
}

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stageProfile(stage: PlantVisualStage): {
  branchLevels: number;
  branchCount: number;
  leafDensity: number;
  flowerChance: number;
  stemLean: number;
} {
  switch (stage) {
    case 'germination':
      return { branchLevels: 0, branchCount: 0, leafDensity: 0, flowerChance: 0, stemLean: 0.04 };
    case 'seedling':
      return { branchLevels: 0, branchCount: 0, leafDensity: 0.35, flowerChance: 0, stemLean: 0.08 };
    case 'vegetative':
      return { branchLevels: 2, branchCount: 5, leafDensity: 0.75, flowerChance: 0, stemLean: 0.12 };
    case 'flowering':
      return { branchLevels: 2, branchCount: 7, leafDensity: 0.9, flowerChance: 0.55, stemLean: 0.1 };
    case 'mature':
      return { branchLevels: 3, branchCount: 9, leafDensity: 1, flowerChance: 0.2, stemLean: 0.08 };
    default:
      return { branchLevels: 2, branchCount: 5, leafDensity: 0.75, flowerChance: 0, stemLean: 0.1 };
  }
}

export function resolvePlantType(seed: string, role?: string): ProceduralPlantType {
  const roleL = (role ?? '').toLowerCase();
  if (roleL.includes('tree') || roleL.includes('orchard')) return 'tree';
  const rng = mulberry32(hashSeed(`${seed}:type`));
  const roll = rng();
  if (roll < 0.28) return 'tree';
  if (roll < 0.62) return 'bush';
  return 'compact';
}

export function buildProceduralPlantSpec(
  stage: PlantVisualStage,
  heightM: number,
  canopyDiameterM: number,
  seed: string,
  role?: string,
): ProceduralPlantSpec {
  const rng = mulberry32(hashSeed(seed));
  const plantType = resolvePlantType(seed, role);
  const profile = stageProfile(stage);
  const height = Math.max(0.08, heightM);
  const canopyRadius = Math.max(0.04, canopyDiameterM / 2);
  const potHeight = Math.min(height * 0.18, Math.max(0.04, canopyRadius * 0.35));
  const potRadius = Math.max(0.03, Math.min(canopyRadius * 0.42, height * 0.14));
  const stemHeight =
    stage === 'germination'
      ? height * 0.55
      : stage === 'seedling'
        ? height * 0.72
        : plantType === 'tree'
          ? height * 0.82
          : height * 0.68;
  const stemRadiusBottom = Math.max(0.008, canopyRadius * (stage === 'germination' ? 0.08 : 0.12));
  const stemRadiusTop = stemRadiusBottom * (plantType === 'tree' ? 0.45 : 0.65);

  const branches: PlantBranchSpec[] = [];
  const leaves: PlantLeafSpec[] = [];
  const flowers: PlantFlowerSpec[] = [];

  const branchCount =
    stage === 'germination'
      ? 0
      : stage === 'seedling'
        ? 0
        : Math.max(2, Math.round(profile.branchCount * (0.55 + rng() * 0.45)));

  for (let i = 0; i < branchCount; i++) {
    const level = i % Math.max(1, profile.branchLevels);
    const t = (i + 0.35) / branchCount;
    const startY = -height / 2 + potHeight + stemHeight * (0.35 + t * 0.55 * (1 - level * 0.12));
    const length = canopyRadius * (0.45 + rng() * 0.55) * (1 - level * 0.15);
    const yaw = (i / branchCount) * Math.PI * 2 + rng() * 0.7;
    const pitch = (0.35 + rng() * 0.45) * (plantType === 'tree' && level === 0 ? 0.55 : 1);
    branches.push({
      id: `b${i}`,
      startY,
      length,
      radiusTop: stemRadiusTop * 0.35,
      radiusBottom: stemRadiusTop * 0.55,
      yaw,
      pitch,
      depth: level,
    });

    const leafCount = Math.max(1, Math.round((2 + level * 2) * profile.leafDensity));
    for (let j = 0; j < leafCount; j++) {
      const along = 0.35 + (j / Math.max(1, leafCount - 1)) * 0.65;
      const lx = Math.cos(yaw) * length * along;
      const lz = Math.sin(yaw) * length * along;
      const ly = startY + Math.sin(pitch) * length * along * 0.35;
      leaves.push({
        id: `b${i}l${j}`,
        x: lx,
        y: ly,
        z: lz,
        yaw: yaw + (rng() - 0.5) * 0.8,
        pitch: pitch * 0.6 + (rng() - 0.5) * 0.35,
        roll: (rng() - 0.5) * 0.5,
        length: Math.max(0.02, canopyRadius * (0.18 + rng() * 0.22)),
        width: Math.max(0.008, canopyRadius * (0.07 + rng() * 0.08)),
        shade: 0.65 + rng() * 0.35,
      });
    }

    if (profile.flowerChance > 0 && rng() < profile.flowerChance) {
      flowers.push({
        id: `f${i}`,
        x: Math.cos(yaw) * length * 0.92,
        y: startY + Math.sin(pitch) * length * 0.25,
        z: Math.sin(yaw) * length * 0.92,
        radius: Math.max(0.008, canopyRadius * 0.06),
      });
    }
  }

  if (stage === 'seedling' || stage === 'germination') {
    const leafTotal = stage === 'germination' ? 0 : 2 + Math.floor(rng() * 3);
    for (let i = 0; i < leafTotal; i++) {
      const yaw = (i / Math.max(1, leafTotal)) * Math.PI * 2 + rng() * 0.4;
      const startY = -height / 2 + potHeight + stemHeight * (0.45 + rng() * 0.25);
      leaves.push({
        id: `s${i}`,
        x: Math.cos(yaw) * canopyRadius * 0.18,
        y: startY,
        z: Math.sin(yaw) * canopyRadius * 0.18,
        yaw,
        pitch: 0.55 + rng() * 0.25,
        roll: (rng() - 0.5) * 0.3,
        length: Math.max(0.018, canopyRadius * 0.28),
        width: Math.max(0.006, canopyRadius * 0.1),
        shade: 0.7 + rng() * 0.3,
      });
    }
  }

  if (plantType === 'tree' && stage !== 'germination' && stage !== 'seedling') {
    const canopyLeaves = Math.round(8 + profile.leafDensity * 10);
    for (let i = 0; i < canopyLeaves; i++) {
      const yaw = rng() * Math.PI * 2;
      const dist = canopyRadius * (0.25 + rng() * 0.7);
      const y = -height / 2 + potHeight + stemHeight * (0.55 + rng() * 0.35);
      leaves.push({
        id: `c${i}`,
        x: Math.cos(yaw) * dist,
        y,
        z: Math.sin(yaw) * dist,
        yaw,
        pitch: 0.25 + rng() * 0.45,
        roll: (rng() - 0.5) * 0.6,
        length: Math.max(0.02, canopyRadius * (0.14 + rng() * 0.16)),
        width: Math.max(0.008, canopyRadius * (0.06 + rng() * 0.07)),
        shade: 0.6 + rng() * 0.4,
      });
    }
  }

  const hueShift = Math.floor(rng() * 3);
  const leafColorBase = hueShift === 0 ? '#15803d' : hueShift === 1 ? '#166534' : '#14532d';
  const leafColorAccent = hueShift === 0 ? '#22c55e' : hueShift === 1 ? '#16a34a' : '#4ade80';

  return {
    stage,
    plantType,
    heightM: height,
    canopyRadiusM: canopyRadius,
    potRadiusM: potRadius,
    potHeightM: potHeight,
    stemHeightM: stemHeight,
    stemRadiusTop,
    stemRadiusBottom,
    branches,
    leaves,
    flowers,
    leafColorBase,
    leafColorAccent,
    stemColor: '#5c4a32',
    potColor: '#a16207',
  };
}
