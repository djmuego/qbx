import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { MapBlueprint } from '../../domain/map/map-blueprint.types';
import { mapBlueprintSchema } from '../../data/schemas/map-blueprint.schema';
import { validateMapBlueprint } from './blueprint-validator';
import { parseMapDescription, type ParseMapResult } from './map-description.parser';
import { getAiProvider } from '../ai/providers/provider-factory';

const SYSTEM = `You generate a QBX MapBlueprint JSON. No deviceId. origin=existing only for hardware the user said they have. Extra sensors go to recommendedHardware, not objects.
schemaVersion=1. Coordinates in meters, origin SW, +X length, +Y width. Objects must fit in spaceGeometry.
For plantGroups set ageDays (days since planting) when user mentions mature/vegetative/seedling plants or specific age. Use defaultPlantAgeDays as fallback.
Return JSON only.`;

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('no json');
  return match[0];
}

export async function generateMapBlueprint(
  description: string,
  options?: { settings?: AiSettings; forceGateway?: boolean },
): Promise<ParseMapResult> {
  const local = parseMapDescription(description);
  if (!options?.forceGateway || !options.settings?.enabled) return local;

  try {
    const provider = getAiProvider(options.settings.provider);
    const result = await provider.chat({
      provider: options.settings.provider,
      model: options.settings.model,
      responseFormat: 'json',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: description },
      ],
    });
    const parsed = mapBlueprintSchema.parse(JSON.parse(extractJson(result.content)));
    const validation = validateMapBlueprint(parsed);
    if (!validation.ok) return local.ok ? local : { ok: false, error: validation.issues.map((i) => i.message).join(' ') };
    return { ok: true, blueprint: parsed as MapBlueprint };
  } catch {
    return local.ok ? local : { ok: false, error: 'Не удалось разобрать описание помещения.' };
  }
}
