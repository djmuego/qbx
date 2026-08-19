export type KnowledgeTopic =
  | 'plant-physiology'
  | 'climate'
  | 'humidity-vpd'
  | 'lighting'
  | 'irrigation'
  | 'substrate'
  | 'hydroponics'
  | 'nutrition'
  | 'co2'
  | 'ph-ec'
  | 'plant-stress'
  | 'disease-basics'
  | 'sensors'
  | 'grow-stages';

export interface KnowledgeRetrievalRequest {
  question?: string;
  topics?: KnowledgeTopic[];
  /** Slug from agent-knowledge index, e.g. crops--tomato */
  cropSlug?: string;
  maxCharacters?: number;
}

export interface KnowledgeProvider {
  retrieve(request?: KnowledgeRetrievalRequest): Promise<string>;
  listTopics(): KnowledgeTopic[];
}
