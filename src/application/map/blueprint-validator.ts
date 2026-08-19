import type { MapBlueprint, BlueprintValidationResult } from '../../domain/map/map-blueprint.types';
import { mapBlueprintSchema } from '../../data/schemas/map-blueprint.schema';

export function validateMapBlueprint(input: unknown): BlueprintValidationResult {
  const parsed = mapBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    const missing = parsed.error.issues.some((i) => i.path.join('.').includes('spaceGeometry') || i.message.includes('positive'));
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        code: missing ? 'invalid_schema' : 'invalid_schema',
        message: `${i.path.join('.') || 'blueprint'}: ${i.message}`,
      })),
    };
  }

  const bp = parsed.data as MapBlueprint;
  const issues: BlueprintValidationResult['issues'] = [];
  const { lengthM, widthM, heightM } = bp.spaceGeometry;
  if (!(lengthM > 0 && widthM > 0 && heightM > 0)) {
    issues.push({ code: 'missing_dimensions', message: 'Размеры помещения должны быть больше нуля.' });
  }

  const inside = (x: number, y: number, w: number, h: number) =>
    x >= 0 && y >= 0 && x + w <= lengthM + 1e-6 && y + h <= widthM + 1e-6;

  for (const obj of bp.objects) {
    if (!inside(obj.suggestedPosition.xM, obj.suggestedPosition.yM, obj.dimensions.widthM, obj.dimensions.heightM)) {
      issues.push({ code: 'outside_room', message: `${obj.name} выходит за границы помещения.` });
    }
    if (obj.origin === 'recommended') {
      issues.push({
        code: 'recommended_as_object',
        message: `${obj.name} помечен как recommended — не должен быть существующим объектом.`,
      });
    }
  }

  for (const zone of bp.zones) {
    if (!inside(zone.xM, zone.yM, zone.widthM, zone.heightM)) {
      issues.push({ code: 'outside_room', message: `Зона ${zone.name} выходит за границы помещения.` });
    }
  }

  return { ok: issues.length === 0, issues };
}
