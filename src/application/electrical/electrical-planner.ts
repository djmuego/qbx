import type { SpaceMap } from '../../domain/map/space-map.types';
import type { ElectricalPlan } from '../../domain/electrical/electrical.types';

const DISCLAIMER =
  'Логическая схема питания. Это не инструкция по электромонтажу и не расчёт сечений/защиты.';

export function proposeLogicalPowerLinks(map: SpaceMap): ElectricalPlan {
  const loads = map.placements.filter((p) => ['light', 'equipment', 'irrigation', 'hub', 'camera'].includes(p.kind));
  const outlets = map.placements.filter((p) => p.kind === 'outlet' || p.kind === 'electrical_panel' || p.kind === 'hub');
  const sink = outlets[0];
  const links = sink
    ? loads.map((load) => ({
        fromId: load.id,
        toId: load.powerConnectionId ?? sink.id,
        kind: 'logical_power' as const,
      }))
    : [];

  const known = loads.map((p) => p.ratedPowerW).filter((w): w is number => typeof w === 'number' && Number.isFinite(w));
  const missing = loads.some((p) => p.ratedPowerW == null);
  const totalRatedW = known.length === 0 ? null : known.reduce((a, b) => a + b, 0);

  const findings: ElectricalPlan['findings'] = [{ code: 'needs_electrician_review', message: 'Любая силовая схема требует проверки квалифицированным электриком.' }];
  if (missing) findings.push({ code: 'unknown_load', message: 'Мощность части приборов неизвестна — сумму не выдумываем.' });
  const wet = map.placements.some((p) => p.kind === 'irrigation' && (p.role === 'pump' || p.role === 'reservoir'));
  if (wet) findings.push({ code: 'wet_zone_load', message: 'Насос/бак в зоне воды — рекомендуется отдельная защищённая цепь (проверка электриком).' });

  return {
    spaceId: map.spaceId,
    schemaVersion: 1,
    status: 'proposal',
    disclaimer: DISCLAIMER,
    generatedBy: 'electrical_planner_v1',
    links,
    totalRatedW,
    findings,
  };
}
