import type { Automation, CreateAutomationInput, UpdateAutomationInput } from '../../domain/automation/automation.types';
import type { CreateDeviceInput, Device, UpdateDeviceInput } from '../../domain/device/device.types';
import type { ConfigureOutputInput, Output } from '../../domain/equipment/equipment.types';
import type { ConfigureSensorInput, Sensor } from '../../domain/sensor/sensor.types';
import type { CreateSpaceInput, Space, UpdateSpaceInput } from '../../domain/space/space.types';
import type { AppSettings, UpdateSettingsInput } from '../../domain/settings/settings.types';
import type { DeviceModel } from '../../domain/device/device.types';
import type { EquipmentConfigEntry, SensorConfigEntry } from '../../domain/catalog/device-catalog';
import type {
  CreatePlantGroupInput,
  CreatePlantInput,
  Plant,
  PlantGroup,
  UpdatePlantGroupInput,
  UpdatePlantInput,
} from '../../domain/grow/plant.types';
import type { SpaceMap, UpdateSpaceMapInput } from '../../domain/map/space-map.types';
import type { SpaceDimensions } from '../../domain/space/space.types';

export interface SpaceRepository {
  list(): Promise<Space[]>;
  getById(id: string): Promise<Space | null>;
  create(input: CreateSpaceInput): Promise<Space>;
  update(id: string, input: UpdateSpaceInput): Promise<Space>;
  delete(id: string): Promise<void>;
  replaceAll(spaces: Space[]): Promise<void>;
}

export interface DeviceRepository {
  list(): Promise<Device[]>;
  listBySpace(spaceId: string): Promise<Device[]>;
  getById(id: string): Promise<Device | null>;
  create(input: CreateDeviceInput): Promise<Device>;
  update(id: string, input: UpdateDeviceInput): Promise<Device>;
  delete(id: string): Promise<void>;
  configureSensor(deviceId: string, sensorId: string, input: ConfigureSensorInput): Promise<Device>;
  configureOutput(deviceId: string, outputId: string, input: ConfigureOutputInput): Promise<Device>;
  toggleOutput(deviceId: string, outputId: string): Promise<Device>;
  setOutputControlMode(deviceId: string, outputId: string, controlMode: Output['controlMode']): Promise<Device>;
  turnOffAllInSpace(spaceId: string): Promise<Device[]>;
  toggleSensorHomeVisibility(deviceId: string, sensorId: string): Promise<Device>;
  replaceAll(devices: Device[]): Promise<void>;
  updateMany(updater: (devices: Device[]) => Device[]): Promise<Device[]>;
}

export interface AutomationRepository {
  list(): Promise<Automation[]>;
  listBySpace(spaceId: string): Promise<Automation[]>;
  getById(id: string): Promise<Automation | null>;
  create(input: CreateAutomationInput): Promise<Automation>;
  update(id: string, input: UpdateAutomationInput): Promise<Automation>;
  delete(id: string): Promise<void>;
  toggle(id: string): Promise<Automation>;
  deleteByDevice(deviceId: string): Promise<void>;
  replaceAll(automations: Automation[]): Promise<void>;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(input: UpdateSettingsInput): Promise<AppSettings>;
  resetDemoPreferences(): Promise<AppSettings>;
}

export interface CatalogRepository {
  getDeviceModels(): Promise<DeviceModel[]>;
  getDeviceModelById(id: string): Promise<DeviceModel | null>;
  getSensorConfig(): Promise<Record<string, SensorConfigEntry>>;
  getEquipmentConfig(): Promise<Record<string, EquipmentConfigEntry>>;
}

export interface SpaceMapRepository {
  list(): Promise<SpaceMap[]>;
  getBySpaceId(spaceId: string): Promise<SpaceMap | null>;
  ensureForSpace(spaceId: string): Promise<SpaceMap>;
  save(map: SpaceMap): Promise<SpaceMap>;
  update(spaceId: string, input: UpdateSpaceMapInput): Promise<SpaceMap>;
  clampToDimensions(spaceId: string, dimensions: SpaceDimensions): Promise<SpaceMap>;
  deleteBySpaceId(spaceId: string): Promise<void>;
  replaceAll(maps: SpaceMap[]): Promise<void>;
}

export interface PlantRepository {
  list(): Promise<Plant[]>;
  listBySpace(spaceId: string): Promise<Plant[]>;
  getById(id: string): Promise<Plant | null>;
  create(input: CreatePlantInput): Promise<Plant>;
  update(id: string, input: UpdatePlantInput): Promise<Plant>;
  delete(id: string): Promise<void>;
  listGroups(): Promise<PlantGroup[]>;
  listGroupsBySpace(spaceId: string): Promise<PlantGroup[]>;
  createGroup(input: CreatePlantGroupInput): Promise<PlantGroup>;
  updateGroup(id: string, input: UpdatePlantGroupInput): Promise<PlantGroup>;
  deleteGroup(id: string): Promise<void>;
  deleteBySpaceId(spaceId: string): Promise<void>;
  replaceAll(plants: Plant[], groups: PlantGroup[]): Promise<void>;
}

export interface DataExportBundle {
  schemaVersion?: 1;
  spaces: Space[];
  devices: Device[];
  automations: Automation[];
  spaceMaps?: SpaceMap[];
  plants?: Plant[];
  plantGroups?: PlantGroup[];
  exportedAt: string;
  app: string;
}

export interface DataManagementRepository {
  exportBundle(): Promise<DataExportBundle>;
  importBundle(bundle: DataExportBundle): Promise<void>;
  resetToDefaults(): Promise<void>;
}

export interface QbxDataLayer {
  spaces: SpaceRepository;
  devices: DeviceRepository;
  automations: AutomationRepository;
  settings: SettingsRepository;
  catalog: CatalogRepository;
  spaceMaps: SpaceMapRepository;
  plants: PlantRepository;
  dataManagement: DataManagementRepository;
}
