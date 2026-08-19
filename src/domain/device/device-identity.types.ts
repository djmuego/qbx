export interface DeviceIdentity {
  deviceId: string;
  hardwareId: string;
  model: string;
  name: string;
  hardwareRevision?: string;
  firmwareVersion?: string;
  protocolVersion?: string;
}

export interface DeviceInfo {
  identity: DeviceIdentity;
  capabilitiesVersion?: string;
}
