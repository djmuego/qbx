import type { DeviceModel } from '../domain/device/device.types';
import type { EquipmentType } from '../domain/equipment/equipment.types';
import type { SensorType } from '../domain/sensor/sensor.types';
import type { TranslateFn } from './translate';
import type { EquipmentConfigEntry, SensorConfigEntry } from '../domain/catalog/device-catalog';
import { DEVICE_MODELS, EQUIPMENT_CONFIG, SENSOR_CONFIG } from '../domain/catalog/device-catalog';
import { productMetaForModel } from '../domain/catalog/product-catalog';

function portKey(kind: 'in' | 'out', index: number): string {
  return `${kind}${index + 1}`;
}

export function localizeDeviceModel(model: DeviceModel, t: TranslateFn): DeviceModel {
  const base = `devices.models.${model.id}`;
  const name = t(`${base}.name`, model.name);
  const category = t(`${base}.category`, model.category);
  const description = t(`${base}.description`, model.description);
  const product = productMetaForModel(model.id);

  return {
    ...model,
    name,
    category,
    description,
    product,
    defaultInputs: model.defaultInputs?.map((input, i) => ({
      ...input,
      name: t(`${base}.inputs.${portKey('in', i)}`, input.name),
    })),
    defaultOutputs: model.defaultOutputs?.map((output, i) => ({
      ...output,
      name: t(`${base}.outputs.${portKey('out', i)}`, output.name),
    })),
  };
}

export function localizeDeviceModels(t: TranslateFn): DeviceModel[] {
  return DEVICE_MODELS.map((m) => localizeDeviceModel(m, t));
}

export function localizeSensorConfig(t: TranslateFn): Record<SensorType, SensorConfigEntry> {
  const out = { ...SENSOR_CONFIG };
  for (const type of Object.keys(SENSOR_CONFIG) as SensorType[]) {
    out[type] = {
      ...SENSOR_CONFIG[type],
      label: t(`devices.sensors.${type}`, SENSOR_CONFIG[type].label),
    };
  }
  return out;
}

export function localizeEquipmentConfig(t: TranslateFn): Record<EquipmentType, EquipmentConfigEntry> {
  const out = { ...EQUIPMENT_CONFIG };
  for (const type of Object.keys(EQUIPMENT_CONFIG) as EquipmentType[]) {
    out[type] = {
      label: t(`devices.equipment.${type}`, EQUIPMENT_CONFIG[type].label),
      defaultName: t(`devices.equipmentDefault.${type}`, EQUIPMENT_CONFIG[type].defaultName),
    };
  }
  return out;
}
