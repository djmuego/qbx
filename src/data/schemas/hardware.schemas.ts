import { z } from 'zod';

export const connectionStateSchema = z.enum([
  'unknown',
  'connecting',
  'online',
  'degraded',
  'offline',
  'error',
]);

export const deviceLifecycleStateSchema = z.enum([
  'discovered',
  'pairing',
  'configuring',
  'online',
  'offline',
  'error',
  'updating',
]);

export const sensorQualitySchema = z.enum(['ok', 'stale', 'error']);

export const sensorReadingBoundarySchema = z.object({
  sensorId: z.string(),
  value: z.number(),
  unit: z.string(),
  timestampMs: z.number(),
  quality: sensorQualitySchema,
  type: z.string().optional(),
});

export const outputStateSchema = z.object({
  outputId: z.string(),
  state: z.enum(['on', 'off']),
  timestampMs: z.number(),
  level: z.number().optional(),
});

export const deviceErrorSchema = z.object({
  code: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  message: z.string(),
  timestampMs: z.number(),
  source: z.string().optional(),
});

export const deviceIdentitySchema = z.object({
  deviceId: z.string(),
  hardwareId: z.string(),
  model: z.string(),
  name: z.string(),
  hardwareRevision: z.string().optional(),
  firmwareVersion: z.string().optional(),
  protocolVersion: z.string().optional(),
});

export const deviceInfoSchema = z.object({
  identity: deviceIdentitySchema,
  capabilitiesVersion: z.string().optional(),
});

export const outputCapabilitySchema = z.object({
  id: z.string(),
  channel: z.string(),
  type: z.enum(['switch', 'dimmer', 'pwm', 'analog']),
  equipmentType: z.string().optional(),
  name: z.string().optional(),
  maxLevel: z.number().optional(),
});

export const sensorInputCapabilitySchema = z.object({
  id: z.string(),
  channel: z.string(),
  type: z.string(),
  unit: z.string(),
  name: z.string().optional(),
});

export const deviceCapabilitiesSchema = z.object({
  deviceId: z.string(),
  outputs: z.array(outputCapabilitySchema),
  sensorInputs: z.array(sensorInputCapabilitySchema),
  interfaces: z.array(z.string()),
  features: z.array(z.string()),
});

export const deviceSnapshotSchema = z.object({
  deviceId: z.string(),
  timestampMs: z.number(),
  connection: connectionStateSchema,
  sensors: z.array(sensorReadingBoundarySchema),
  outputs: z.array(outputStateSchema),
  errors: z.array(deviceErrorSchema),
});

export const commandResultSchema = z.object({
  commandId: z.string(),
  status: z.enum(['pending', 'acknowledged', 'failed', 'timeout']),
  timestampMs: z.number(),
  error: z.string().optional(),
});

export function parseDeviceSnapshot(input: unknown) {
  return deviceSnapshotSchema.parse(input);
}

export function parseDeviceCapabilities(input: unknown) {
  return deviceCapabilitiesSchema.parse(input);
}

export function parseDeviceInfo(input: unknown) {
  return deviceInfoSchema.parse(input);
}

export function parseCommandResult(input: unknown) {
  return commandResultSchema.parse(input);
}
