import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import { analyzeSpatialLayout } from './spatial-insight.engine';
import { isPlacementInZone, nearestPlacement, placementCenter } from '../../domain/map/space-map.geometry';

export interface SpatialQuestionInput {
  space: Space;
  map: SpaceMap;
  devices: Device[];
}

export function answerSpatialQuestion(question: string, input: SpatialQuestionInput): string | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;
  const insights = analyzeSpatialLayout(input);
  const { map, devices } = input;

  const spatialCue =
    /карт|зон|датчик|куда постав|покрыт|компонов|перестав|растен.*ближ|самая (высок|холод|тепл)|прибор.*zone|оцени/.test(
      q,
    );
  if (!spatialCue && !/sensor|zone|layout|map/.test(q)) return null;

  if (/самая холодн|самая тепл|самая высок.*темп/.test(q)) {
    const temps = map.placements
      .filter((p) => p.kind === 'sensor')
      .flatMap((p) =>
        devices.flatMap((d) =>
          d.isOnline
            ? d.inputs.filter((s) => s.id === p.sensorId && s.type === 'temperature' && Number.isFinite(s.currentValue))
            : [],
        ),
      );
    if (temps.length < 2) {
      return 'Недостаточно данных для spatial comparison. Нужны минимум два свежих датчика температуры в разных точках.';
    }
  }

  if (/куда постав.*датчик|третий датчик|второй датчик/.test(q)) {
    const rec = insights.find((i) => i.kind === 'placement_recommendation');
    if (rec?.suggestedPosition) {
      return `**${rec.title}** (${rec.basis ?? 'GEOMETRY_BASED'})\n${rec.detail}\nРекомендуемая точка: X ${rec.suggestedPosition.xM} м, Y ${rec.suggestedPosition.yM} м.\nЭто предложение по геометрии, не сохранённый объект.`;
    }
    return 'На карте мало данных для рекомендации точки. Добавьте размеры и хотя бы один датчик.';
  }

  if (/покрыт|coverage|оцени.*карт/.test(q)) {
    const missing = insights.filter((i) => i.kind === 'zone_without_sensor');
    const lines = ['**Оценка карты (локально, без домыслов)**'];
    lines.push(`Объектов: ${map.placements.length}, зон: ${map.zones.length}.`);
    if (missing.length) lines.push(missing.map((m) => `- ${m.detail}`).join('\n'));
    else lines.push('- У каждой зоны есть датчик или зон ещё нет.');
    const rec = insights.find((i) => i.kind === 'placement_recommendation');
    if (rec) lines.push(`- ${rec.detail}`);
    return lines.join('\n');
  }

  if (/растен.*ближ|ближ.*sensor|датчик 1|sensor 1/.test(q)) {
    const sensor = map.placements.find((p) => p.kind === 'sensor');
    const plants = map.placements.filter((p) => p.kind === 'plant' || p.kind === 'plant_group');
    if (!sensor || plants.length === 0) return 'На карте нет одновременно датчика и растений.';
    const nearest = nearestPlacement(sensor, plants);
    if (!nearest) return 'Не удалось найти ближайшие растения.';
    const d = Math.hypot(
      placementCenter(sensor).xM - placementCenter(nearest).xM,
      placementCenter(sensor).yM - placementCenter(nearest).yM,
    );
    return `Ближе всего к датчику «${sensor.label ?? 'Датчик'}»: ${nearest.label ?? 'растения'} (${d.toFixed(1)} м).`;
  }

  if (/прибор.*zone a|zone a|зоне a/.test(q)) {
    const zone = map.zones.find((z) => /a/i.test(z.name)) ?? map.zones[0];
    if (!zone) return 'Зон на карте пока нет.';
    const items = map.placements.filter((p) => isPlacementInZone(p, zone) || p.zoneId === zone.id);
    if (!items.length) return `В ${zone.name} нет объектов.`;
    return `В ${zone.name}: ${items.map((i) => i.label ?? i.kind).join(', ')}.`;
  }

  if (/розетк|кабел|электро|питан|групп.*прибор|сколько.*кабел/.test(q)) {
    const lights = map.placements.filter((p) => p.kind === 'light').length;
    const outlets = map.placements.filter((p) => p.kind === 'outlet' || p.kind === 'electrical_panel').length;
    const knownW = map.placements.map((p) => p.ratedPowerW).filter((w): w is number => typeof w === 'number');
    const load = knownW.length ? `${knownW.reduce((a, b) => a + b, 0)} W (только введённые ватты)` : 'нагрузка неизвестна — ватты не выдумываем';
    return `**Логическая схема питания (не монтажная инструкция)**\nСветильников: ${lights}. Розеток/щитов: ${outlets}. ${load}.\nСечения, номиналы автоматов и УЗО QBX не назначает — нужна проверка электриком.`;
  }

  if (/что.*перестав|компонов|layout/.test(q)) {
    const issues = insights.filter((i) =>
      ['layout_issue', 'sensor_distribution', 'placement_recommendation', 'zone_without_sensor'].includes(i.kind),
    );
    if (!issues.length) return 'Явных проблем компоновки по геометрии не видно. Telemetry-based выводы доступны только при нескольких датчиках.';
    return `**Компоновка**\n${issues.map((i) => `- ${i.title}: ${i.detail}`).join('\n')}`;
  }

  if (/самая высок.*темп|где сейчас/.test(q) && /темп/.test(q)) {
    const temps = devices.flatMap((d) =>
      d.isOnline
        ? d.inputs.filter((s) => s.type === 'temperature' && Number.isFinite(s.currentValue)).map((s) => ({ d, s }))
        : [],
    );
    if (temps.length < 2) {
      return 'Недостаточно данных для spatial comparison.';
    }
    const hottest = [...temps].sort((a, b) => b.s.currentValue - a.s.currentValue)[0]!;
    return `Самая высокая температура среди свежих датчиков: ${hottest.s.customName} — ${hottest.s.currentValue}${hottest.s.unit}. Это FACT по показаниям, не карта поля.`;
  }

  if (spatialCue) {
    const top = insights.slice(0, 4);
    if (!top.length) return 'Карта есть, но пространственных замечаний пока нет.';
    return `**Пространственный обзор**\n${top.map((i) => `- ${i.title}: ${i.detail}`).join('\n')}`;
  }

  return null;
}
