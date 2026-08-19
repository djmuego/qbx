import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  Zap,
  Clock,
  Timer,
  ChevronRight,
  ChevronDown,
  Check,
  SensorIcon,
  EquipmentIcon,
} from '../common/Icons';
import { AutomationTriggerType, SensorType, EquipmentType } from '../../types';

export const AddAutomationModal: React.FC = () => {
  const {
    isAddAutomationOpen,
    setIsAddAutomationOpen,
    currentSpaceId,
    allSensorsInCurrentSpace,
    allOutputsInCurrentSpace,
    addAutomation,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>('sensor');
  
  // Sensor trigger state
  const [selectedSensorIndex, setSelectedSensorIndex] = useState<number>(0);
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [threshold, setThreshold] = useState<number>(30);
  const [stopThreshold, setStopThreshold] = useState<number>(55);

  // Schedule trigger state
  const [onTime, setOnTime] = useState<string>('07:00');
  const [offTime, setOffTime] = useState<string>('21:00');

  // Timer trigger state
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [durationSeconds, setDurationSeconds] = useState<number>(30);

  // Action state
  const [selectedOutputIndex, setSelectedOutputIndex] = useState<number>(0);
  const [actionType, setActionType] = useState<'turn_on' | 'turn_off'>('turn_on');

  // Name
  const [ruleName, setRuleName] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const currentSensor = allSensorsInCurrentSpace[selectedSensorIndex];
  const currentOutput = allOutputsInCurrentSpace[selectedOutputIndex];

  const resetForm = () => {
    setStep(1);
    setTriggerType('sensor');
    setSelectedSensorIndex(0);
    setCondition('below');
    setThreshold(30);
    setStopThreshold(55);
    setOnTime('07:00');
    setOffTime('21:00');
    setIntervalMinutes(60);
    setDurationSeconds(30);
    setSelectedOutputIndex(0);
    setActionType('turn_on');
    setRuleName('');
    setFormError(null);
  };

  const handleClose = () => {
    setIsAddAutomationOpen(false);
    setTimeout(resetForm, 200);
  };

  // Auto-generate name suggestion
  const generateSuggestedName = () => {
    if (triggerType === 'sensor') {
      const sName = currentSensor?.sensor.customName || 'Датчик';
      const eqName = currentOutput?.output.customName || 'Оборудование';
      return `${eqName} при ${sName.toLowerCase()}`;
    }
    if (triggerType === 'schedule') {
      const eqName = currentOutput?.output.customName || 'Свет';
      return `${eqName} по расписанию (${onTime}–${offTime})`;
    }
    const eqName = currentOutput?.output.customName || 'Оборудование';
    return `Циклическое включение: ${eqName}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const targetDev = currentOutput?.device;
    const targetOut = currentOutput?.output;

    if (!targetDev || !targetOut) {
      setFormError('Пожалуйста, выберите оборудование для управления');
      return;
    }
    setFormError(null);

    const finalName = ruleName.trim() || generateSuggestedName();

    if (triggerType === 'sensor') {
      const sDev = currentSensor?.device;
      const sInput = currentSensor?.sensor;

      addAutomation({
        spaceId: currentSpaceId,
        name: finalName,
        isEnabled: true,
        type: 'sensor',
        sensorDeviceId: sDev?.id,
        sensorInputId: sInput?.id,
        sensorName: sInput?.customName || 'Датчик',
        sensorType: sInput?.type || 'temperature',
        condition,
        threshold: Number(threshold),
        thresholdUnit: sInput?.unit || '',
        stopThreshold: stopThreshold ? Number(stopThreshold) : undefined,
        targetDeviceId: targetDev.id,
        targetOutputId: targetOut.id,
        equipmentName: targetOut.customName,
        actionType,
      });
    } else if (triggerType === 'schedule') {
      addAutomation({
        spaceId: currentSpaceId,
        name: finalName,
        isEnabled: true,
        type: 'schedule',
        scheduleDays: [0, 1, 2, 3, 4, 5, 6],
        onTime,
        offTime,
        targetDeviceId: targetDev.id,
        targetOutputId: targetOut.id,
        equipmentName: targetOut.customName,
        actionType,
      });
    } else {
      addAutomation({
        spaceId: currentSpaceId,
        name: finalName,
        isEnabled: true,
        type: 'timer',
        intervalMinutes: Number(intervalMinutes),
        durationSeconds: Number(durationSeconds),
        targetDeviceId: targetDev.id,
        targetOutputId: targetOut.id,
        equipmentName: targetOut.customName,
        actionType,
      });
    }

    handleClose();
  };

  return (
    <Modal
      isOpen={isAddAutomationOpen}
      onClose={handleClose}
      title="Создать автоматизацию"
      subtitle={`Шаг ${step} из 4`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-xs font-semibold border border-rose-200 dark:border-rose-800">
            {formError}
          </div>
        )}
        {/* STEP 1: TRIGGER TYPE */}
        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Когда должно сработать правило?
            </label>

            <div className="space-y-2">
              {/* SENSOR TRIGGER */}
              <div
                onClick={() => setTriggerType('sensor')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  triggerType === 'sensor'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      По показаниям датчика
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Влажность, температура, CO₂ и другие параметры
                    </p>
                  </div>
                </div>
                {triggerType === 'sensor' && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              </div>

              {/* SCHEDULE TRIGGER */}
              <div
                onClick={() => setTriggerType('schedule')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  triggerType === 'schedule'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      По расписанию
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Суточный световой день или фиксированное время
                    </p>
                  </div>
                </div>
                {triggerType === 'schedule' && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              </div>

              {/* TIMER TRIGGER */}
              <div
                onClick={() => setTriggerType('timer')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  triggerType === 'timer'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Циклический таймер
                    </h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Периодический полив, продувка или перемешивание
                    </p>
                  </div>
                </div>
                {triggerType === 'timer' && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CONDITIONS */}
        {step === 2 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Настройте условие срабатывания
            </label>

            {triggerType === 'sensor' && (
              <div className="space-y-3">
                {allSensorsInCurrentSpace.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    В этом пространстве нет датчиков. Переключитесь на расписание или добавьте датчик.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Выберите датчик
                      </label>
                      <select
                        value={selectedSensorIndex}
                        onChange={e => {
                          const idx = Number(e.target.value);
                          setSelectedSensorIndex(idx);
                          const s = allSensorsInCurrentSpace[idx]?.sensor;
                          if (s?.type === 'temperature') {
                            setThreshold(28);
                            setStopThreshold(25);
                          } else if (s?.type === 'soil_moisture') {
                            setThreshold(30);
                            setStopThreshold(55);
                          } else if (s?.type === 'co2') {
                            setThreshold(800);
                            setStopThreshold(1200);
                          }
                        }}
                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-emerald-500"
                      >
                        {allSensorsInCurrentSpace.map((item, idx) => (
                          <option key={item.sensor.id} value={idx}>
                            {item.sensor.customName} ({item.sensor.currentValue} {item.sensor.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Когда значение
                        </label>
                        <select
                          value={condition}
                          onChange={e => setCondition(e.target.value as 'above' | 'below')}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                        >
                          <option value="below">Ниже порога ( &lt; )</option>
                          <option value="above">Выше порога ( &gt; )</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Порог ({currentSensor?.sensor.unit})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={threshold}
                          onChange={e => setThreshold(Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Остановить при достижении ({currentSensor?.sensor.unit})
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={stopThreshold}
                        onChange={e => setStopThreshold(Number(e.target.value))}
                        className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                      />
                      <span className="text-[11px] text-zinc-400">
                        Оборудование выключится, когда показатель вернётся в норму
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {triggerType === 'schedule' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Время включения
                    </label>
                    <input
                      type="time"
                      value={onTime}
                      onChange={e => setOnTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      Время выключения
                    </label>
                    <input
                      type="time"
                      value={offTime}
                      onChange={e => setOffTime(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Правило будет повторяться каждый день в заданные часы.
                </p>
              </div>
            )}

            {triggerType === 'timer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Повторять каждые (минут)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={intervalMinutes}
                    onChange={e => setIntervalMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Включать на (секунд)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={durationSeconds}
                    onChange={e => setDurationSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ACTION */}
        {step === 3 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Что сделать при срабатывании?
            </label>

            {allOutputsInCurrentSpace.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                В этом пространстве нет подключённого оборудования. Сначала добавьте силовой блок QBX.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Выберите оборудование
                  </label>
                  <select
                    value={selectedOutputIndex}
                    onChange={e => setSelectedOutputIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    {allOutputsInCurrentSpace.map((item, idx) => (
                      <option key={item.output.id} value={idx}>
                        {item.output.customName} ({item.device.customName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Действие
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionType('turn_on')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        actionType === 'turn_on'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Включить
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionType('turn_off')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                        actionType === 'turn_off'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      Выключить
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Назад
              </button>
              <button
                type="button"
                disabled={allOutputsInCurrentSpace.length === 0}
                onClick={() => {
                  if (!ruleName) {
                    setRuleName(generateSuggestedName());
                  }
                  setStep(4);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>Далее</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: NAME & FINISH */}
        {step === 4 && (
          <div className="space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Название автоматизации
            </label>

            <div>
              <input
                type="text"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder={generateSuggestedName()}
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                Понятное название, чтобы легко находить правило в списке.
              </p>
            </div>

            {/* Summary preview */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs space-y-1.5">
              <div className="font-semibold text-zinc-700 dark:text-zinc-300">Итоговый сценарий:</div>
              <div className="text-zinc-600 dark:text-zinc-400">
                {triggerType === 'sensor' && (
                  <span>
                    Когда <b>{currentSensor?.sensor.customName}</b> {condition === 'below' ? 'ниже' : 'выше'} <b>{threshold}{currentSensor?.sensor.unit}</b> → {actionType === 'turn_on' ? 'включить' : 'выключить'} <b>{currentOutput?.output.customName}</b> (остановить при {stopThreshold}{currentSensor?.sensor.unit}).
                  </span>
                )}
                {triggerType === 'schedule' && (
                  <span>
                    Каждый день в <b>{onTime}</b> {actionType === 'turn_on' ? 'включить' : 'выключить'} <b>{currentOutput?.output.customName}</b> и выключить в <b>{offTime}</b>.
                  </span>
                )}
                {triggerType === 'timer' && (
                  <span>
                    Каждые <b>{intervalMinutes} мин</b> {actionType === 'turn_on' ? 'включить' : 'выключить'} <b>{currentOutput?.output.customName}</b> на <b>{durationSeconds} сек</b>.
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Назад
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs"
              >
                Сохранить правило
              </button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
