import type { KnowledgeRetrievalRequest } from '../../../domain/ai/knowledge-provider.types';
import type { GrowContext } from '../../../domain/ai/grow-context.types';
import { AIAssistantService } from '../ai-assistant.service';
import { inferTopicsFromQuestion, retrieveKnowledgeContext } from './knowledge-retrieval';

export interface HybridKnowledgeOptions extends KnowledgeRetrievalRequest {
  growContext?: GrowContext;
  /** When true, prepend vector RAG chunks before curated bundle. */
  useRag?: boolean;
}

/**
 * Hybrid retrieval: pgvector RAG (admin KB) + curated Obsidian bundle.
 * RAG is isolated from AutomationEngine — advisory context only.
 */
export async function retrieveHybridKnowledgeContext(
  options: HybridKnowledgeOptions = {},
): Promise<string> {
  const maxChars = options.maxCharacters ?? 10000;
  const curated = retrieveKnowledgeContext({
    question: options.question,
    topics: options.topics,
    cropSlug: options.cropSlug,
    maxCharacters: Math.floor(maxChars * 0.55),
  });

  if (options.useRag === false) {
    return curated.slice(0, maxChars);
  }

  const queryParts = [
    options.question,
    options.growContext?.space.name,
    options.growContext?.growStage?.stageName,
    options.growContext?.crop?.commonName,
    ...(options.topics ?? []),
  ].filter(Boolean);

  const ragQuery = queryParts.join(' · ');
  let ragBlock = '';

  if (ragQuery.trim()) {
    try {
      const ragChunks = await AIAssistantService.retrieveRelevantContext(ragQuery, {
        matchCount: 6,
        threshold: 0.42,
      });
      if (ragChunks.length > 0) {
        ragBlock = `### QBX Knowledge Base (vector retrieval)\n\n${ragChunks.join('\n\n---\n\n')}`;
      }
    } catch {
      // Offline / no embeddings — curated bundle still works
    }
  }

  if (!ragBlock) {
    return curated.slice(0, maxChars);
  }

  const ragBudget = Math.floor(maxChars * 0.45);
  const combined = `${ragBlock.slice(0, ragBudget)}\n\n---\n\n### Curated agronomy library\n\n${curated}`;
  return combined.slice(0, maxChars);
}

export { inferTopicsFromQuestion };
