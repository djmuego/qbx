import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Save, Eye } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import { AccountCard } from '../account/AccountShell';
import {
  AI_PROVIDER_ORDER,
  AI_PROVIDERS,
  type AiProviderId,
} from '../../domain/ai/ai-provider.types';
import {
  DEFAULT_AGENT_QUICK_PROMPTS,
  type PlatformConsciousnessConfig,
} from '../../domain/ai/ai-admin-config.types';
import { buildPromptOverlay, parsePlatformConsciousness } from '../../application/ai/ai-config.resolver';
import { buildGrowAgentSystemPrompt } from '../../application/ai/prompts/grow-agent.system';

interface AdminConsciousnessPanelProps {
  loading: boolean;
  raw: Record<string, unknown> | null;
  saveBusy: boolean;
  onLoad: () => void;
  onSave: (config: PlatformConsciousnessConfig) => void;
}

export const AdminConsciousnessPanel: React.FC<AdminConsciousnessPanelProps> = ({
  loading,
  raw,
  saveBusy,
  onLoad,
  onSave,
}) => {
  const { t } = useLocale();
  const [form, setForm] = useState<PlatformConsciousnessConfig>({ schemaVersion: 1 });
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  useEffect(() => {
    onLoad();
  }, [onLoad]);

  useEffect(() => {
    if (raw) setForm(parsePlatformConsciousness(raw));
  }, [raw]);

  const update = (patch: Partial<PlatformConsciousnessConfig>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const promptPreview = useMemo(() => {
    const overlay = buildPromptOverlay(form, null);
    return buildGrowAgentSystemPrompt('[RAG knowledge context would appear here]', overlay);
  }, [form]);

  return (
    <AccountCard
      title={t('account.admin.consciousnessTitle', 'Сознание приложения')}
      description={t(
        'account.admin.consciousnessHint',
        'Глобальные промпты и политики QBX Agent для всех ферм. Не заменяет локальные настройки пользователя, но дополняет system prompt.',
      )}
    >
      {loading ? (
        <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
      ) : (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('account.admin.safetyPreamble', 'Блок безопасности (в начало промпта)')}
            <textarea
              value={form.safetyPreamble ?? ''}
              onChange={(e) => update({ safetyPreamble: e.target.value })}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono"
              placeholder="SAFETY: AI advisory only. Never claim hardware control..."
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('account.admin.defaultPersonality', 'Личность агента по умолчанию')}
            <textarea
              value={form.defaultPersonality ?? ''}
              onChange={(e) => update({ defaultPersonality: e.target.value })}
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono"
              placeholder="You are QBX Grow Agent..."
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('account.admin.globalSystemAppend', 'Глобальное дополнение к system prompt')}
            <textarea
              value={form.globalSystemAppend ?? ''}
              onChange={(e) => update({ globalSystemAppend: e.target.value })}
              rows={4}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-mono"
              placeholder="Product policy, brand voice, regional notes..."
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('account.admin.operatorNotes', 'Заметки оператора (только админка)')}
            <textarea
              value={form.operatorNotes ?? ''}
              onChange={(e) => update({ operatorNotes: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
            />
          </label>
          <button
            type="button"
            disabled={saveBusy}
            onClick={() => onSave(form)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saveBusy ? t('common.loading', 'Загрузка…') : t('account.saveName', 'Сохранить')}
          </button>
          <button
            type="button"
            onClick={() => setShowPromptPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-violet-300 text-violet-700 text-xs font-semibold ml-2"
          >
            <Eye className="w-3.5 h-3.5" />
            {t('account.admin.promptPreview', 'Preview system prompt')}
          </button>
          {showPromptPreview && (
            <pre className="mt-3 p-3 rounded-xl bg-slate-900 text-emerald-100 text-[10px] leading-relaxed overflow-x-auto max-h-64 whitespace-pre-wrap">
              {promptPreview}
            </pre>
          )}
        </div>
      )}
    </AccountCard>
  );
};

interface AdminWorkspaceAiPanelProps {
  workspaceId: string;
  workspaceName: string;
  config: import('../../domain/ai/ai-admin-config.types').WorkspaceAiAdminConfig;
  saveBusy: boolean;
  onChange: (config: import('../../domain/ai/ai-admin-config.types').WorkspaceAiAdminConfig) => void;
  onSave: () => void;
}

export const AdminWorkspaceAiPanel: React.FC<AdminWorkspaceAiPanelProps> = ({
  workspaceName,
  config,
  saveBusy,
  onChange,
  onSave,
}) => {
  const { t } = useLocale();
  const provider = config.provider ?? 'deepseek';
  const models = AI_PROVIDERS[provider].modelOptions;

  const update = (patch: Partial<typeof config>) => onChange({ ...config, ...patch });

  const quickText = (config.quickPrompts ?? DEFAULT_AGENT_QUICK_PROMPTS).join('\n');

  return (
    <div className="p-3 rounded-xl border border-violet-200/80 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-violet-600" />
        <p className="text-xs font-bold text-violet-800 dark:text-violet-200">
          {t('account.admin.workspaceAiTitle', 'AI Agent —')} {workspaceName}
        </p>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={config.managedByPlatform}
          onChange={(e) => update({ managedByPlatform: e.target.checked })}
        />
        {t('account.admin.managedByPlatform', 'Управляется платформой (помощь пользователю)')}
      </label>

      {config.managedByPlatform && (
        <>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-[11px] font-semibold text-slate-600">
              {t('settings.aiEnabled', 'AI включён')}
              <select
                value={config.enabled ? '1' : '0'}
                onChange={(e) => update({ enabled: e.target.value === '1' })}
                className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              >
                <option value="1">{t('common.yes', 'Да')}</option>
                <option value="0">{t('common.no', 'Нет')}</option>
              </select>
            </label>
            <label className="text-[11px] font-semibold text-slate-600">
              Provider
              <select
                value={provider}
                onChange={(e) =>
                  update({
                    provider: e.target.value as AiProviderId,
                    model: AI_PROVIDERS[e.target.value as AiProviderId].defaultModel,
                  })
                }
                className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              >
                {AI_PROVIDER_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {AI_PROVIDERS[id].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-semibold text-slate-600 sm:col-span-2">
              Model
              <select
                value={config.model ?? AI_PROVIDERS[provider].defaultModel}
                onChange={(e) => update({ model: e.target.value })}
                className="mt-1 w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-[11px] font-semibold text-slate-600">
            {t('account.admin.personalityPrompt', 'Личность агента для этой фермы')}
            <textarea
              value={config.personalityPrompt ?? ''}
              onChange={(e) => update({ personalityPrompt: e.target.value })}
              rows={3}
              className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-mono"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            {t('account.admin.systemPromptAppend', 'Дополнение к system prompt')}
            <textarea
              value={config.systemPromptAppend ?? ''}
              onChange={(e) => update({ systemPromptAppend: e.target.value })}
              rows={3}
              className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px] font-mono"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            {t('account.admin.quickPrompts', 'Быстрые подсказки (по одной на строку)')}
            <textarea
              value={quickText}
              onChange={(e) =>
                update({
                  quickPrompts: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                })
              }
              rows={4}
              className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-600">
            {t('account.admin.adminNotes', 'Заметки поддержки')}
            <textarea
              value={config.adminNotes ?? ''}
              onChange={(e) => update({ adminNotes: e.target.value })}
              rows={2}
              className="mt-1 w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[11px]"
            />
          </label>

          <div className="flex flex-wrap gap-3 text-[11px]">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.localExpertFirst ?? true}
                onChange={(e) => update({ localExpertFirst: e.target.checked })}
              />
              Local expert first
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={config.useGatewayForChat ?? false}
                onChange={(e) => update({ useGatewayForChat: e.target.checked })}
              />
              Gateway for chat
            </label>
          </div>
        </>
      )}

      <button
        type="button"
        disabled={saveBusy}
        onClick={onSave}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-[11px] font-semibold disabled:opacity-50"
      >
        <Save className="w-3.5 h-3.5" />
        {saveBusy ? t('common.loading', 'Загрузка…') : t('account.admin.saveWorkspaceAi', 'Сохранить AI настройки')}
      </button>
    </div>
  );
};
