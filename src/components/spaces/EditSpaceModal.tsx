import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { Modal } from '../common/Modal';
import {
  computeSpaceMetrics,
  SPACE_TYPE_LABELS,
  type Space,
  type SpaceType,
} from '../../domain/space/space.types';
import { Check } from '../common/Icons';

interface EditSpaceModalProps {
  space: Space | null;
  onClose: () => void;
}

export const EditSpaceModal: React.FC<EditSpaceModalProps> = ({ space, onClose }) => {
  const { updateSpaceDetails } = useApp();
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<SpaceType>('grow_tent');
  const [lengthM, setLengthM] = useState('1.2');
  const [widthM, setWidthM] = useState('1.2');
  const [heightM, setHeightM] = useState('2');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!space) return;
    setName(space.name);
    setDescription(space.description ?? '');
    setType((space.type as SpaceType) ?? 'custom');
    setLengthM(String(space.dimensions?.lengthM ?? 1.2));
    setWidthM(String(space.dimensions?.widthM ?? 1.2));
    setHeightM(String(space.dimensions?.heightM ?? 2));
  }, [space]);

  const metrics =
    Number(lengthM) > 0 && Number(widthM) > 0 && Number(heightM) > 0
      ? computeSpaceMetrics({
          lengthM: Number(lengthM),
          widthM: Number(widthM),
          heightM: Number(heightM),
        })
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!space || !name.trim() || !metrics) return;
    setBusy(true);
    try {
      await updateSpaceDetails(space.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        dimensions: {
          lengthM: Number(lengthM),
          widthM: Number(widthM),
          heightM: Number(heightM),
        },
        ...metrics,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(space)}
      onClose={onClose}
      title={t('spaces.editTitle', 'Редактировать пространство')}
      subtitle={t('spaces.editHint', 'Название, тип и габариты')}
      maxWidth="md"
      layer="stacked"
    >
      {space && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('spaces.name', 'Название')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('spaces.description', 'Описание')}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800 resize-none"
              placeholder={t('spaces.descriptionPlaceholder', 'Напр. дача, вторая комната, весенний цикл')}
            />
          </label>
          <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400">
            {t('spaces.type', 'Тип')}
            <select
              value={type}
              onChange={(e) => setType(e.target.value as SpaceType)}
              className="mt-1 w-full px-3 py-2.5 rounded-xl border text-sm dark:bg-zinc-800"
            >
              {Object.entries(SPACE_TYPE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t('spaces.length', 'Длина, м'), value: lengthM, set: setLengthM },
              { label: t('spaces.width', 'Ширина, м'), value: widthM, set: setWidthM },
              { label: t('spaces.height', 'Высота, м'), value: heightM, set: setHeightM },
            ].map((field) => (
              <label key={field.label} className="text-[11px] font-semibold text-slate-500">
                {field.label}
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 rounded-lg border text-sm dark:bg-zinc-800"
                />
              </label>
            ))}
          </div>
          {metrics && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              {metrics.areaM2} м² · {metrics.volumeM3} м³
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-xl">
              {t('common.cancel', 'Отмена')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              {busy ? t('common.loading', '…') : t('common.save', 'Сохранить')}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
