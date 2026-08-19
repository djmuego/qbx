import React, { useMemo, useState } from 'react';
import { BookOpen, Plus, RefreshCw, Save, Search, Trash2, Zap } from 'lucide-react';
import { AccountCard } from '../account/AccountShell';
import { useLocale } from '../../i18n/LocaleContext';
import { useKnowledgeAdmin } from './useKnowledgeAdmin';
import { renderMarkdownPreview } from './markdown-preview';
import type { KnowledgeArticleDetail } from '../../domain/ai/knowledge-base.types';

interface AdminKnowledgePanelProps {
  localMode: boolean;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64);
}

export const AdminKnowledgePanel: React.FC<AdminKnowledgePanelProps> = ({ localMode }) => {
  const { t } = useLocale();
  const kb = useKnowledgeAdmin(localMode);
  const [tagsInput, setTagsInput] = useState('');
  const [categoryDraft, setCategoryDraft] = useState({ slug: '', title: '', description: '' });

  const previewHtml = useMemo(
    () => (kb.editing ? renderMarkdownPreview(kb.editing.contentMarkdown) : ''),
    [kb.editing?.contentMarkdown],
  );

  const updateDraft = (patch: Partial<KnowledgeArticleDetail>) => {
    if (!kb.editing) return;
    kb.setEditing({ ...kb.editing, ...patch });
  };

  return (
    <div className="space-y-4">
      {kb.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {[
            { label: t('account.admin.kbArticles', 'Статьи'), value: kb.stats.articleCount },
            { label: t('account.admin.kbPublished', 'Опублик.'), value: kb.stats.publishedCount },
            { label: t('account.admin.kbChunks', 'Чанки'), value: kb.stats.chunkCount },
            { label: t('account.admin.kbCategories', 'Категории'), value: kb.stats.categoryCount },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900">
              <p className="text-[10px] uppercase tracking-wider text-violet-500">{item.label}</p>
              <p className="text-lg font-bold text-violet-900 dark:text-violet-100">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      <AccountCard
        title={t('account.admin.knowledgeRetrievalTest', 'Тест RAG retrieval')}
        description={t('account.admin.knowledgeRetrievalHint', 'Проверка гибридного поиска без вызова LLM.')}
      >
        <div className="flex gap-2 mb-2">
          <input
            value={kb.retrievalQuery}
            onChange={(e) => kb.setRetrievalQuery(e.target.value)}
            placeholder={t('account.admin.knowledgeRetrievalQuery', 'Запрос агронома…')}
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
          />
          <button
            type="button"
            disabled={kb.retrievalBusy}
            onClick={() => void kb.testRetrieval()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5" />
            {t('account.admin.knowledgeTest', 'Тест')}
          </button>
          <button
            type="button"
            disabled={kb.indexBusy || kb.articles.length === 0}
            onClick={() => void kb.reindexAll()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-300 text-violet-700 text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${kb.indexBusy ? 'animate-spin' : ''}`} />
            {t('account.admin.knowledgeReindexAll', 'Re-index all')}
          </button>
        </div>
        {kb.retrievalResults.length > 0 && (
          <ul className="space-y-1.5 max-h-40 overflow-y-auto">
            {kb.retrievalResults.map((match, i) => (
              <li key={`${match.articleId}-${i}`} className="p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/50 text-[11px]">
                <span className="font-semibold text-violet-700">{match.similarity.toFixed(3)}</span>
                {' · '}
                {match.articleTitle}
                <p className="text-slate-500 line-clamp-2 mt-0.5">{match.chunkContent}</p>
              </li>
            ))}
          </ul>
        )}
      </AccountCard>

      {!localMode && (
        <AccountCard title={t('account.admin.knowledgeCategories', 'Категории')} description="">
          <div className="grid sm:grid-cols-3 gap-2 mb-2">
            <input
              value={categoryDraft.slug}
              onChange={(e) => setCategoryDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="slug"
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
            />
            <input
              value={categoryDraft.title}
              onChange={(e) => setCategoryDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={t('account.admin.knowledgeFieldTitle', 'Название')}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700"
            />
            <button
              type="button"
              disabled={!categoryDraft.slug.trim() || !categoryDraft.title.trim()}
              onClick={() => {
                void kb.saveCategory(categoryDraft);
                setCategoryDraft({ slug: '', title: '', description: '' });
              }}
              className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              {t('account.admin.knowledgeAddCategory', 'Добавить')}
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {kb.categories.map((c) => (
              <li key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px]">
                {c.title}
                <button type="button" onClick={() => void kb.removeCategory(c.id)} className="text-rose-600">
                  ×
                </button>
              </li>
            ))}
          </ul>
        </AccountCard>
      )}

      <AccountCard
        title={t('account.admin.knowledgeTitle', 'База знаний AI-агронома')}
        description={t(
          'account.admin.knowledgeHint',
          'Markdown-статьи по агрономии. После сохранения нажмите Re-index для векторизации (pgvector RAG).',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={kb.search}
              onChange={(e) => kb.setSearch(e.target.value)}
              placeholder={t('account.admin.knowledgeSearch', 'Поиск статей…')}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
          </div>
          <select
            value={kb.categoryFilter}
            onChange={(e) => kb.setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
          >
            <option value="all">{t('account.admin.knowledgeAllCategories', 'Все категории')}</option>
            {kb.categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => kb.openNew()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('account.admin.knowledgeNew', 'Статья')}
          </button>
        </div>

        {kb.loading ? (
          <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
        ) : kb.articles.length === 0 ? (
          <p className="text-xs text-slate-500">{t('account.admin.knowledgeEmpty', 'Статей пока нет')}</p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {kb.articles.map((article) => (
              <li
                key={article.id}
                className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                  kb.editing?.id === article.id
                    ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 hover:border-emerald-300'
                }`}
                onClick={() => void kb.openArticle(article.id)}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-zinc-200 truncate">{article.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {article.categoryTitle ?? '—'} · {article.slug} · {article.chunkCount} chunks
                    {!article.isPublished && ' · draft'}
                  </p>
                </div>
                <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
              </li>
            ))}
          </ul>
        )}
      </AccountCard>

      {kb.editing && (
        <AccountCard
          title={kb.editing.id ? t('account.admin.knowledgeEdit', 'Редактор статьи') : t('account.admin.knowledgeCreate', 'Новая статья')}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-2">
              <input
                value={kb.editing.title}
                onChange={(e) => {
                  const title = e.target.value;
                  updateDraft({
                    title,
                    slug: kb.editing?.slug ? kb.editing.slug : slugify(title),
                  });
                }}
                placeholder={t('account.admin.knowledgeFieldTitle', 'Название')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={kb.editing.slug}
                  onChange={(e) => updateDraft({ slug: slugify(e.target.value) })}
                  placeholder="slug"
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
                <select
                  value={kb.editing.categoryId ?? ''}
                  onChange={(e) => {
                    const cat = kb.categories.find((c) => c.id === e.target.value);
                    updateDraft({
                      categoryId: cat?.id ?? null,
                      categorySlug: cat?.slug ?? null,
                      categoryTitle: cat?.title ?? null,
                    });
                  }}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                >
                  <option value="">{t('account.admin.knowledgeNoCategory', 'Без категории')}</option>
                  {kb.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <input
                value={tagsInput || kb.editing.tags.join(', ')}
                onChange={(e) => {
                  setTagsInput(e.target.value);
                  updateDraft({
                    tags: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  });
                }}
                placeholder={t('account.admin.knowledgeTags', 'Теги через запятую')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
              />
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                <input
                  type="checkbox"
                  checked={kb.editing.isPublished}
                  onChange={(e) => updateDraft({ isPublished: e.target.checked })}
                />
                {t('account.admin.knowledgePublished', 'Опубликовано')}
              </label>
              <textarea
                value={kb.editing.contentMarkdown}
                onChange={(e) => updateDraft({ contentMarkdown: e.target.value })}
                rows={16}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                spellCheck={false}
              />
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 overflow-y-auto max-h-[520px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('account.admin.knowledgePreview', 'Предпросмотр')}
              </p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-xs text-slate-700 dark:text-zinc-300"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <button
              type="button"
              disabled={kb.saveBusy}
              onClick={() => void kb.saveArticle(kb.editing!)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {t('common.save', 'Сохранить')}
            </button>
            <button
              type="button"
              disabled={kb.indexBusy}
              onClick={() => void kb.reindexArticle(kb.editing!)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${kb.indexBusy ? 'animate-spin' : ''}`} />
              {t('account.admin.knowledgeReindex', 'Re-index & Embed')}
            </button>
            {kb.editing.id && (
              <button
                type="button"
                onClick={() => void kb.removeArticle(kb.editing!.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('common.delete', 'Удалить')}
              </button>
            )}
          </div>
        </AccountCard>
      )}

      {kb.error && (
        <p className="text-xs text-rose-600 dark:text-rose-400">{kb.error}</p>
      )}
      {kb.success && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{kb.success}</p>
      )}
    </div>
  );
};
