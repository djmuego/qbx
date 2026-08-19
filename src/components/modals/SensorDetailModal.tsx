import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { SensorIcon, Zap, Check, ChevronRight } from '../common/Icons';
import { SensorStatusBadge } from '../common/StatusBadge';

export const SensorDetailModal: React.FC = () => {
  const {
    selectedSensor,
    setSelectedSensor,
    automations,
    toggleSensorHomeVisibility,
    setCurrentTab,
    getSensorHistory,
  } = useApp();

  if (!selectedSensor) return null;

  const { device, sensor } = selectedSensor;

  // Find automations triggered by this sensor
  const relatedAutomations = automations.filter(
    a => a.sensorInputId === sensor.id || (a.sensorType === sensor.type && a.sensorDeviceId === device.id)
  );

  const runtimeHistory = getSensorHistory(sensor.id);
  const history = runtimeHistory.length > 1 ? runtimeHistory : sensor.history ?? [];
  const hasHistory = history.length > 1;
  const displayValue = Number.isFinite(sensor.currentValue) ? sensor.currentValue : null;

  const values = hasHistory ? history.map((h) => h.value) : [];
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;
  const avgVal = values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0;

  // SVG Sparkline calculation
  const width = 360;
  const height = 110;
  const padding = 15;
  const range = maxVal - minVal || 1;

  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((h.value - minVal) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width - padding},${height} L ${padding},${height} Z`;

  return (
    <Modal
      isOpen={Boolean(selectedSensor)}
      onClose={() => setSelectedSensor(null)}
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <SensorIcon type={sensor.type} className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              {sensor.customName}
            </div>
            <div className="text-xs text-zinc-400">{device.customName}</div>
          </div>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Top: Big Value & Status Badge */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-zinc-400 font-medium">Текущее показание</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white font-mono">
                {displayValue ?? '—'}
              </span>
              <span className="text-base font-semibold text-zinc-500">
                {displayValue != null ? sensor.unit : 'Нет данных'}
              </span>
            </div>
          </div>

          <SensorStatusBadge status={sensor.status} />
        </div>

        {/* History chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">История</span>
          </div>

          {!hasHistory ? (
            <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50/70 dark:bg-zinc-800/30 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Недостаточно данных
            </div>
          ) : (
          <div className="p-3 bg-zinc-50/70 dark:bg-zinc-800/30 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex flex-col items-center">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
              <defs>
                <linearGradient id="sensorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Area */}
              <path d={areaD} fill="url(#sensorGrad)" />
              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {history.map((h, i) => {
                const x = padding + (i / (history.length - 1)) * (width - 2 * padding);
                const y = height - padding - ((h.value - minVal) / range) * (height - 2 * padding);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    className="fill-emerald-600 dark:fill-emerald-400 stroke-white dark:stroke-zinc-900"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>

            {/* Time labels below */}
            <div className="w-full flex justify-between text-[10px] text-zinc-400 px-2 mt-1">
              <span>{history[0]?.time}</span>
              <span>{history[Math.floor(history.length / 2)]?.time}</span>
              <span>{history[history.length - 1]?.time}</span>
            </div>
          </div>
          )}
        </div>

        {hasHistory && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[11px] text-zinc-400">Минимум</div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
              {minVal} {sensor.unit}
            </div>
          </div>
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[11px] text-zinc-400">Среднее</div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
              {avgVal} {sensor.unit}
            </div>
          </div>
          <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="text-[11px] text-zinc-400">Максимум</div>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono mt-0.5">
              {maxVal} {sensor.unit}
            </div>
          </div>
        </div>
        )}

        {/* Related Automations */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Связанные автоматизации ({relatedAutomations.length})
          </h4>

          {relatedAutomations.length === 0 ? (
            <p className="text-xs text-zinc-400 py-1">Нет активных правил, привязанных к этому датчику</p>
          ) : (
            <div className="space-y-1.5">
              {relatedAutomations.map(auto => (
                <div
                  key={auto.id}
                  onClick={() => {
                    setSelectedSensor(null);
                    setCurrentTab('automations');
                  }}
                  className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{auto.name}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Visibility Toggle */}
        <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Показывать карточку на главной странице
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={sensor.showOnHome}
              onChange={() => toggleSensorHomeVisibility(device.id, sensor.id)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>
      </div>
    </Modal>
  );
};
