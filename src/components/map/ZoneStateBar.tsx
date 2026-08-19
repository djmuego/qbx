import React from 'react';
import type { Device } from '../../domain/device/device.types';
import { calculateVpd } from '../../application/ai/derived-metrics';

interface ZoneStateBarProps {
  devices: Device[];
  zoneName?: string;
  emergencyOff?: boolean;
}

function live(devices: Device[], type: string) {
  for (const d of devices) {
    if (!d.isOnline) continue;
    const s = d.inputs.find((i) => i.type === type && Number.isFinite(i.currentValue));
    if (s) return { value: s.currentValue, unit: s.unit, name: s.customName || s.name, min: s.optimalMin, max: s.optimalMax };
  }
  return null;
}

export const ZoneStateBar: React.FC<ZoneStateBarProps> = ({ devices, zoneName, emergencyOff }) => {
  const temp = live(devices, 'temperature');
  const rh = live(devices, 'humidity');
  const co2 = live(devices, 'co2');
  const light = live(devices, 'light');
  const ph = live(devices, 'ph');
  const ec = live(devices, 'ec');
  const vpd =
    temp && rh
      ? calculateVpd(temp.value, rh.value)
      : null;

  const cards: Array<{ label: string; value: string; hint: string; ok?: boolean }> = [
    {
      label: 'Температура',
      value: temp ? `${temp.value}${temp.unit}` : 'Нет данных',
      hint: temp ? `цель ${temp.min}–${temp.max}` : 'нужен датчик',
      ok: Boolean(temp),
    },
    {
      label: 'Влажность',
      value: rh ? `${rh.value}${rh.unit}` : 'Нет данных',
      hint: rh ? `цель ${rh.min}–${rh.max}` : 'нужен датчик',
      ok: Boolean(rh),
    },
    {
      label: 'VPD',
      value: vpd?.available && vpd.value != null ? `${vpd.value.toFixed(2)} ${vpd.unit}` : 'Нет данных',
      hint: vpd?.available ? 'из T + RH' : 'нужны T и RH',
      ok: Boolean(vpd?.available),
    },
    {
      label: 'CO₂',
      value: co2 ? `${co2.value} ${co2.unit}` : 'Нет данных',
      hint: co2 ? 'FACT' : 'датчик не подключён',
      ok: Boolean(co2),
    },
    {
      label: 'Свет',
      value: light ? `${light.value} ${light.unit}` : 'Нет PPFD',
      hint: light ? 'измерение датчика' : 'нет фотометрии — карту PPFD не строим',
      ok: Boolean(light),
    },
    {
      label: 'pH',
      value: ph ? String(ph.value) : 'Нет данных',
      hint: ph ? 'FACT' : 'нет датчика',
      ok: Boolean(ph),
    },
    {
      label: 'EC',
      value: ec ? `${ec.value} ${ec.unit}` : 'Нет данных',
      hint: ec ? 'FACT' : 'нет датчика',
      ok: Boolean(ec),
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold text-zinc-200">Состояние среды{zoneName ? ` · ${zoneName}` : ''}</p>
        {emergencyOff && <span className="text-[10px] font-semibold text-rose-400">Emergency Off</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-zinc-900 px-2.5 py-2 min-h-[64px]">
            <p className="text-[10px] text-zinc-500">{c.label}</p>
            <p className={`text-sm font-bold ${c.ok ? 'text-emerald-300' : 'text-zinc-500'}`}>{c.value}</p>
            <p className="text-[10px] text-zinc-600 leading-tight">{c.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
