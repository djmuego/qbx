export type GrowPhaseId = 'seedling' | 'vegetation' | 'flowering' | 'flushing';

export interface GrowPhaseInfo {
  id: GrowPhaseId;
  name: string;
  subtitle: string;
  description: string;
  lightCycle: string;
  targetTemp: string;
  targetHumidity: string;
}

export const GROW_PHASES: Record<GrowPhaseId, GrowPhaseInfo> = {
  vegetation: {
    id: 'vegetation',
    name: 'Вегетация',
    subtitle: '18/6 ЧАСОВ СВЕТА',
    description: 'Система оптимизирована для быстрого роста зеленой массы.',
    lightCycle: '18 / 6',
    targetTemp: '24–26 °C',
    targetHumidity: '55–65%',
  },
  flowering: {
    id: 'flowering',
    name: 'Цветение',
    subtitle: '12/12 ЧАСОВ СВЕТА',
    description: 'Интенсивное освещение и пониженная влажность для формирования плодов и соцветий.',
    lightCycle: '12 / 12',
    targetTemp: '22–24 °C',
    targetHumidity: '40–50%',
  },
  seedling: {
    id: 'seedling',
    name: 'Проращивание',
    subtitle: '18/6 ЧАСОВ СВЕТА',
    description: 'Мягкий свет и высокая влажность для активного корнеобразования.',
    lightCycle: '18 / 6',
    targetTemp: '23–25 °C',
    targetHumidity: '65–75%',
  },
  flushing: {
    id: 'flushing',
    name: 'Созревание',
    subtitle: '12/12 ЧАСОВ СВЕТА',
    description: 'Финальный этап созревания и подготовка к уборке урожая.',
    lightCycle: '12 / 12',
    targetTemp: '20–22 °C',
    targetHumidity: '35–45%',
  },
};
