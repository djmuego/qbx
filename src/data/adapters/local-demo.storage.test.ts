import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  domainStorageKey,
  loadInitialDevices,
  loadInitialSpaceMaps,
  loadInitialSpaces,
  looksLikeSimulatorDeviceList,
  persistDevices,
  persistSpaceMaps,
  STORAGE_KEYS,
} from './local-demo.storage';
import { INITIAL_DEVICES } from '../../mock/seed.runtime';
import { mapLegacyDevice } from './mappers';
import { createEmptySpaceMap, createPlacement } from '../../domain/map/space-map.geometry';

function installMemoryStorage() {
  const data = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, String(value));
    },
    removeItem: (key) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  vi.stubGlobal('localStorage', storage);
  return storage;
}

describe('local-demo.storage runtime isolation', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('detects simulator seed device lists', () => {
    expect(looksLikeSimulatorDeviceList(INITIAL_DEVICES)).toBe(true);
    expect(looksLikeSimulatorDeviceList([{ id: 'dev-1710000000000' }])).toBe(false);
  });

  it('does not load simulator seed devices into hardware mode from legacy keys', () => {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(INITIAL_DEVICES));
    expect(loadInitialDevices('hardware')).toEqual([]);
  });

  it('still loads simulator seed from legacy keys in simulator mode', () => {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(INITIAL_DEVICES));
    expect(loadInitialDevices('simulator').map((d) => d.id)).toEqual(['dev-1', 'dev-2', 'dev-3']);
  });

  it('keeps hardware and simulator device worlds on separate keys', () => {
    const hardwareDevice = mapLegacyDevice({
      ...INITIAL_DEVICES[0]!,
      id: 'dev-1710000000000',
      isOnline: false,
      firmwareVersion: '',
      serialNumber: '',
      inputs: INITIAL_DEVICES[0]!.inputs.map((input) => ({ ...input, currentValue: 0, history: [] })),
    });
    persistDevices([hardwareDevice], 'hardware');
    persistDevices(INITIAL_DEVICES.map(mapLegacyDevice), 'simulator');

    expect(loadInitialDevices('hardware').map((d) => d.id)).toEqual(['dev-1710000000000']);
    expect(loadInitialDevices('simulator').map((d) => d.id)).toEqual(['dev-1', 'dev-2', 'dev-3']);
    expect(localStorage.getItem(domainStorageKey('devices_v1', 'hardware'))).toContain('dev-1710000000000');
    expect(localStorage.getItem(domainStorageKey('devices_v1', 'simulator'))).toContain('dev-1');
  });

  it('does not migrate simulator spaces into hardware mode', () => {
    localStorage.setItem(STORAGE_KEYS.SPACES, JSON.stringify([{ id: 'space-1', name: 'Моя теплица' }]));
    expect(loadInitialSpaces('hardware')).toEqual([]);
  });

  it('keeps valid maps when one placement kind is corrupt', () => {
    const good = createEmptySpaceMap('space-171');
    good.placements = [createPlacement({ kind: 'hub', xM: 0.2, yM: 0.2, widthM: 0.25, heightM: 0.2, rotationDeg: 0 })];
    persistSpaceMaps(
      [
        good,
        { ...good, spaceId: 'bad', placements: [{ id: 'x', kind: 'spaceship' } as never] },
      ],
      'hardware',
    );
    const maps = loadInitialSpaceMaps('hardware');
    expect(maps.map((m) => m.spaceId)).toEqual(['space-171']);
  });
});
