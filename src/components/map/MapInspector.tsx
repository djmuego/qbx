import React, { useState } from 'react';
import type { MapPlacement, MapZone, SpaceMap } from '../../domain/map/space-map.types';
import { MAP_KIND_LABELS } from '../../domain/map/space-map.types';
import type { Plant } from '../../domain/grow/plant.types';
import type { Device } from '../../domain/device/device.types';
import { Trash2 } from '../common/Icons';
import { resolveSpatialAsset } from '../../features/map3d/assets/resolve-spatial-asset';
import { listCompatibleBindTargets, type BindCandidate } from '../../domain/map/spatial-device-bind';
import { placementBindRole } from '../../domain/map/spatial-device-bind';
import type { LiveTwinLabel } from '../../domain/map/live-twin-label';
import type { GrowPhaseId } from '../../domain/grow/grow-phase.types';
import type { OutputTwinMode } from '../../domain/equipment/output-twin-mode';
import type { OutputControlStatus } from '../../domain/equipment/output-control-status';
import { resolvePlacementGrowthVisual, visualStageLabel } from '../../domain/grow/plant-growth-visual';
import { PlantGrowthCycleScrubber } from './PlantGrowthCycleScrubber';
import { OutputControl } from '../equipment/OutputControl';
import { TwinControlStatusBadge } from '../equipment/TwinControlStatusBadge';

interface MapInspectorProps {
  selected: MapPlacement[];
  zones: MapZone[];
  plants: Plant[];
  onChange: (placement: MapPlacement) => void;
  onDelete: (ids: string[]) => void;
  onCreateZone: () => void;
  onCreateGroup: () => void;
  onOpenPlant: (plantId: string) => void;
  onAskAgent?: () => void;
  readOnly?: boolean;
  liveLabel?: string | null;
  onDuplicate?: () => void;
  onFocus?: () => void;
  devices?: Device[];
  map?: SpaceMap | null;
  liveTwin?: LiveTwinLabel | null;
  onBind?: (target: BindCandidate) => void;
  onUnbind?: () => void;
  onOpenDevice?: (deviceId: string) => void;
  allowBind?: boolean;
  onOpenChildSpace?: (childSpaceId: string) => void;
  growPhase?: GrowPhaseId;
  cropStartedAt?: string;
  onUpdatePlant?: (plantId: string, updates: Partial<Plant>) => void;
  growthPreviewDays?: number | null;
  growthPreviewPlaying?: boolean;
  onGrowthPreviewChange?: (days: number | null) => void;
  onGrowthPreviewPlayingChange?: (playing: boolean) => void;
  outputTwinMode?: OutputTwinMode | null;
  onOutputTwinModeChange?: (mode: OutputTwinMode) => void;
  outputControlDisabled?: boolean;
  outputControlStatus?: OutputControlStatus | null;
}

export const MapInspector: React.FC<MapInspectorProps> = ({
  selected,
  zones,
  plants,
  onChange,
  onDelete,
  onCreateZone,
  onCreateGroup,
  onOpenPlant,
  onAskAgent,
  readOnly,
  liveLabel,
  onDuplicate,
  onFocus,
  devices = [],
  map = null,
  liveTwin,
  onBind,
  onUnbind,
  onOpenDevice,
  allowBind,
  onOpenChildSpace,
  growPhase,
  cropStartedAt,
  onUpdatePlant,
  growthPreviewDays = null,
  growthPreviewPlaying = false,
  onGrowthPreviewChange,
  onGrowthPreviewPlayingChange,
  outputTwinMode = null,
  onOutputTwinModeChange,
  outputControlDisabled = false,
  outputControlStatus = null,
}) => {
  const shell = readOnly
    ? 'rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3'
    : 'rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-4 space-y-3';

  if (selected.length === 0) {
    return (
      <div className={shell}>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">Инспектор</h3>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
          {readOnly
            ? 'Выберите объект. В режиме «Редактирование» его можно перетащить.'
            : 'Выберите растение, датчик или прибор. Shift или рамка — несколько объектов, затем зона.'}
        </p>
        {onAskAgent && (
          <button type="button" onClick={onAskAgent} className="mt-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50">
            Спросить QBX Agent
          </button>
        )}
      </div>
    );
  }

  if (selected.length > 1) {
    const plantCount = selected.filter((p) => p.kind === 'plant').length;
    return (
      <div className={shell}>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">Выбрано: {selected.length}</h3>
        <button
          type="button"
          onClick={onCreateZone}
          disabled={readOnly}
          className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
        >
          Создать зону из выделения
        </button>
        {plantCount >= 2 && !readOnly && (
          <button
            type="button"
            onClick={onCreateGroup}
            className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50"
          >
            Группа растений ({plantCount})
          </button>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => onDelete(selected.map((p) => p.id))}
            className="inline-flex items-center gap-1 text-[11px] text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" /> Удалить
          </button>
        )}
      </div>
    );
  }

  const item = selected[0]!;
  const plant = item.plantId ? plants.find((p) => p.id === item.plantId) : undefined;
  const growth =
    plant && (item.kind === 'plant' || item.kind === 'plant_group')
      ? resolvePlacementGrowthVisual(item, plant, {
          growPhase,
          cropStartedAt,
          previewAgeDays: growthPreviewDays ?? undefined,
        })
      : null;
  const liveGrowth =
    plant && growthPreviewDays != null
      ? resolvePlacementGrowthVisual(item, plant, { growPhase, cropStartedAt })
      : growth;
  const thumb = resolveSpatialAsset(item, { plant, growthVisual: growth });

  return (
    <div className={shell}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">{MAP_KIND_LABELS[item.kind]}</h3>
        {!readOnly && (
          <button type="button" onClick={() => onDelete([item.id])} className="text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {thumb.source && thumb.renderType === 'sprite' && thumb.objectSprite && (
        <div className="flex justify-center rounded-xl bg-zinc-950 p-2">
          <img src={thumb.source} alt="" className="h-16 w-16 object-contain" />
        </div>
      )}
      {plant && growth && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 px-3 py-2 space-y-2 text-[11px]">
          <p className="font-bold text-emerald-900 dark:text-emerald-100">{plant.name}</p>
          {plant.crop && (
            <p className="text-emerald-800 dark:text-emerald-200">Культура: {plant.crop}</p>
          )}
          <p>
            День {growth.ageDays}
            {growth.isPreview ? ' (превью)' : ''} · {visualStageLabel(growth.visualStageIndex)}
          </p>
          <p>Рост: {growth.growthMode === 'manual' ? 'MANUAL' : 'AUTO'}</p>
          <p>Высота: {(growth.plantHeightM * 100).toFixed(0)} см</p>
          <p>Крона: {(growth.canopyDiameterM * 100).toFixed(0)} см</p>
          <p>Визуальная стадия: {growth.visualStageIndex}/9</p>
          {!readOnly && onUpdatePlant && (
            <button
              type="button"
              className="text-emerald-700 font-semibold"
              onClick={() =>
                onUpdatePlant(plant.id, {
                  growthMode: plant.growthMode === 'manual' ? 'auto' : 'manual',
                  plantHeightM: growth.plantHeightM,
                  canopyDiameterM: growth.canopyDiameterM,
                })
              }
            >
              {plant.growthMode === 'manual' ? 'Вернуть AUTO' : 'Уточнить размер'}
            </button>
          )}
          {onGrowthPreviewChange && liveGrowth && (
            <PlantGrowthCycleScrubber
              placement={item}
              growth={growth}
              liveAgeDays={liveGrowth.ageDays}
              previewDays={growthPreviewDays}
              playing={growthPreviewPlaying}
              onPlayingChange={onGrowthPreviewPlayingChange ?? (() => {})}
              onPreviewChange={onGrowthPreviewChange}
            />
          )}
          <button type="button" onClick={() => onOpenPlant(plant.id)} className="text-emerald-700 font-semibold block">
            Карточка растения
          </button>
        </div>
      )}
      {plant && !growth && (
        <div className="text-[11px] text-slate-500 space-y-0.5">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">{plant.name}</p>
          <button type="button" onClick={() => onOpenPlant(plant.id)} className="text-emerald-700 font-semibold">
            Карточка растения
          </button>
        </div>
      )}
      <label className="block text-[11px] font-bold text-slate-500">Подпись</label>
      <input
        value={item.label ?? ''}
        disabled={readOnly}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
        className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
      />
      <div className="grid grid-cols-2 gap-2">
        {[
          ['X, м', 'xM'],
          ['Y, м', 'yM'],
          ['Z, м', 'zM'],
          ['Ширина', 'widthM'],
          ['Глубина', 'heightM'],
          ['Высота 3D', 'sizeZM'],
          ['Поворот', 'rotationDeg'],
        ].map(([label, key]) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-slate-400">{label}</label>
            <input
              type="number"
              step={0.1}
              disabled={readOnly}
              value={(item[key as keyof MapPlacement] as number | undefined) ?? 0}
              onChange={(e) =>
                onChange({
                  ...item,
                  [key]: Number(e.target.value),
                  zSource: key === 'zM' || key === 'sizeZM' ? 'user' : item.zSource,
                })
              }
              className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
            />
          </div>
        ))}
      </div>
      <label className="block text-[11px] font-bold text-slate-500">Зона</label>
      <select
        value={item.zoneId ?? ''}
        disabled={readOnly}
        onChange={(e) => onChange({ ...item, zoneId: e.target.value || undefined })}
        className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
      >
        <option value="">Без зоны</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
      <label className="block text-[11px] font-bold text-slate-500">Монтаж</label>
      <select
        value={item.mounting ?? 'floor'}
        disabled={readOnly}
        onChange={(e) => onChange({ ...item, mounting: e.target.value as MapPlacement['mounting'], zSource: 'user' })}
        className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
      >
        {['floor', 'wall', 'ceiling', 'hanging', 'rack', 'plantCanopy', 'free'].map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <label className="block text-[11px] font-bold text-slate-500">Заметки</label>
      <input
        value={item.notes ?? ''}
        disabled={readOnly}
        onChange={(e) => onChange({ ...item, notes: e.target.value })}
        className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
      />
      {(item.kind === 'light' || item.kind === 'equipment' || item.kind === 'irrigation' || item.kind === 'hub') && (
        <div>
          <label className="block text-[11px] font-bold text-slate-500">Мощность, W</label>
          <input
            type="number"
            disabled={readOnly}
            placeholder="неизвестно"
            value={item.ratedPowerW ?? ''}
            onChange={(e) =>
              onChange({ ...item, ratedPowerW: e.target.value === '' ? undefined : Number(e.target.value) })
            }
            className="w-full px-2 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
          />
        </div>
      )}
      {(item.deviceId || item.sensorId || item.outputId) && (
        <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/80 px-3 py-2 space-y-1">
          <p className="text-[11px] font-bold text-slate-700 dark:text-zinc-200">
            {liveTwin?.title ?? 'Прибор'}
          </p>
          {liveTwin?.readingLine && (
            <p className="text-[12px] font-semibold text-slate-900 dark:text-white">{liveTwin.readingLine}</p>
          )}
          {liveTwin?.statusLine && (
            <p className="text-[11px] text-slate-500">{liveTwin.statusLine}</p>
          )}
          {outputTwinMode && onOutputTwinModeChange && (
            <div className="space-y-2">
              {outputControlStatus && <TwinControlStatusBadge status={outputControlStatus} />}
              <OutputControl
                mode={outputTwinMode}
                onChange={onOutputTwinModeChange}
                disabled={outputControlDisabled}
              />
            </div>
          )}
          {item.deviceId && (
            <p className="text-[11px] text-slate-500">
              {devices.find((d) => d.id === item.deviceId)?.customName ?? 'Устройство'}
              {item.sensorId
                ? ` · ${devices.find((d) => d.id === item.deviceId)?.inputs.find((s) => s.id === item.sensorId)?.hardwareLabel ?? 'IN'}`
                : item.outputId
                  ? ` · ${devices.find((d) => d.id === item.deviceId)?.outputs.find((o) => o.id === item.outputId)?.hardwareLabel ?? 'OUT'}`
                  : ''}
            </p>
          )}
          {onOpenDevice && item.deviceId && (
            <button
              type="button"
              onClick={() => onOpenDevice(item.deviceId!)}
              className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
            >
              Открыть устройство
            </button>
          )}
          {allowBind && onUnbind && (
            <button type="button" onClick={onUnbind} className="block text-[11px] text-slate-500 underline">
              Отвязать устройство
            </button>
          )}
        </div>
      )}
      {!item.deviceId && !item.sensorId && item.kind === 'sensor' && (
        <p className="text-[11px] text-zinc-500">Не связан с устройством</p>
      )}
      {allowBind && onBind && placementBindRole(item) !== 'none' && !item.deviceId && (
        <BindPicker item={item} devices={devices} map={map} onBind={onBind} />
      )}
      {item.zSource === 'default_visualization' && (
        <p className="text-[11px] text-amber-700">Высота Z — визуальный default, не измерение.</p>
      )}
      {item.childSpaceId && onOpenChildSpace && (
        <button
          type="button"
          onClick={() => onOpenChildSpace(item.childSpaceId!)}
          className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white"
        >
          Открыть {item.label ?? 'пространство'}
        </button>
      )}
      {onFocus && (
        <button type="button" onClick={onFocus} className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800">
          Показать
        </button>
      )}
      {onDuplicate && !readOnly && (
        <button type="button" onClick={onDuplicate} className="w-full px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-zinc-800">
          Дублировать
        </button>
      )}
      {onAskAgent && (
        <button type="button" onClick={onAskAgent} className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 dark:bg-violet-950/40">
          Спросить QBX Agent
        </button>
      )}
    </div>
  );
};

function BindPicker({
  item,
  devices,
  map,
  onBind,
}: {
  item: MapPlacement;
  devices: Device[];
  map: SpaceMap | null;
  onBind: (target: BindCandidate) => void;
}) {
  const [open, setOpen] = useState(false);
  const targets = map ? listCompatibleBindTargets(item, devices, map) : [];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 min-h-[40px]"
      >
        Связать с устройством
      </button>
      {open && (
        <div className="mt-2 max-h-48 overflow-auto space-y-1">
          {targets.length === 0 ? (
            <p className="text-[11px] text-slate-500">Нет совместимых устройств в этом пространстве.</p>
          ) : (
            targets.map((t: BindCandidate) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  onBind(t);
                  setOpen(false);
                }}
                className="w-full text-left px-2 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800 min-h-[44px]"
              >
                <span className="block text-[12px] font-semibold text-slate-900 dark:text-white">{t.roleLabel}</span>
                <span className="block text-[11px] text-slate-500">
                  {t.deviceName} · {t.endpointLabel}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: t.online ? '#16a34a' : '#94a3b8' }}>
                  {t.online ? '● Online' : '○ Offline'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
