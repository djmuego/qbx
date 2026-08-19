import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Check,
  Leaf,
  X,
  AlertTriangle,
  Sparkles,
} from '../common/Icons';
import { AI_PROVIDERS, AI_CUSTOM_MODEL_ID, AI_PROVIDER_ORDER, type AiProviderId } from '../../domain/ai/ai-provider.types';
import {
  applyProviderChange,
  getModelDisplayLabel,
  getModelOptionsForProvider,
  settingsUseCustomModel,
} from '../../application/ai/ai-settings.store';
import { testAiConnection, AiClientError } from '../../application/ai/ai-client';
import { useLocale } from '../../i18n/LocaleContext';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../../i18n/types';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { SpacesManagerPanel } from '../spaces/SpacesManagerPanel';
import { CreateSpaceModal } from '../modals/CreateSpaceModal';

export const SettingsView: React.FC = () => {
  const {
    theme,
    setTheme,
    tempUnit,
    setTempUnit,
    exportDataJson,
    importDataJson,
    resetToDefault,
    aiSettings,
    updateAiSettings,
    isReadOnly,
  } = useApp();
  const { locale, setLocale, t, tv } = useLocale();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const changeLocale = (next: Locale) => {
    setLocale(next);
    if (supabase && user) {
      void supabase.from('profiles').update({ locale: next }).eq('id', user.id);
    }
  };

  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aiTesting, setAiTesting] = useState(false);

  const handleExport = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qbx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      const success = importDataJson(text);
      if (success) {
        setImportMessage({ text: t('settings.importSuccess', 'Восстановлено'), type: 'success' });
        setTimeout(() => setImportMessage(null), 3500);
      } else {
        setImportMessage({ text: t('settings.importError', 'Ошибка формата'), type: 'error' });
        setTimeout(() => setImportMessage(null), 3500);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const confirmReset = () => {
    resetToDefault();
    setIsResetConfirmOpen(false);
    setImportMessage({ text: t('settings.resetSuccess', 'Сброшено'), type: 'success' });
    setTimeout(() => setImportMessage(null), 3000);
  };

  const providerInfo = AI_PROVIDERS[aiSettings.provider];
  const modelOptions = getModelOptionsForProvider(aiSettings.provider);
  const selectedModelOption = modelOptions.find((m) => m.id === aiSettings.model);
  const modelSelectValue = settingsUseCustomModel(aiSettings) ? AI_CUSTOM_MODEL_ID : aiSettings.model;

  const handleAiTest = async () => {
    setAiTesting(true);
    setAiTestStatus(null);
    try {
      const result = await testAiConnection(aiSettings);
      setAiTestStatus({
        type: 'success',
        text: tv('settings.aiTestSuccess', {
          provider: AI_PROVIDERS[result.provider as AiProviderId]?.label ?? result.provider,
          model: result.model,
        }, ''),
      });
    } catch (err) {
      const message =
        err instanceof AiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : t('settings.aiTestError', 'Не удалось проверить');
      setAiTestStatus({ type: 'error', text: message });
    } finally {
      setAiTesting(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200/80 dark:border-zinc-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('settings.title', 'Настройки')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          {t('settings.subtitle', '')}
        </p>
      </div>

      {importMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border animate-in fade-in ${
            importMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 border-rose-200 dark:border-rose-800'
          }`}
        >
          {importMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{importMessage.text}</span>
        </div>
      )}

      {/* 2-Column Responsive Bento Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
        {/* COLUMN 1: Spaces & App Preferences */}
        <div className="space-y-4 sm:space-y-5">
          {/* 1. ПРОСТРАНСТВА */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs">
            <SpacesManagerPanel onCreateRequest={() => setIsCreateSpaceOpen(true)} />
          </section>

          {/* 2. ИНТЕРФЕЙС */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Интерфейс
            </h2>

            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {t('settings.language', 'Язык')}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {t('settings.languageHint', 'Русский — основной язык разработки QBX')}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-xs shrink-0">
                {SUPPORTED_LOCALES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => changeLocale(code)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                      locale === code
                        ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    {LOCALE_LABELS[code]}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Тема оформления
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Светлая, тёмная или системная
                </div>
              </div>

              <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-xs shrink-0">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    theme === 'light'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Светлая
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    theme === 'dark'
                      ? 'bg-zinc-700 text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Тёмная
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    theme === 'system'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-zinc-400'
                  }`}
                >
                  Авто
                </button>
              </div>
            </div>

            {/* Temperature Unit */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Шкала температуры
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Цельсии или Фаренгейты
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700 text-xs shrink-0">
                <button
                  onClick={() => setTempUnit('C')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    tempUnit === 'C'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => setTempUnit('F')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all ${
                    tempUnit === 'F'
                      ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-500 dark:text-zinc-400'
                  }`}
                >
                  °F
                </button>
              </div>
            </div>
          </section>

          {/* AI ADVISOR */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  QBX Agent (AI)
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Мониторинг пространства и диалог с AI-помощником
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Включить AI-помощник
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Рекомендации по фазе и микроклимату
                </div>
              </div>
              <button
                type="button"
                onClick={() => updateAiSettings({ enabled: !aiSettings.enabled })}
                className={`w-10 h-6 rounded-full transition-colors relative p-0.5 shrink-0 focus:outline-none ${
                  aiSettings.enabled ? 'bg-violet-600' : 'bg-slate-300 dark:bg-zinc-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                    aiSettings.enabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-zinc-800">
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Провайдер</label>
              <select
                value={aiSettings.provider}
                onChange={(e) => {
                  const provider = e.target.value as AiProviderId;
                  updateAiSettings(applyProviderChange(provider));
                  setAiTestStatus(null);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
              >
                {AI_PROVIDER_ORDER.map((id) => (
                  <option key={id} value={id}>
                    {AI_PROVIDERS[id].label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
                {providerInfo.description}
                {providerInfo.docsUrl && (
                  <>
                    {' '}
                    <a
                      href={providerInfo.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Получить ключ →
                    </a>
                  </>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">Модель</label>
              <select
                value={modelSelectValue}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === AI_CUSTOM_MODEL_ID) {
                    updateAiSettings({ model: aiSettings.model || '' });
                  } else {
                    updateAiSettings({ model: value });
                  }
                  setAiTestStatus(null);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl"
              >
                {modelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.recommended ? `★ ${model.label}` : model.label}
                  </option>
                ))}
                <option value={AI_CUSTOM_MODEL_ID}>Своя модель (ID вручную)…</option>
              </select>

              {(modelSelectValue === AI_CUSTOM_MODEL_ID || settingsUseCustomModel(aiSettings)) && (
                <input
                  type="text"
                  value={aiSettings.model}
                  onChange={(e) => {
                    updateAiSettings({ model: e.target.value.trim() });
                    setAiTestStatus(null);
                  }}
                  placeholder={
                    aiSettings.provider === 'openrouter'
                      ? 'например deepseek/deepseek-chat'
                      : 'например deepseek-chat'
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl font-mono"
                />
              )}

              <div className="rounded-xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/50 px-3 py-2.5">
                <div className="text-[11px] font-bold text-violet-800 dark:text-violet-200">
                  {getModelDisplayLabel(aiSettings.provider, aiSettings.model)}
                </div>
                <div className="text-[10px] text-violet-700/80 dark:text-violet-300/80 mt-0.5 leading-relaxed">
                  {selectedModelOption?.description ??
                    'Пользовательский ID модели. Убедитесь, что провайдер его поддерживает.'}
                </div>
                <div className="text-[10px] font-mono text-violet-600/70 dark:text-violet-400/70 mt-1">
                  {aiSettings.model || '—'}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 px-3 py-2.5">
              <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">API-ключ</div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                Ключ задаётся только через переменную окружения{' '}
                <span className="font-mono">{providerInfo.envKey}</span> в <span className="font-mono">.env</span>.
                QBX не хранит ключи в браузере и не выводит их в UI.
              </p>
            </div>

            <div className="pt-1 space-y-2">
              <button
                type="button"
                onClick={() => void handleAiTest()}
                disabled={!aiSettings.enabled || aiTesting || !aiSettings.model.trim()}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition-colors"
              >
                {aiTesting ? 'Проверка подключения…' : 'Проверить подключение'}
              </button>
              {aiTestStatus && (
                <div
                  className={`p-3 rounded-xl text-[11px] font-medium border ${
                    aiTestStatus.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {aiTestStatus.text}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* COLUMN 2: Data Management & System Info */}
        <div className="space-y-4 sm:space-y-5">
          {/* 3. РЕЗЕРВНАЯ КОПИЯ */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3.5 shadow-xs">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Резервная копия конфигурации
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Сохранение и восстановление настроек пространств, устройств и правил
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={handleExport}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left transition-all flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Создать резервную копию</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Сохранить файл</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-left transition-all flex items-center justify-between text-xs font-bold text-slate-800 dark:text-zinc-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Восстановить из копии</div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Загрузить файл</div>
                  </div>
                </div>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />
            </div>

            {/* Reset Settings */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Сброс конфигурации
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Вернуть систему к начальному состоянию
                </div>
              </div>

              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="px-3 py-1.5 rounded-xl border border-rose-200/80 dark:border-rose-900/60 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                Сбросить настройки
              </button>
            </div>
          </section>

          {/* 4. О СИСТЕМЕ QBX */}
          <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm tracking-tight shadow-2xs">
                  Q
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    QBX
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Quantum BotaniX
                  </div>
                </div>
              </div>

              <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500">
                Smart Growing Ecosystem
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
              Модульная экосистема умных контроллеров, силовых блоков и сенсоров для автоматизации микроклимата, освещения и полива растений.
            </p>

            <div className="pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-zinc-400">
              <span className="text-emerald-600 dark:text-emerald-400">Plug. Assign. Automate. Grow.</span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">QBX v1</span>
            </div>
          </section>
        </div>
      </div>

      {/* Clean Confirmation Dialog for Reset */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 p-5 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Сбросить настройки?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Все добавленные устройства, пространства и сценарии автоматизации будут возвращены к исходным параметрам.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      )}
      <CreateSpaceModal isOpen={isCreateSpaceOpen} onClose={() => setIsCreateSpaceOpen(false)} />
    </div>
  );
};
