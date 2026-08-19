import React from 'react';
import { Trash2, Users } from '../../common/Icons';
import { useLocale } from '../../../i18n/LocaleContext';
import { AccountCard } from '../AccountShell';
import type { AccountActions } from '../useAccountActions';
import type { WorkspaceRole } from '../../../domain/auth/auth.types';

export const AccountTeamSection: React.FC<{ actions: AccountActions }> = ({ actions }) => {
  const { t } = useLocale();
  const {
    user,
    members,
    memberEmail,
    setMemberEmail,
    memberRole,
    setMemberRole,
    roleLabel,
    canManageTeam,
    cloudReady,
    localAuthEnabled,
    busy,
    inviteMember,
    changeMemberRole,
    removeMember,
  } = actions;

  return (
    <AccountCard
      title={t('account.members', 'Участники')}
      description={
        localAuthEnabled
          ? t('account.team.localHint', '')
          : t('account.team.cloudHint', '')
      }
    >
      <ul className="space-y-2">
        {members.map((m) => (
          <li
            key={m.userId}
            className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 text-xs"
          >
            <div className="min-w-0">
              <p className="font-semibold truncate">
                {m.displayName || m.email || m.userId.slice(0, 8)}
                {m.userId === user?.id && (
                  <span className="text-slate-400 font-normal"> ({t('account.you', 'вы')})</span>
                )}
              </p>
              {m.email && <p className="text-slate-500 truncate">{m.email}</p>}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {m.userId === user?.id || m.role === 'owner' || !cloudReady ? (
                <span className="px-2 py-1 rounded-md bg-slate-200/80 dark:bg-zinc-700 text-[11px] font-semibold">
                  {roleLabel(m.role)}
                </span>
              ) : (
                <select
                  value={m.role}
                  onChange={(e) => void changeMemberRole(m.userId, e.target.value as WorkspaceRole)}
                  className="px-2 py-1 rounded-md border text-[11px] dark:bg-zinc-800"
                >
                  <option value="viewer">{roleLabel('viewer')}</option>
                  <option value="operator">{roleLabel('operator')}</option>
                  <option value="owner">{roleLabel('owner')}</option>
                </select>
              )}
              {cloudReady && m.userId !== user?.id && m.role !== 'owner' && (
                <button
                  type="button"
                  onClick={() => void removeMember(m.userId)}
                  className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title={t('account.removeMember', 'Удалить')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {localAuthEnabled && (
        <p className="text-xs text-slate-500 flex items-start gap-2">
          <Users className="w-4 h-4 shrink-0 mt-0.5" />
          {t('account.team.localUpgrade', 'Подключите Supabase, чтобы приглашать операторов и наблюдателей.')}
        </p>
      )}

      {canManageTeam && cloudReady && (
        <div className="grid sm:grid-cols-[1fr_auto_auto] gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <input
            type="email"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            placeholder={t('account.memberEmail', 'Email')}
            className="px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"
          />
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as WorkspaceRole)}
            className="px-3 py-2 rounded-xl border text-sm dark:bg-zinc-800"
          >
            <option value="viewer">{roleLabel('viewer')}</option>
            <option value="operator">{roleLabel('operator')}</option>
            <option value="owner">{roleLabel('owner')}</option>
          </select>
          <button
            type="button"
            disabled={busy || !memberEmail.trim()}
            onClick={() => void inviteMember()}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold disabled:opacity-50"
          >
            {t('account.addMember', 'Пригласить')}
          </button>
        </div>
      )}
    </AccountCard>
  );
};
