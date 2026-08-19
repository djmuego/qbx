import type { DeviceModel } from '../domain/device/device.types';
import type { SensorType } from '../domain/sensor/sensor.types';
import type { EquipmentType } from '../domain/equipment/equipment.types';
import { DEVICE_MODELS, EQUIPMENT_CONFIG, SENSOR_CONFIG } from '../domain/catalog/device-catalog';
import type { Device } from '../domain/device/device.types';
import { mapLegacyDevice } from '../data/adapters/mappers';
import type { LegacyDevice } from '../data/schemas/qbx.schemas';
import { isSimulatorMode } from '../config/runtime-mode';
import type { TranslateFn } from '../i18n/translate';
import { createTranslator } from '../i18n/translate';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from '../i18n/types';
import { localizeDeviceModel, localizeEquipmentConfig, localizeSensorConfig } from '../i18n/localize-catalog';

export function createDeviceFromModel(
  modelId: string,
  customName: string,
  spaceId: string,
  t?: TranslateFn,
): Device {
  const raw = DEVICE_MODELS.find((m) => m.id === modelId) ?? DEVICE_MODELS[0];
  const translator = resolveTranslator(t);
  const modelDef = translator ? localizeDeviceModel(raw, translator) : raw;
  const sensorConf = translator ? localizeSensorConfig(translator) : SENSOR_CONFIG;
  const equipmentConf = translator ? localizeEquipmentConfig(translator) : EQUIPMENT_CONFIG;
  const portFree = translator ? translator('devices.portFree', 'Порт свободен') : 'Порт свободен';
  const newDeviceId = `dev-${Date.now()}`;
  const dateStr = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());
  const randId = Math.floor(1000 + Math.random() * 9000);
  const simulator = isSimulatorMode();

  const legacy: LegacyDevice = {
    id: newDeviceId,
    spaceId,
    modelId: modelDef.id,
    modelName: modelDef.name,
    customName: customName.trim() || modelDef.name,
    isOnline: simulator,
    firmwareVersion: simulator ? 'sim-v2.4.2' : '',
    serialNumber: simulator ? `QBX-${modelDef.id.split('-')[1]?.toUpperCase() || 'MOD'}-${randId}` : '',
    addedAt: dateStr,
    inputs: buildInputs(modelDef, newDeviceId, simulator, sensorConf, portFree),
    outputs: buildOutputs(modelDef, newDeviceId, equipmentConf, portFree),
  };

  return mapLegacyDevice(legacy);
}

function resolveTranslator(t?: TranslateFn): TranslateFn | undefined {
  if (t) return t;
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  const locale = (stored ?? DEFAULT_LOCALE) as Locale;
  if (locale === DEFAULT_LOCALE) return undefined;
  return createTranslator(locale);
}

function buildInputs(
  modelDef: DeviceModel,
  deviceId: string,
  simulator: boolean,
  sensorConf: typeof SENSOR_CONFIG,
  portFree: string,
): LegacyDevice['inputs'] {
  return Array.from({ length: modelDef.inputCount }).map((_, idx) => {
    const portNum = idx + 1;
    const def = modelDef.defaultInputs?.[idx];
    const sensorType: SensorType = def ? def.type : 'unused';
    const conf = sensorConf[sensorType];
    const initialVal = simulator && sensorType !== 'unused' ? initialSensorValue(sensorType) : 0;

    return {
      id: `${deviceId}-in${portNum}`,
      portNumber: portNum,
      hardwareLabel: `IN${portNum}`,
      type: sensorType,
      customName: def ? def.name : sensorType === 'unused' ? portFree : conf.label,
      currentValue: initialVal,
      unit: def ? def.unit : conf.defaultUnit,
      optimalMin: def ? def.optimalMin : conf.optimalMin,
      optimalMax: def ? def.optimalMax : conf.optimalMax,
      status: 'normal' as const,
      showOnHome: sensorType !== 'unused',
      history: simulator && sensorType !== 'unused' ? buildSimHistory(initialVal) : [],
    };
  });
}

function buildOutputs(
  modelDef: DeviceModel,
  deviceId: string,
  equipmentConf: typeof EQUIPMENT_CONFIG,
  portFree: string,
): LegacyDevice['outputs'] {
  return Array.from({ length: modelDef.outputCount }).map((_, idx) => {
    const portNum = idx + 1;
    const def = modelDef.defaultOutputs?.[idx];
    const eqType: EquipmentType = def ? def.type : 'unused';
    const conf = equipmentConf[eqType];
    const isHighPower = def?.isHighPower || (modelDef.hasHighPowerOutput && idx === 0);

    return {
      id: `${deviceId}-out${portNum}`,
      portNumber: portNum,
      hardwareLabel: `OUT${portNum}`,
      isHighPower: Boolean(isHighPower),
      type: eqType,
      customName: def ? def.name : eqType === 'unused' ? portFree : conf.defaultName,
      state: false,
      isAuto: true,
    };
  });
}

function initialSensorValue(type: SensorType): number {
  switch (type) {
    case 'temperature':
      return 24.0;
    case 'humidity':
      return 60;
    case 'soil_moisture':
      return 48;
    case 'co2':
      return 800;
    case 'ph':
      return 6.2;
    case 'ec':
      return 1.5;
    default:
      return 0;
  }
}

function buildSimHistory(initialVal: number) {
  return [
    { time: '00:00', value: initialVal - 0.5 },
    { time: '06:00', value: initialVal - 0.2 },
    { time: '12:00', value: initialVal + 0.4 },
    { time: '18:00', value: initialVal },
    { time: 'Сейчас', value: initialVal },
  ];
}

export function applySensorTypeChange(
  sensor: Device['inputs'][number],
  nextType: SensorType,
  customName?: string,
): Device['inputs'][number] {
  const conf = SENSOR_CONFIG[nextType];
  return {
    ...sensor,
    type: nextType,
    unit: conf.defaultUnit,
    optimalMin: conf.optimalMin,
    optimalMax: conf.optimalMax,
    customName: customName ?? (nextType === 'unused' ? 'Порт свободен' : conf.label),
    showOnHome: nextType !== 'unused',
    visibleOnHome: nextType !== 'unused',
    currentValue: 0,
    history: [],
  };
}

export function applyOutputTypeChange(
  output: Device['outputs'][number],
  nextType: EquipmentType,
  customName?: string,
): Device['outputs'][number] {
  const conf = EQUIPMENT_CONFIG[nextType];
  return {
    ...output,
    type: nextType,
    customName: customName ?? (nextType === 'unused' ? 'Порт свободен' : conf.defaultName),
  };
}
