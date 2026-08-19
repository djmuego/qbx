import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { Home, Zap, Layers, Settings, Map, User } from './Icons';
import { NavigationTab } from '../../types';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, openAccount } = useApp();
  const { t } = useLocale();

  const tabs: { key: NavigationTab; labelKey: string; fallback: string; icon: React.ReactNode }[] = [
    { key: 'home', labelKey: 'nav.home', fallback: 'Главная', icon: <Home className="w-5 h-5" /> },
    { key: 'automations', labelKey: 'nav.automations', fallback: 'Автоматизации', icon: <Zap className="w-5 h-5" /> },
    { key: 'devices', labelKey: 'nav.devices', fallback: 'Устройства', icon: <Layers className="w-5 h-5" /> },
    { key: 'map', labelKey: 'nav.map', fallback: 'Карта', icon: <Map className="w-5 h-5" /> },
    { key: 'account', labelKey: 'nav.account', fallback: 'Кабинет', icon: <User className="w-5 h-5" /> },
    { key: 'settings', labelKey: 'nav.settings', fallback: 'Настройки', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border-t border-zinc-200/80 dark:border-zinc-800/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)] transition-colors">
      <nav className="grid grid-cols-6 h-16 max-w-lg mx-auto px-0.5">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => (tab.key === 'account' ? openAccount() : setCurrentTab(tab.key))}
              className={`flex flex-col items-center justify-center gap-1 transition-all relative ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] leading-tight tracking-tight">{t(tab.labelKey, tab.fallback)}</span>
              {isActive && <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
