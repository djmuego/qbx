import type { SupabaseClient } from '@supabase/supabase-js';
import type { KnowledgeEmbeddingChunk } from '../../../domain/ai/knowledge-base.types';
import { chunkMarkdown } from './knowledge-chunker';
import { embedTexts } from './embedding.service';
import { replaceKnowledgeEmbeddings } from '../../../data/adapters/supabase/knowledge-api';
import { replaceLocalKnowledgeEmbeddings } from './local-knowledge.store';
import { isSupabaseConfigured } from '../../../infrastructure/supabase/config';

export async function indexArticleEmbeddings(
  articleId: string,
  markdown: string,
  client?: SupabaseClient | null,
): Promise<{ chunkCount: number }> {
  const chunks = chunkMarkdown(markdown);
  if (chunks.length === 0) {
    if (isSupabaseConfigured() && client) {
      await replaceKnowledgeEmbeddings(client, articleId, []);
    } else {
      replaceLocalKnowledgeEmbeddings(articleId, []);
    }
    return { chunkCount: 0 };
  }

  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const payload: KnowledgeEmbeddingChunk[] = chunks.map((chunk, i) => ({
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    embedding: embeddings[i].embedding,
  }));

  if (isSupabaseConfigured() && client) {
    const count = await replaceKnowledgeEmbeddings(client, articleId, payload);
    return { chunkCount: count };
  }

  const count = replaceLocalKnowledgeEmbeddings(articleId, payload);
  return { chunkCount: count };
}
