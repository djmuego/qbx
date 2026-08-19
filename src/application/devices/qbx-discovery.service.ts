import { isSimulatorMode } from '../../config/runtime-mode';

/** GATT service UUID reserved for QBX Strip provisioning (Pass 3 wire protocol) */
export const QBX_STRIP_BLE_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

export type DiscoveryTransport = 'ble' | 'wifi' | 'simulator';

export interface DiscoveredQbxDevice {
  id: string;
  modelId: string;
  displayName: string;
  transport: DiscoveryTransport;
  signalLabel?: string;
}

function modelIdFromBleName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('strip')) return 'qbx-strip-4';
  if (n.includes('sense')) return 'qbx-sense';
  if (n.includes('hub')) return 'qbx-hub';
  if (n.includes('climate')) return 'qbx-climate';
  if (n.includes('water')) return 'qbx-water';
  if (n.includes('power')) return 'qbx-power-4';
  return 'qbx-strip-4';
}

function webBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/** Passive LAN scan placeholder — real mDNS in Pass 3 firmware */
export async function scanLanForQbx(_timeoutMs = 1800): Promise<DiscoveredQbxDevice[]> {
  return [];
}

/** User-gesture BLE pick — no invented devices in hardware mode */
export async function requestBleQbxDevice(): Promise<DiscoveredQbxDevice | null> {
  if (!webBluetoothAvailable()) return null;
  try {
    const nav = navigator as Navigator & {
      bluetooth?: {
        requestDevice: (options: {
          filters: { namePrefix: string }[];
          optionalServices: string[];
        }) => Promise<{ id: string; name?: string }>;
      };
    };
    const device = await nav.bluetooth!.requestDevice({
      filters: [{ namePrefix: 'QBX' }],
      optionalServices: [QBX_STRIP_BLE_SERVICE],
    });
    const displayName = device.name ?? 'QBX Device';
    return {
      id: device.id,
      modelId: modelIdFromBleName(displayName),
      displayName,
      transport: 'ble',
      signalLabel: 'BLE',
    };
  } catch {
    return null;
  }
}

/** Simulator-only demo discovery — never called in hardware mode */
function simulatorDiscoveredStrip(): DiscoveredQbxDevice[] {
  return [
    {
      id: 'sim-strip-1',
      modelId: 'qbx-strip-4',
      displayName: 'QBX Strip 4 · SIM',
      transport: 'simulator',
      signalLabel: 'Wi‑Fi',
    },
  ];
}

export interface DiscoveryScanResult {
  devices: DiscoveredQbxDevice[];
  bleAvailable: boolean;
  simulator: boolean;
}

/** Initial auto-scan: LAN + simulator demo. Does not fake hardware results. */
export async function runInitialQbxScan(timeoutMs = 2000): Promise<DiscoveryScanResult> {
  const simulator = isSimulatorMode();
  const bleAvailable = webBluetoothAvailable();

  if (simulator) {
    await new Promise((r) => setTimeout(r, Math.min(timeoutMs, 900)));
    return { devices: simulatorDiscoveredStrip(), bleAvailable, simulator: true };
  }

  const lan = await Promise.race([
    scanLanForQbx(timeoutMs),
    new Promise<DiscoveredQbxDevice[]>((r) => setTimeout(() => r([]), timeoutMs)),
  ]);

  return { devices: lan, bleAvailable, simulator: false };
}

export function isBleDiscoverySupported(): boolean {
  return webBluetoothAvailable();
}
