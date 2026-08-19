import { describe, expect, it } from 'vitest';
import { mapBlueprintSchema } from '../../data/schemas/map-blueprint.schema';
import { validateMapBlueprint } from '../../application/map/blueprint-validator';
import { layoutFromBlueprint } from '../../application/map/spatial-layout.engine';
import { parseMapDescription } from '../../application/map/map-description.parser';
import { matchBlueprintToDevices } from '../../application/map/device-matcher';
import type { Device } from '../device/device.types';

const validBlueprint = {
  schemaVersion: 1 as const,
  spaceGeometry: { lengthM: 6, widthM: 4, heightM: 2.5 },
  zones: [{ name: 'Zone A', xM: 0, yM: 0, widthM: 3, heightM: 4 }],
  objects: [
    {
      id: 'rack-1',
      type: 'structure' as const,
      name: 'Стеллаж 1',
      suggestedPosition: { xM: 0.2, yM: 0.4 },
      dimensions: { widthM: 4, heightM: 0.6 },
      rotationDeg: 0,
      origin: 'existing' as const,
    },
    {
      id: 'ex-1',
      type: 'equipment' as const,
      name: 'Вытяжка',
      role: 'exhaust',
      suggestedPosition: { xM: 5.5, yM: 1.8 },
      dimensions: { widthM: 0.4, heightM: 0.4 },
      rotationDeg: 0,
      origin: 'existing' as const,
    },
  ],
  plantGroups: [{ name: 'Томаты', count: 48, crop: 'tomato', position: { xM: 0.4, yM: 0.5 } }],
  relationships: [],
  assumptions: ['Стеллажи вдоль длинной стены'],
  questions: [],
  confidence: 'medium' as const,
  recommendedHardware: [{ type: 'sensor', role: 'climate', reason: 'Третий датчик для неоднородности' }],
};

describe('MapBlueprint', () => {
  it('parses a valid blueprint', () => {
    expect(mapBlueprintSchema.parse(validBlueprint).plantGroups[0]?.count).toBe(48);
  });

  it('rejects objects outside the room', () => {
    const result = validateMapBlueprint({
      ...validBlueprint,
      objects: [
        {
          ...validBlueprint.objects[0]!,
          suggestedPosition: { xM: 9, yM: 1 },
        },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'outside_room')).toBe(true);
  });

  it('does not treat recommended hardware as existing objects', () => {
    const result = validateMapBlueprint(validBlueprint);
    expect(result.ok).toBe(true);
    expect(validBlueprint.objects.every((o) => o.origin === 'existing')).toBe(true);
    expect(validBlueprint.recommendedHardware).toHaveLength(1);
  });

  it('rejects missing dimensions', () => {
    const result = validateMapBlueprint({
      ...validBlueprint,
      spaceGeometry: { lengthM: 0, widthM: 4, heightM: 2.5 },
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'missing_dimensions')).toBe(true);
  });

  it('layout engine builds preview without deviceIds', () => {
    const layout = layoutFromBlueprint(validBlueprint, 'space-1');
    expect(layout.map.placements.length).toBeGreaterThan(0);
    expect(layout.map.placements.every((p) => !p.deviceId)).toBe(true);
    expect(layout.groups[0]?.plantIds.length).toBe(48);
    expect(layout.plants).toHaveLength(48);
  });

  it('local parser builds a proposal from natural language', () => {
    const parsed = parseMapDescription(
      'Комната 6×4×2.5. Два стеллажа. 48 томатов. 4 лампы. 2 датчика. Вытяжка справа.',
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.blueprint.spaceGeometry).toEqual({ lengthM: 6, widthM: 4, heightM: 2.5 });
    expect(parsed.blueprint.objects.filter((o) => o.type === 'structure').length).toBe(2);
    expect(parsed.blueprint.objects.filter((o) => o.type === 'light').length).toBe(4);
    expect(parsed.blueprint.objects.filter((o) => o.type === 'sensor' && o.origin === 'existing').length).toBe(2);
    expect(parsed.blueprint.objects.some((o) => o.role === 'exhaust')).toBe(true);
    expect(parsed.blueprint.plantGroups[0]?.count).toBe(48);
  });

  it('device matcher suggests exhaust → ventilation output without auto-linking', () => {
    const device: Device = {
      id: 'dev-1',
      spaceId: 'space-1',
      modelId: 'qbx-power-4',
      model: 'qbx-power-4',
      modelName: 'QBX Power 4',
      name: 'Power',
      customName: 'QBX Power 4',
      status: 'online',
      isOnline: true,
      capabilities: {
        sensorInputCount: 0,
        outputCount: 1,
        supportedSensorTypes: [],
        supportedOutputTypes: ['ventilation'],
        specialCapabilities: [],
      },
      sensors: [],
      inputs: [],
      outputs: [
        {
          id: 'out-2',
          portNumber: 2,
          hardwareLabel: 'OUT2',
          type: 'ventilation',
          name: 'Вытяжка',
          customName: 'Вытяжка',
          state: false,
          controlMode: 'auto',
          isAuto: true,
        },
      ],
      firmwareVersion: '0',
      serialNumber: 'x',
      addedAt: '2026-08-18',
    };
    const matches = matchBlueprintToDevices(validBlueprint, [device]);
    const exhaust = matches.find((m) => m.objectId === 'ex-1');
    expect(exhaust?.candidates[0]?.outputId).toBe('out-2');
    expect(exhaust?.linked).toBe(false);
  });
});
