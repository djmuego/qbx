import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Plant, PlantGroup } from '../../domain/grow/plant.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { AppSettings } from '../../domain/settings/settings.types';
import type { Space } from '../../domain/space/space.types';

export interface DataPersistenceAdapter {
  persistSpaces(spaces: Space[]): Promise<void>;
  persistDevices(devices: Device[]): Promise<void>;
  persistAutomations(automations: Automation[]): Promise<void>;
  persistSettings(settings: AppSettings): Promise<void>;
  persistSpaceMaps(maps: SpaceMap[]): Promise<void>;
  persistPlants(plants: Plant[], groups: PlantGroup[]): Promise<void>;
  deleteSpace?(spaceId: string): Promise<void>;
  deleteDevice?(deviceId: string): Promise<void>;
  deleteAutomation?(automationId: string): Promise<void>;
  deletePlant?(plantId: string): Promise<void>;
  deletePlantGroup?(groupId: string): Promise<void>;
  deleteSpaceMap?(spaceId: string): Promise<void>;
}
