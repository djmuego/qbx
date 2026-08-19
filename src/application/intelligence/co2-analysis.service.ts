import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import type { Co2Analysis } from '../../domain/intelligence/analysis.types';

export function analyzeCo2(context: CultivationContext): Co2Analysis {
  const co2 = context.environment.sensors.find((s) => s.type === 'co2');
  const co2Known = co2?.quality === 'fresh' && co2.value != null;
  const ventOn = context.equipment.some(
    (e) => (e.type === 'ventilation' || /вент|exhaust|вытяж/i.test(e.name)) && e.reportedState,
  );
  const lightOn = context.equipment.some((e) => e.type === 'lighting' && e.reportedState);

  if (!co2Known) {
    return {
      available: true,
      co2Known: false,
      enrichmentRecommended: false,
      ventConflict: false,
      summary: 'CO₂ sensor отсутствует или stale — не рекомендуем enrichment вслепую.',
      evidence: ['CO2 level unknown'],
      confidence: 'high',
    };
  }

  const ventConflict = ventOn && (co2!.value ?? 0) > 700;
  const enrichmentRecommended = lightOn && !ventConflict && (co2!.value ?? 0) < 800;

  return {
    available: true,
    co2Known: true,
    enrichmentRecommended,
    ventConflict,
    summary: ventConflict
      ? 'Высокий CO₂ при активной вытяжке — проверьте стратегию.'
      : enrichmentRecommended
        ? 'При активном свете CO₂ может быть ниже цели — enrichment имеет смысл только с измерением.'
        : 'CO₂ в рабочем контексте.',
    evidence: [`CO2=${co2!.value}`, `vent=${ventOn}`, `light=${lightOn}`],
    confidence: 'medium',
  };
}
