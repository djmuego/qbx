import type { AiSettings } from '../../domain/ai/ai-provider.types';
import type { SpaceAdvisorRecommendation, SpaceSetupBrief } from '../../domain/ai/advisor.types';
import { completeChat } from './ai-client';
import { buildSpaceAdvisorSystemPrompt, buildSpaceAdvisorUserPrompt } from './advisor-prompt';
import { advisorResponseSchema } from './advisor-response.schema';

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response does not contain JSON');
  return match[0];
}

export async function adviseSpaceSetup(
  brief: SpaceSetupBrief,
  settings: AiSettings,
): Promise<SpaceAdvisorRecommendation> {
  const result = await completeChat({
    settings,
    responseFormat: 'json',
    messages: [
      { role: 'system', content: buildSpaceAdvisorSystemPrompt() },
      { role: 'user', content: buildSpaceAdvisorUserPrompt(brief) },
    ],
  });

  const json = extractJson(result.content);
  const parsed = advisorResponseSchema.parse(JSON.parse(json));
  return parsed;
}
