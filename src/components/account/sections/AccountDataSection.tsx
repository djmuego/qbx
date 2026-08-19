import React from 'react';
import { Download } from '../../common/Icons';
import { useApp } from '../../../context/AppContext';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import type { AccountActions } from '../useAccountActions';

export const AccountDataSection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t } = useLocale();
  const { exportDataJson } = useApp();
  const { cloudReady, localAuthEnabled, busy, imported, importMsg, runImport, dataLayer } = actions;

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

  return (
    <>
      <AccountCard title={t('account.data.mode', 'Режим данных')} description={t('account.data.modeHint', '')}>
        <p className="text-sm font-semibold">
          {cloudReady
            ? t('account.data.storageCloud', 'Облако Supabase')
            : t('account.data.storageLocal', 'Локально в браузере')}
        </p>
        <p className="text-xs text-slate-500">
          {localAuthEnabled
            ? t('account.data.localNote', 'Данные workspace хранятся в localStorage этого браузера.')
            : t('account.data.cloudNote', 'Данные синхронизируются с Postgres по workspace_id.')}
        </p>
      </AccountCard>

      <AccountCard title={t('account.data.export', 'Экспорт')} description={t('account.data.exportHint', '')}>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          {t('account.data.exportBtn', 'Скачать JSON')}
        </button>
      </AccountCard>

      {cloudReady && (
        <AccountCard title={t('account.importTitle', 'Импорт')} description={t('account.importHint', '')}>
          {!imported ? (
            <button
              type="button"
              disabled={busy || !dataLayer}
              onClick={() => void runImport()}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              {t('account.importBtn', 'Импорт')}
            </button>
          ) : (
            <p className="text-xs text-slate-500">{t('account.imported', '')}</p>
          )}
          {importMsg && <p className="text-xs text-emerald-700 dark:text-emerald-300">{importMsg}</p>}
        </AccountCard>
      )}
    </>
  );
};
