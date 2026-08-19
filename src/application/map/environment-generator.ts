import type { EnvironmentPart, EnvironmentPresetId, ProceduralEnvironment } from '../../domain/map/environment.types';
import { isOutdoorPreset } from '../../domain/map/environment.types';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { SpaceType } from '../../domain/space/space.types';
import type { TemplateSpaceType } from '../../domain/map/space-templates.types';
import type { TerrainProfile } from '../../domain/map/terrain.types';
import { defaultTerrainForPreset } from '../../domain/map/terrain.types';

function part(
  partial: Omit<EnvironmentPart, 'xM' | 'yM' | 'zM'> & { xM: number; yM: number; zM: number },
): EnvironmentPart {
  return partial;
}

function roomShell(preset: EnvironmentPresetId, d: SpaceDimensions, wallMaterial: EnvironmentPart['material']): EnvironmentPart[] {
  const t = 0.04;
  const { lengthM: L, widthM: W, heightM: H } = d;
  const floorMaterial: EnvironmentPart['material'] =
    preset === 'OUTDOOR_ZONE' || preset === 'GREENHOUSE'
      ? 'soil'
      : preset === 'HYDROPONIC_ROOM'
        ? 'hydroFloor'
        : 'concreteFloor';
  return [
    part({
      id: 'floor',
      kind: 'floor',
      material: floorMaterial,
      xM: L / 2,
      yM: W / 2,
      zM: 0,
      widthM: L,
      depthM: W,
      heightM: 0.02,
    }),
    part({
      id: 'wall-back',
      kind: 'wall',
      material: wallMaterial,
      xM: L / 2,
      yM: W - t / 2,
      zM: H / 2,
      widthM: L,
      depthM: t,
      heightM: H,
    }),
    part({
      id: 'wall-left',
      kind: 'wall',
      material: wallMaterial,
      xM: t / 2,
      yM: W / 2,
      zM: H / 2,
      widthM: t,
      depthM: W,
      heightM: H,
    }),
    part({
      id: 'wall-right',
      kind: 'wall',
      material: wallMaterial,
      xM: L - t / 2,
      yM: W / 2,
      zM: H / 2,
      widthM: t,
      depthM: W,
      heightM: H,
      opacity: preset === 'GROW_TENT' || preset === 'GROW_BOX' ? 0.28 : 0.16,
    }),
    part({
      id: 'wall-front',
      kind: 'wall',
      material: wallMaterial,
      xM: L / 2,
      yM: t / 2,
      zM: H / 2,
      widthM: L,
      depthM: t,
      heightM: H,
      opacity: 0.08,
    }),
    part({
      id: 'ceiling',
      kind: 'ceiling',
      material: preset === 'GROW_TENT' || preset === 'GROW_BOX' ? 'reflectiveMylar' : 'growRoomWall',
      xM: L / 2,
      yM: W / 2,
      zM: H,
      widthM: L,
      depthM: W,
      heightM: 0.03,
      opacity: preset === 'GREENHOUSE' ? 0.22 : 1,
    }),
  ];
}

function tentDetails(d: SpaceDimensions): EnvironmentPart[] {
  const { lengthM: L, widthM: W, heightM: H } = d;
  const pole = 0.032;
  const corners: Array<[number, number, string]> = [
    [pole / 2, pole / 2, 'sw'],
    [L - pole / 2, pole / 2, 'se'],
    [pole / 2, W - pole / 2, 'nw'],
    [L - pole / 2, W - pole / 2, 'ne'],
  ];
  const poles = corners.map(([x, y, id]) =>
    part({
      id: `pole-${id}`,
      kind: 'frame',
      material: 'metalRack',
      xM: x,
      yM: y,
      zM: H / 2,
      widthM: pole,
      depthM: pole,
      heightM: H,
    }),
  );
  return [
    ...poles,
    part({
      id: 'tray',
      kind: 'tray',
      material: 'plastic',
      xM: L / 2,
      yM: W / 2,
      zM: 0.03,
      widthM: L - 0.08,
      depthM: W - 0.08,
      heightM: 0.04,
    }),
    part({
      id: 'mylar-back',
      kind: 'mylar',
      material: 'reflectiveMylar',
      xM: L / 2,
      yM: W - 0.045,
      zM: H / 2,
      widthM: L - 0.1,
      depthM: 0.008,
      heightM: H - 0.12,
      opacity: 0.7,
    }),
    part({
      id: 'mylar-left',
      kind: 'mylar',
      material: 'reflectiveMylar',
      xM: 0.045,
      yM: W / 2,
      zM: H / 2,
      widthM: 0.008,
      depthM: W - 0.1,
      heightM: H - 0.12,
      opacity: 0.55,
    }),
    part({
      id: 'seam-back',
      kind: 'seam',
      material: 'qbxBlack',
      xM: L / 2,
      yM: W - 0.02,
      zM: H * 0.5,
      widthM: 0.012,
      depthM: 0.012,
      heightM: H,
    }),
    part({
      id: 'door',
      kind: 'door',
      material: 'growTentFabric',
      xM: L / 2,
      yM: 0.02,
      zM: H * 0.45,
      widthM: Math.min(0.7, L * 0.55),
      depthM: 0.02,
      heightM: H * 0.85,
      opacity: 0.15,
    }),
    part({
      id: 'vent-left',
      kind: 'vent',
      material: 'metalRack',
      xM: 0.08,
      yM: W - 0.04,
      zM: H * 0.78,
      widthM: 0.12,
      depthM: 0.04,
      heightM: 0.12,
    }),
    part({
      id: 'vent-right',
      kind: 'vent',
      material: 'metalRack',
      xM: L - 0.08,
      yM: W - 0.04,
      zM: H * 0.78,
      widthM: 0.12,
      depthM: 0.04,
      heightM: 0.12,
    }),
  ];
}

function greenhouseRibs(d: SpaceDimensions): EnvironmentPart[] {
  const { lengthM: L, widthM: W, heightM: H } = d;
  const ribs: EnvironmentPart[] = [];
  const count = Math.max(3, Math.round(L / 2));
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.5) / count) * L;
    ribs.push(
      part({
        id: `rib-${i}`,
        kind: 'frame',
        material: 'metalRack',
        xM: x,
        yM: W / 2,
        zM: H / 2,
        widthM: 0.04,
        depthM: W,
        heightM: 0.04,
      }),
    );
  }
  ribs.push(
    part({
      id: 'ridge',
      kind: 'frame',
      material: 'metalRack',
      xM: L / 2,
      yM: W / 2,
      zM: H + 0.12,
      widthM: L,
      depthM: 0.05,
      heightM: 0.05,
    }),
    part({
      id: 'sill',
      kind: 'frame',
      material: 'wood',
      xM: L / 2,
      yM: W / 2,
      zM: 0.06,
      widthM: L,
      depthM: W,
      heightM: 0.08,
    }),
  );
  return ribs;
}

function outdoorTerrain(
  preset: EnvironmentPresetId,
  d: SpaceDimensions,
  terrain?: TerrainProfile,
): EnvironmentPart[] {
  const profile = terrain ?? defaultTerrainForPreset(preset);
  const mat = profile.materialId;
  const parts: EnvironmentPart[] = [
    part({
      id: 'terrain',
      kind: 'floor',
      material: mat,
      xM: d.lengthM / 2,
      yM: d.widthM / 2,
      zM: 0,
      widthM: d.lengthM,
      depthM: d.widthM,
      heightM: 0.04,
    }),
  ];
  if (profile.elevationMode === 'simpleSlope' && profile.slope) {
    parts.push(
      part({
        id: 'terrain-slope-hint',
        kind: 'panel',
        material: mat,
        xM: d.lengthM / 2,
        yM: d.widthM / 2,
        zM: profile.slope.angleDeg * 0.01,
        widthM: d.lengthM * 0.9,
        depthM: d.widthM * 0.9,
        heightM: 0.02,
        opacity: 0.15,
      }),
    );
  }
  return parts;
}

export function generateEnvironment(
  preset: EnvironmentPresetId,
  dimensions: SpaceDimensions,
  terrain?: TerrainProfile,
): ProceduralEnvironment {
  const d = {
    lengthM: dimensions.lengthM,
    widthM: dimensions.widthM,
    heightM: dimensions.heightM,
  };
  let parts: EnvironmentPart[] = [];
  const notes: string[] = ['Геометрия построена из размеров пространства, не из фоновой картинки.'];

  if (isOutdoorPreset(preset)) {
    parts = outdoorTerrain(preset, d, terrain);
    notes.push('Outdoor: terrain plane replaces indoor floor.');
  } else if (preset === 'GREENHOUSE') {
    parts = [...roomShell(preset, d, 'greenhouseGlass'), ...greenhouseRibs(d)];
  } else if (preset === 'GROW_TENT' || preset === 'GROW_BOX') {
    parts = [...roomShell(preset, d, 'growTentFabric'), ...tentDetails(d)];
  } else {
    parts = roomShell(preset, d, 'growRoomWall');
  }

  return {
    preset,
    lengthM: d.lengthM,
    widthM: d.widthM,
    heightM: d.heightM,
    parts,
    notes,
  };
}

export function environmentPresetForTemplate(type: TemplateSpaceType): EnvironmentPresetId {
  switch (type) {
    case 'GROW_BOX':
      return 'GROW_BOX';
    case 'GROW_TENT':
      return 'GROW_TENT';
    case 'GREENHOUSE':
      return 'GREENHOUSE';
    case 'RACK':
      return 'VERTICAL_FARM';
    case 'HYDROPONIC_ZONE':
      return 'HYDROPONIC_ROOM';
    case 'FACILITY':
      return 'FACILITY';
    case 'SITE':
      return 'SMALL_FARM';
    case 'OUTDOOR_GARDEN':
      return 'OUTDOOR_GARDEN';
    case 'OPEN_FIELD':
      return 'OPEN_FIELD';
    case 'FARM_SITE':
      return 'SMALL_FARM';
    case 'ORCHARD':
      return 'ORCHARD';
    case 'NURSERY':
      return 'NURSERY';
    default:
      return 'GROW_ROOM';
  }
}

export function environmentPresetForSpaceType(type?: SpaceType): EnvironmentPresetId {
  switch (type) {
    case 'grow_box':
      return 'GROW_BOX';
    case 'grow_tent':
      return 'GROW_TENT';
    case 'greenhouse':
      return 'GREENHOUSE';
    case 'hydroponics':
      return 'HYDROPONIC_ROOM';
    case 'facility':
      return 'FACILITY';
    case 'site':
    case 'outdoor':
      return 'SMALL_FARM';
    default:
      return 'GROW_ROOM';
  }
}
