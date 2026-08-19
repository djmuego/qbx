import { z } from 'zod';

export const agentBriefingSchema = z.object({
  status: z.enum(['ok', 'attention', 'critical', 'waiting']),
  headline: z.string().min(1),
  summary: z.string().min(1),
  insights: z.array(
    z.object({
      severity: z.enum(['info', 'warning', 'critical']),
      title: z.string(),
      detail: z.string(),
    }),
  ),
  watchItems: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export type ParsedAgentBriefing = z.infer<typeof agentBriefingSchema>;
