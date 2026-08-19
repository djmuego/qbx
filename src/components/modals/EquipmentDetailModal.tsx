import React from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  EquipmentIcon,
  Zap,
  ChevronRight,
} from '../common/Icons';
import { ModeBadge, HighPowerBadge } from '../common/StatusBadge';
import { OutputControl } from '../equipment/OutputControl';
import { TwinControlStatusBadge } from '../equipment/TwinControlStatusBadge';
import { resolveOutputTwinMode } from '../../domain/equipment/output-twin-mode';
import { resolveOutputControlStatus } from '../../domain/equipment/output-control-status';
import { useLocale } from '../../i18n/LocaleContext';

export const EquipmentDetailModal: React.FC = () => {
  const {
    selectedEquipment,
    setSelectedEquipment,
    setOutputTwinMode,
    automations,
    setCurrentTab,
    isReadOnly,
    runtimeSnapshot,
    runtimeEvents,
  } = useApp();
  const { t } = useLocale();

  if (!selectedEquipment) return null;

  const { device, output } = selectedEquipment;
  const twinMode = resolveOutputTwinMode(output);
  const controlStatus = resolveOutputControlStatus({
    outputId: output.id,
    output,
    runtime: runtimeSnapshot?.outputStates[output.id],
    events: runtimeEvents,
  });

  const relatedAutomations = automations.filter(
    a => a.targetOutputId === output.id || (a.targetDeviceId === device.id && a.equipmentName === output.customName)
  );

  return (
    <Modal
      isOpen={Boolean(selectedEquipment)}
      onClose={() => setSelectedEquipment(null)}
      title={
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg ${
              output.state
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
            }`}
          >
            <EquipmentIcon
              type={output.type}
              isHighPower={output.isHighPower}
              className="w-5 h-5"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                {output.customName}
              </span>
              {output.isHighPower && <HighPowerBadge />}
            </div>
            <div className="text-xs text-zinc-400">
              {device.customName} · {t('twinControl.groupLabel', 'Режим управления')} #{output.portNumber}
            </div>
          </div>
        </div>
      }
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400 font-medium">{t('twinControl.powerState', 'Состояние')}</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-lg font-bold ${
                    output.state
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {output.state ? t('twinControl.powerOn', 'Включено') : t('twinControl.powerOff', 'Выключено')}
                </span>
                <ModeBadge isAuto={output.isAuto} />
                <TwinControlStatusBadge status={controlStatus} />
              </div>
            </div>
          </div>

          {!isReadOnly && (
            <OutputControl
              mode={twinMode}
              onChange={(mode) => setOutputTwinMode(device.id, output.id, mode)}
              size="md"
            />
          )}

          {!output.isAuto && (
            <p className="text-[11px] text-amber-700/90 dark:text-amber-300/90">
              {t('twinControl.manualHint', 'Автоматические правила приостановлены, пока выбран Вкл или Выкл.')}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Связанные сценарии и правила ({relatedAutomations.length})
          </h4>

          {relatedAutomations.length === 0 ? (
            <p className="text-xs text-zinc-400 py-1">
              Нет автоматизаций, управляющих этим оборудованием.
            </p>
          ) : (
            <div className="space-y-1.5">
              {relatedAutomations.map(auto => (
                <div
                  key={auto.id}
                  onClick={() => {
                    setSelectedEquipment(null);
                    setCurrentTab('automations');
                  }}
                  className="p-2.5 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <div>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">
                        {auto.name}
                      </span>
                      <div className="text-[10px] text-zinc-400">
                        {auto.type === 'schedule' && `Расписание: ${auto.onTime}–${auto.offTime}`}
                        {auto.type === 'sensor' && `По датчику: ${auto.sensorName}`}
                        {auto.type === 'timer' && `Таймер: каждые ${auto.intervalMinutes} мин`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setSelectedEquipment(null)}
            className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
};
