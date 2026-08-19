import React, { useState } from 'react';
import { X, FileJson, Trash2, Plug } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleContext';
import { AdminWorkspaceAiPanel } from '../admin/AdminAiPanels';
import type {
  PlatformAdminWorkspaceDetail,
  PlatformAdminWorkspaceIntegrations,
  PlatformAdminWorkspacePayload,
  PlatformAdminWorkspaceSubscription,
} from '../../domain/admin/platform-admin.types';
import type { WorkspaceAiAdminConfig } from '../../domain/ai/ai-admin-config.types';
import type { SubscriptionStatus, SubscriptionTier } from '../../domain/commercial/subscription.types';

interface AdminWorkspaceDetailModalProps {
  detail: PlatformAdminWorkspaceDetail | null;
  loading: boolean;
  localMode: boolean;
  payload: Record<string, unknown> | PlatformAdminWorkspacePayload | null;
  payloadLoading: boolean;
  deleteBusy: boolean;
  subscription: PlatformAdminWorkspaceSubscription | null;
  integrations: PlatformAdminWorkspaceIntegrations | null;
  subscriptionBusy: boolean;
  hubLifetimeBusy: boolean;
  transferOwnerId: string;
  onTransferOwnerIdChange: (value: string) => void;
  onClose: () => void;
  onLoadPayload: (workspaceId: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  onToggleHubLifetime: (workspaceId: string, enabled: boolean) => void;
  onUpdateSubscription: (
    workspaceId: string,
    opts: { tier?: SubscriptionTier; status?: SubscriptionStatus; extendTrialDays?: number; trialEndsAt?: string | null },
  ) => void;
  onTransferOwner: (workspaceId: string, newOwnerId: string) => void;
  onRenameWorkspace: (workspaceId: string, name: string) => void;
  onSetMemberRole: (workspaceId: string, userId: string, role: string) => void;
  onRemoveMember: (workspaceId: string, userId: string) => void;
  workspaceAiConfig: WorkspaceAiAdminConfig;
  onWorkspaceAiConfigChange: (config: WorkspaceAiAdminConfig) => void;
  workspaceAiSaveBusy: boolean;
  onSaveWorkspaceAi: (workspaceId: string) => void;
}

const MEMBER_ROLES = ['owner', 'admin', 'operator', 'viewer'] as const;

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const TIERS: SubscriptionTier[] = ['free', 'pro', 'enterprise'];

const STATUSES: SubscriptionStatus[] = ['trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleString();
}

export const AdminWorkspaceDetailModal: React.FC<AdminWorkspaceDetailModalProps> = ({
  detail,
  loading,
  localMode,
  payload,
  payloadLoading,
  deleteBusy,
  subscription,
  integrations,
  subscriptionBusy,
  hubLifetimeBusy,
  transferOwnerId,
  onTransferOwnerIdChange,
  onClose,
  onLoadPayload,
  onDeleteWorkspace,
  onToggleHubLifetime,
  onUpdateSubscription,
  onTransferOwner,
  onRenameWorkspace,
  onSetMemberRole,
  onRemoveMember,
  workspaceAiConfig,
  onWorkspaceAiConfigChange,
  workspaceAiSaveBusy,
  onSaveWorkspaceAi,
}) => {
  const { t } = useLocale();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [payloadSearch, setPayloadSearch] = useState('');
  const [showPayload, setShowPayload] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);

  if (!detail && !loading) return null;

  const handleClose = () => {
    setConfirmDelete(false);
    setDeleteConfirmName('');
    setRenameValue('');
    setPayloadSearch('');
    setShowPayload(false);
    setShowIntegrations(false);
    onClose();
  };

  const hubLifetime = subscription?.hubLifetime ?? false;
  const payloadText = payload ? JSON.stringify(payload, null, 2) : '';
  const payloadDisplay =
    payloadSearch.trim() && payloadText
      ? payloadText
          .split('\n')
          .filter((line) => line.toLowerCase().includes(payloadSearch.trim().toLowerCase()))
          .join('\n')
      : payloadText;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur">
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{detail?.name ?? t('common.loading', 'Загрузка…')}</p>
            <p className="text-[11px] text-slate-500 truncate">{detail?.id}</p>
          </div>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && <p className="p-4 text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>}

        {detail && !loading && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2">
              <input
                value={renameValue || detail.name}
                onChange={(e) => setRenameValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
              />
              <button
                type="button"
                disabled={!(renameValue || detail.name).trim() || (renameValue || detail.name) === detail.name}
                onClick={() => void onRenameWorkspace(detail.id, (renameValue || detail.name).trim())}
                className="px-3 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-semibold disabled:opacity-50"
              >
                {t('account.admin.renameFarm', 'Переименовать')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{t('account.admin.colOwner', 'Владелец')}</p>
                <p className="font-semibold mt-1">{detail.ownerName || '—'}</p>
                <p className="text-[11px] text-slate-500">{detail.ownerEmail}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{t('account.admin.colCreated', 'Создан')}</p>
                <p className="font-semibold mt-1">{formatDate(detail.createdAt)}</p>
                <p className="text-[11px] text-slate-500">
                  {detail.memberCount} {t('account.members', 'участников')}
                </p>
              </div>
            </div>

            {subscription && (
              <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-700 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {t('account.admin.subscriptionTitle', 'Подписка')}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    {t('account.admin.subscriptionTier', 'Тариф')}
                    <select
                      value={subscription.tier}
                      disabled={subscriptionBusy}
                      onChange={(e) =>
                        void onUpdateSubscription(detail.id, { tier: e.target.value as SubscriptionTier })
                      }
                      className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
                    >
                      {TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    {t('account.admin.subscriptionStatus', 'Статус')}
                    <select
                      value={subscription.status}
                      disabled={subscriptionBusy}
                      onChange={(e) =>
                        void onUpdateSubscription(detail.id, { status: e.target.value as SubscriptionStatus })
                      }
                      className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-zinc-400 mb-1">
                    {t('account.admin.trialEnds', 'Триал до')}
                    <input
                      type="datetime-local"
                      disabled={subscriptionBusy}
                      value={toDatetimeLocal(subscription.trialEndsAt)}
                      onChange={(e) => {
                        const iso = e.target.value ? new Date(e.target.value).toISOString() : null;
                        void onUpdateSubscription(detail.id, { trialEndsAt: iso });
                      }}
                      className="mt-1 w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-normal"
                    />
                  </label>
                  {subscription.stripeCustomerId && (
                    <span className="block mt-1">Stripe: {subscription.stripeCustomerId}</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={subscriptionBusy}
                    onClick={() => void onUpdateSubscription(detail.id, { extendTrialDays: 14 })}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
                  >
                    +14 {t('account.admin.trialDays', 'дн. триала')}
                  </button>
                  <button
                    type="button"
                    disabled={hubLifetimeBusy}
                    onClick={() => void onToggleHubLifetime(detail.id, !hubLifetime)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                      hubLifetime
                        ? 'border-violet-300 text-violet-700 dark:border-violet-800 dark:text-violet-300'
                        : 'border-slate-200 dark:border-zinc-700'
                    }`}
                  >
                    {hubLifetime
                      ? t('account.admin.revokeHubLifetime', 'Снять Hub Lifetime')
                      : t('account.admin.grantHubLifetime', 'Выдать Hub Lifetime Pro')}
                  </button>
                </div>
              </div>
            )}

            {!localMode && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t('account.admin.workspaceData', 'Данные фермы')}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { label: t('account.overview.spaces', 'Пространства'), value: detail.counts.spaces },
                    { label: t('account.overview.devices', 'Устройства'), value: detail.counts.devices },
                    { label: t('account.admin.countAutomations', 'Авто'), value: detail.counts.automations },
                    { label: t('account.admin.countMaps', 'Карты'), value: detail.counts.spatialMaps },
                    { label: t('account.admin.countPlants', 'Растения'), value: detail.counts.plants },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-center">
                      <p className="text-base font-bold">{item.value}</p>
                      <p className="text-[10px] text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail && (
              <AdminWorkspaceAiPanel
                workspaceId={detail.id}
                workspaceName={detail.name}
                config={workspaceAiConfig}
                saveBusy={workspaceAiSaveBusy}
                onChange={onWorkspaceAiConfigChange}
                onSave={() => onSaveWorkspaceAi(detail.id)}
              />
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPayload(true);
                  onLoadPayload(detail.id);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
              >
                <FileJson className="w-3.5 h-3.5" />
                {t('account.admin.viewPayload', 'Payload (read-only)')}
              </button>
              <button
                type="button"
                onClick={() => setShowIntegrations(!showIntegrations)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold"
              >
                <Plug className="w-3.5 h-3.5" />
                {t('account.admin.integrations', 'Интеграции')}
              </button>
            </div>

            {showPayload && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-zinc-800/60">
                  {t('account.admin.payloadTitle', 'JSON payload')}
                </p>
                <input
                  value={payloadSearch}
                  onChange={(e) => setPayloadSearch(e.target.value)}
                  placeholder={t('account.admin.payloadSearch', 'Поиск в JSON…')}
                  className="w-full px-3 py-2 text-[11px] border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                />
                {payloadLoading ? (
                  <p className="p-3 text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>
                ) : (
                  <pre className="p-3 text-[10px] leading-relaxed overflow-x-auto max-h-48 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900">
                    {payloadDisplay || '—'}
                  </pre>
                )}
              </div>
            )}

            {showIntegrations && integrations && (
              <div className="rounded-xl border border-slate-200 dark:border-zinc-700 overflow-hidden">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-zinc-800/60">
                  {t('account.admin.integrationsPayload', 'Конфиг интеграций')}
                  {integrations.updatedAt && (
                    <span className="ml-2 font-normal normal-case">
                      ({formatDate(integrations.updatedAt)})
                    </span>
                  )}
                </p>
                <pre className="p-3 text-[10px] leading-relaxed overflow-x-auto max-h-40 text-slate-700 dark:text-zinc-300">
                  {JSON.stringify(integrations.payload, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('account.admin.transferOwner', 'Смена владельца')}
              </p>
              <div className="flex gap-2">
                <select
                  value={transferOwnerId}
                  onChange={(e) => onTransferOwnerIdChange(e.target.value)}
                  className="flex-1 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs"
                >
                  <option value="">{t('account.admin.selectMember', 'Выберите участника')}</option>
                  {detail.members
                    .filter((m) => m.userId !== detail.ownerId)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.displayName || m.email || m.userId} ({m.role})
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={!transferOwnerId}
                  onClick={() => void onTransferOwner(detail.id, transferOwnerId)}
                  className="px-3 py-2 rounded-xl bg-sky-600 text-white text-[11px] font-semibold disabled:opacity-50"
                >
                  {t('account.admin.transfer', 'Передать')}
                </button>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('account.members', 'Участники')}
              </p>
              <ul className="space-y-1.5">
                {detail.members.map((m) => {
                  const isOwner = m.userId === detail.ownerId;
                  return (
                    <li
                      key={m.userId}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{m.displayName || m.email || m.userId}</p>
                        <p className="text-[11px] text-slate-500 truncate">{m.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOwner ? (
                          <span className="text-[10px] font-bold uppercase text-slate-500">{m.role}</span>
                        ) : (
                          <>
                            <select
                              value={m.role}
                              onChange={(e) => void onSetMemberRole(detail.id, m.userId, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[10px]"
                            >
                              {MEMBER_ROLES.filter((r) => r !== 'owner').map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => void onRemoveMember(detail.id, m.userId)}
                              className="text-[10px] font-semibold text-rose-600 hover:underline"
                            >
                              {t('account.admin.removeMember', 'Удалить')}
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t('account.admin.deleteWorkspace', 'Удалить ферму')}
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {t('account.admin.deleteWorkspaceConfirm', 'Удалить ферму и все данные безвозвратно?')}
                  </p>
                  <input
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder={detail.name}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 dark:border-rose-800"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleteBusy || deleteConfirmName !== detail.name}
                      onClick={() => void onDeleteWorkspace(detail.id)}
                      className="px-3 py-2 rounded-xl bg-rose-600 text-white text-[11px] font-semibold disabled:opacity-50"
                    >
                      {deleteBusy ? t('common.loading', 'Загрузка…') : t('common.delete', 'Удалить')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-[11px] font-semibold"
                    >
                      {t('common.cancel', 'Отмена')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
