export interface KnowledgeCategory {
  id: string;
  slug: string;
  title: string;
  description: string | null;
}

export interface KnowledgeArticleSummary {
  id: string;
  categoryId: string | null;
  categorySlug: string | null;
  categoryTitle: string | null;
  title: string;
  slug: string;
  tags: string[];
  isPublished: boolean;
  chunkCount: number;
  updatedAt: string;
}

export interface KnowledgeArticleDetail extends KnowledgeArticleSummary {
  contentMarkdown: string;
  createdAt: string;
}

export interface KnowledgeChunkMatch {
  id: string;
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  chunkContent: string;
  similarity: number;
}

export interface KnowledgeEmbeddingChunk {
  content: string;
  embedding: number[];
  chunkIndex: number;
}

/** Grow box telemetry slice for RAG prompt assembly. */
export interface GrowTelemetryContext {
  spaceName: string;
  stage: 'seedling' | 'vegetation' | 'flowering' | 'flush' | 'unknown';
  tempC: number | null;
  humidityPct: number | null;
  vpdKpa?: number | null;
  soilMoisturePct?: number | null;
  lightStatus: 'ON' | 'OFF' | 'UNKNOWN';
  hoursInCurrentPhase: number | null;
}

/** Vision-ready attachment for future leaf-photo diagnosis. */
export interface VisionAttachment {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Base64 without data-URL prefix, or HTTPS URL when camera pipeline is live. */
  dataOrUrl: string;
  caption?: string;
}

export interface AgronomistPromptInput {
  telemetry: GrowTelemetryContext;
  knowledgeChunks: string[];
  userQuery: string;
  visionAttachments?: VisionAttachment[];
}
