import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../common/Modal';
import type { MapBlueprint } from '../../domain/map/map-blueprint.types';
import type { LayoutPreview } from '../../domain/map/map-blueprint.types';
import type { BlueprintDeviceMatch } from '../../application/map/device-matcher';
import { MAP_KIND_LABELS } from '../../domain/map/space-map.types';
import { PlantSetupAgeField } from './PlantSetupAgeField';
import { enrichLayoutWithPlantAge, parsePlantAgeFromText } from '../../domain/grow/plant-setup-age';
import { layoutFromBlueprint } from '../../application/map/spatial-layout.engine';

interface BlueprintPreviewModalProps {
  open: boolean;
  blueprint: MapBlueprint | null;
  layout: LayoutPreview | null;
  matches: BlueprintDeviceMatch[];
  spaceId: string;
  onClose: () => void;
  onApply: (layout: LayoutPreview, links: Record<string, { deviceId: string; sensorId?: string; outputId?: string }>) => void;
}

export const BlueprintPreviewModal: React.FC<BlueprintPreviewModalProps> = ({
  open,
  blueprint,
  layout,
  matches,
  spaceId,
  onClose,
  onApply,
}) => {
  const [links, setLinks] = useState<Record<string, string>>({});
  const initialAge = useMemo(() => {
    if (!blueprint) return 0;
    return (
      blueprint.defaultPlantAgeDays ??
      blueprint.plantGroups.find((g) => g.ageDays != null)?.ageDays ??
      parsePlantAgeFromText(blueprint.assumptions.join(' ')) ??
      0
    );
  }, [blueprint]);
  const [plantAgeDays, setPlantAgeDays] = useState(initialAge);

  useEffect(() => {
    setPlantAgeDays(initialAge);
  }, [initialAge]);

  const displayLayout = useMemo(() => {
    if (!blueprint) return layout;
    const base = layoutFromBlueprint(blueprint, spaceId);
    return plantAgeDays > 0 ? enrichLayoutWithPlantAge(base, plantAgeDays) : base;
  }, [blueprint, layout, plantAgeDays, spaceId]);

  if (!blueprint || !displayLayout) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Предложение карты">
        {null}
      </Modal>
    );
  }

  const crop = blueprint.plantGroups[0]?.crop;

  return (
    <Modal isOpen={open} onClose={onClose} title="Предложение карты" subtitle="Ничего не сохраняется, пока не нажмёте «Применить»" maxWidth="xl">
      <div className="space-y-3 max-h-[70vh] overflow-auto">
        <p className="text-xs text-slate-500">
          {blueprint.spaceGeometry.lengthM} × {blueprint.spaceGeometry.widthM} × {blueprint.spaceGeometry.heightM} м ·{' '}
          {displayLayout.map.placements.length} объектов · уверенность {blueprint.confidence === 'high' ? 'высокая' : blueprint.confidence === 'medium' ? 'средняя' : 'низкая'}
        </p>
        {displayLayout.plants.length > 0 && (
          <PlantSetupAgeField
            ageDays={plantAgeDays}
            crop={crop}
            description={blueprint.assumptions.join('. ')}
            onChange={setPlantAgeDays}
          />
        )}
        <ul className="text-xs space-y-1">
          {displayLayout.map.placements.map((p) => (
            <li key={p.id}>
              {MAP_KIND_LABELS[p.kind]} — {p.label ?? 'без названия'} · {p.xM.toFixed(1)} / {p.yM.toFixed(1)} м
            </li>
          ))}
        </ul>
        {blueprint.assumptions.length > 0 && (
          <div>
            <p className="text-[11px] font-bold">Допущения</p>
            {blueprint.assumptions.map((a) => (
              <p key={a} className="text-[11px] text-slate-500">
                — {a}
              </p>
            ))}
          </div>
        )}
        {blueprint.questions.length > 0 && (
          <div>
            <p className="text-[11px] font-bold">Уточнения</p>
            {blueprint.questions.map((a) => (
              <p key={a} className="text-[11px] text-amber-700">
                ? {a}
              </p>
            ))}
          </div>
        )}
        {blueprint.recommendedHardware.length > 0 && (
          <div className="rounded-xl bg-violet-50 dark:bg-violet-950/30 p-3">
            <p className="text-[11px] font-bold text-violet-700">Рекомендации (не устройства)</p>
            {blueprint.recommendedHardware.map((r) => (
              <p key={r.reason} className="text-[11px] text-violet-800 dark:text-violet-200">
                + {r.type}: {r.reason}
              </p>
            ))}
          </div>
        )}
        {matches.some((m) => m.candidates.length) && (
          <div>
            <p className="text-[11px] font-bold">Привязать к имеющимся приборам</p>
            {matches
              .filter((m) => m.candidates.length)
              .map((m) => (
                <label key={m.objectId} className="block text-[11px] mt-1">
                  {m.objectName}
                  <select
                    className="mt-0.5 w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800"
                    value={links[m.objectId] ?? ''}
                    onChange={(e) => setLinks((prev) => ({ ...prev, [m.objectId]: e.target.value }))}
                  >
                    <option value="">Позже</option>
                    {m.candidates.map((c) => (
                      <option key={`${c.deviceId}-${c.sensorId ?? c.outputId}`} value={`${c.deviceId}|${c.sensorId ?? ''}|${c.outputId ?? ''}`}>
                        {c.label} · {c.deviceName}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-zinc-800">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => {
              const parsed: Record<string, { deviceId: string; sensorId?: string; outputId?: string }> = {};
              for (const [id, raw] of Object.entries(links)) {
                if (!raw) continue;
                const [deviceId, sensorId, outputId] = raw.split('|');
                parsed[id] = {
                  deviceId: deviceId!,
                  sensorId: sensorId || undefined,
                  outputId: outputId || undefined,
                };
              }
              onApply(displayLayout, parsed);
            }}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white"
          >
            Применить
          </button>
        </div>
      </div>
    </Modal>
  );
};
