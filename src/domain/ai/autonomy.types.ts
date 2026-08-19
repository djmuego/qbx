/** How much authority AI has over equipment — user-configurable per space or globally */
export type AiAutonomyLevel = 'advisor' | 'confirm' | 'autopilot';

export const AI_AUTONOMY_LABELS: Record<AiAutonomyLevel, string> = {
  advisor: 'Советник — только рекомендации',
  confirm: 'С подтверждением — AI предлагает, человек нажимает «Выполнить»',
  autopilot: 'Автопилот — разрешённые действия без подтверждения (в пределах Safety)',
};

export interface AiAutonomyPolicy {
  level: AiAutonomyLevel;
  /** Action categories allowed in autopilot, e.g. ventilation, irrigation */
  allowedCategories?: string[];
  /** Hard caps — deterministic Safety always wins */
  maxContinuousOutputMinutes?: number;
  requireConfirmationFor?: ('irrigation' | 'heating' | 'co2' | 'lighting' | 'fertigation')[];
}

export const DEFAULT_AI_AUTONOMY: AiAutonomyPolicy = {
  level: 'advisor',
};
