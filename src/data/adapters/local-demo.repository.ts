import type { CreateAutomationInput, Automation, UpdateAutomationInput } from '../../domain/automation/automation.types';
import type { CreateDeviceInput, Device, UpdateDeviceInput } from '../../domain/device/device.types';
import type { ConfigureOutputInput, Output } from '../../domain/equipment/equipment.types';
import type { ConfigureSensorInput } from '../../domain/sensor/sensor.types';
import type { CreateSpaceInput, Space, UpdateSpaceInput } from '../../domain/space/space.types';
import type { AppSettings, UpdateSettingsInput } from '../../domain/settings/settings.types';
import type { SpaceMap, UpdateSpaceMapInput } from '../../domain/map/space-map.types';
import type {
  CreatePlantGroupInput,
  CreatePlantInput,
  Plant,
  PlantGroup,
  UpdatePlantGroupInput,
  UpdatePlantInput,
} from '../../domain/grow/plant.types';
import { DEVICE_MODELS, EQUIPMENT_CONFIG, SENSOR_CONFIG } from '../../domain/catalog/device-catalog';
import type {
  AutomationRepository,
  CatalogRepository,
  DataExportBundle,
  DataManagementRepository,
  DeviceRepository,
  PlantRepository,
  QbxDataLayer,
  SettingsRepository,
  SpaceMapRepository,
  SpaceRepository,
} from '../contracts/repositories';
import {
  applyOutputTypeChange,
  applySensorTypeChange,
  createDeviceFromModel,
} from '../../services/device-factory.service';
import {
  clearDomainStorage,
  loadInitialAutomations,
  loadInitialDevices,
  loadInitialPlantStore,
  loadInitialSettings,
  loadInitialSpaceMaps,
  loadInitialSpaces,
  persistAutomations,
  persistDevices,
  persistPlantStore,
  persistSettings,
  persistSpaceMaps,
  persistSpaces,
} from './local-demo.storage';
import {
  getDefaultAutomations,
  getDefaultDevices,
  getDefaultSettings,
  getDefaultSpaces,
} from '../../mock/seed.defaults';
import { computeSpaceMetrics } from '../../domain/space/space.types';
import { clampMapToDimensions, createEmptySpaceMap } from '../../domain/map/space-map.geometry';
import { mapLegacyAutomation, mapLegacyDevice, mapLegacySpace } from './mappers';
import { getRuntimeMode } from '../../config/runtime-mode';
import { unbindDeviceFromMap } from '../../domain/map/spatial-device-bind';
import { EXPORT_SCHEMA_VERSION, sanitizeImportedDevices, stripEphemeralAutomation, stripEphemeralDevice } from './export-sanitize';
import type { DataPersistenceAdapter } from './persistence-adapter';
import { localStoragePersistence } from './local-storage.persistence';

export interface LocalDemoDataLayerOptions {
  persistence?: DataPersistenceAdapter;
  skipInitialLoad?: boolean;
}

class LocalDemoDataLayer implements QbxDataLayer {
  private persistence: DataPersistenceAdapter;
  private spacesState: Space[];
  private devicesState: Device[];
  private automationsState: Automation[];
  private settingsState: AppSettings;
  private spaceMapsState: SpaceMap[];
  private plantsState: Plant[];
  private plantGroupsState: PlantGroup[];

  spaces: SpaceRepository;
  devices: DeviceRepository;
  automations: AutomationRepository;
  settings: SettingsRepository;
  catalog: CatalogRepository;
  spaceMaps: SpaceMapRepository;
  plants: PlantRepository;
  dataManagement: DataManagementRepository;

  constructor(options?: LocalDemoDataLayerOptions) {
    this.persistence = options?.persistence ?? localStoragePersistence;
    if (options?.skipInitialLoad) {
      this.spacesState = [];
      this.devicesState = [];
      this.automationsState = [];
      this.settingsState = getDefaultSettings();
      this.spaceMapsState = [];
      this.plantsState = [];
      this.plantGroupsState = [];
    } else {
      this.spacesState = loadInitialSpaces();
      this.devicesState = loadInitialDevices();
      this.automationsState = loadInitialAutomations();
      this.settingsState = loadInitialSettings(this.spacesState[0]?.id ?? '');
      this.spaceMapsState = loadInitialSpaceMaps();
      const plantStore = loadInitialPlantStore();
      this.plantsState = plantStore.plants;
      this.plantGroupsState = plantStore.groups;
    }

    this.spaces = this.createSpaceRepository();
    this.devices = this.createDeviceRepository();
    this.automations = this.createAutomationRepository();
    this.settings = this.createSettingsRepository();
    this.catalog = this.createCatalogRepository();
    this.spaceMaps = this.createSpaceMapRepository();
    this.plants = this.createPlantRepository();
    this.dataManagement = this.createDataManagementRepository();
  }

  setPersistenceAdapter(adapter: DataPersistenceAdapter) {
    this.persistence = adapter;
  }

  private async flushSpaces() {
    await this.persistence.persistSpaces(this.spacesState);
  }

  private async flushDevices() {
    await this.persistence.persistDevices(this.devicesState);
  }

  private async flushAutomations() {
    await this.persistence.persistAutomations(this.automationsState);
  }

  private async flushSettings() {
    await this.persistence.persistSettings(this.settingsState);
  }

  private async flushSpaceMaps() {
    await this.persistence.persistSpaceMaps(this.spaceMapsState);
  }

  private async flushPlants() {
    await this.persistence.persistPlants(this.plantsState, this.plantGroupsState);
  }

  private createSpaceRepository(): SpaceRepository {
    return {
      list: async () => [...this.spacesState],
      getById: async (id) => this.spacesState.find((s) => s.id === id) ?? null,
      create: async (input) => {
        const metrics = input.dimensions ? computeSpaceMetrics(input.dimensions) : {};
        const space: Space = {
          id: `space-${Date.now()}`,
          name: input.name.trim() || 'Новое пространство',
          description: input.description,
          type: input.type,
          dimensions: input.dimensions,
          timezone: input.timezone,
          parentId: input.parentId,
          spatialScale: input.spatialScale,
          spatialKind: input.spatialKind,
          localOrigin: input.localOrigin,
          ...metrics,
        };
        this.spacesState = [...this.spacesState, space];
        await this.flushSpaces();
        await this.ensureMapForSpace(space.id);
        return space;
      },
      update: async (id, input) => {
        this.spacesState = this.spacesState.map((s) =>
          s.id === id ? { ...s, ...input, name: input.name?.trim() || s.name } : s,
        );
        await this.flushSpaces();
        const updated = this.spacesState.find((s) => s.id === id)!;
        if (input.dimensions) {
          await this.clampMapForSpace(id, input.dimensions);
        }
        return updated;
      },
      delete: async (id) => {
        this.spacesState = this.spacesState.filter((s) => s.id !== id);
        await this.flushSpaces();
        this.spaceMapsState = this.spaceMapsState.filter((m) => m.spaceId !== id);
        await this.flushSpaceMaps();
        this.plantsState = this.plantsState.filter((p) => p.spaceId !== id);
        this.plantGroupsState = this.plantGroupsState.filter((g) => g.spaceId !== id);
        await this.flushPlants();
        this.devicesState = this.devicesState.filter((d) => d.spaceId !== id);
        await this.flushDevices();
        this.automationsState = this.automationsState.filter((a) => a.spaceId !== id);
        await this.flushAutomations();
        await this.persistence.deleteSpace?.(id);
      },
      replaceAll: async (spaces) => {
        this.spacesState = [...spaces];
        await this.flushSpaces();
      },
    };
  }

  private createDeviceRepository(): DeviceRepository {
    return {
      list: async () => [...this.devicesState],
      listBySpace: async (spaceId) => this.devicesState.filter((d) => d.spaceId === spaceId),
      getById: async (id) => this.devicesState.find((d) => d.id === id) ?? null,
      create: async (input) => {
        const device = createDeviceFromModel(input.modelId, input.customName || input.name, input.spaceId);
        this.devicesState = [...this.devicesState, device];
        await this.flushDevices();
        return device;
      },
      update: async (id, input) => {
        const existing = this.devicesState.find((d) => d.id === id);
        if (!existing) throw new Error(`Device not found: ${id}`);
        const nextSpaceId = input.spaceId?.trim();
        if (nextSpaceId && nextSpaceId !== existing.spaceId) {
          this.spaceMapsState = this.spaceMapsState.map((m) =>
            m.spaceId === existing.spaceId ? unbindDeviceFromMap(m, id) : m,
          );
          await this.flushSpaceMaps();
        }
        this.devicesState = this.devicesState.map((d) =>
          d.id === id
            ? {
                ...d,
                customName: input.customName?.trim() || input.name?.trim() || d.customName,
                name: input.customName?.trim() || input.name?.trim() || d.name,
                spaceId: nextSpaceId || d.spaceId,
              }
            : d,
        );
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === id)!;
      },
      delete: async (id) => {
        this.devicesState = this.devicesState.filter((d) => d.id !== id);
        await this.flushDevices();
        this.automationsState = this.automationsState.filter(
          (a) => a.targetDeviceId !== id && a.sensorDeviceId !== id,
        );
        await this.flushAutomations();
        this.spaceMapsState = this.spaceMapsState.map((m) => unbindDeviceFromMap(m, id));
        await this.flushSpaceMaps();
      },
      configureSensor: async (deviceId, sensorId, input) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.id !== deviceId) return dev;
          const inputs = dev.inputs.map((sensor) => {
            if (sensor.id !== sensorId) return sensor;
            const merged = { ...sensor, ...input };
            if (input.type && input.type !== sensor.type) {
              return applySensorTypeChange(merged, input.type, input.customName);
            }
            if (input.showOnHome !== undefined) {
              merged.visibleOnHome = input.showOnHome;
            }
            if (input.visibleOnHome !== undefined) {
              merged.showOnHome = input.visibleOnHome;
            }
            return merged;
          });
          return { ...dev, inputs, sensors: inputs };
        });
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === deviceId)!;
      },
      configureOutput: async (deviceId, outputId, input) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.id !== deviceId) return dev;
          return {
            ...dev,
            outputs: dev.outputs.map((output) => {
              if (output.id !== outputId) return output;
              const merged = { ...output, ...input };
              if (input.controlMode) {
                merged.isAuto = input.controlMode === 'auto';
              }
              if (input.isAuto !== undefined) {
                merged.controlMode = input.isAuto ? 'auto' : 'manual';
              }
              if (input.type && input.type !== output.type) {
                return applyOutputTypeChange(merged, input.type, input.customName);
              }
              return merged;
            }),
          };
        });
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === deviceId)!;
      },
      toggleOutput: async (deviceId, outputId) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.id !== deviceId) return dev;
          return {
            ...dev,
            outputs: dev.outputs.map((output) =>
              output.id === outputId
                ? { ...output, state: !output.state, isAuto: false, controlMode: 'manual' as const }
                : output,
            ),
          };
        });
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === deviceId)!;
      },
      setOutputControlMode: async (deviceId, outputId, controlMode) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.id !== deviceId) return dev;
          return {
            ...dev,
            outputs: dev.outputs.map((output) =>
              output.id === outputId
                ? { ...output, controlMode, isAuto: controlMode === 'auto' }
                : output,
            ),
          };
        });
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === deviceId)!;
      },
      turnOffAllInSpace: async (spaceId) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.spaceId !== spaceId) return dev;
          return {
            ...dev,
            outputs: dev.outputs.map((output) => ({
              ...output,
              state: false,
              isAuto: false,
              controlMode: 'manual' as const,
            })),
          };
        });
        await this.flushDevices();
        return this.devicesState.filter((d) => d.spaceId === spaceId);
      },
      toggleSensorHomeVisibility: async (deviceId, sensorId) => {
        this.devicesState = this.devicesState.map((dev) => {
          if (dev.id !== deviceId) return dev;
          const inputs = dev.inputs.map((sensor) =>
            sensor.id === sensorId
              ? {
                  ...sensor,
                  showOnHome: !sensor.showOnHome,
                  visibleOnHome: !sensor.showOnHome,
                }
              : sensor,
          );
          return { ...dev, inputs, sensors: inputs };
        });
        await this.flushDevices();
        return this.devicesState.find((d) => d.id === deviceId)!;
      },
      replaceAll: async (devices) => {
        this.devicesState = [...devices];
        await this.flushDevices();
      },
      updateMany: async (updater) => {
        this.devicesState = updater(this.devicesState);
        await this.flushDevices();
        return [...this.devicesState];
      },
    };
  }

  private createAutomationRepository(): AutomationRepository {
    return {
      list: async () => [...this.automationsState],
      listBySpace: async (spaceId) => this.automationsState.filter((a) => a.spaceId === spaceId),
      getById: async (id) => this.automationsState.find((a) => a.id === id) ?? null,
      create: async (input) => {
        const automation: Automation = {
          ...input,
          id: `auto-${Date.now()}`,
          isEnabled: input.isEnabled ?? input.enabled ?? true,
          enabled: input.isEnabled ?? input.enabled ?? true,
          runtimeStatus: 'waiting',
        };
        this.automationsState = [...this.automationsState, automation];
        await this.flushAutomations();
        return automation;
      },
      update: async (id, input) => {
        this.automationsState = this.automationsState.map((a) => (a.id === id ? { ...a, ...input } : a));
        await this.flushAutomations();
        return this.automationsState.find((a) => a.id === id)!;
      },
      delete: async (id) => {
        this.automationsState = this.automationsState.filter((a) => a.id !== id);
        await this.flushAutomations();
      },
      toggle: async (id) => {
        this.automationsState = this.automationsState.map((a) =>
          a.id === id
            ? {
                ...a,
                isEnabled: !a.isEnabled,
                enabled: !a.isEnabled,
                runtimeStatus: !a.isEnabled ? 'waiting' : 'disabled',
              }
            : a,
        );
        await this.flushAutomations();
        return this.automationsState.find((a) => a.id === id)!;
      },
      deleteByDevice: async (deviceId) => {
        this.automationsState = this.automationsState.filter(
          (a) => a.targetDeviceId !== deviceId && a.sensorDeviceId !== deviceId,
        );
        await this.flushAutomations();
      },
      replaceAll: async (automations) => {
        this.automationsState = [...automations];
        await this.flushAutomations();
      },
    };
  }

  private createSettingsRepository(): SettingsRepository {
    return {
      get: async () => ({ ...this.settingsState }),
      update: async (input) => {
        this.settingsState = { ...this.settingsState, ...input };
        await this.flushSettings();
        return { ...this.settingsState };
      },
      resetDemoPreferences: async () => {
        const defaults = getDefaultSettings();
        this.settingsState = {
          ...this.settingsState,
          theme: defaults.theme,
          tempUnit: defaults.tempUnit,
          growPhase: defaults.growPhase,
        };
        await this.flushSettings();
        return { ...this.settingsState };
      },
    };
  }

  private async ensureMapForSpace(spaceId: string): Promise<SpaceMap> {
    const existing = this.spaceMapsState.find((m) => m.spaceId === spaceId);
    if (existing) return existing;
    const created = createEmptySpaceMap(spaceId);
    this.spaceMapsState = [...this.spaceMapsState, created];
    await this.flushSpaceMaps();
    return created;
  }

  private async clampMapForSpace(
    spaceId: string,
    dimensions: { lengthM: number; widthM: number; heightM: number },
  ): Promise<SpaceMap> {
    const current = await this.ensureMapForSpace(spaceId);
    const clamped = clampMapToDimensions(current, dimensions);
    this.spaceMapsState = this.spaceMapsState.map((m) => (m.spaceId === spaceId ? clamped : m));
    await this.flushSpaceMaps();
    return clamped;
  }

  private createSpaceMapRepository(): SpaceMapRepository {
    return {
      list: async () => [...this.spaceMapsState],
      getBySpaceId: async (spaceId) => this.spaceMapsState.find((m) => m.spaceId === spaceId) ?? null,
      ensureForSpace: async (spaceId) => this.ensureMapForSpace(spaceId),
      save: async (map) => {
        const next = { ...map, schemaVersion: 1 as const, updatedAt: new Date().toISOString() };
        const exists = this.spaceMapsState.some((m) => m.spaceId === map.spaceId);
        this.spaceMapsState = exists
          ? this.spaceMapsState.map((m) => (m.spaceId === map.spaceId ? next : m))
          : [...this.spaceMapsState, next];
        await this.flushSpaceMaps();
        return next;
      },
      update: async (spaceId, input: UpdateSpaceMapInput) => {
        const current = await this.ensureMapForSpace(spaceId);
        const next: SpaceMap = {
          ...current,
          ...input,
          spaceId,
          schemaVersion: 1,
          updatedAt: new Date().toISOString(),
        };
        this.spaceMapsState = this.spaceMapsState.map((m) => (m.spaceId === spaceId ? next : m));
        await this.flushSpaceMaps();
        return next;
      },
      clampToDimensions: async (spaceId, dimensions) => this.clampMapForSpace(spaceId, dimensions),
      deleteBySpaceId: async (spaceId) => {
        this.spaceMapsState = this.spaceMapsState.filter((m) => m.spaceId !== spaceId);
        await this.flushSpaceMaps();
      },
      replaceAll: async (maps) => {
        this.spaceMapsState = [...maps];
        await this.flushSpaceMaps();
      },
    };
  }

  private createPlantRepository(): PlantRepository {
    return {
      list: async () => [...this.plantsState],
      listBySpace: async (spaceId) => this.plantsState.filter((p) => p.spaceId === spaceId),
      getById: async (id) => this.plantsState.find((p) => p.id === id) ?? null,
      create: async (input: CreatePlantInput) => {
        const plant: Plant = {
          id: `plant-${Date.now()}`,
          spaceId: input.spaceId,
          name: input.name.trim() || 'Растение',
          growRunId: input.growRunId,
          zoneId: input.zoneId,
          cultivar: input.cultivar,
          potVolumeL: input.potVolumeL,
          medium: input.medium,
          plantedAt: input.plantedAt ?? new Date().toISOString(),
          notes: input.notes,
        };
        this.plantsState = [...this.plantsState, plant];
        await this.flushPlants();
        return plant;
      },
      update: async (id, input: UpdatePlantInput) => {
        this.plantsState = this.plantsState.map((p) => (p.id === id ? { ...p, ...input, name: input.name?.trim() || p.name } : p));
        await this.flushPlants();
        return this.plantsState.find((p) => p.id === id)!;
      },
      delete: async (id) => {
        this.plantsState = this.plantsState.filter((p) => p.id !== id);
        this.plantGroupsState = this.plantGroupsState.map((g) => ({
          ...g,
          plantIds: g.plantIds.filter((pid) => pid !== id),
        }));
        this.spaceMapsState = this.spaceMapsState.map((m) => ({
          ...m,
          placements: m.placements.filter((p) => p.plantId !== id),
          updatedAt: new Date().toISOString(),
        }));
        await this.flushPlants();
        await this.flushSpaceMaps();
      },
      listGroups: async () => [...this.plantGroupsState],
      listGroupsBySpace: async (spaceId) => this.plantGroupsState.filter((g) => g.spaceId === spaceId),
      createGroup: async (input: CreatePlantGroupInput) => {
        const group: PlantGroup = {
          id: `pgrp-${Date.now()}`,
          spaceId: input.spaceId,
          name: input.name.trim() || 'Группа',
          plantIds: input.plantIds ?? [],
          zoneId: input.zoneId,
        };
        this.plantGroupsState = [...this.plantGroupsState, group];
        await this.flushPlants();
        return group;
      },
      updateGroup: async (id, input: UpdatePlantGroupInput) => {
        this.plantGroupsState = this.plantGroupsState.map((g) =>
          g.id === id ? { ...g, ...input, name: input.name?.trim() || g.name } : g,
        );
        await this.flushPlants();
        return this.plantGroupsState.find((g) => g.id === id)!;
      },
      deleteGroup: async (id) => {
        this.plantGroupsState = this.plantGroupsState.filter((g) => g.id !== id);
        await this.flushPlants();
      },
      deleteBySpaceId: async (spaceId) => {
        this.plantsState = this.plantsState.filter((p) => p.spaceId !== spaceId);
        this.plantGroupsState = this.plantGroupsState.filter((g) => g.spaceId !== spaceId);
        await this.flushPlants();
      },
      replaceAll: async (plants, groups) => {
        this.plantsState = [...plants];
        this.plantGroupsState = [...groups];
        await this.flushPlants();
      },
    };
  }

  private createCatalogRepository(): CatalogRepository {
    return {
      getDeviceModels: async () => [...DEVICE_MODELS],
      getDeviceModelById: async (id) => DEVICE_MODELS.find((m) => m.id === id) ?? null,
      getSensorConfig: async () => SENSOR_CONFIG,
      getEquipmentConfig: async () => EQUIPMENT_CONFIG,
    };
  }

  private createDataManagementRepository(): DataManagementRepository {
    return {
      exportBundle: async () => ({
        schemaVersion: EXPORT_SCHEMA_VERSION,
        spaces: [...this.spacesState],
        devices: this.devicesState.map(stripEphemeralDevice),
        automations: this.automationsState.map(stripEphemeralAutomation),
        spaceMaps: [...this.spaceMapsState],
        plants: [...this.plantsState],
        plantGroups: [...this.plantGroupsState],
        exportedAt: new Date().toISOString(),
        app: 'QBX — Quantum BotaniX',
      }),
      importBundle: async (bundle) => {
        if (!bundle || !Array.isArray(bundle.spaces) || !Array.isArray(bundle.devices) || !Array.isArray(bundle.automations)) {
          throw new Error('Invalid QBX export: missing spaces, devices, or automations');
        }
        if (bundle.schemaVersion != null && bundle.schemaVersion !== EXPORT_SCHEMA_VERSION) {
          throw new Error(`Unsupported export schemaVersion ${bundle.schemaVersion}`);
        }
        this.spacesState = [...bundle.spaces];
        this.devicesState = sanitizeImportedDevices(bundle.devices, getRuntimeMode());
        this.automationsState = bundle.automations.map(stripEphemeralAutomation);
        this.spaceMapsState = [...(bundle.spaceMaps ?? [])];
        this.plantsState = [...(bundle.plants ?? [])];
        this.plantGroupsState = [...(bundle.plantGroups ?? [])];
        await this.flushSpaces();
        await this.flushDevices();
        await this.flushAutomations();
        await this.flushSpaceMaps();
        await this.flushPlants();
        if (bundle.spaces[0]) {
          this.settingsState = {
            ...this.settingsState,
            currentSpaceId: bundle.spaces[0].id,
          };
          await this.flushSettings();
        }
      },
      resetToDefaults: async () => {
        clearDomainStorage();
        this.spacesState = getDefaultSpaces().map(mapLegacySpace);
        this.devicesState = getDefaultDevices().map(mapLegacyDevice);
        this.automationsState = getDefaultAutomations().map(mapLegacyAutomation);
        this.spaceMapsState = [];
        this.plantsState = [];
        this.plantGroupsState = [];
        this.settingsState = {
          ...getDefaultSettings(),
          currentSpaceId: this.spacesState[0]?.id ?? '',
        };
        await this.flushSpaces();
        await this.flushDevices();
        await this.flushAutomations();
        await this.flushSpaceMaps();
        await this.flushPlants();
        await this.flushSettings();
      },
    };
  }

  getSnapshot() {
    return {
      spaces: this.spacesState,
      devices: this.devicesState,
      automations: this.automationsState,
      settings: this.settingsState,
      spaceMaps: this.spaceMapsState,
      plants: this.plantsState,
      plantGroups: this.plantGroupsState,
    };
  }

  async setSnapshot(snapshot: {
    spaces: Space[];
    devices: Device[];
    automations: Automation[];
    settings: AppSettings;
    spaceMaps?: SpaceMap[];
    plants?: Plant[];
    plantGroups?: PlantGroup[];
  }) {
    this.spacesState = snapshot.spaces;
    this.devicesState = snapshot.devices;
    this.automationsState = snapshot.automations;
    this.settingsState = snapshot.settings;
    this.spaceMapsState = snapshot.spaceMaps ?? this.spaceMapsState;
    this.plantsState = snapshot.plants ?? this.plantsState;
    this.plantGroupsState = snapshot.plantGroups ?? this.plantGroupsState;
    await this.flushSpaces();
    await this.flushDevices();
    await this.flushAutomations();
    await this.flushSettings();
    await this.flushSpaceMaps();
    await this.flushPlants();
  }
}

let singleton: LocalDemoDataLayer | null = null;

export function createFreshLocalDemoDataLayer(options?: LocalDemoDataLayerOptions): LocalDemoDataLayer & {
  getSnapshot: LocalDemoDataLayer['getSnapshot'];
  setSnapshot: LocalDemoDataLayer['setSnapshot'];
  setPersistenceAdapter: LocalDemoDataLayer['setPersistenceAdapter'];
} {
  return new LocalDemoDataLayer(options);
}

export function createLocalDemoDataLayer(): QbxDataLayer & {
  getSnapshot: LocalDemoDataLayer['getSnapshot'];
  setSnapshot: LocalDemoDataLayer['setSnapshot'];
  setPersistenceAdapter: LocalDemoDataLayer['setPersistenceAdapter'];
} {
  if (!singleton) {
    singleton = new LocalDemoDataLayer();
  }
  return singleton;
}

export type LocalDemoDataLayerInstance = ReturnType<typeof createLocalDemoDataLayer>;
