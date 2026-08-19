import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { SPACE_TYPE_LABELS, type Space, type SpaceType } from '../../domain/space/space.types';
import { canDeleteSpace, canEditMap } from '../../domain/auth/role-guards';
import { Copy, Edit2, Trash2, Plus } from '../common/Icons';
import { EditSpaceModal } from './EditSpaceModal';

interface SpacesManagerPanelProps {
  onCreateRequest?: () => void;
}

export const SpacesManagerPanel: React.FC<SpacesManagerPanelProps> = ({ onCreateRequest }) => {
  const {
    spaces,
    currentSpaceId,
    setCurrentSpaceId,
    deleteSpace,
    duplicateSpace,
    getSpaceSummary,
    activeRole,
  } = useApp();
  const { t, tv } = useLocale();
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canDelete = canDeleteSpace(activeRole ?? 'owner');
  const canEdit = canEditMap(activeRole ?? 'owner');
  const isLastSpace = spaces.length <= 1;

  const handleDuplicate = async (space: Space) => {
    setBusyId(space.id);
    try {
      await duplicateSpace(space.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (space: Space) => {
    deleteSpace(space.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <p className="text-xs text-slate-500">{t('spaces.hint', '')}</p>
        {canEdit && (
          <button
            type="button"
            onClick={onCreateRequest}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('spaces.create', 'Создать')}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {spaces.map((space) => {
          const isActive = space.id === currentSpaceId;
          const stats = getSpaceSummary(space.id);
          const typeLabel = space.type ? SPACE_TYPE_LABELS[space.type as SpaceType] : t('spaces.typeCustom', 'Пространство');
          const dims = space.dimensions
            ? `${space.dimensions.lengthM}×${space.dimensions.widthM}×${space.dimensions.heightM} м`
            : null;

          return (
            <article
              key={space.id}
              className={`p-4 rounded-2xl border transition-all ${
                isActive
                  ? 'border-emerald-500/80 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold truncate">{space.name}</h3>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        {t('spaces.active', 'Активное')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {typeLabel}
                    {dims ? ` · ${dims}` : ''}
                    {space.areaM2 ? ` · ${space.areaM2} м²` : ''}
                  </p>
                  {space.description && (
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{space.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { label: t('spaces.stats.devices', 'Устройства'), value: stats.deviceCount },
                      { label: t('spaces.stats.automations', 'Авто'), value: stats.automationCount },
                      { label: t('spaces.stats.map', 'Карта'), value: stats.mapObjectCount },
                      { label: t('spaces.stats.plants', 'Растения'), value: stats.plantCount },
                    ].map((chip) => (
                      <span
                        key={chip.label}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                      >
                        {chip.label}: {chip.value}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => setCurrentSpaceId(space.id)}
                      className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-zinc-700"
                    >
                      {t('spaces.open', 'Открыть')}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingSpace(space)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                        title={t('spaces.edit', 'Редактировать')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busyId === space.id}
                        onClick={() => void handleDuplicate(space)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                        title={t('spaces.duplicate', 'Дублировать')}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      disabled={isLastSpace}
                      onClick={() => !isLastSpace && setDeleteTarget(space)}
                      className={`p-2 rounded-lg ${
                        isLastSpace
                          ? 'text-slate-300 dark:text-zinc-600 cursor-not-allowed'
                          : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                      }`}
                      title={
                        isLastSpace
                          ? t('spaces.deleteLastHint', 'Нельзя удалить последнее пространство')
                          : t('spaces.delete', 'Удалить')
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {deleteTarget?.id === space.id && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 space-y-2">
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {tv(
                      'spaces.deleteConfirm',
                      {
                        name: space.name,
                        devices: stats.deviceCount,
                        automations: stats.automationCount,
                        map: stats.mapObjectCount,
                      },
                      '',
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(null)}
                      className="px-3 py-1.5 rounded-lg text-xs border"
                    >
                      {t('common.cancel', 'Отмена')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(space)}
                      className="px-3 py-1.5 rounded-lg text-xs bg-rose-600 text-white font-semibold"
                    >
                      {t('spaces.delete', 'Удалить')}
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {spaces.length === 0 && (
          <div className="text-center py-10 text-sm text-slate-500 border border-dashed rounded-2xl">
            {t('spaces.empty', 'Нет пространств. Создайте первое — гроубокс, комнату или дачу.')}
          </div>
        )}
      </div>

      <EditSpaceModal space={editingSpace} onClose={() => setEditingSpace(null)} />
    </>
  );
};
