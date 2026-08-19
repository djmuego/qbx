import { z } from 'zod';
import { mapObjectKindSchema } from './qbx.schemas';

export const blueprintPositionSchema = z.object({
  xM: z.number(),
  yM: z.number(),
  zM: z.number().optional(),
});

export const mapBlueprintObjectSchema = z.object({
  id: z.string(),
  type: mapObjectKindSchema,
  name: z.string(),
  role: z.string().optional(),
  suggestedPosition: blueprintPositionSchema,
  dimensions: z.object({ widthM: z.number().positive(), heightM: z.number().positive() }),
  rotationDeg: z.number(),
  zone: z.string().optional(),
  count: z.number().int().positive().optional(),
  origin: z.enum(['existing', 'recommended']),
});

export const mapBlueprintSchema = z.object({
  schemaVersion: z.literal(1),
  spaceGeometry: z.object({
    lengthM: z.number(),
    widthM: z.number(),
    heightM: z.number(),
  }),
  zones: z.array(
    z.object({
      name: z.string(),
      xM: z.number(),
      yM: z.number(),
      widthM: z.number(),
      heightM: z.number(),
    }),
  ),
  objects: z.array(mapBlueprintObjectSchema),
  plantGroups: z.array(
    z.object({
      name: z.string(),
      count: z.number().int().nonnegative(),
      crop: z.string().optional(),
      zone: z.string().optional(),
      position: blueprintPositionSchema,
      dimensions: z.object({ widthM: z.number(), heightM: z.number() }).optional(),
      ageDays: z.number().nonnegative().optional(),
    }),
  ),
  relationships: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      kind: z.string(),
    }),
  ),
  assumptions: z.array(z.string()),
  questions: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  recommendedHardware: z.array(
    z.object({
      type: z.string(),
      role: z.string().optional(),
      reason: z.string(),
    }),
  ),
  defaultPlantAgeDays: z.number().nonnegative().optional(),
});

export type ParsedMapBlueprint = z.infer<typeof mapBlueprintSchema>;
