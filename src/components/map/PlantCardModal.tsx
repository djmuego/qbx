import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Plant } from '../../domain/grow/plant.types';
import { PLANT_MEDIUM_LABELS, type PlantMedium } from '../../domain/grow/plant.types';
import type { MapPlacement } from '../../domain/map/space-map.types';

interface PlantCardModalProps {
  plant: Plant | null;
  placement?: MapPlacement;
  onClose: () => void;
  onSave: (plant: Plant) => void;
}

export const PlantCardModal: React.FC<PlantCardModalProps> = ({ plant, placement, onClose, onSave }) => {
  const [draft, setDraft] = useState<Plant | null>(plant);

  React.useEffect(() => {
    setDraft(plant);
  }, [plant]);

  if (!plant || !draft) return (
    <Modal isOpen={false} onClose={onClose} title="Растение">
      {null}
    </Modal>
  );

  return (
    <Modal isOpen={Boolean(plant)} onClose={onClose} title={draft.name} subtitle="Карточка растения — без выдуманного health" maxWidth="md">
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-slate-500">Имя</label>
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-bold text-slate-500">Сорт</label>
            <input
              value={draft.cultivar ?? ''}
              onChange={(e) => setDraft({ ...draft, cultivar: e.target.value || undefined })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500">Объём, л</label>
            <input
              type="number"
              value={draft.potVolumeL ?? ''}
              onChange={(e) => setDraft({ ...draft, potVolumeL: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
          </div>
        </div>
        <label className="text-[11px] font-bold text-slate-500">Субстрат</label>
        <select
          value={draft.medium ?? ''}
          onChange={(e) => setDraft({ ...draft, medium: (e.target.value || undefined) as PlantMedium | undefined })}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
        >
          <option value="">Не указан</option>
          {Object.entries(PLANT_MEDIUM_LABELS).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        {placement && (
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            📍 {placement.xM.toFixed(1)} м × {placement.yM.toFixed(1)} м
            {placement.sensorId ? ' · привязан датчик' : ''}
            {placement.outputId ? ' · привязан свет/оборудование' : ''}
          </p>
        )}
        <p className="text-[11px] text-slate-400">Health score появится, когда будут показания по этому растению.</p>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="w-full px-3 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Сохранить
        </button>
      </div>
    </Modal>
  );
};
