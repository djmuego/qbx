import type { GrowPhaseId } from './grow-phase.types';

/** Extended grow stage model — not all stages apply to every crop. */
export type GrowStageId =
  | 'germination'
  | 'seedling'
  | 'vegetative'
  | 'preflower'
  | 'flowering'
  | 'fruiting'
  | 'ripening'
  | 'harvest'
  | 'custom';

export const GROW_STAGE_LABELS: Record<GrowStageId, string> = {
  germination: 'Прорастание',
  seedling: 'Рассада',
  vegetative: 'Вегетация',
  preflower: 'Предцвет',
  flowering: 'Цветение',
  fruiting: 'Плодоношение',
  ripening: 'Созревание',
  harvest: 'Уборка',
  custom: 'Пользовательская',
};

/** Maps legacy QBX growPhase setting to extended stage id. */
export function mapGrowPhaseToStage(phase: GrowPhaseId): GrowStageId {
  const map: Record<GrowPhaseId, GrowStageId> = {
    seedling: 'seedling',
    vegetation: 'vegetative',
    flowering: 'flowering',
    flushing: 'ripening',
  };
  return map[phase];
}
