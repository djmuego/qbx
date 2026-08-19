import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ChevronDown,
  Plus,
  Moon,
  SunMedium,
  Check,
  ShieldAlert,
  ShieldCheck,
  MoreVertical,
  Layers,
  Sparkles,
  Bot,
} from './Icons';
import { NavigationTab } from '../../types';
import { CreateSpaceModal } from '../modals/CreateSpaceModal';
import { SpacesManagerModal } from '../spaces/SpacesManagerModal';
import { isSimulatorMode } from '../../config/runtime-mode';
import { useLocale } from '../../i18n/LocaleContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale } from '../../i18n/types';
import { getSupabaseClient } from '../../infrastructure/supabase/client';

export const Header: React.FC = () => {
  const {
    currentTab,
    setCurrentTab,
    openPlatformAdmin,
    spaces,
    currentSpaceId,
    setCurrentSpaceId,
    currentSpace,
    addSpace,
    theme,
    setTheme,
    setIsAddDeviceOpen,
    setIsEmergencyModalOpen,
    setIsSpaceAdvisorOpen,
    setIsAgentOpen,
    isReadOnly,
  } = useApp();
  const { t, locale, setLocale } = useLocale();
  const { user, updateLocale, isPlatformAdmin } = useAuth();
  const { canAddSpace, isFeatureAvailable, requestUpgrade } = useSubscription();
  const supabase = getSupabaseClient();

  const changeLocale = (next: Locale) => {
    setLocale(next);
    void updateLocale(next);
    if (supabase && user) {
      void supabase.from('profiles').update({ locale: next }).eq('id', user.id);
    }
  };

  const [isSpaceMenuOpen, setIsSpaceMenuOpen] = useState(false);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isSpacesManagerOpen, setIsSpacesManagerOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  const spaceMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(e.target as Node)) {
        setIsSpaceMenuOpen(false);
        setIsCreatingSpace(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    if (!canAddSpace(spaces.length)) {
      requestUpgrade('UNLIMITED_SPACES');
      return;
    }
    addSpace(newSpaceName);
    setNewSpaceName('');
    setIsCreatingSpace(false);
    setIsSpaceMenuOpen(false);
  };

  const navItems: { key: NavigationTab; labelKey: string; fallback: string }[] = [
    { key: 'home', labelKey: 'nav.home', fallback: 'Главная' },
    { key: 'automations', labelKey: 'nav.automations', fallback: 'Автоматизации' },
    { key: 'devices', labelKey: 'nav.devices', fallback: 'Устройства' },
    { key: 'map', labelKey: 'nav.map', fallback: 'Карта' },
    { key: 'account', labelKey: 'nav.account', fallback: 'Кабинет' },
    { key: 'settings', labelKey: 'nav.settings', fallback: 'Настройки' },
  ];

  return (
    <>
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#09090b]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Space Selector */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Logo */}
          <button
            onClick={() => setCurrentTab('home')}
            className="flex flex-col items-start text-left group focus:outline-none"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                QBX
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {isSimulatorMode() && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200">
                  SIM
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-zinc-500 -mt-1 uppercase">
              Quantum BotaniX
            </span>
          </button>

          <div className="h-6 w-px bg-slate-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Space Selector Dropdown */}
          <div className="relative" ref={spaceMenuRef}>
            <button
              onClick={() => setIsSpaceMenuOpen(!isSpaceMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-slate-100/90 hover:bg-slate-200/80 dark:bg-zinc-800/90 dark:hover:bg-zinc-700/80 text-slate-800 dark:text-zinc-200 transition-all border border-slate-200/80 dark:border-zinc-700/70 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="max-w-[120px] sm:max-w-[170px] truncate">{currentSpace?.name || t('header.space', 'Пространство')}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isSpaceMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 overflow-hidden">
                <div className="px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {t('header.spaces', 'Пространства')}
                </div>

                <div className="max-h-48 overflow-y-auto">
                  {spaces.map(space => {
                    const isSelected = space.id === currentSpaceId;
                    return (
                      <button
                        key={space.id}
                        onClick={() => {
                          setCurrentSpaceId(space.id);
                          setIsSpaceMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm text-left text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-medium"
                      >
                        <span className="truncate">{space.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-100 dark:border-zinc-800 mt-1 pt-1">
                  {isCreatingSpace ? (
                    <form onSubmit={handleCreateSpaceSubmit} className="p-2.5">
                      <input
                        type="text"
                        placeholder={t('header.spaceNamePlaceholder', 'Название пространства')}
                        value={newSpaceName}
                        onChange={e => setNewSpaceName(e.target.value)}
                        autoFocus
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex justify-end gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingSpace(false)}
                          className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-md font-medium"
                        >
                          {t('common.cancel', 'Отмена')}
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md"
                        >
                          {t('common.add', 'Добавить')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setIsSpaceMenuOpen(false);
                          setIsSpacesManagerOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        {t('spaces.manage', 'Управление пространствами')}
                      </button>
                      <button
                        onClick={() => {
                          setIsSpaceMenuOpen(false);
                          if (!canAddSpace(spaces.length)) {
                            requestUpgrade('UNLIMITED_SPACES');
                            return;
                          }
                          setIsCreateSpaceModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {t('header.createSpace', 'Создать пространство')}
                      </button>
                      <button
                        onClick={() => {
                          setIsSpaceMenuOpen(false);
                          if (!isFeatureAvailable('AI_GROW_ADVISOR')) {
                            requestUpgrade('AI_GROW_ADVISOR');
                            return;
                          }
                          setIsSpaceAdvisorOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('header.createWithAi', 'Создать с AI')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100/80 dark:bg-zinc-900/80 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 shrink-0">
          {navItems.map(item => {
            const isActive = currentTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentTab(item.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
                }`}
              >
                {t(item.labelKey, item.fallback)}
              </button>
            );
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* QBX Agent */}
          <button
            onClick={() => {
              if (!isFeatureAvailable('AI_GROW_ADVISOR')) {
                requestUpgrade('AI_GROW_ADVISOR');
                return;
              }
              setIsAgentOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 active:scale-98 text-white shadow-2xs transition-all"
            title="QBX Agent"
          >
            <Bot className="w-4 h-4" />
            Agent
          </button>

          {isPlatformAdmin && (
            <button
              type="button"
              onClick={() => openPlatformAdmin()}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-900/60 hover:bg-sky-100 dark:hover:bg-sky-950/60 transition-colors"
              title={t('header.platformAdmin', 'Админка платформы')}
            >
              <ShieldCheck className="w-4 h-4" />
              {t('header.platformAdminShort', 'Админка')}
            </button>
          )}

          {/* Add Device Button */}
          {!isReadOnly && (
          <button
            onClick={() => setIsAddDeviceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-2xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('header.addDevice', 'Добавить устройство')}</span>
            <span className="sm:hidden">{t('header.addDeviceShort', 'Устройство')}</span>
          </button>
          )}

          {/* More actions menu */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label={t('header.options', 'Опции')}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-800 py-1.5 z-50 animate-in fade-in duration-150 overflow-hidden">
                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    {t('header.language', 'Язык')}
                  </p>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                    {SUPPORTED_LOCALES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => changeLocale(code)}
                        className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          locale === code
                            ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                            : 'text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {LOCALE_LABELS[code]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="px-3.5 py-2 border-b border-slate-100 dark:border-zinc-800">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                    {t('header.theme', 'Тема')}
                  </p>
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        theme === 'light'
                          ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <SunMedium className="w-3.5 h-3.5" />
                      {t('header.themeLightShort', 'Светлая')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        theme === 'dark'
                          ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                          : 'text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      {t('header.themeDarkShort', 'Тёмная')}
                    </button>
                  </div>
                </div>

                {isPlatformAdmin && (
                  <button
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      openPlatformAdmin();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors border-b border-slate-100 dark:border-zinc-800"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {t('header.platformAdmin', 'Админка платформы')}
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    setIsEmergencyModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" />
                  {t('header.emergencyOff', 'Выключить всё оборудование')}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>

    <CreateSpaceModal isOpen={isCreateSpaceModalOpen} onClose={() => setIsCreateSpaceModalOpen(false)} />
    <SpacesManagerModal isOpen={isSpacesManagerOpen} onClose={() => setIsSpacesManagerOpen(false)} />
    </>
  );
};
