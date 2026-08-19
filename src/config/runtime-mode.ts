export type RuntimeMode = 'hardware' | 'simulator';

export function getRuntimeMode(): RuntimeMode {
  const fromVite = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_QBX_RUNTIME_MODE : undefined;
  const fromProcess = typeof process !== 'undefined' ? process.env.VITE_QBX_RUNTIME_MODE : undefined;
  const env = fromVite ?? fromProcess;
  return env === 'simulator' ? 'simulator' : 'hardware';
}

export function isSimulatorMode(): boolean {
  return getRuntimeMode() === 'simulator';
}

export function isHardwareMode(): boolean {
  return getRuntimeMode() === 'hardware';
}
