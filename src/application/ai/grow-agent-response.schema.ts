import { z } from 'zod';

const evidenceSchema = z.object({
  label: z.string(),
  kind: z.enum(['FACT', 'DERIVED', 'INFERENCE', 'UNKNOWN']),
  detail: z.string(),
});

export const growAgentResponseSchema = z.object({
  status: z.enum(['ok', 'attention', 'critical', 'waiting']),
  summary: z.string().min(1),
  headline: z.string().min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  observations: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      evidence: z.array(evidenceSchema),
    }),
  ),
  warnings: z.array(
    z.object({
      severity: z.enum(['info', 'attention', 'warning', 'critical']),
      title: z.string(),
      detail: z.string(),
      evidence: z.array(evidenceSchema),
    }),
  ),
  recommendations: z.array(
    z.object({
      title: z.string(),
      reason: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      evidence: z.array(evidenceSchema),
      suggestedAction: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
      expectedEffect: z.string().optional(),
      risk: z.string().optional(),
      requiresUserAction: z.boolean().optional(),
    }),
  ),
  questions: z.array(z.string()),
  possibleCauses: z.array(z.string()).optional(),
  healthScore: z.number().min(0).max(100).optional(),
  healthLabel: z.string().optional(),
  missingData: z.array(z.string()).optional(),
  proposedAutomations: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      triggerSummary: z.string(),
      actionSummary: z.string(),
      reason: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    }),
  ),
  missingSensors: z.array(z.string()),
  evidenceSources: z.array(z.string()),
  watchItems: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export type ParsedGrowAgentResponse = z.infer<typeof growAgentResponseSchema>;
