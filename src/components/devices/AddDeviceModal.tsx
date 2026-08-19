import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { Modal } from '../common/Modal';
import { isSimulatorMode } from '../../config/runtime-mode';
import {
  Cpu,
  Zap,
  ChevronRight,
  RefreshCw,
  Plus,
  Bluetooth,
} from '../common/Icons';
import { QBXModelDef } from '../../types';
import { SPACE_TYPE_LABELS, type SpaceType } from '../../domain/space/space.types';
import {
  type DiscoveredQbxDevice,
  isBleDiscoverySupported,
  requestBleQbxDevice,
  runInitialQbxScan,
} from '../../application/devices/qbx-discovery.service';

type DiscoveryPhase = 'searching' | 'results' | 'not_found';
type HardwareTab = 'discover' | 'manual';

interface ManualWizardProps {
  deviceModels: QBXModelDef[];
  defaultModel: QBXModelDef | undefined;
  spaces: { id: string; name: string }[];
  currentSpaceId: string;
  onSubmit: (modelId: string, customName: string, spaceId: string) => void;
  onCancel: () => void;
  subtitle?: string;
}

const ManualDeviceWizard: React.FC<ManualWizardProps> = ({
  deviceModels,
  defaultModel,
  spaces,
  currentSpaceId,
  onSubmit,
  onCancel,
  subtitle,
}) => {
  const { t } = useLocale();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedModel, setSelectedModel] = useState<QBXModelDef | undefined>(defaultModel);
  const [customName, setCustomName] = useState('');
  const [targetSpaceId, setTargetSpaceId] = useState(currentSpaceId);

  useEffect(() => {
    setTargetSpaceId(currentSpaceId || spaces[0]?.id || '');
  }, [currentSpaceId, spaces]);

  useEffect(() => {
    if (defaultModel) {
      setSelectedModel(defaultModel);
      setCustomName(defaultModel.name);
    }
  }, [defaultModel]);

  const handleModelSelect = (model: QBXModelDef) => {
    setSelectedModel(model);
    setCustomName(model.name);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !targetSpaceId) return;
    onSubmit(selectedModel.id, customName, targetSpaceId);
  };

  if (step === 1) {
    return (
      <div className="space-y-3">
        {subtitle && <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {deviceModels.map((model) => {
            const isSelected = selectedModel?.id === model.id;
            return (
              <div
                key={model.id}
                onClick={() => handleModelSelect(model)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{model.name}</h4>
                    {model.hasHighPowerOutput && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <Zap className="w-2.5 h-2.5 fill-current" />
                        {t('devices.highPower', 'High Power')}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">{model.category}</div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{model.description}</p>
                  {model.product?.consumerReady && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                        {t('devices.product.consumerBadge', 'Готов к покупке')}
                      </span>
                      {model.product.purchaseUrl && (
                        <a
                          href={model.product.purchaseUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-semibold text-emerald-600 hover:underline"
                        >
                          {t('devices.product.buy', 'Купить')}
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>{t('devices.selectModel', 'Выбрать модель')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end pt-1">
          <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-medium text-zinc-600 rounded-xl">
            {t('common.cancel', 'Отмена')}
          </button>
        </div>
      </div>
    );
  }

  if (!selectedModel) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs text-zinc-400">{t('discovery.selectedModel', 'Выбранная модель')}</div>
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">
            {selectedModel.name} ({selectedModel.category})
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('discovery.deviceName', 'Название устройства')}
        </label>
        <input
          type="text"
          required
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('discovery.space', 'Пространство')}
        </label>
        <select
          value={targetSpaceId}
          onChange={(e) => setTargetSpaceId(e.target.value)}
          className="w-full px-3.5 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl"
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-3 flex justify-between">
        <button type="button" onClick={() => setStep(1)} className="px-3 py-2 text-xs font-medium text-zinc-600 rounded-xl">
          {t('common.back', 'Назад')}
        </button>
        <button type="submit" className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          {t('discovery.addDevice', 'Добавить устройство')}
        </button>
      </div>
    </form>
  );
};

const DiscoverPanel: React.FC<{
  spaces: { id: string; name: string }[];
  currentSpaceId: string;
  onAdd: (modelId: string, name: string, spaceId: string) => void;
  onManual: () => void;
}> = ({ spaces, currentSpaceId, onAdd, onManual }) => {
  const { t } = useLocale();
  const [phase, setPhase] = useState<DiscoveryPhase>('searching');
  const [found, setFound] = useState<DiscoveredQbxDevice[]>([]);
  const [bleAvailable, setBleAvailable] = useState(false);
  const [bleBusy, setBleBusy] = useState(false);

  const runScan = () => {
    setPhase('searching');
    void runInitialQbxScan(2000).then((result) => {
      setBleAvailable(result.bleAvailable);
      setFound(result.devices);
      setPhase(result.devices.length ? 'results' : 'not_found');
    });
  };

  useEffect(() => {
    runScan();
  }, []);

  const handleBle = async () => {
    if (!isBleDiscoverySupported()) return;
    setBleBusy(true);
    try {
      const device = await requestBleQbxDevice();
      if (device) {
        setFound((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
        setPhase('results');
        onAdd(device.modelId, device.displayName, currentSpaceId || spaces[0]?.id || '');
      }
    } finally {
      setBleBusy(false);
    }
  };

  if (phase === 'searching') {
    return (
      <div className="py-10 flex flex-col items-center gap-3 text-slate-500 dark:text-zinc-400">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm font-medium">{t('discovery.searching', 'Поиск устройств QBX…')}</p>
        <p className="text-xs text-center max-w-xs">{t('discovery.searchingHint', '')}</p>
      </div>
    );
  }

  if (phase === 'results' && found.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{t('discovery.foundDevices', 'Найдено')}</p>
        {found.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-2 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{d.displayName}</p>
              <p className="text-[11px] text-slate-500">{d.signalLabel ?? d.transport}</p>
            </div>
            <button
              type="button"
              onClick={() => onAdd(d.modelId, d.displayName, currentSpaceId || spaces[0]?.id || '')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white"
            >
              {t('discovery.addFound', 'Добавить')}
            </button>
          </div>
        ))}
        <p className="text-[11px] text-slate-500">{t('discovery.wifiHint', '')}</p>
        <DiscoverActions
          bleAvailable={bleAvailable}
          bleBusy={bleBusy}
          onRetry={runScan}
          onBle={handleBle}
          onManual={onManual}
        />
      </div>
    );
  }

  return (
    <div className="py-4 flex flex-col items-center gap-3 text-center">
      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
        <RefreshCw className="w-8 h-8" />
      </div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{t('discovery.notFoundTitle', '')}</h4>
      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm leading-relaxed">{t('discovery.notFoundHint', '')}</p>
      <p className="text-[11px] text-violet-600 dark:text-violet-400 max-w-sm">{t('discovery.wifiHint', '')}</p>
      <DiscoverActions
        bleAvailable={bleAvailable}
        bleBusy={bleBusy}
        onRetry={runScan}
        onBle={handleBle}
        onManual={onManual}
      />
    </div>
  );
};

const DiscoverActions: React.FC<{
  bleAvailable: boolean;
  bleBusy: boolean;
  onRetry: () => void;
  onBle: () => void;
  onManual: () => void;
}> = ({ bleAvailable, bleBusy, onRetry, onBle, onManual }) => {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-1">
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200/70 dark:border-emerald-800/60"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {t('discovery.retry', 'Повторить поиск')}
      </button>
      {bleAvailable ? (
        <button
          type="button"
          disabled={bleBusy}
          onClick={onBle}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl disabled:opacity-60"
        >
          <Bluetooth className="w-3.5 h-3.5" />
          {t('discovery.bleScan', 'Найти по Bluetooth')}
        </button>
      ) : (
        <span className="text-[10px] text-slate-400 max-w-[200px]">{t('discovery.bleUnsupported', '')}</span>
      )}
      <button
        type="button"
        onClick={onManual}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
      >
        <Plus className="w-3.5 h-3.5" />
        {t('discovery.tabManual', 'Добавить вручную')}
      </button>
    </div>
  );
};

export const AddDeviceModal: React.FC = () => {
  const {
    isAddDeviceOpen,
    setIsAddDeviceOpen,
    addDevicePreferredModelId,
    spaces,
    currentSpaceId,
    addDevice,
    catalog,
    isReadOnly,
  } = useApp();
  const { t } = useLocale();

  const deviceModels = catalog.deviceModels;
  const preferred =
    addDevicePreferredModelId != null
      ? deviceModels.find((m) => m.id === addDevicePreferredModelId)
      : undefined;
  const defaultModel = preferred ?? deviceModels[0];
  const simulator = isSimulatorMode();

  const [hardwareTab, setHardwareTab] = useState<HardwareTab>(preferred ? 'manual' : 'discover');

  useEffect(() => {
    if (isAddDeviceOpen && preferred) setHardwareTab('manual');
    if (isAddDeviceOpen && !preferred) setHardwareTab('discover');
  }, [isAddDeviceOpen, preferred]);

  const handleClose = () => {
    setIsAddDeviceOpen(false);
    setTimeout(() => setHardwareTab('discover'), 200);
  };

  const handleSubmit = (modelId: string, customName: string, targetSpaceId: string) => {
    addDevice(modelId, customName, targetSpaceId);
    handleClose();
  };

  if (isReadOnly) return null;

  if (!simulator) {
    return (
      <Modal
        isOpen={isAddDeviceOpen}
        onClose={handleClose}
        title={t('discovery.title', 'Добавить устройство QBX')}
        subtitle={
          hardwareTab === 'discover'
            ? t('discovery.subtitleDiscover', '')
            : t('discovery.subtitleManual', '')
        }
        maxWidth="lg"
      >
        <div className="flex gap-1 p-1 mb-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <button
            type="button"
            onClick={() => setHardwareTab('discover')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              hardwareTab === 'discover'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {t('discovery.tabDiscover', 'Автопоиск')}
          </button>
          <button
            type="button"
            onClick={() => setHardwareTab('manual')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              hardwareTab === 'manual'
                ? 'bg-white dark:bg-zinc-900 text-emerald-700 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            {t('discovery.tabManual', 'Добавить вручную')}
          </button>
        </div>

        {hardwareTab === 'discover' ? (
          <DiscoverPanel
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            onAdd={handleSubmit}
            onManual={() => setHardwareTab('manual')}
          />
        ) : (
          <ManualDeviceWizard
            deviceModels={deviceModels}
            defaultModel={defaultModel}
            spaces={spaces}
            currentSpaceId={currentSpaceId}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            subtitle={t('discovery.manualOfflineHint', '')}
          />
        )}
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isAddDeviceOpen}
      onClose={handleClose}
      title={t('discovery.title', 'Добавить устройство QBX')}
      subtitle={t('discovery.subtitleManual', '')}
      maxWidth="lg"
    >
      <ManualDeviceWizard
        deviceModels={deviceModels}
        defaultModel={defaultModel}
        spaces={spaces}
        currentSpaceId={currentSpaceId}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        subtitle={t('discovery.simHint', '')}
      />
    </Modal>
  );
};

export { SPACE_TYPE_LABELS };
