import { z } from 'zod';

export const advisorResponseSchema = z.object({
  growPhase: z.enum(['seedling', 'vegetation', 'flowering', 'flushing']),
  spaceNameSuggestion: z.string().min(1),
  spaceDescription: z.string().min(1),
  targets: z.object({
    temperature: z.string(),
    humidity: z.string(),
    lightCycle: z.string(),
    soilMoisture: z.string().optional(),
    co2: z.string().optional(),
  }),
  criteria: z.array(z.string()).min(1),
  nextSteps: z.array(z.string()).min(1),
  automationHints: z.array(z.string()),
  summary: z.string().min(1),
});

export type ParsedAdvisorResponse = z.infer<typeof advisorResponseSchema>;
