import React from 'react';
import { useLocale } from '../../i18n/LocaleContext';
import { AuthLayout } from './AuthLayout';

export const AuthSetupPage: React.FC = () => {
  const { t } = useLocale();
  const isSim = import.meta.env.VITE_QBX_RUNTIME_MODE === 'simulator';

  return (
    <AuthLayout title={t('auth.setupTitle', 'Настройка')} subtitle={t('auth.setupHint', '')}>
      {isSim && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
          {t(
            'auth.setupSimWarning',
            'Сейчас запущен симулятор (npm run dev:sim). Для входа и регистрации остановите его и запустите npm run dev.',
          )}
        </div>
      )}
      <ol className="text-xs text-slate-600 dark:text-zinc-300 space-y-2 mb-4 list-decimal list-inside">
        <li>{t('auth.setupStep1', 'Создайте проект на supabase.com')}</li>
        <li>{t('auth.setupStep2', 'Выполните миграции из supabase/migrations/')}</li>
        <li>{t('auth.setupStep3', 'Вставьте ключи в файл .env в корне проекта')}</li>
        <li>{t('auth.setupStep4', 'Перезапустите npm run dev')}</li>
      </ol>
      <pre className="text-[11px] p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 overflow-x-auto text-slate-700 dark:text-zinc-300">
{`VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_QBX_REQUIRE_AUTH=true
VITE_QBX_DATA_BACKEND=supabase`}
      </pre>
      <p className="text-xs text-slate-500 mt-4">{t('auth.setupDoc', '')}</p>
    </AuthLayout>
  );
};
