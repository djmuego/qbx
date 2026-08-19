import type {
  KnowledgeArticleDetail,
  KnowledgeArticleSummary,
  KnowledgeCategory,
  KnowledgeChunkMatch,
  KnowledgeEmbeddingChunk,
} from '../../../domain/ai/knowledge-base.types';
import { cosineSimilarity } from './embedding.service';

const ARTICLES_KEY = 'qbx_knowledge_articles_v1';
const CATEGORIES_KEY = 'qbx_knowledge_categories_v1';
const EMBEDDINGS_KEY = 'qbx_knowledge_embeddings_v1';

interface StoredArticle extends KnowledgeArticleDetail {
  categorySlug: string | null;
  categoryTitle: string | null;
}

interface StoredEmbedding {
  articleId: string;
  chunkContent: string;
  embedding: number[];
  chunkIndex: number;
}

const DEFAULT_CATEGORIES: KnowledgeCategory[] = [
  { id: 'cat-climate', slug: 'climate', title: 'Климат', description: 'VPD, температура, влажность' },
  { id: 'cat-nutrition', slug: 'nutrition', title: 'Питание', description: 'NPK, EC, pH' },
  { id: 'cat-lighting', slug: 'lighting', title: 'Освещение', description: 'DLI, PPFD' },
  { id: 'cat-defects', slug: 'defects', title: 'Дефекты', description: 'Симптомы стресса' },
  { id: 'cat-cultivars', slug: 'cultivars', title: 'Сорта', description: 'Профили культур' },
  { id: 'cat-hydro', slug: 'hydroponics', title: 'Гидропоника', description: 'Субстраты, полив' },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureCategories(): KnowledgeCategory[] {
  const existing = readJson<KnowledgeCategory[]>(CATEGORIES_KEY, []);
  if (existing.length === 0) {
    writeJson(CATEGORIES_KEY, DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return existing;
}

export function listLocalKnowledgeCategories(): KnowledgeCategory[] {
  return ensureCategories();
}

export function listLocalKnowledgeArticles(): KnowledgeArticleSummary[] {
  const articles = readJson<StoredArticle[]>(ARTICLES_KEY, []);
  const embeddings = readJson<StoredEmbedding[]>(EMBEDDINGS_KEY, []);
  return articles.map((a) => ({
    id: a.id,
    categoryId: a.categoryId,
    categorySlug: a.categorySlug,
    categoryTitle: a.categoryTitle,
    title: a.title,
    slug: a.slug,
    tags: a.tags,
    isPublished: a.isPublished,
    chunkCount: embeddings.filter((e) => e.articleId === a.id).length,
    updatedAt: a.updatedAt,
  }));
}

export function getLocalKnowledgeArticle(id: string): KnowledgeArticleDetail | null {
  const articles = readJson<StoredArticle[]>(ARTICLES_KEY, []);
  return articles.find((a) => a.id === id) ?? null;
}

export function upsertLocalKnowledgeArticle(input: {
  id?: string;
  categoryId: string | null;
  title: string;
  slug: string;
  contentMarkdown: string;
  tags: string[];
  isPublished: boolean;
}): string {
  const categories = ensureCategories();
  const articles = readJson<StoredArticle[]>(ARTICLES_KEY, []);
  const now = new Date().toISOString();
  const cat = categories.find((c) => c.id === input.categoryId);
  const id = input.id ?? `local-article-${Date.now()}`;

  const detail: StoredArticle = {
    id,
    categoryId: input.categoryId,
    categorySlug: cat?.slug ?? null,
    categoryTitle: cat?.title ?? null,
    title: input.title.trim(),
    slug: input.slug.trim().toLowerCase(),
    contentMarkdown: input.contentMarkdown,
    tags: input.tags,
    isPublished: input.isPublished,
    chunkCount: 0,
    createdAt: articles.find((a) => a.id === id)?.createdAt ?? now,
    updatedAt: now,
  };

  const next = articles.filter((a) => a.id !== id);
  next.unshift(detail);
  writeJson(ARTICLES_KEY, next);
  return id;
}

export function deleteLocalKnowledgeArticle(id: string): void {
  writeJson(
    ARTICLES_KEY,
    readJson<StoredArticle[]>(ARTICLES_KEY, []).filter((a) => a.id !== id),
  );
  writeJson(
    EMBEDDINGS_KEY,
    readJson<StoredEmbedding[]>(EMBEDDINGS_KEY, []).filter((e) => e.articleId !== id),
  );
}

export function replaceLocalKnowledgeEmbeddings(articleId: string, chunks: KnowledgeEmbeddingChunk[]): number {
  const rest = readJson<StoredEmbedding[]>(EMBEDDINGS_KEY, []).filter((e) => e.articleId !== articleId);
  const next = [
    ...rest,
    ...chunks.map((c) => ({
      articleId,
      chunkContent: c.content,
      embedding: c.embedding,
      chunkIndex: c.chunkIndex,
    })),
  ];
  writeJson(EMBEDDINGS_KEY, next);

  const articles = readJson<StoredArticle[]>(ARTICLES_KEY, []);
  writeJson(
    ARTICLES_KEY,
    articles.map((a) =>
      a.id === articleId ? { ...a, chunkCount: chunks.length, updatedAt: new Date().toISOString() } : a,
    ),
  );
  return chunks.length;
}

export function searchLocalKnowledgeChunks(
  query: string,
  matchCount: number,
  threshold: number,
): KnowledgeChunkMatch[] {
  const articles = readJson<StoredArticle[]>(ARTICLES_KEY, []);
  const embeddings = readJson<StoredEmbedding[]>(EMBEDDINGS_KEY, []);
  const q = query.toLowerCase();

  const keywordHits: KnowledgeChunkMatch[] = [];
  for (const article of articles.filter((a) => a.isPublished)) {
    if (article.title.toLowerCase().includes(q) || article.contentMarkdown.toLowerCase().includes(q)) {
      keywordHits.push({
        id: `kw-${article.id}`,
        articleId: article.id,
        articleTitle: article.title,
        articleSlug: article.slug,
        chunkContent: article.contentMarkdown.slice(0, 1200),
        similarity: 0.5,
      });
    }
  }

  if (embeddings.length === 0) {
    return keywordHits.slice(0, matchCount);
  }

  // Without live embedding in offline search, use keyword overlap on chunks
  const scored = embeddings
    .map((e) => {
      const article = articles.find((a) => a.id === e.articleId);
      if (!article?.isPublished) return null;
      const overlap = q.split(/\s+/).filter((w) => w.length > 2 && e.chunkContent.toLowerCase().includes(w)).length;
      const sim = overlap > 0 ? Math.min(0.95, 0.45 + overlap * 0.08) : cosineSimilarity([], e.embedding);
      return {
        id: `local-${e.articleId}-${e.chunkIndex}`,
        articleId: e.articleId,
        articleTitle: article.title,
        articleSlug: article.slug,
        chunkContent: e.chunkContent,
        similarity: sim,
      } satisfies KnowledgeChunkMatch;
    })
    .filter((x): x is KnowledgeChunkMatch => x != null && x.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

  const merged = [...scored, ...keywordHits];
  const seen = new Set<string>();
  const out: KnowledgeChunkMatch[] = [];
  for (const m of merged) {
    const key = `${m.articleId}:${m.chunkContent.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
    if (out.length >= matchCount) break;
  }
  return out;
}
