import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  SensorIcon,
  EquipmentIcon,
  Zap,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle2,
  Cpu,
  Sliders,
} from '../common/Icons';
import { SensorType, EquipmentType, PortInput, PortOutput } from '../../types';

export const DeviceDetailModal: React.FC = () => {
  const {
    selectedDeviceDetail,
    setSelectedDeviceDetail,
    updateDeviceName,
    assignDeviceToSpace,
    deleteDevice,
    configurePortInput,
    configurePortOutput,
    catalog,
    spaces,
    isReadOnly,
  } = useApp();

  const SENSOR_CONFIG = catalog.sensorConfig;
  const EQUIPMENT_CONFIG = catalog.equipmentConfig;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'ports'>('overview');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  if (!selectedDeviceDetail) return null;

  const device = selectedDeviceDetail;

  const handleStartRename = () => {
    setNameInput(device.customName);
    setIsEditingName(true);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      updateDeviceName(device.id, nameInput);
      setIsEditingName(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите удалить устройство "${device.customName}"?`)) {
      deleteDevice(device.id);
      setSelectedDeviceDetail(null);
    }
  };

  const sensorTypesList: { type: SensorType; label: string }[] = [
    { type: 'temperature', label: 'Температура воздуха' },
    { type: 'humidity', label: 'Влажность воздуха' },
    { type: 'soil_moisture', label: 'Влажность почвы' },
    { type: 'co2', label: 'Уровень CO₂' },
    { type: 'light', label: 'Освещённость' },
    { type: 'water_level', label: 'Уровень воды' },
    { type: 'ph', label: 'Кислотность (pH)' },
    { type: 'ec', label: 'Проводимость (EC)' },
    { type: 'pressure', label: 'Давление' },
    { type: 'other', label: 'Другой датчик' },
    { type: 'unused', label: 'Не используется' },
  ];

  const equipmentTypesList: { type: EquipmentType; label: string }[] = [
    { type: 'lighting', label: 'Освещение' },
    { type: 'watering', label: 'Полив / Помпа' },
    { type: 'ventilation', label: 'Вентиляция' },
    { type: 'heating', label: 'Обогрев' },
    { type: 'humidifier', label: 'Увлажнитель' },
    { type: 'valve', label: 'Клапан' },
    { type: 'co2', label: 'Подача CO₂' },
    { type: 'socket', label: 'Розетка' },
    { type: 'other', label: 'Другое' },
    { type: 'unused', label: 'Не используется' },
  ];

  return (
    <Modal
      isOpen={Boolean(selectedDeviceDetail)}
      onClose={() => setSelectedDeviceDetail(null)}
      title={
        isEditingName ? (
          <form onSubmit={handleSaveRename} className="flex items-center gap-2">
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              autoFocus
              className="px-2 py-1 text-base font-semibold bg-white dark:bg-zinc-800 border border-emerald-500 rounded-lg text-zinc-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
            >
              ОК
            </button>
          </form>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold">{device.customName}</span>
            <button
              onClick={handleStartRename}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              title="Переименовать"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      }
      subtitle={`${device.modelName} · В сети`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Navigation pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Подключено
          </button>
          <button
            onClick={() => setActiveTab('ports')}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
              activeTab === 'ports'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            Настроить подключения
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {!isReadOnly && spaces.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">Пространство</label>
                <select
                  value={device.spaceId}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next === device.spaceId) return;
                    const spaceName = spaces.find((s) => s.id === next)?.name ?? 'другое';
                    const ok = window.confirm(
                      `Переместить «${device.customName}» в «${spaceName}»? Привязки на карте в текущем пространстве будут сняты.`,
                    );
                    if (ok) assignDeviceToSpace(device.id, next);
                  }}
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Inputs Overview */}
            {device.inputs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Датчики ({device.inputs.filter(i => i.type !== 'unused').length} из {device.inputs.length})
                </h4>
                <div className="space-y-2">
                  {device.inputs.map(input => {
                    const isUsed = input.type !== 'unused';
                    return (
                      <div
                        key={input.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isUsed
                            ? 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800'
                            : 'bg-zinc-50/40 dark:bg-zinc-900/20 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                            <SensorIcon type={input.type} className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {input.customName}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {isUsed ? SENSOR_CONFIG[input.type]?.label : 'Порт свободен'}
                            </div>
                          </div>
                        </div>

                        {isUsed && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                              {input.currentValue} {input.unit}
                            </div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              В норме
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Outputs Overview */}
            {device.outputs.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Управляемое оборудование ({device.outputs.filter(o => o.type !== 'unused').length} из {device.outputs.length})
                </h4>
                <div className="space-y-2">
                  {device.outputs.map(output => {
                    const isUsed = output.type !== 'unused';
                    return (
                      <div
                        key={output.id}
                        className={`p-3 rounded-xl border flex items-center justify-between ${
                          isUsed
                            ? output.state
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30'
                              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800'
                            : 'bg-zinc-50/40 dark:bg-zinc-900/20 border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              output.state
                                ? 'bg-emerald-500 text-white'
                                : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            <EquipmentIcon
                              type={output.type}
                              isHighPower={output.isHighPower}
                              className="w-4 h-4"
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {output.customName}
                              </span>
                              {output.isHighPower && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Zap className="w-2.5 h-2.5 fill-current" />
                                  ⚡ Усиленный
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400">
                              {isUsed ? EQUIPMENT_CONFIG[output.type]?.label : 'Порт свободен'}
                            </div>
                          </div>
                        </div>

                        {isUsed && (
                          <div className="text-right">
                            <span
                              className={`text-xs font-semibold ${
                                output.state
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-zinc-400 dark:text-zinc-500'
                              }`}
                            >
                              {output.state ? 'Включено' : 'Выключено'}
                            </span>
                            <div className="text-[10px] text-zinc-400">
                              {output.isAuto ? 'Автоматически' : 'Ручной режим'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PORTS CONFIGURATION TAB */}
        {activeTab === 'ports' && (
          <div className="space-y-5">
            {/* Configure Inputs */}
            {device.inputs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Назначение датчиков
                </h4>

                <div className="space-y-3">
                  {device.inputs.map(input => (
                    <div
                      key={input.id}
                      className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Датчик #{input.portNumber}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Физический порт: {input.hardwareLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                            Что подключено?
                          </label>
                          <select
                            value={input.type}
                            onChange={e =>
                              configurePortInput(device.id, input.id, {
                                type: e.target.value as SensorType,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                          >
                            {sensorTypesList.map(item => (
                              <option key={item.type} value={item.type}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                            Понятное название
                          </label>
                          <input
                            type="text"
                            value={input.customName}
                            disabled={input.type === 'unused'}
                            onChange={e =>
                              configurePortInput(device.id, input.id, {
                                customName: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {input.type !== 'unused' && (
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            Показывать карточку на главной
                          </span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={input.showOnHome}
                              onChange={e =>
                                configurePortInput(device.id, input.id, {
                                  showOnHome: e.target.checked,
                                })
                              }
                              className="sr-only peer"
                            />
                            <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600" />
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configure Outputs */}
            {device.outputs.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Назначение выходов оборудования
                </h4>

                <div className="space-y-3">
                  {device.outputs.map(output => (
                    <div
                      key={output.id}
                      className="p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                            Выход #{output.portNumber}
                          </span>
                          {output.isHighPower && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              ⚡ Усиленный выход
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          Физический порт: {output.hardwareLabel}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                            Что подключено?
                          </label>
                          <select
                            value={output.type}
                            onChange={e =>
                              configurePortOutput(device.id, output.id, {
                                type: e.target.value as EquipmentType,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                          >
                            {equipmentTypesList.map(item => (
                              <option key={item.type} value={item.type}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
                            Понятное название
                          </label>
                          <input
                            type="text"
                            value={output.customName}
                            disabled={output.type === 'unused'}
                            onChange={e =>
                              configurePortOutput(device.id, output.id, {
                                customName: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* COLLAPSED ADVANCED SECTION */}
        <div className="border-t border-zinc-200/80 dark:border-zinc-800 pt-3">
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="w-full flex items-center justify-between py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            <span>Дополнительная информация об устройстве</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {isAdvancedOpen && (
            <div className="mt-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/60 dark:border-zinc-800 text-xs space-y-1.5 font-mono text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between">
                <span>Идентификатор устройства:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Модель:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.modelName}</span>
              </div>
              <div className="flex justify-between">
                <span>Серийный номер:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.serialNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Прошивка:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.firmwareVersion}</span>
              </div>
              <div className="flex justify-between">
                <span>Добавлено в систему:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">{device.addedAt}</span>
              </div>
            </div>
          )}
        </div>

        {/* Delete Device Action */}
        {!isReadOnly && (
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить устройство из пространства</span>
          </button>
        </div>
        )}
      </div>
    </Modal>
  );
};
