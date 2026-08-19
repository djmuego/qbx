import React from 'react';
import { ShieldCheck, Users, Building2, LayoutDashboard, ScrollText, Ban, CheckCircle2, CreditCard, Brain, BookOpen, Bot } from 'lucide-react';
import { AccountCard } from '../AccountShell';
import { useAdminActions } from '../useAdminActions';
import { AdminWorkspaceDetailModal } from '../AdminWorkspaceDetailModal';
import { AdminConsciousnessPanel } from '../../admin/AdminAiPanels';
import { AdminUserDetailModal } from '../AdminUserDetailModal';
import { useLocale } from '../../../i18n/LocaleContext';
import { useAuth } from '../../../context/AuthContext';
import type { AdminPanelTab } from '../../../domain/admin/platform-admin.types';
import { AdminKnowledgePanel } from '../../admin/AdminKnowledgePanel';
import { AdminOverviewHealth } from '../../admin/AdminOverviewHealth';
import { AdminAiFarmsPanel } from '../../admin/AdminAiFarmsPanel';
import { AdminAuditPanel } from '../../admin/AdminAuditPanel';

const TABS: { id: AdminPanelTab; icon: React.ReactNode }[] = [
  { id: 'overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'users', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'workspaces', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'subscriptions', icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 'consciousness', icon: <Brain className="w-3.5 h-3.5" /> },
  { id: 'knowledge', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'aiFarms', icon: <Bot className="w-3.5 h-3.5" /> },
  { id: 'platformAdmins', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'audit', icon: <ScrollText className="w-3.5 h-3.5" /> },
];

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString();
}

function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function auditActionLabel(action: string, t: (key: string, fb: string) => string): string {
  const map: Record<string, string> = {
    'user.disable': t('account.admin.auditUserDisable', 'Блокировка пользователя'),
    'user.enable': t('account.admin.auditUserEnable', 'Разблокировка пользователя'),
    'user.auth_ban': t('account.admin.auditAuthBan', 'Бан Auth + профиль'),
    'user.auth_unban': t('account.admin.auditAuthUnban', 'Снятие бана Auth'),
    'workspace.delete': t('account.admin.auditWorkspaceDelete', 'Удаление фермы'),
    'audit.export': t('account.admin.auditExport', 'Экспорт журнала'),
    'subscription.hub_lifetime_grant': t('account.admin.auditHubGrant', 'Hub Lifetime Pro выдан'),
    'subscription.hub_lifetime_revoke': t('account.admin.auditHubRevoke', 'Hub Lifetime снят'),
    'subscription.admin_update': t('account.admin.auditSubUpdate', 'Изменение подписки'),
    'user.data_export': t('account.admin.auditUserExport', 'Экспорт данных пользователя'),
    'user.delete': t('account.admin.auditUserDelete', 'Удаление пользователя'),
    'workspace.transfer_owner': t('account.admin.auditTransferOwner', 'Смена владельца фермы'),
    'workspace.rename': t('account.admin.auditWorkspaceRename', 'Переименование фермы'),
    'workspace.member_role': t('account.admin.auditMemberRole', 'Смена роли участника'),
    'workspace.member_remove': t('account.admin.auditMemberRemove', 'Удаление участника'),
    'workspace.ai_config_update': t('account.admin.auditAiConfig', 'AI настройки фермы'),
    'platform.consciousness_update': t('account.admin.auditConsciousness', 'Сознание платформы'),
    'knowledge.article_upsert': t('account.admin.auditKnowledgeUpsert', 'Статья базы знаний'),
    'knowledge.article_delete': t('account.admin.auditKnowledgeDelete', 'Удаление статьи'),
    'knowledge.embeddings_reindex': t('account.admin.auditKnowledgeReindex', 'Re-index эмбеддингов'),
    'platform_admin.grant': t('account.admin.auditGrantAdmin', 'Выдача platform admin'),
    'platform_admin.revoke': t('account.admin.auditRevokeAdmin', 'Снятие platform admin'),
  };
  return map[action] ?? action;
}

export const AccountAdminSection: React.FC = () => {
  const { t } = useLocale();
  const { user } = useAuth();
  const admin = useAdminActions();

  return (
    <div className="space-y-4">
      <AccountCard
        title={t('account.admin.title', 'Админка платформы')}
        description={t(
          'account.admin.hint',
          'Управление всеми пользователями и фермами QBX. Не путать с ролью «Админ» внутри одной фермы.',
        )}
      >
        {admin.localMode && (
          <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            {t('account.admin.localMode', 'Локальный режим: данные только из этого браузера.')}
          </p>
        )}

        <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => admin.setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                admin.tab === item.id
                  ? 'bg-white dark:bg-zinc-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-zinc-400'
              }`}
            >
              {item.icon}
              {t(`account.admin.tabs.${item.id}`, item.id)}
            </button>
          ))}
        </div>
      </AccountCard>

      {admin.error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800">
          {admin.error}
        </div>
      )}
      {admin.success && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800">
          {admin.success}
        </div>
      )}

      {admin.loading && (
        <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
      )}

      {admin.tab === 'overview' && (
        <AdminOverviewHealth
          stats={admin.stats}
          localMode={admin.localMode}
          cloudReady={admin.cloudReady}
          onOpenTab={(tab) => admin.setTab(tab)}
        />
      )}

      {admin.tab === 'users' && (
        <AccountCard title={t('account.admin.usersTitle', 'Пользователи')} description={t('account.admin.usersHint', '')}>
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              value={admin.userSearch}
              onChange={(e) => {
                admin.setUserSearch(e.target.value);
                admin.setUserPage(0);
              }}
              placeholder={t('account.admin.searchUsers', 'Поиск по email или имени')}
              className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
            <select
              value={admin.userStatusFilter}
              onChange={(e) => {
                admin.setUserStatusFilter(e.target.value as typeof admin.userStatusFilter);
                admin.setUserPage(0);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            >
              <option value="all">{t('account.admin.filterAll', 'Все')}</option>
              <option value="active">{t('account.admin.filterActive', 'Активные')}</option>
              <option value="disabled">{t('account.admin.filterDisabled', 'Мягкая блок.')}</option>
              <option value="banned">{t('account.admin.filterBanned', 'Auth бан')}</option>
              <option value="admin">{t('account.admin.filterAdmins', 'Platform admin')}</option>
            </select>
          </div>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.profile', 'Профиль')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.colStatus', 'Статус')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.colFarms', 'Фермы')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.colCreated', 'Создан')}</th>
                  <th className="py-2 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {admin.users.map((row) => {
                  const isAdmin = admin.platformAdminIds.has(row.id);
                  const isSelf = row.id === user?.id;
                  const isBanned = row.isAuthBanned;
                  const softDisabled = row.isDisabled && !row.isAuthBanned;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-50 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                      onClick={() => void admin.openUserDetail(row.id)}
                    >
                      <td className="py-2.5 pr-3 font-medium text-slate-800 dark:text-zinc-200">
                        {row.email ?? '—'}
                        {isSelf && (
                          <span className="ml-1 text-[10px] text-emerald-600">({t('account.you', 'вы')})</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-400">{row.displayName || '—'}</td>
                      <td className="py-2.5 pr-3">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-rose-600">
                            <Ban className="w-3 h-3" />
                            {t('account.admin.statusBanned', 'Auth бан')}
                          </span>
                        ) : softDisabled ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600">
                            {t('account.admin.statusSoftDisabled', 'Мягкая блокировка')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('account.admin.statusActive', 'Активен')}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">{row.workspaceCount}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{formatDate(row.createdAt)}</td>
                      <td className="py-2.5 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {!isSelf && !isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => void admin.toggleUserSoftDisable(row.id, !row.isDisabled)}
                              className="text-[11px] font-semibold text-amber-700 hover:underline"
                            >
                              {row.isDisabled
                                ? t('account.admin.enableUser', 'Разблокировать')
                                : t('account.admin.softDisable', 'Мягкая блок.')}
                            </button>
                            <button
                              type="button"
                              onClick={() => void admin.toggleUserBan(row.id, !isBanned)}
                              className={`text-[11px] font-semibold hover:underline ${
                                isBanned ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'
                              }`}
                            >
                              {isBanned
                                ? t('account.admin.unbanUser', 'Снять бан')
                                : t('account.admin.banUser', 'Забанить (Auth)')}
                            </button>
                          </>
                        )}
                        {isAdmin ? (
                          !isSelf && (
                            <button
                              type="button"
                              onClick={() => void admin.revokePlatformAdmin(row.id)}
                              className="text-[11px] font-semibold text-rose-600 hover:underline"
                            >
                              {t('account.admin.revokeAdmin', 'Снять админа')}
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => void admin.grantPlatformAdmin(row.id)}
                            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                          >
                            {t('account.admin.grantAdmin', 'Сделать админом')}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500">
            <span>
              {admin.filteredUsersCount} {t('account.admin.usersTotal', 'пользователей')} · {t('account.admin.page', 'стр.')}{' '}
              {admin.userPage + 1}/{admin.userPageCount}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={admin.userPage <= 0}
                onClick={() => admin.setUserPage(admin.userPage - 1)}
                className="px-2 py-1 rounded-lg border disabled:opacity-40"
              >
                ←
              </button>
              <button
                type="button"
                disabled={admin.userPage + 1 >= admin.userPageCount}
                onClick={() => admin.setUserPage(admin.userPage + 1)}
                className="px-2 py-1 rounded-lg border disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </AccountCard>
      )}

      {admin.tab === 'workspaces' && (
        <AccountCard title={t('account.admin.workspacesTitle', 'Фермы')} description={t('account.admin.workspacesHint', '')}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-semibold">{t('account.workspaceName', 'Название')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.colOwner', 'Владелец')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.members', 'Участники')}</th>
                  <th className="py-2 font-semibold">{t('account.admin.colCreated', 'Создан')}</th>
                </tr>
              </thead>
              <tbody>
                {admin.workspaces.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    onClick={() => void admin.openWorkspaceDetail(row.id)}
                  >
                    <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-zinc-200">{row.name}</td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-400">
                      {row.ownerName || '—'}
                      <span className="block text-[10px] text-slate-400">{row.ownerEmail}</span>
                    </td>
                    <td className="py-2.5 pr-3">{row.memberCount}</td>
                    <td className="py-2.5 text-slate-500">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccountCard>
      )}

      {admin.tab === 'subscriptions' && (
        <AccountCard
          title={t('account.admin.subscriptionsTitle', 'Подписки ферм')}
          description={t('account.admin.subscriptionsHint', 'Тарифы, статусы, Hub Lifetime и триалы.')}
        >
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-semibold">{t('account.workspaceName', 'Название')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.colOwner', 'Владелец')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.subscriptionTier', 'Тариф')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('account.admin.subscriptionStatus', 'Статус')}</th>
                  <th className="py-2 font-semibold">Hub</th>
                </tr>
              </thead>
              <tbody>
                {admin.subscriptions.map((row) => (
                  <tr
                    key={row.workspaceId}
                    className="border-b border-slate-50 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    onClick={() => void admin.openWorkspaceDetail(row.workspaceId)}
                  >
                    <td className="py-2.5 pr-3 font-semibold">{row.workspaceName}</td>
                    <td className="py-2.5 pr-3 text-slate-500">{row.ownerEmail ?? '—'}</td>
                    <td className="py-2.5 pr-3 uppercase font-bold text-slate-600">{row.tier}</td>
                    <td className="py-2.5 pr-3">{row.status}</td>
                    <td className="py-2.5">{row.hubLifetime ? 'Lifetime' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccountCard>
      )}

      {admin.tab === 'consciousness' && (
        <AdminConsciousnessPanel
          loading={admin.consciousnessLoading}
          raw={admin.platformConsciousnessRaw}
          saveBusy={admin.consciousnessSaveBusy}
          onLoad={() => void admin.loadPlatformConsciousness()}
          onSave={(config) => void admin.savePlatformConsciousness(config)}
        />
      )}

      {admin.tab === 'knowledge' && <AdminKnowledgePanel localMode={admin.localMode} />}

      {admin.tab === 'aiFarms' && (
        <AdminAiFarmsPanel localMode={admin.localMode} onOpenWorkspace={(id) => void admin.openWorkspaceDetail(id)} />
      )}

      {admin.tab === 'platformAdmins' && (
        <AccountCard
          title={t('account.admin.platformAdminsTitle', 'Админы платформы')}
          description={t('account.admin.platformAdminsHint', 'Полный доступ к админке и управлению пользователями.')}
        >
          <ul className="space-y-2">
            {admin.platformAdmins.map((row) => (
              <li
                key={row.userId}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-zinc-800"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    {row.displayName || row.email || row.userId}
                  </p>
                  <p className="text-[11px] text-slate-500">{row.email}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  Platform
                </span>
              </li>
            ))}
          </ul>
        </AccountCard>
      )}

      {admin.tab === 'audit' && (
        <AdminAuditPanel
          localMode={admin.localMode}
          fallbackLog={admin.auditLog}
          onExport={() => void admin.exportAuditLogFile()}
          auditActionLabel={(action) => auditActionLabel(action, t)}
          formatDateTime={formatDateTime}
        />
      )}

      <AdminUserDetailModal
        detail={admin.userDetail}
        loading={admin.userDetailLoading}
        isSelf={admin.userDetail?.id === user?.id}
        deleteBusy={admin.userDeleteBusy}
        onClose={admin.closeUserDetail}
        onExportData={(id) => void admin.exportUserData(id)}
        onSoftDisable={(id, disabled) => void admin.toggleUserSoftDisable(id, disabled)}
        onAuthBan={(id, ban) => void admin.toggleUserBan(id, ban)}
        onGrantAdmin={(id) => void admin.grantPlatformAdmin(id)}
        onRevokeAdmin={(id) => void admin.revokePlatformAdmin(id)}
        onDeleteUser={(id) => void admin.deleteUserAdmin(id)}
      />

      <AdminWorkspaceDetailModal
        detail={admin.workspaceDetail}
        loading={admin.workspaceDetailLoading}
        localMode={admin.localMode}
        payload={admin.workspacePayload}
        payloadLoading={admin.workspacePayloadLoading}
        deleteBusy={admin.workspaceDeleteBusy}
        subscription={admin.workspaceSubscription}
        integrations={admin.workspaceIntegrations}
        subscriptionBusy={admin.subscriptionBusy}
        hubLifetimeBusy={admin.hubLifetimeBusy}
        transferOwnerId={admin.transferOwnerId}
        onTransferOwnerIdChange={admin.setTransferOwnerId}
        onClose={admin.closeWorkspaceDetail}
        onLoadPayload={(id) => void admin.loadWorkspacePayload(id)}
        onDeleteWorkspace={(id) => void admin.deleteWorkspaceAdmin(id)}
        onToggleHubLifetime={(id, enabled) => void admin.toggleHubLifetime(id, enabled)}
        onUpdateSubscription={(id, opts) => void admin.updateWorkspaceSubscription(id, opts)}
        onTransferOwner={(id, ownerId) => void admin.transferWorkspaceOwnerAdmin(id, ownerId)}
        onRenameWorkspace={(id, name) => void admin.renameWorkspaceAdminAction(id, name)}
        onSetMemberRole={(id, userId, role) => void admin.setMemberRoleAdmin(id, userId, role)}
        onRemoveMember={(id, userId) => void admin.removeMemberAdmin(id, userId)}
        workspaceAiConfig={admin.workspaceAiConfig}
        onWorkspaceAiConfigChange={admin.setWorkspaceAiConfig}
        workspaceAiSaveBusy={admin.workspaceAiSaveBusy}
        onSaveWorkspaceAi={(id) => void admin.saveWorkspaceAiConfig(id)}
      />
    </div>
  );
};
