import type { DataPersistenceAdapter } from './persistence-adapter';
import {
  persistAutomations,
  persistDevices,
  persistPlantStore,
  persistSettings,
  persistSpaceMaps,
  persistSpaces,
} from './local-demo.storage';
import type { Space } from '../../domain/space/space.types';
import type { Device } from '../../domain/device/device.types';
import type { Automation } from '../../domain/automation/automation.types';
import type { AppSettings } from '../../domain/settings/settings.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { Plant, PlantGroup } from '../../domain/grow/plant.types';

export class LocalStoragePersistenceAdapter implements DataPersistenceAdapter {
  async persistSpaces(spaces: Space[]): Promise<void> {
    persistSpaces(spaces);
  }

  async persistDevices(devices: Device[]): Promise<void> {
    persistDevices(devices);
  }

  async persistAutomations(automations: Automation[]): Promise<void> {
    persistAutomations(automations);
  }

  async persistSettings(settings: AppSettings): Promise<void> {
    persistSettings(settings);
  }

  async persistSpaceMaps(maps: SpaceMap[]): Promise<void> {
    persistSpaceMaps(maps);
  }

  async persistPlants(plants: Plant[], groups: PlantGroup[]): Promise<void> {
    persistPlantStore(plants, groups);
  }
}

export const localStoragePersistence = new LocalStoragePersistenceAdapter();
