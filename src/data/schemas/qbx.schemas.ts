import { z } from 'zod';

export const schemaVersionSchema = z.literal(1);

export const sensorTypeSchema = z.enum([
  'temperature',
  'humidity',
  'soil_moisture',
  'co2',
  'light',
  'water_level',
  'ph',
  'ec',
  'pressure',
  'other',
  'generic',
  'unused',
]);

export const equipmentTypeSchema = z.enum([
  'lighting',
  'watering',
  'ventilation',
  'heating',
  'humidifier',
  'valve',
  'co2',
  'socket',
  'other',
  'unused',
]);

export const sensorStatusSchema = z.enum(['normal', 'low', 'high', 'attention']);

export const sensorHistoryPointSchema = z.object({
  time: z.string(),
  value: z.number(),
});

export const legacySensorSchema = z.object({
  id: z.string(),
  portNumber: z.number(),
  hardwareLabel: z.string(),
  type: sensorTypeSchema,
  customName: z.string(),
  currentValue: z.number(),
  unit: z.string(),
  optimalMin: z.number(),
  optimalMax: z.number(),
  status: sensorStatusSchema,
  showOnHome: z.boolean(),
  history: z.array(sensorHistoryPointSchema).optional().default([]),
});

export const legacyOutputSchema = z.object({
  id: z.string(),
  portNumber: z.number(),
  hardwareLabel: z.string(),
  isHighPower: z.boolean().optional(),
  type: equipmentTypeSchema,
  customName: z.string(),
  state: z.boolean(),
  isAuto: z.boolean(),
  activeAutomationId: z.string().optional(),
  activeAutomationName: z.string().optional(),
});

export const legacyDeviceSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  modelId: z.string(),
  modelName: z.string(),
  customName: z.string(),
  isOnline: z.boolean(),
  inputs: z.array(legacySensorSchema),
  outputs: z.array(legacyOutputSchema),
  firmwareVersion: z.string(),
  serialNumber: z.string(),
  addedAt: z.string(),
});

export const spaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z
    .enum([
      'greenhouse',
      'grow_tent',
      'grow_box',
      'grow_room',
      'hydroponics',
      'seedling_area',
      'outdoor',
      'facility',
      'site',
      'custom',
    ])
    .optional(),
  dimensions: z
    .object({
      lengthM: z.number(),
      widthM: z.number(),
      heightM: z.number(),
    })
    .optional(),
  areaM2: z.number().optional(),
  volumeM3: z.number().optional(),
  timezone: z.string().optional(),
  isDefault: z.boolean().optional(),
  deviceIds: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  spatialScale: z.enum(['L1_MICRO', 'L2_ROOM', 'L3_FACILITY', 'L4_SITE']).optional(),
  spatialKind: z.enum(['site', 'building', 'floor', 'room', 'zone', 'rack', 'bed', 'plant']).optional(),
  localOrigin: z.object({ xM: z.number(), yM: z.number(), zM: z.number() }).optional(),
});

export const automationTriggerTypeSchema = z.enum(['sensor', 'schedule', 'timer']);

export const legacyAutomationSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  name: z.string(),
  isEnabled: z.boolean(),
  type: automationTriggerTypeSchema,
  sensorInputId: z.string().optional(),
  sensorDeviceId: z.string().optional(),
  sensorName: z.string().optional(),
  sensorType: sensorTypeSchema.optional(),
  condition: z.enum(['above', 'below']).optional(),
  threshold: z.number().optional(),
  thresholdUnit: z.string().optional(),
  stopThreshold: z.number().optional(),
  scheduleDays: z.array(z.number()).optional(),
  onTime: z.string().optional(),
  offTime: z.string().optional(),
  intervalMinutes: z.number().optional(),
  durationSeconds: z.number().optional(),
  targetDeviceId: z.string(),
  targetOutputId: z.string(),
  equipmentName: z.string(),
  actionType: z.enum(['turn_on', 'turn_off']),
});

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  tempUnit: z.enum(['C', 'F']),
  growPhase: z.enum(['seedling', 'vegetation', 'flowering', 'flushing']),
  currentSpaceId: z.string(),
  mapViewMode: z.enum(['2d', '3d']).optional(),
  mapEditMode: z.boolean().optional(),
  mapSnapStepM: z.number().optional(),
});

export const mapObjectKindSchema = z.enum([
  'plant',
  'plant_group',
  'sensor',
  'equipment',
  'light',
  'irrigation',
  'structure',
  'camera',
  'hub',
  'outlet',
  'electrical_panel',
]);

export const mapPlacementSchema = z.object({
  id: z.string(),
  kind: mapObjectKindSchema,
  xM: z.number(),
  yM: z.number(),
  zM: z.number().optional(),
  widthM: z.number(),
  heightM: z.number(),
  rotationDeg: z.number(),
  rotationXM: z.number().optional(),
  rotationZM: z.number().optional(),
  zoneId: z.string().optional(),
  plantId: z.string().optional(),
  deviceId: z.string().optional(),
  sensorId: z.string().optional(),
  outputId: z.string().optional(),
  label: z.string().optional(),
  notes: z.string().optional(),
  sizeZM: z.number().optional(),
  mounting: z.enum(['floor', 'wall', 'ceiling', 'hanging', 'rack_level', 'rack', 'plantCanopy', 'free']).optional(),
  zSource: z.enum(['user', 'default_visualization']).optional(),
  role: z.string().optional(),
  catalogId: z.string().optional(),
  parentId: z.string().optional(),
  rackLevels: z.number().optional(),
  rackLevel: z.number().optional(),
  canopyDiameterM: z.number().optional(),
  plantHeightM: z.number().optional(),
  groupRows: z.number().optional(),
  groupCols: z.number().optional(),
  spacingXM: z.number().optional(),
  spacingYM: z.number().optional(),
  ratedPowerW: z.number().optional(),
  ratedVoltageV: z.number().optional(),
  powerConnectionId: z.string().optional(),
  fovDeg: z.number().optional(),
  beamAngleDeg: z.number().optional(),
  coverageWidthM: z.number().optional(),
  coverageDepthM: z.number().optional(),
  childSpaceId: z.string().optional(),
  cropProfileId: z.string().optional(),
  growRunId: z.string().optional(),
  medium: z.string().optional(),
  bedHeightM: z.number().optional(),
  rowStartXM: z.number().optional(),
  rowStartYM: z.number().optional(),
  rowEndXM: z.number().optional(),
  rowEndYM: z.number().optional(),
  rowSpacingM: z.number().optional(),
  plantCount: z.number().optional(),
});

export const terrainProfileSchema = z.object({
  type: z.enum(['soil', 'grass', 'mulch', 'gravel', 'concrete', 'sand', 'hydro_floor', 'mixed', 'custom']),
  elevationMode: z.enum(['flat', 'simpleSlope']),
  materialId: z.string(),
  slope: z
    .object({
      angleDeg: z.number(),
      directionDeg: z.number(),
    })
    .optional(),
  notes: z.string().optional(),
});

export const mapZoneSchema = z.object({
  id: z.string(),
  name: z.string(),
  xM: z.number(),
  yM: z.number(),
  widthM: z.number(),
  heightM: z.number(),
  type: z.enum(['climate', 'vegetative', 'flowering', 'irrigation', 'custom']).optional(),
});

export const spatialRelationshipSchema = z.object({
  id: z.string(),
  type: z.enum([
    'sensor_monitors_zone',
    'light_illuminates_group',
    'fan_serves_space',
    'pump_supplies_zone',
    'camera_observes_zone',
    'device_mounted_on',
    'powered_from',
  ]),
  fromId: z.string(),
  toId: z.string(),
});

export const electricalPlanObjectSchema = z.object({
  spaceId: z.string().optional(),
  schemaVersion: z.literal(1),
  status: z.literal('proposal'),
  disclaimer: z.string(),
  generatedBy: z.string(),
  links: z.array(z.object({ fromId: z.string(), toId: z.string(), kind: z.literal('logical_power') })),
  totalRatedW: z.number().nullable(),
  findings: z.array(z.object({ code: z.string(), message: z.string(), placementId: z.string().optional() })),
});
export const electricalPlanSchema = electricalPlanObjectSchema.optional();

export const spaceMapSchema = z.object({
  spaceId: z.string(),
  schemaVersion: schemaVersionSchema,
  spatialSchemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  gridStepM: z.number(),
  northOffsetDeg: z.number(),
  terrainProfile: terrainProfileSchema.optional(),
  zones: z.array(mapZoneSchema),
  placements: z.array(mapPlacementSchema),
  relationships: z.array(spatialRelationshipSchema).optional(),
  electrical: electricalPlanSchema,
  updatedAt: z.string(),
  appliedTemplateId: z.string().optional(),
  heightsAreDefaults: z.boolean().optional(),
  environmentPreset: z
    .enum([
      'GROW_TENT',
      'GROW_BOX',
      'GROW_ROOM',
      'GREENHOUSE',
      'VERTICAL_FARM',
      'HYDROPONIC_ROOM',
      'FACILITY',
      'OUTDOOR_ZONE',
      'OUTDOOR_GARDEN',
      'OPEN_FIELD',
      'SMALL_FARM',
      'ORCHARD',
      'NURSERY',
      'GREENHOUSE_SITE',
    ])
    .optional(),
});

export const plantMediumSchema = z.enum(['coco', 'soil', 'hydro', 'other']);

export const plantSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  growRunId: z.string().optional(),
  zoneId: z.string().optional(),
  name: z.string(),
  cultivar: z.string().optional(),
  potVolumeL: z.number().optional(),
  medium: plantMediumSchema.optional(),
  plantedAt: z.string().optional(),
  notes: z.string().optional(),
  crop: z.string().optional(),
  canopyDiameterM: z.number().optional(),
  plantHeightM: z.number().optional(),
});

export const plantGroupSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  name: z.string(),
  plantIds: z.array(z.string()),
  zoneId: z.string().optional(),
});

export const plantStoreSchema = z.object({
  plants: z.array(plantSchema),
  groups: z.array(plantGroupSchema),
});

export const spacesEnvelopeSchema = z.union([
  z.array(spaceSchema),
  z.object({ schemaVersion: schemaVersionSchema, data: z.array(spaceSchema) }),
]);

export const devicesEnvelopeSchema = z.union([
  z.array(legacyDeviceSchema),
  z.object({ schemaVersion: schemaVersionSchema, data: z.array(legacyDeviceSchema) }),
]);

export const automationsEnvelopeSchema = z.union([
  z.array(legacyAutomationSchema),
  z.object({ schemaVersion: schemaVersionSchema, data: z.array(legacyAutomationSchema) }),
]);

export const settingsEnvelopeSchema = z.union([
  settingsSchema,
  z.object({ schemaVersion: schemaVersionSchema, data: settingsSchema }),
]);

export const spaceMapsEnvelopeSchema = z.union([
  z.array(spaceMapSchema),
  z.object({ schemaVersion: schemaVersionSchema, data: z.array(spaceMapSchema) }),
]);

export const plantStoreEnvelopeSchema = z.union([
  plantStoreSchema,
  z.object({ schemaVersion: schemaVersionSchema, data: plantStoreSchema }),
]);

export type LegacyDevice = z.infer<typeof legacyDeviceSchema>;
export type LegacyAutomation = z.infer<typeof legacyAutomationSchema>;
export type LegacySpace = z.infer<typeof spaceSchema>;
export type LegacySettings = z.infer<typeof settingsSchema>;
export type ParsedSpaceMap = z.infer<typeof spaceMapSchema>;
export type ParsedPlantStore = z.infer<typeof plantStoreSchema>;

export function unwrapEnvelope<T>(parsed: T[] | { schemaVersion: 1; data: T[] }): T[] {
  return Array.isArray(parsed) ? parsed : parsed.data;
}

export function unwrapSettings(parsed: LegacySettings | { schemaVersion: 1; data: LegacySettings }): LegacySettings {
  return 'schemaVersion' in parsed ? parsed.data : parsed;
}

export function wrapEnvelope<T>(data: T[]) {
  return { schemaVersion: 1 as const, data };
}

export function wrapSettings(data: LegacySettings) {
  return { schemaVersion: 1 as const, data };
}

export function unwrapPlantStore(parsed: ParsedPlantStore | { schemaVersion: 1; data: ParsedPlantStore }): ParsedPlantStore {
  if ('plants' in parsed && 'groups' in parsed) return parsed;
  return parsed.data;
}

export function wrapPlantStore(data: ParsedPlantStore) {
  return { schemaVersion: 1 as const, data };
}
