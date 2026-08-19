import type { MapBlueprint, MapBlueprintObject } from '../../domain/map/map-blueprint.types';
import { validateMapBlueprint } from './blueprint-validator';
import type { MapObjectKind } from '../../domain/map/space-map.types';
import { parsePlantAgeFromText } from '../../domain/grow/plant-setup-age';

export type ParseMapResult = { ok: true; blueprint: MapBlueprint } | { ok: false; error: string };

function num(text: string): number {
  return Number(text.replace(',', '.'));
}

const WORD_NUM: Record<string, number> = {
  один: 1,
  одна: 1,
  два: 2,
  две: 2,
  три: 3,
  четыре: 4,
  пять: 5,
  шесть: 6,
  семь: 7,
  восемь: 8,
};

function parseCount(text: string, noun: string): number {
  const digit = text.match(new RegExp(`(\\d+)\\s*${noun}`));
  if (digit) return Number(digit[1]);
  for (const [word, n] of Object.entries(WORD_NUM)) {
    if (new RegExp(`${word}\\s*${noun}`).test(text)) return n;
  }
  return new RegExp(noun).test(text) ? 1 : 0;
}

function placeRow(
  count: number,
  type: MapObjectKind,
  name: string,
  yM: number,
  lengthM: number,
  size: { widthM: number; heightM: number },
  role?: string,
): MapBlueprintObject[] {
  const gap = lengthM / (count + 1);
  return Array.from({ length: count }, (_, i) => ({
    id: `${type}-${i + 1}`,
    type,
    name: count > 1 ? `${name} ${i + 1}` : name,
    role,
    suggestedPosition: { xM: Number((gap * (i + 1) - size.widthM / 2).toFixed(2)), yM },
    dimensions: size,
    rotationDeg: 0,
    origin: 'existing' as const,
  }));
}

export function parseMapDescription(text: string): ParseMapResult {
  const t = text.replace(/,/g, '.').toLowerCase();
  const dim = t.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(?:[x×]\s*(\d+(?:\.\d+)?))?/);
  if (!dim) {
    return { ok: false, error: 'Не указаны размеры помещения (например 6×4×2.5 м).' };
  }
  const lengthM = num(dim[1]!);
  const widthM = num(dim[2]!);
  const heightM = dim[3] ? num(dim[3]) : 2.5;
  if (!(lengthM > 0 && widthM > 0 && heightM > 0)) {
    return { ok: false, error: 'Размеры помещения должны быть больше нуля.' };
  }

  const assumptions: string[] = [];
  const questions: string[] = [];
  const objects: MapBlueprintObject[] = [];

  const rackCount = parseCount(t, 'стеллаж');
  if (rackCount > 0) {
    assumptions.push('Стеллажи расставлены вдоль длины помещения.');
    const rackLen = Math.min(lengthM - 0.4, Math.max(2, lengthM - 0.8));
    for (let i = 0; i < rackCount; i += 1) {
      const y = 0.3 + i * Math.max(0.8, (widthM - 0.8) / Math.max(rackCount, 1));
      objects.push({
        id: `rack-${i + 1}`,
        type: 'structure',
        name: `Стеллаж ${i + 1}`,
        suggestedPosition: { xM: 0.2, yM: Number(y.toFixed(2)) },
        dimensions: { widthM: rackLen, heightM: 0.5 },
        rotationDeg: 0,
        origin: 'existing',
      });
    }
  }

  const lightCount = parseCount(t, '(?:светильник|ламп)');
  if (lightCount > 0) {
    objects.push(...placeRow(lightCount, 'light', 'Свет', widthM - 0.5, lengthM, { widthM: 0.6, heightM: 0.25 }));
  }

  const sensorCount = parseCount(t, 'датчик');
  if (sensorCount > 0) {
    objects.push(
      ...placeRow(sensorCount, 'sensor', 'Датчик климата', widthM / 2, lengthM, { widthM: 0.2, heightM: 0.2 }, 'climate'),
    );
  }

  if (/вытяж/.test(t)) {
    const right = /справа|дальн|правой/.test(t);
    const left = /слева|вход/.test(t) && !right;
    const xM = right ? lengthM - 0.5 : left ? 0.1 : lengthM - 0.5;
    if (right) assumptions.push('Вытяжка на правой (дальней по +X) стене.');
    objects.push({
      id: 'exhaust-1',
      type: 'equipment',
      name: 'Вытяжка',
      role: 'exhaust',
      suggestedPosition: { xM: Number(xM.toFixed(2)), yM: Number((widthM / 2 - 0.2).toFixed(2)) },
      dimensions: { widthM: 0.4, heightM: 0.4 },
      rotationDeg: 0,
      origin: 'existing',
    });
  }

  if (/резервуар|бак/.test(t)) {
    assumptions.push('Резервуар у входа (SW, origin).');
    objects.push({
      id: 'tank-1',
      type: 'structure',
      name: 'Резервуар',
      role: 'reservoir',
      suggestedPosition: { xM: 0.1, yM: 0.1 },
      dimensions: { widthM: 0.6, heightM: 0.4 },
      rotationDeg: 0,
      origin: 'existing',
    });
  }

  const plantCount = parseCount(t, '(?:растен|томат)');
  const parsedAge = parsePlantAgeFromText(t);
  const plantGroups = plantCount
    ? [
        {
          name: /томат/.test(t) ? 'Томаты' : 'Растения',
          count: plantCount,
          crop: /томат/.test(t) ? 'tomato' : undefined,
          position: { xM: 0.3, yM: rackCount > 0 ? 0.35 : 0.5 },
          dimensions: { widthM: Math.min(lengthM - 0.6, 4), heightM: 0.5 },
          ageDays: parsedAge,
        },
      ]
    : [];
  if (parsedAge != null && parsedAge > 0) {
    assumptions.push(`Возраст растений: ~${parsedAge} дн. с посадки.`);
  }

  if (!lightCount && /свет над/.test(t)) {
    questions.push('Сколько светильников и какого размера?');
  }

  const recommendedHardware = [];
  if (sensorCount === 1 && lengthM * widthM >= 12) {
    recommendedHardware.push({
      type: 'sensor',
      role: 'climate',
      reason: 'Один датчик на большую площадь — для неоднородности климата нужен второй.',
    });
  }

  const blueprint: MapBlueprint = {
    schemaVersion: 1,
    spaceGeometry: { lengthM, widthM, heightM },
    zones: [
      { name: 'Zone A', xM: 0, yM: 0, widthM: lengthM / 2, heightM: widthM },
      { name: 'Zone B', xM: lengthM / 2, yM: 0, widthM: lengthM / 2, heightM: widthM },
    ],
    objects,
    plantGroups,
    relationships: [],
    assumptions,
    questions,
    confidence: questions.length ? 'low' : assumptions.length ? 'medium' : 'high',
    recommendedHardware,
    defaultPlantAgeDays: parsedAge,
  };

  const validation = validateMapBlueprint(blueprint);
  if (!validation.ok) {
    return { ok: false, error: validation.issues.map((i) => i.message).join(' ') };
  }
  return { ok: true, blueprint };
}
