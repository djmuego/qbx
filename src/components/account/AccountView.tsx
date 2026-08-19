import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { AccountAlerts } from './AccountShell';
import { useAccountActions } from './useAccountActions';
import type { AccountSectionId } from '../../domain/account/account-sections';
import { AccountOverviewSection } from './sections/AccountOverviewSection';
import { AccountWorkspaceSection } from './sections/AccountWorkspaceSection';
import { AccountTeamSection } from './sections/AccountTeamSection';
import { AccountDataSection } from './sections/AccountDataSection';
import { AccountDangerSection } from './sections/AccountDangerSection';
import { AccountBillingSection } from './sections/AccountBillingSection';
import { AccountIntegrationsSection } from './sections/AccountIntegrationsSection';
import { AccountShell } from './AccountShell';

interface AccountViewProps {
  dataLayer: import('../../data/adapters/local-demo.repository').LocalDemoDataLayerInstance | null;
  onDataReload?: () => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ dataLayer, onDataReload }) => {
  const { user, localAuthEnabled, supabaseEnabled } = useAuth();
  const { accountSection, setAccountSection } = useApp();
  const { t } = useLocale();
  const actions = useAccountActions({ dataLayer, onDataReload });

  if (!user) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-zinc-700 p-8 text-center">
        <h2 className="text-lg font-bold">{t('account.offlineTitle', 'Офлайн')}</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{t('account.offlineHint', '')}</p>
      </div>
    );
  }

  const subtitle = localAuthEnabled && !supabaseEnabled
    ? t('account.localSubtitle', 'Локальный аккаунт')
    : t('account.subtitle', '');

  const storageBadge = supabaseEnabled
    ? t('account.data.storageCloud', 'Облако')
    : t('account.data.storageLocal', 'Локально');

  const renderSection = () => {
    switch (accountSection) {
      case 'overview':
        return <AccountOverviewSection actions={actions} onNavigate={setAccountSection} />;
      case 'billing':
        return <AccountBillingSection />;
      case 'integrations':
        return <AccountIntegrationsSection />;
      case 'workspace':
        return <AccountWorkspaceSection actions={actions} />;
      case 'team':
        return <AccountTeamSection actions={actions} />;
      case 'data':
        return <AccountDataSection actions={actions} />;
      case 'danger':
        return <AccountDangerSection actions={actions} />;
      default:
        return null;
    }
  };

  return (
    <AccountShell
      section={accountSection}
      onSectionChange={(id: AccountSectionId) => setAccountSection(id)}
      subtitle={subtitle}
      storageBadge={storageBadge}
    >
      <AccountAlerts error={actions.errorMsg} success={actions.successMsg} />
      {renderSection()}
    </AccountShell>
  );
};
