import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { isSupabaseConfigured } from '../../infrastructure/supabase/config';
import type { KnowledgeArticleDetail, KnowledgeArticleSummary, KnowledgeCategory } from '../../domain/ai/knowledge-base.types';
import {
  deleteKnowledgeArticle,
  fetchKnowledgeArticle,
  fetchKnowledgeArticles,
  fetchKnowledgeCategories,
  upsertKnowledgeArticle,
  deleteKnowledgeCategory,
  upsertKnowledgeCategory,
} from '../../data/adapters/supabase/knowledge-api';
import { fetchKnowledgeStatsAdmin } from '../../data/adapters/supabase/admin-api';
import type { PlatformAdminKnowledgeStats } from '../../domain/admin/platform-admin.types';
import type { KnowledgeChunkMatch } from '../../domain/ai/knowledge-base.types';
import { AIAssistantService } from '../../application/ai/ai-assistant.service';
import {
  deleteLocalKnowledgeArticle,
  getLocalKnowledgeArticle,
  listLocalKnowledgeArticles,
  listLocalKnowledgeCategories,
  upsertLocalKnowledgeArticle,
} from '../../application/ai/knowledge/local-knowledge.store';
import { indexArticleEmbeddings } from '../../application/ai/knowledge/knowledge-indexing.service';

export function useKnowledgeAdmin(localMode: boolean) {
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexBusy, setIndexBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editing, setEditing] = useState<KnowledgeArticleDetail | null>(null);
  const [stats, setStats] = useState<PlatformAdminKnowledgeStats | null>(null);
  const [retrievalQuery, setRetrievalQuery] = useState('');
  const [retrievalResults, setRetrievalResults] = useState<KnowledgeChunkMatch[]>([]);
  const [retrievalBusy, setRetrievalBusy] = useState(false);

  const cloud = isSupabaseConfigured() && !localMode;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (cloud) {
        const client = getSupabaseClient();
        if (!client) throw new Error('Supabase client unavailable');
        const [cats, list] = await Promise.all([
          fetchKnowledgeCategories(client),
          fetchKnowledgeArticles(client),
        ]);
        setCategories(cats);
        setArticles(list);
        try {
          setStats(await fetchKnowledgeStatsAdmin(client));
        } catch {
          setStats(null);
        }
      } else {
        setCategories(listLocalKnowledgeCategories());
        setArticles(listLocalKnowledgeArticles());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  }, [cloud]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles.filter((a) => {
      if (categoryFilter !== 'all' && a.categorySlug !== categoryFilter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.slug.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [articles, search, categoryFilter]);

  const openNew = useCallback(() => {
    setEditing({
      id: '',
      categoryId: categories[0]?.id ?? null,
      categorySlug: categories[0]?.slug ?? null,
      categoryTitle: categories[0]?.title ?? null,
      title: '',
      slug: '',
      contentMarkdown: '# Новая статья\n\n',
      tags: [],
      isPublished: true,
      chunkCount: 0,
      createdAt: '',
      updatedAt: '',
    });
  }, [categories]);

  const openArticle = useCallback(
    async (id: string) => {
      setError(null);
      try {
        if (cloud) {
          const client = getSupabaseClient();
          if (!client) throw new Error('Supabase client unavailable');
          const detail = await fetchKnowledgeArticle(client, id);
          if (!detail) throw new Error('Article not found');
          setEditing(detail);
        } else {
          const detail = getLocalKnowledgeArticle(id);
          if (!detail) throw new Error('Article not found');
          setEditing(detail);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to open article');
      }
    },
    [cloud],
  );

  const saveArticle = useCallback(
    async (draft: KnowledgeArticleDetail) => {
      setSaveBusy(true);
      setError(null);
      setSuccess(null);
      try {
        let id = draft.id;
        if (cloud) {
          const client = getSupabaseClient();
          if (!client) throw new Error('Supabase client unavailable');
          id = await upsertKnowledgeArticle(client, {
            id: draft.id || null,
            categoryId: draft.categoryId,
            title: draft.title,
            slug: draft.slug,
            contentMarkdown: draft.contentMarkdown,
            tags: draft.tags,
            isPublished: draft.isPublished,
          });
        } else {
          id = upsertLocalKnowledgeArticle({
            id: draft.id || undefined,
            categoryId: draft.categoryId,
            title: draft.title,
            slug: draft.slug,
            contentMarkdown: draft.contentMarkdown,
            tags: draft.tags,
            isPublished: draft.isPublished,
          });
        }
        await refresh();
        if (editing) setEditing({ ...draft, id });
        setSuccess('Статья сохранена');
        return id;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
        return null;
      } finally {
        setSaveBusy(false);
      }
    },
    [cloud, editing, refresh],
  );

  const reindexArticle = useCallback(
    async (article: KnowledgeArticleDetail) => {
      setIndexBusy(true);
      setError(null);
      setSuccess(null);
      try {
        let id = article.id;
        if (!id) {
          id = (await saveArticle(article)) ?? '';
          if (!id) return;
        }
        const client = cloud ? getSupabaseClient() : null;
        const { chunkCount } = await indexArticleEmbeddings(id, article.contentMarkdown, client);
        await refresh();
        setSuccess(`Индекс обновлён: ${chunkCount} чанков`);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Re-index failed');
      } finally {
        setIndexBusy(false);
      }
    },
    [cloud, refresh, saveArticle],
  );

  const removeArticle = useCallback(
    async (id: string) => {
      setError(null);
      try {
        if (cloud) {
          const client = getSupabaseClient();
          if (!client) throw new Error('Supabase client unavailable');
          await deleteKnowledgeArticle(client, id);
        } else {
          deleteLocalKnowledgeArticle(id);
        }
        if (editing?.id === id) setEditing(null);
        await refresh();
        setSuccess('Статья удалена');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed');
      }
    },
    [cloud, editing?.id, refresh],
  );

  const reindexAll = useCallback(async () => {
    setIndexBusy(true);
    setError(null);
    let total = 0;
    try {
      const client = cloud ? getSupabaseClient() : null;
      for (const article of articles) {
        const detail = cloud && client
          ? await fetchKnowledgeArticle(client, article.id)
          : getLocalKnowledgeArticle(article.id);
        if (!detail?.contentMarkdown) continue;
        const { chunkCount } = await indexArticleEmbeddings(article.id, detail.contentMarkdown, client);
        total += chunkCount;
      }
      await refresh();
      setSuccess(`Re-index all: ${total} chunks across ${articles.length} articles`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Re-index all failed');
    } finally {
      setIndexBusy(false);
    }
  }, [articles, cloud, refresh]);

  const testRetrieval = useCallback(async () => {
    const q = retrievalQuery.trim();
    if (!q) return;
    setRetrievalBusy(true);
    setError(null);
    try {
      const matches = await AIAssistantService.retrieveChunkMatches(q, { matchCount: 6, threshold: 0.35 });
      setRetrievalResults(matches);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retrieval test failed');
      setRetrievalResults([]);
    } finally {
      setRetrievalBusy(false);
    }
  }, [retrievalQuery]);

  const saveCategory = useCallback(
    async (input: { id?: string; slug: string; title: string; description: string }) => {
      if (!cloud) {
        setError('Categories CRUD requires Supabase');
        return;
      }
      const client = getSupabaseClient();
      if (!client) return;
      await upsertKnowledgeCategory(client, { ...input, id: input.id ?? null });
      await refresh();
      setSuccess('Категория сохранена');
    },
    [cloud, refresh],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      if (!cloud) return;
      const client = getSupabaseClient();
      if (!client) return;
      await deleteKnowledgeCategory(client, id);
      await refresh();
      setSuccess('Категория удалена');
    },
    [cloud, refresh],
  );

  return {
    categories,
    articles: filtered,
    stats,
    loading,
    indexBusy,
    saveBusy,
    error,
    success,
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    editing,
    setEditing,
    openNew,
    openArticle,
    saveArticle,
    reindexArticle,
    reindexAll,
    removeArticle,
    refresh,
    retrievalQuery,
    setRetrievalQuery,
    retrievalResults,
    retrievalBusy,
    testRetrieval,
    saveCategory,
    removeCategory,
  };
}
