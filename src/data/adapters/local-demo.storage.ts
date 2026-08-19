import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import type { AppSettings } from '../../domain/settings/settings.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import type { Plant, PlantGroup, PlantStoreSnapshot } from '../../domain/grow/plant.types';
import { getRuntimeMode, type RuntimeMode } from '../../config/runtime-mode';
import {
  automationsEnvelopeSchema,
  devicesEnvelopeSchema,
  legacyAutomationSchema,
  legacyDeviceSchema,
  plantStoreEnvelopeSchema,
  spaceMapSchema,
  spacesEnvelopeSchema,
  unwrapEnvelope,
  unwrapPlantStore,
  type LegacyAutomation,
  type LegacyDevice,
} from '../schemas/qbx.schemas';
import {
  automationToLegacy,
  deviceToLegacy,
  mapLegacyAutomation,
  mapLegacyDevice,
  mapLegacySettings,
  mapLegacySpace,
} from './mappers';
import { getDefaultAutomations, getDefaultDevices, getDefaultSettings, getDefaultSpaces } from '../../mock/seed.defaults';

/** Shared UI chrome — theme is not a hardware/simulator world. */
const SHARED_KEYS = {
  THEME: 'qbx_theme_v1',
  TEMP_UNIT: 'qbx_temp_unit_v1',
  GROW_PHASE: 'qbx_grow_phase_v1',
  MAP_VIEW_MODE: 'qbx_map_view_mode_v1',
} as const;

export type DomainLogicalKey =
  | 'spaces_v1'
  | 'devices_v1'
  | 'automations_v1'
  | 'current_space_v1'
  | 'space_maps_v1'
  | 'plants_v1';

const LEGACY_DOMAIN_KEYS: Record<DomainLogicalKey, string> = {
  spaces_v1: 'qbx_spaces_v1',
  devices_v1: 'qbx_devices_v1',
  automations_v1: 'qbx_automations_v1',
  current_space_v1: 'qbx_current_space_v1',
  space_maps_v1: 'qbx_space_maps_v1',
  plants_v1: 'qbx_plants_v1',
};

/** Known simulator seed ids from `seed.runtime.ts` — never migrate into hardware mode. */
export const SIMULATOR_SEED_DEVICE_IDS = new Set(['dev-1', 'dev-2', 'dev-3']);
export const SIMULATOR_SEED_SPACE_IDS = new Set(['space-1', 'space-2', 'space-3']);
export const SIMULATOR_SEED_AUTOMATION_IDS = new Set(['auto-1', 'auto-2', 'auto-3', 'auto-4']);

export function domainStorageKey(logical: DomainLogicalKey, mode: RuntimeMode = getRuntimeMode()): string {
  return `qbx_${mode}_${logical}`;
}

function readJson<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota / private mode — do not crash the app.
  }
}

function unwrapUnknownArray(stored: unknown): unknown[] | null {
  if (Array.isArray(stored)) return stored;
  if (stored && typeof stored === 'object' && 'data' in stored && Array.isArray((stored as { data: unknown }).data)) {
    return (stored as { data: unknown[] }).data;
  }
  return null;
}

function parseId(item: unknown): string | null {
  if (item && typeof item === 'object' && 'id' in item && typeof (item as { id: unknown }).id === 'string') {
    return (item as { id: string }).id;
  }
  return null;
}

export function looksLikeSimulatorDeviceList(stored: unknown): boolean {
  const items = unwrapUnknownArray(stored);
  if (!items || items.length === 0) return false;
  return items.some((item) => {
    const id = parseId(item);
    return id != null && SIMULATOR_SEED_DEVICE_IDS.has(id);
  });
}

/**
 * Hardware must not inherit the simulator world from un-namespaced v1 keys.
 * Simulator may migrate legacy keys as-is (they were the only store before namespacing).
 */
function readDomainJson(logical: DomainLogicalKey, mode: RuntimeMode): unknown | null {
  const namespaced = readJson<unknown>(domainStorageKey(logical, mode));
  if (namespaced != null) return namespaced;

  const legacy = readJson<unknown>(LEGACY_DOMAIN_KEYS[logical]);
  if (legacy == null) return null;

  if (mode === 'simulator') return legacy;

  if (logical === 'devices_v1' && looksLikeSimulatorDeviceList(legacy)) {
    const items = unwrapUnknownArray(legacy) ?? [];
    const kept = items.filter((item) => {
      const id = parseId(item);
      return id != null && !SIMULATOR_SEED_DEVICE_IDS.has(id);
    });
    return kept.length > 0 ? kept : null;
  }

  if (logical === 'spaces_v1') {
    const items = unwrapUnknownArray(legacy) ?? [];
    const kept = items.filter((item) => {
      const id = parseId(item);
      return id != null && !SIMULATOR_SEED_SPACE_IDS.has(id);
    });
    return kept.length > 0 ? kept : null;
  }

  if (logical === 'automations_v1') {
    const items = unwrapUnknownArray(legacy) ?? [];
    const kept = items.filter((item) => {
      const id = parseId(item);
      return id != null && !SIMULATOR_SEED_AUTOMATION_IDS.has(id);
    });
    return kept.length > 0 ? kept : null;
  }

  if (logical === 'space_maps_v1') {
    const items = unwrapUnknownArray(legacy) ?? [];
    const kept = items.filter((item) => {
      if (!item || typeof item !== 'object' || !('spaceId' in item)) return false;
      return !SIMULATOR_SEED_SPACE_IDS.has(String((item as { spaceId: unknown }).spaceId));
    });
    return kept.length > 0 ? kept : null;
  }

  if (logical === 'plants_v1') {
    if (legacy && typeof legacy === 'object' && 'plants' in legacy) {
      const store = legacy as { plants?: unknown; groups?: unknown };
      const plants = Array.isArray(store.plants)
        ? store.plants.filter((item) => {
            if (!item || typeof item !== 'object' || !('spaceId' in item)) return false;
            return !SIMULATOR_SEED_SPACE_IDS.has(String((item as { spaceId: unknown }).spaceId));
          })
        : [];
      const groups = Array.isArray(store.groups)
        ? store.groups.filter((item) => {
            if (!item || typeof item !== 'object' || !('spaceId' in item)) return false;
            return !SIMULATOR_SEED_SPACE_IDS.has(String((item as { spaceId: unknown }).spaceId));
          })
        : [];
      if (plants.length === 0 && groups.length === 0) return null;
      return { plants, groups };
    }
    return null;
  }

  if (logical === 'current_space_v1') {
    const id = typeof legacy === 'string' ? legacy : null;
    if (!id || SIMULATOR_SEED_SPACE_IDS.has(id)) return null;
    return id;
  }

  return legacy;
}

export function loadInitialSpaces(mode: RuntimeMode = getRuntimeMode()): Space[] {
  const stored = readDomainJson('spaces_v1', mode);
  if (stored) {
    const parsed = spacesEnvelopeSchema.safeParse(stored);
    if (parsed.success) {
      return unwrapEnvelope(parsed.data).map(mapLegacySpace);
    }
    const items = unwrapUnknownArray(stored) ?? [];
    return items.flatMap((item) => {
      const one = spacesEnvelopeSchema.safeParse([item]);
      return one.success ? unwrapEnvelope(one.data).map(mapLegacySpace) : [];
    });
  }

  return getDefaultSpaces(mode).map(mapLegacySpace);
}

export function loadInitialDevices(mode: RuntimeMode = getRuntimeMode()): Device[] {
  const stored = readDomainJson('devices_v1', mode);
  if (stored) {
    const items = unwrapUnknownArray(stored);
    if (items) {
      return items.flatMap((item) => {
        const parsed = legacyDeviceSchema.safeParse(item);
        return parsed.success ? [mapLegacyDevice(parsed.data)] : [];
      });
    }
    const parsed = devicesEnvelopeSchema.safeParse(stored);
    if (parsed.success) {
      return unwrapEnvelope(parsed.data).map(mapLegacyDevice);
    }
  }

  return getDefaultDevices(mode).map(mapLegacyDevice);
}

export function loadInitialAutomations(mode: RuntimeMode = getRuntimeMode()): Automation[] {
  const stored = readDomainJson('automations_v1', mode);
  if (stored) {
    const items = unwrapUnknownArray(stored);
    if (items) {
      return items.flatMap((item) => {
        const parsed = legacyAutomationSchema.safeParse(item);
        return parsed.success ? [mapLegacyAutomation(parsed.data)] : [];
      });
    }
    const parsed = automationsEnvelopeSchema.safeParse(stored);
    if (parsed.success) {
      return unwrapEnvelope(parsed.data).map(mapLegacyAutomation);
    }
  }

  return getDefaultAutomations(mode).map(mapLegacyAutomation);
}

export function loadInitialSpaceMaps(mode: RuntimeMode = getRuntimeMode()): SpaceMap[] {
  const stored = readDomainJson('space_maps_v1', mode);
  if (stored) {
    const items = unwrapUnknownArray(stored);
    if (items) {
      return items.flatMap((item) => {
        const parsed = spaceMapSchema.safeParse(item);
        return parsed.success ? [parsed.data as SpaceMap] : [];
      });
    }
  }
  return [];
}

export function loadInitialPlantStore(mode: RuntimeMode = getRuntimeMode()): PlantStoreSnapshot {
  const stored = readDomainJson('plants_v1', mode);
  if (stored) {
    const parsed = plantStoreEnvelopeSchema.safeParse(stored);
    if (parsed.success) {
      return unwrapPlantStore(parsed.data);
    }
  }
  return { plants: [], groups: [] };
}

export function loadInitialSettings(fallbackSpaceId: string, mode: RuntimeMode = getRuntimeMode()): AppSettings {
  const defaults = getDefaultSettings(mode);
  const theme = (readJson<string>(SHARED_KEYS.THEME) as AppSettings['theme']) || defaults.theme;
  const tempUnit = (readJson<string>(SHARED_KEYS.TEMP_UNIT) as AppSettings['tempUnit']) || defaults.tempUnit;
  const growPhase =
    (readJson<string>(SHARED_KEYS.GROW_PHASE) as AppSettings['growPhase']) || defaults.growPhase;
  const storedSpaceId = readDomainJson('current_space_v1', mode);
  const currentSpaceId =
    (typeof storedSpaceId === 'string' ? storedSpaceId : null) ?? fallbackSpaceId ?? defaults.currentSpaceId;

  return mapLegacySettings({
    theme,
    tempUnit,
    growPhase,
    currentSpaceId,
    mapViewMode: (readJson<string>(SHARED_KEYS.MAP_VIEW_MODE) as AppSettings['mapViewMode']) || '2d',
  });
}

export function persistSpaces(spaces: Space[], mode: RuntimeMode = getRuntimeMode()) {
  writeJson(domainStorageKey('spaces_v1', mode), spaces);
}

export function persistDevices(devices: Device[], mode: RuntimeMode = getRuntimeMode()) {
  const legacy: LegacyDevice[] = devices.map(deviceToLegacy);
  writeJson(domainStorageKey('devices_v1', mode), legacy);
}

export function persistAutomations(automations: Automation[], mode: RuntimeMode = getRuntimeMode()) {
  const legacy: LegacyAutomation[] = automations.map(automationToLegacy);
  writeJson(domainStorageKey('automations_v1', mode), legacy);
}

export function persistSpaceMaps(maps: SpaceMap[], mode: RuntimeMode = getRuntimeMode()) {
  writeJson(domainStorageKey('space_maps_v1', mode), maps);
}

export function persistPlantStore(plants: Plant[], groups: PlantGroup[], mode: RuntimeMode = getRuntimeMode()) {
  writeJson(domainStorageKey('plants_v1', mode), { plants, groups });
}

export function persistSettings(settings: AppSettings, mode: RuntimeMode = getRuntimeMode()) {
  writeJson(SHARED_KEYS.THEME, settings.theme);
  writeJson(SHARED_KEYS.TEMP_UNIT, settings.tempUnit);
  writeJson(SHARED_KEYS.GROW_PHASE, settings.growPhase);
  writeJson(domainStorageKey('current_space_v1', mode), settings.currentSpaceId);
  writeJson(SHARED_KEYS.MAP_VIEW_MODE, settings.mapViewMode ?? '2d');
}

export function clearDomainStorage(mode: RuntimeMode = getRuntimeMode()) {
  (Object.keys(LEGACY_DOMAIN_KEYS) as DomainLogicalKey[]).forEach((logical) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(domainStorageKey(logical, mode));
    } catch {
      /* ignore */
    }
  });
}

/** Back-compat alias used by older imports / tests. */
export const STORAGE_KEYS = {
  SPACES: LEGACY_DOMAIN_KEYS.spaces_v1,
  DEVICES: LEGACY_DOMAIN_KEYS.devices_v1,
  AUTOMATIONS: LEGACY_DOMAIN_KEYS.automations_v1,
  THEME: SHARED_KEYS.THEME,
  TEMP_UNIT: SHARED_KEYS.TEMP_UNIT,
  CURRENT_SPACE: LEGACY_DOMAIN_KEYS.current_space_v1,
  GROW_PHASE: SHARED_KEYS.GROW_PHASE,
  SPACE_MAPS: LEGACY_DOMAIN_KEYS.space_maps_v1,
  PLANTS: LEGACY_DOMAIN_KEYS.plants_v1,
  MAP_VIEW_MODE: SHARED_KEYS.MAP_VIEW_MODE,
} as const;
