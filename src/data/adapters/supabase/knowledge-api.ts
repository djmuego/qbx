import type {
  KnowledgeArticleDetail,
  KnowledgeArticleSummary,
  KnowledgeCategory,
  KnowledgeChunkMatch,
  KnowledgeEmbeddingChunk,
} from '../../../domain/ai/knowledge-base.types';
import type { SupabaseClient } from '@supabase/supabase-js';

function mapSummary(row: Record<string, unknown>): KnowledgeArticleSummary {
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : null,
    categorySlug: (row.category_slug as string | null) ?? null,
    categoryTitle: (row.category_title as string | null) ?? null,
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    isPublished: Boolean(row.is_published ?? row.isPublished),
    chunkCount: Number(row.chunk_count ?? row.chunkCount ?? 0),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
  };
}

export async function fetchKnowledgeCategories(client: SupabaseClient): Promise<KnowledgeCategory[]> {
  const { data, error } = await client.rpc('admin_list_knowledge_categories');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
  }));
}

export async function fetchKnowledgeArticles(client: SupabaseClient): Promise<KnowledgeArticleSummary[]> {
  const { data, error } = await client.rpc('admin_list_knowledge_articles');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSummary);
}

export async function fetchKnowledgeArticle(
  client: SupabaseClient,
  articleId: string,
): Promise<KnowledgeArticleDetail | null> {
  const { data, error } = await client.rpc('admin_get_knowledge_article', { p_article_id: articleId });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    categoryId: row.categoryId ? String(row.categoryId) : null,
    categorySlug: (row.categorySlug as string | null) ?? null,
    categoryTitle: (row.categoryTitle as string | null) ?? null,
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    contentMarkdown: String(row.contentMarkdown ?? ''),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    isPublished: Boolean(row.isPublished),
    chunkCount: Number(row.chunkCount ?? 0),
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
}

export async function upsertKnowledgeArticle(
  client: SupabaseClient,
  input: {
    id?: string | null;
    categoryId: string | null;
    title: string;
    slug: string;
    contentMarkdown: string;
    tags: string[];
    isPublished: boolean;
  },
): Promise<string> {
  const { data, error } = await client.rpc('admin_upsert_knowledge_article', {
    p_article_id: input.id ?? null,
    p_category_id: input.categoryId,
    p_title: input.title,
    p_slug: input.slug,
    p_content_markdown: input.contentMarkdown,
    p_tags: input.tags,
    p_is_published: input.isPublished,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function deleteKnowledgeArticle(client: SupabaseClient, articleId: string): Promise<void> {
  const { data, error } = await client.rpc('admin_delete_knowledge_article', { p_article_id: articleId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Article not found');
}

export async function replaceKnowledgeEmbeddings(
  client: SupabaseClient,
  articleId: string,
  chunks: KnowledgeEmbeddingChunk[],
): Promise<number> {
  const payload = chunks.map((c) => ({
    content: c.content,
    embedding: c.embedding,
    chunkIndex: c.chunkIndex,
  }));
  const { data, error } = await client.rpc('admin_replace_knowledge_embeddings', {
    p_article_id: articleId,
    p_chunks: payload,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function matchKnowledgeChunks(
  client: SupabaseClient,
  embedding: number[],
  matchCount = 6,
  threshold = 0.45,
): Promise<KnowledgeChunkMatch[]> {
  const { data, error } = await client.rpc('match_knowledge_chunks', {
    query_embedding: embedding,
    match_count: matchCount,
    match_threshold: threshold,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    articleId: String(row.article_id),
    articleTitle: String(row.article_title ?? ''),
    articleSlug: String(row.article_slug ?? ''),
    chunkContent: String(row.chunk_content ?? ''),
    similarity: Number(row.similarity ?? 0),
  }));
}

export async function upsertKnowledgeCategory(
  client: SupabaseClient,
  input: { id?: string | null; slug: string; title: string; description: string },
): Promise<string> {
  const { data, error } = await client.rpc('admin_upsert_knowledge_category', {
    p_id: input.id ?? null,
    p_slug: input.slug,
    p_title: input.title,
    p_description: input.description,
  });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function deleteKnowledgeCategory(client: SupabaseClient, categoryId: string): Promise<void> {
  const { data, error } = await client.rpc('admin_delete_knowledge_category', { p_id: categoryId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Category not found');
}
