export type DeviceLifecycleState =
  | 'discovered'
  | 'pairing'
  | 'configuring'
  | 'online'
  | 'offline'
  | 'error'
  | 'updating';

export type ConnectionState =
  | 'unknown'
  | 'connecting'
  | 'online'
  | 'degraded'
  | 'offline'
  | 'error';

export type DeviceSetupPhase =
  | 'searching'
  | 'found'
  | 'pairing'
  | 'configuring'
  | 'ready'
  | 'error';

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
export const DEFAULT_OFFLINE_AFTER_MS = 90_000;
