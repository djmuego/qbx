import type { LegacyAutomation, LegacyDevice, LegacySettings } from '../data/schemas/qbx.schemas';
import { getRuntimeMode, type RuntimeMode } from '../config/runtime-mode';
import { INITIAL_AUTOMATIONS, INITIAL_DEVICES, INITIAL_SPACES } from './seed.runtime';

export const PRODUCT_DEFAULT_SPACES: typeof INITIAL_SPACES = [];
export const PRODUCT_DEFAULT_DEVICES: LegacyDevice[] = [];
export const PRODUCT_DEFAULT_AUTOMATIONS: LegacyAutomation[] = [];

export const PRODUCT_DEFAULT_SETTINGS: LegacySettings = {
  theme: 'light',
  tempUnit: 'C',
  growPhase: 'vegetation',
  currentSpaceId: '',
};

export const SIMULATOR_DEFAULT_SPACES = INITIAL_SPACES;
export const SIMULATOR_DEFAULT_DEVICES = INITIAL_DEVICES as LegacyDevice[];
export const SIMULATOR_DEFAULT_AUTOMATIONS = INITIAL_AUTOMATIONS as LegacyAutomation[];

export const SIMULATOR_DEFAULT_SETTINGS: LegacySettings = {
  theme: 'light',
  tempUnit: 'C',
  growPhase: 'vegetation',
  currentSpaceId: 'space-1',
};

export function getDefaultSpaces(mode: RuntimeMode = getRuntimeMode()) {
  return mode === 'simulator' ? SIMULATOR_DEFAULT_SPACES : PRODUCT_DEFAULT_SPACES;
}

export function getDefaultDevices(mode: RuntimeMode = getRuntimeMode()) {
  return mode === 'simulator' ? SIMULATOR_DEFAULT_DEVICES : PRODUCT_DEFAULT_DEVICES;
}

export function getDefaultAutomations(mode: RuntimeMode = getRuntimeMode()) {
  return mode === 'simulator' ? SIMULATOR_DEFAULT_AUTOMATIONS : PRODUCT_DEFAULT_AUTOMATIONS;
}

export function getDefaultSettings(mode: RuntimeMode = getRuntimeMode()): LegacySettings {
  return mode === 'simulator' ? SIMULATOR_DEFAULT_SETTINGS : PRODUCT_DEFAULT_SETTINGS;
}

/** @deprecated use getDefaultSpaces() */
export const DEFAULT_SPACES = PRODUCT_DEFAULT_SPACES;
/** @deprecated use getDefaultDevices() */
export const DEFAULT_DEVICES = PRODUCT_DEFAULT_DEVICES;
/** @deprecated use getDefaultAutomations() */
export const DEFAULT_AUTOMATIONS = PRODUCT_DEFAULT_AUTOMATIONS;
/** @deprecated use getDefaultSettings() */
export const DEFAULT_SETTINGS = PRODUCT_DEFAULT_SETTINGS;
