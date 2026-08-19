import type { KnowledgeProvider, KnowledgeRetrievalRequest } from '../../../domain/ai/knowledge-provider.types';
import { retrieveKnowledgeContext } from './knowledge-retrieval';

export class CuratedKnowledgeProvider implements KnowledgeProvider {
  listTopics() {
    return [] as import('../../../domain/ai/knowledge-provider.types').KnowledgeTopic[];
  }

  async retrieve(request: KnowledgeRetrievalRequest = {}): Promise<string> {
    return retrieveKnowledgeContext(request);
  }
}

export const curatedKnowledgeProvider = new CuratedKnowledgeProvider();
