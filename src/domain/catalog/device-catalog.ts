import type { DeviceCapabilities, DeviceModel } from '../device/device.types';
import type { EquipmentType } from '../equipment/equipment.types';
import type { SensorType } from '../sensor/sensor.types';
import { PRODUCT_CATALOG } from './product-catalog';

export type SensorConfigEntry = {
  label: string;
  defaultUnit: string;
  optimalMin: number;
  optimalMax: number;
};

export type EquipmentConfigEntry = {
  label: string;
  defaultName: string;
};

const ALL_SENSOR_TYPES: SensorType[] = [
  'temperature',
  'humidity',
  'soil_moisture',
  'co2',
  'light',
  'water_level',
  'ph',
  'ec',
  'pressure',
  'other',
  'generic',
  'unused',
];

const ALL_EQUIPMENT_TYPES: EquipmentType[] = [
  'lighting',
  'watering',
  'ventilation',
  'heating',
  'humidifier',
  'valve',
  'co2',
  'socket',
  'other',
  'unused',
];

export function buildCapabilities(model: Pick<DeviceModel, 'inputCount' | 'outputCount' | 'hasHighPowerOutput' | 'defaultInputs' | 'defaultOutputs'>): DeviceCapabilities {
  const inputTypes = model.defaultInputs?.map((d) => d.type) ?? [];
  const outputTypes = model.defaultOutputs?.map((d) => d.type) ?? [];
  const specialCapabilities: DeviceCapabilities['specialCapabilities'] = model.hasHighPowerOutput
    ? ['high_power_output']
    : [];

  return {
    sensorInputCount: model.inputCount,
    outputCount: model.outputCount,
    supportedSensorTypes: (model.inputCount > 0 ? [...new Set([...inputTypes, 'unused'])] : []) as SensorType[],
    supportedOutputTypes: (model.outputCount > 0 ? [...new Set([...outputTypes, 'unused'])] : []) as EquipmentType[],
    specialCapabilities,
  };
}

export const SENSOR_CONFIG: Record<SensorType, SensorConfigEntry> = {
  temperature: { label: 'Температура воздуха', defaultUnit: '°C', optimalMin: 21, optimalMax: 26 },
  humidity: { label: 'Влажность воздуха', defaultUnit: '%', optimalMin: 50, optimalMax: 65 },
  soil_moisture: { label: 'Влажность субстрата', defaultUnit: '%', optimalMin: 40, optimalMax: 65 },
  co2: { label: 'Уровень CO₂', defaultUnit: 'ppm', optimalMin: 600, optimalMax: 1100 },
  light: { label: 'Освещённость', defaultUnit: 'klx', optimalMin: 15, optimalMax: 50 },
  water_level: { label: 'Уровень воды', defaultUnit: '%', optimalMin: 30, optimalMax: 95 },
  ph: { label: 'Кислотность (pH)', defaultUnit: 'pH', optimalMin: 5.8, optimalMax: 6.5 },
  ec: { label: 'Проводимость (EC)', defaultUnit: 'mS/cm', optimalMin: 1.2, optimalMax: 2.0 },
  pressure: { label: 'Атмосферное давление', defaultUnit: 'hPa', optimalMin: 990, optimalMax: 1025 },
  other: { label: 'Универсальный датчик', defaultUnit: 'ед.', optimalMin: 0, optimalMax: 100 },
  generic: { label: 'Универсальный датчик', defaultUnit: 'ед.', optimalMin: 0, optimalMax: 100 },
  unused: { label: 'Не используется', defaultUnit: '', optimalMin: 0, optimalMax: 0 },
};

export const EQUIPMENT_CONFIG: Record<EquipmentType, EquipmentConfigEntry> = {
  lighting: { label: 'Освещение', defaultName: 'Основной свет' },
  watering: { label: 'Полив / Помпа', defaultName: 'Полив' },
  ventilation: { label: 'Вентиляция', defaultName: 'Вытяжка' },
  heating: { label: 'Обогрев', defaultName: 'Обогрев' },
  humidifier: { label: 'Увлажнитель', defaultName: 'Увлажнитель' },
  valve: { label: 'Клапан', defaultName: 'Электроклапан' },
  co2: { label: 'Подача CO₂', defaultName: 'Клапан CO₂' },
  socket: { label: 'Розетка', defaultName: 'Розетка' },
  other: { label: 'Другое оборудование', defaultName: 'Устройство' },
  unused: { label: 'Не используется', defaultName: 'Порт свободен' },
};

const RAW_MODELS: Omit<DeviceModel, 'capabilities'>[] = [
  {
    id: 'qbx-strip-4',
    name: 'QBX Strip 4',
    category: 'Умный удлинитель',
    description: '4 управляемые розетки + встроенные датчики климата',
    inputCount: 3,
    outputCount: 4,
    defaultInputs: [
      { type: 'temperature', name: 'Температура воздуха', unit: '°C', optimalMin: 21, optimalMax: 26 },
      { type: 'humidity', name: 'Влажность воздуха', unit: '%', optimalMin: 50, optimalMax: 65 },
      { type: 'light', name: 'Освещённость', unit: 'klx', optimalMin: 15, optimalMax: 50 },
    ],
    defaultOutputs: [
      { type: 'socket', name: 'Розетка 1' },
      { type: 'socket', name: 'Розетка 2' },
      { type: 'socket', name: 'Розетка 3' },
      { type: 'socket', name: 'Розетка 4' },
    ],
  },
  {
    id: 'qbx-hub',
    name: 'QBX Hub',
    category: 'Универсальный контроллер',
    description: '4 датчика + 4 управляемых выхода',
    inputCount: 4,
    outputCount: 4,
    defaultInputs: [
      { type: 'temperature', name: 'Температура воздуха', unit: '°C', optimalMin: 21, optimalMax: 26 },
      { type: 'humidity', name: 'Влажность воздуха', unit: '%', optimalMin: 50, optimalMax: 65 },
      { type: 'soil_moisture', name: 'Влажность субстрата', unit: '%', optimalMin: 45, optimalMax: 70 },
      { type: 'co2', name: 'Уровень CO₂', unit: 'ppm', optimalMin: 600, optimalMax: 1200 },
    ],
    defaultOutputs: [
      { type: 'lighting', name: 'Основной свет' },
      { type: 'ventilation', name: 'Вытяжка' },
      { type: 'watering', name: 'Полив' },
      { type: 'heating', name: 'Обогрев' },
    ],
  },
  {
    id: 'qbx-power-4',
    name: 'QBX Power 4',
    category: 'Умный силовой блок',
    description: '4 управляемых выхода',
    inputCount: 0,
    outputCount: 4,
    defaultOutputs: [
      { type: 'lighting', name: 'Дополнительный свет' },
      { type: 'ventilation', name: 'Обдув (вентилятор)' },
      { type: 'humidifier', name: 'Увлажнитель' },
      { type: 'socket', name: 'Розетка AUX' },
    ],
  },
  {
    id: 'qbx-power-4x',
    name: 'QBX Power 4X',
    category: 'Усиленный силовой блок',
    description: '4 стандартных выхода + 1 усиленный',
    inputCount: 0,
    outputCount: 5,
    hasHighPowerOutput: true,
    defaultOutputs: [
      { type: 'lighting', name: 'Мощный квантум-борд', isHighPower: true },
      { type: 'ventilation', name: 'Канальный вентилятор' },
      { type: 'heating', name: 'Конвектор обогрева' },
      { type: 'humidifier', name: 'Ультразвуковой увлажнитель' },
      { type: 'socket', name: 'Сервисный разъём' },
    ],
  },
  {
    id: 'qbx-power-8',
    name: 'QBX Power 8',
    category: 'Силовой блок расширения',
    description: '8 управляемых выходов',
    inputCount: 0,
    outputCount: 8,
    defaultOutputs: [
      { type: 'lighting', name: 'Свет Секция 1' },
      { type: 'lighting', name: 'Свет Секция 2' },
      { type: 'ventilation', name: 'Приточная вентиляция' },
      { type: 'ventilation', name: 'Вытяжка' },
      { type: 'watering', name: 'Линия капельного полива 1' },
      { type: 'watering', name: 'Линия капельного полива 2' },
      { type: 'co2', name: 'Клапан подачи CO₂' },
      { type: 'socket', name: 'Розетка оборудования' },
    ],
  },
  {
    id: 'qbx-sense',
    name: 'QBX Sense',
    category: 'Сенсорный модуль',
    description: 'До 4 подключаемых датчиков',
    inputCount: 4,
    outputCount: 0,
    defaultInputs: [
      { type: 'soil_moisture', name: 'Влажность почвы (Зона 1)', unit: '%', optimalMin: 40, optimalMax: 65 },
      { type: 'soil_moisture', name: 'Влажность почвы (Зона 2)', unit: '%', optimalMin: 40, optimalMax: 65 },
      { type: 'light', name: 'Освещённость (PPFD / Lux)', unit: 'klx', optimalMin: 20, optimalMax: 60 },
      { type: 'water_level', name: 'Уровень бака воды', unit: '%', optimalMin: 30, optimalMax: 95 },
    ],
  },
  {
    id: 'qbx-climate',
    name: 'QBX Climate',
    category: 'Климатический контроллер',
    description: '2 датчика климата + 2 выхода',
    inputCount: 2,
    outputCount: 2,
    defaultInputs: [
      { type: 'temperature', name: 'Температура кроны', unit: '°C', optimalMin: 22, optimalMax: 27 },
      { type: 'humidity', name: 'Относительная влажность', unit: '%', optimalMin: 55, optimalMax: 68 },
    ],
    defaultOutputs: [
      { type: 'ventilation', name: 'Вытяжной вентилятор' },
      { type: 'humidifier', name: 'Увлажнитель воздуха' },
    ],
  },
  {
    id: 'qbx-water',
    name: 'QBX Water',
    category: 'Контроллер гидропоники и полива',
    description: '2 датчика раствора + 2 выхода',
    inputCount: 2,
    outputCount: 2,
    defaultInputs: [
      { type: 'ph', name: 'Кислотность раствора (pH)', unit: 'pH', optimalMin: 5.8, optimalMax: 6.5 },
      { type: 'ec', name: 'Проводимость (EC)', unit: 'mS/cm', optimalMin: 1.2, optimalMax: 2.0 },
    ],
    defaultOutputs: [
      { type: 'watering', name: 'Помпа полива' },
      { type: 'valve', name: 'Клапан слива / долива' },
    ],
  },
];

export const DEVICE_MODELS: DeviceModel[] = RAW_MODELS.map((model) => ({
  ...model,
  capabilities: buildCapabilities(model),
  product: PRODUCT_CATALOG.find((p) => p.modelId === model.id),
})).sort((a, b) => (a.product?.sortOrder ?? 99) - (b.product?.sortOrder ?? 99));

export { ALL_SENSOR_TYPES, ALL_EQUIPMENT_TYPES };
