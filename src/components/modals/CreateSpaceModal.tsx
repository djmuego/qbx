import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Modal } from '../common/Modal';
import { computeSpaceMetrics, SPACE_TYPE_LABELS, type SpaceType } from '../../domain/space/space.types';
import { SPACE_PRESETS, templateSpaceTypeToSpaceType } from '../../application/map/space-presets';
import { generateSpaceLayout } from '../../application/map/template-generator';
import { DEFAULT_EQUIPMENT, type GrowMethod, type TemplateEquipmentFlags } from '../../domain/map/space-templates.types';
import { SPATIAL_SCALE_LABELS, type SpatialScale } from '../../domain/map/spatial-hierarchy';
import { PlantSetupAgeField } from '../map/PlantSetupAgeField';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GROW_METHODS: { id: GrowMethod; label: string }[] = [
  { id: 'pots', label: 'Горшки' },
  { id: 'bed', label: 'Грядка' },
  { id: 'rack', label: 'Стеллаж' },
  { id: 'hydro', label: 'Hydro' },
  { id: 'custom', label: 'Своё' },
];

const PLANT_COUNTS = [1, 2, 4, 6, 9, 12, 16];

export const CreateSpaceModal: React.FC<CreateSpaceModalProps> = ({ isOpen, onClose }) => {
  const { createSpaceWithLayout, spaces } = useApp();
  const { canAddSpace, requestUpgrade } = useSubscription();
  const [name, setName] = useState('');
  const [type, setType] = useState<SpaceType>('grow_tent');
  const [lengthM, setLengthM] = useState('1.2');
  const [widthM, setWidthM] = useState('1.2');
  const [heightM, setHeightM] = useState('2');
  const [mode, setMode] = useState<'empty' | 'template'>('template');
  const [presetId, setPresetId] = useState('tent-120-9');
  const [growMethod, setGrowMethod] = useState<GrowMethod>('pots');
  const [plantCount, setPlantCount] = useState(9);
  const [customCount, setCustomCount] = useState('9');
  const [equipment, setEquipment] = useState<TemplateEquipmentFlags>(DEFAULT_EQUIPMENT);
  const [plantAgeDays, setPlantAgeDays] = useState(0);
  const [busy, setBusy] = useState(false);

  const preset = SPACE_PRESETS.find((p) => p.id === presetId);
  const dimensions = {
    lengthM: Number(lengthM),
    widthM: Number(widthM),
    heightM: Number(heightM),
  };
  const metrics =
    dimensions.lengthM > 0 && dimensions.widthM > 0 && dimensions.heightM > 0 ? computeSpaceMetrics(dimensions) : null;
  const count = PLANT_COUNTS.includes(plantCount) ? plantCount : Number(customCount) || 1;

  const preview = useMemo(() => {
    if (mode !== 'template' || !metrics) return null;
    return generateSpaceLayout({
      spaceId: 'preview',
      spaceType: preset?.spaceType ?? 'GROW_TENT',
      dimensions,
      growMethod,
      plantCount: count,
      equipment,
      rackCount: preset?.rackCount,
      templateId: preset?.id,
      plantAgeDays: plantAgeDays > 0 ? plantAgeDays : undefined,
      cropName: /томат/i.test(name) ? 'tomato' : undefined,
    });
  }, [mode, metrics, preset, dimensions.lengthM, dimensions.widthM, dimensions.heightM, growMethod, count, equipment, plantAgeDays, name]);

  const applyPreset = (id: string) => {
    const next = SPACE_PRESETS.find((p) => p.id === id);
    if (!next) return;
    setPresetId(id);
    setType(templateSpaceTypeToSpaceType(next.spaceType));
    setLengthM(String(next.dimensions.lengthM));
    setWidthM(String(next.dimensions.widthM));
    setHeightM(String(next.dimensions.heightM));
    setGrowMethod(next.growMethod);
    setPlantCount(next.plantCount);
    setCustomCount(String(next.plantCount));
    setEquipment(next.equipment);
    if (!name) setName(next.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !metrics) return;
    if (!canAddSpace(spaces.length)) {
      requestUpgrade('UNLIMITED_SPACES');
      return;
    }
    setBusy(true);
    try {
      await createSpaceWithLayout(
        { name: name.trim(), type, dimensions },
        mode === 'template'
          ? {
              spaceId: 'pending',
              spaceType: preset?.spaceType ?? 'CUSTOM_ROOM',
              dimensions,
              growMethod,
              plantCount: count,
              equipment,
              rackCount: preset?.rackCount,
              templateId: preset?.id,
              plantAgeDays: plantAgeDays > 0 ? plantAgeDays : undefined,
              cropName: /томат/i.test(name) ? 'tomato' : undefined,
            }
          : undefined,
      );
      setName('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isOpen && !canAddSpace(spaces.length)) {
      requestUpgrade('UNLIMITED_SPACES');
      onClose();
    }
  }, [isOpen, spaces.length, canAddSpace, requestUpgrade, onClose]);

  const grouped = (Object.keys(SPATIAL_SCALE_LABELS) as SpatialScale[]).map((scale) => ({
    scale,
    items: SPACE_PRESETS.filter((p) => p.scale === scale),
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать пространство" subtitle="От горшка до комплекса — один Spatial Engine" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Название</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Моя теплица"
            className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            required
          />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Тип</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SpaceType)}
            className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
          >
            {Object.entries(SPACE_TYPE_LABELS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Длина, м', value: lengthM, set: setLengthM },
            { label: 'Ширина, м', value: widthM, set: setWidthM },
            { label: 'Высота, м', value: heightM, set: setHeightM },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[11px] font-bold text-slate-500">{field.label}</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                className="mt-1 w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
              />
            </div>
          ))}
        </div>
        {metrics && (
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            {metrics.areaM2} м² · {metrics.volumeM3} м³
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setMode('empty')} className={`px-3 py-2 rounded-xl text-xs font-semibold ${mode === 'empty' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}>
            Пустое пространство
          </button>
          <button type="button" onClick={() => setMode('template')} className={`px-3 py-2 rounded-xl text-xs font-semibold ${mode === 'template' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}>
            Использовать шаблон
          </button>
        </div>
        {mode === 'template' && (
          <>
            {grouped.map((g) =>
              g.items.length ? (
                <div key={g.scale}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{SPATIAL_SCALE_LABELS[g.scale]}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${presetId === p.id ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1">Тип выращивания</p>
              <div className="flex flex-wrap gap-1.5">
                {GROW_METHODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setGrowMethod(m.id)} className={`px-2.5 py-1.5 rounded-lg text-[11px] ${growMethod === m.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1">Растений</p>
              <div className="flex flex-wrap gap-1.5">
                {PLANT_COUNTS.map((n) => (
                  <button key={n} type="button" onClick={() => setPlantCount(n)} className={`w-10 h-9 rounded-lg text-[11px] font-semibold ${plantCount === n ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                    {n}
                  </button>
                ))}
                <input
                  value={customCount}
                  onChange={(e) => {
                    setCustomCount(e.target.value);
                    setPlantCount(-1);
                  }}
                  className="w-16 px-2 rounded-lg text-[11px] border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
                  placeholder="N"
                />
              </div>
            </div>
            <PlantSetupAgeField
              ageDays={plantAgeDays}
              crop={/томат/i.test(name) ? 'tomato' : undefined}
              description={name}
              growMethod={growMethod}
              onChange={setPlantAgeDays}
            />
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {(
                [
                  ['mainLight', 'Основной свет'],
                  ['exhaust', 'Вытяжка'],
                  ['circulationFan', 'Циркуляция'],
                  ['climateSensor', 'Климат-датчик'],
                  ['substrateSensor', 'Датчик субстрата'],
                  ['irrigation', 'Полив'],
                  ['tank', 'Бак'],
                  ['camera', 'Камера'],
                  ['hub', 'QBX Hub'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-2 min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={equipment[key]}
                    onChange={(e) => setEquipment((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            {preview && (
              <p className="text-xs text-slate-500">
                Предпросмотр: {preview.map.placements.filter((p) => p.kind === 'plant').length} растений,{' '}
                {preview.map.placements.length} объектов. Ничего не сохраняется до «Создать».
              </p>
            )}
          </>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-xl">
            Отмена
          </button>
          <button disabled={busy} type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">
            {busy ? 'Создание…' : 'Создать пространство'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
