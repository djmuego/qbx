import type { LayoutPreview } from '../map/map-blueprint.types';
import type { MapPlacement } from '../map/space-map.types';
import { placementCycleDays } from './plant-growth-visual';

export interface PlantAgePreset {
  id: string;
  label: string;
  cycleFraction: number;
}

export const PLANT_AGE_PRESETS: PlantAgePreset[] = [
  { id: 'seedling', label: 'Саженец', cycleFraction: 0.12 },
  { id: 'vegetative', label: 'Вегетация', cycleFraction: 0.45 },
  { id: 'flowering', label: 'Цветение', cycleFraction: 0.72 },
  { id: 'mature', label: 'Зрелость', cycleFraction: 1 },
];

export function plantedAtFromAgeDays(ageDays: number, now: Date = new Date()): string {
  const days = Math.max(0, Math.round(ageDays));
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

export function ageDaysFromPreset(presetId: string, cycleDays = 90): number {
  const preset = PLANT_AGE_PRESETS.find((p) => p.id === presetId);
  return Math.round((preset?.cycleFraction ?? 0) * cycleDays);
}

export function defaultCycleDaysForSetup(placement?: Pick<MapPlacement, 'kind' | 'role'>): number {
  if (!placement) return 90;
  return placementCycleDays(placement);
}

/** Parse Russian/English age hints from free text. */
export function parsePlantAgeFromText(text: string, cycleDays = 90): number | undefined {
  const t = text.toLowerCase();

  const dayMatch = t.match(/(\d+)\s*(?:дн|day)/);
  if (dayMatch) return Math.min(cycleDays, Number(dayMatch[1]));

  const weekMatch = t.match(/(\d+)\s*(?:нед|week)/);
  if (weekMatch) return Math.min(cycleDays, Number(weekMatch[1]) * 7);

  const monthMatch = t.match(/(\d+)\s*(?:мес|month)/);
  if (monthMatch) return Math.min(cycleDays, Number(monthMatch[1]) * 30);

  if (/нов(ая|ые|ое)\s+посад|только\s+посад|from\s+seed/.test(t)) return 0;
  if (/взросл|зрел|урожай|собира|mature|harvest/.test(t)) return cycleDays;
  if (/цветен|flower/.test(t)) return Math.round(cycleDays * 0.72);
  if (/вегет|подрос|vegetat/.test(t)) return Math.round(cycleDays * 0.45);
  if (/саженец|молод|проращ|рассада|seedling|germinat/.test(t)) return Math.round(cycleDays * 0.12);

  return undefined;
}

export interface PlantAgeSuggestion {
  ageDays: number;
  reason: string;
}

/** Lightweight heuristic “AI assist” — no network, uses crop + description. */
export function suggestPlantAgeDays(ctx: {
  description?: string;
  crop?: string;
  growMethod?: string;
  cycleDays?: number;
}): PlantAgeSuggestion {
  const cycle = ctx.cycleDays ?? 90;
  const blob = [ctx.description, ctx.crop].filter(Boolean).join('. ');
  const parsed = blob ? parsePlantAgeFromText(blob, cycle) : undefined;
  if (parsed != null) {
    return { ageDays: parsed, reason: 'Возраст из вашего описания' };
  }

  const crop = (ctx.crop ?? '').toLowerCase();
  if (/томат|tomato|pepper|перец|cucumber|огур/.test(crop)) {
    if (/теплиц|greenhouse|существ|уже|перенос/.test(blob)) {
      return { ageDays: Math.round(cycle * 0.55), reason: 'Типичная теплица с подросшей культурой' };
    }
  }
  if (/уже|существ|перенос|документ|имеется/.test(blob)) {
    return { ageDays: Math.round(cycle * 0.5), reason: 'Существующее помещение — средний возраст' };
  }

  return { ageDays: 0, reason: 'Новая посадка — день 0' };
}

export function enrichLayoutWithPlantAge(layout: LayoutPreview, ageDays: number, now: Date = new Date()): LayoutPreview {
  if (ageDays <= 0 || !layout.plants.length) return layout;
  const plantedAt = plantedAtFromAgeDays(ageDays, now);
  return {
    ...layout,
    plants: layout.plants.map((p) => ({ ...p, plantedAt, growthMode: 'auto' })),
  };
}
