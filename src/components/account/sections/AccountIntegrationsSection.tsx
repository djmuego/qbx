import React, { useEffect, useState } from 'react';
import { Lock, Radio, Home, Cloud, Cpu, PlugZap } from 'lucide-react';
import { AccountCard } from '../AccountShell';
import { useLocale } from '../../../i18n/LocaleContext';
import { useSubscriptionGuard } from '../../../context/SubscriptionContext';
import { useAuth } from '../../../context/AuthContext';
import { cloudHistoryRetentionLabel } from '../../../application/commercial/journal-retention';
import {
  loadIntegrationsConfig,
  saveIntegrationsConfig,
} from '../../../application/integrations/hub-integration.store';
import {
  testHomeAssistantConnection,
  testMqttBrokerConnection,
} from '../../../application/integrations/integrations-connection.api';
import type { WorkspaceIntegrationsConfig } from '../../../domain/integrations/hub-integration.types';

export const AccountIntegrationsSection: React.FC = () => {
  const { t } = useLocale();
  const { activeWorkspaceId } = useAuth();
  const { allowed, requestAccess } = useSubscriptionGuard('EXTERNAL_HUB_INTEGRATION');
  const [config, setConfig] = useState<WorkspaceIntegrationsConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [mqttTestBusy, setMqttTestBusy] = useState(false);
  const [mqttTestResult, setMqttTestResult] = useState<string | null>(null);
  const [haTestBusy, setHaTestBusy] = useState(false);
  const [haTestResult, setHaTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setConfig(loadIntegrationsConfig(activeWorkspaceId));
  }, [activeWorkspaceId]);

  const persist = (next: WorkspaceIntegrationsConfig) => {
    if (!activeWorkspaceId) return;
    setConfig(next);
    saveIntegrationsConfig(activeWorkspaceId, next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (!config) {
    return <p className="text-xs text-slate-500">{t('common.loading', 'Загрузка…')}</p>;
  }

  const proGate = (action: () => void) => {
    if (!allowed) {
      requestAccess();
      return;
    }
    action();
  };

  const runMqttTest = async () => {
    if (!config?.mqtt.brokerUrl.trim()) {
      setMqttTestResult(t('integrations.mqttNoBroker', 'Укажите адрес брокера'));
      return;
    }
    setMqttTestBusy(true);
    setMqttTestResult(null);
    try {
      const result = await testMqttBrokerConnection({
        brokerUrl: config.mqtt.brokerUrl,
        port: config.mqtt.port,
      });
      if (result.ok) {
        setMqttTestResult(
          t('integrations.mqttOk', 'Брокер доступен') +
            ` (${result.latencyMs}ms · ${result.host}:${result.port})`,
        );
      } else {
        setMqttTestResult(result.error ?? t('integrations.mqttFail', 'Не удалось подключиться'));
      }
    } catch (e) {
      setMqttTestResult(e instanceof Error ? e.message : t('integrations.mqttFail', 'Не удалось подключиться'));
    } finally {
      setMqttTestBusy(false);
    }
  };

  const runHaTest = async () => {
    if (!config.homeAssistant.baseUrl.trim()) {
      setHaTestResult(t('integrations.haNoUrl', 'Укажите URL Home Assistant'));
      return;
    }
    if (!config.homeAssistant.accessToken?.trim()) {
      setHaTestResult(t('integrations.haNoToken', 'Укажите long-lived access token'));
      return;
    }
    setHaTestBusy(true);
    setHaTestResult(null);
    try {
      const result = await testHomeAssistantConnection({
        baseUrl: config.homeAssistant.baseUrl,
        accessToken: config.homeAssistant.accessToken,
      });
      if (result.ok) {
        setHaTestResult(
          `${t('integrations.haOk', 'Home Assistant API OK')}: ${result.version ?? 'OK'} (${result.latencyMs}ms)`,
        );
      } else {
        setHaTestResult(result.error ?? t('integrations.haFail', 'Не удалось подключиться'));
      }
    } catch (e) {
      setHaTestResult(e instanceof Error ? e.message : t('integrations.haFail', 'Не удалось подключиться'));
    } finally {
      setHaTestBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <AccountCard
        title={t('integrations.title', 'Внешние хабы')}
        description={t(
          'integrations.hint',
          'QBX Hub (фирменный Zigbee) — в разработке. Ниже — черновики подключений (без live-транспорта).',
        )}
      >
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          {t('integrations.qbxHubNote', 'Собственный QBX Zigbee Hub подключается позже — железо в пути.')}
        </p>

        {!allowed && (
          <p className="text-xs text-violet-700 dark:text-violet-300 mt-2 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            {t('integrations.proRequired', 'Настройка внешних хабов — Pro. Коннекторы появятся в следующем релизе.')}
          </p>
        )}

        <div className="mt-4 space-y-4">
          <section className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold">QBX Zigbee Hub</p>
            </div>
            <p className="text-xs text-slate-500 mb-2">{t('integrations.qbxHubDraft', 'Зарезервировано под фирменный хаб')}</p>
            <label className="flex items-center gap-2 text-xs mb-2">
              <input
                type="checkbox"
                checked={config.qbxZigbee.enabled}
                disabled={!allowed}
                onChange={(e) =>
                  proGate(() => persist({ ...config, qbxZigbee: { ...config.qbxZigbee, enabled: e.target.checked } }))
                }
              />
              {t('integrations.enabled', 'Включить (черновик)')}
            </label>
          </section>

          <section className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold">MQTT</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.mqtt.enabled}
                disabled={!allowed}
                onChange={(e) =>
                  proGate(() => persist({ ...config, mqtt: { ...config.mqtt, enabled: e.target.checked } }))
                }
              />
              {t('integrations.enabled', 'Включить (черновик)')}
            </label>
            <input
              disabled={!allowed}
              value={config.mqtt.brokerUrl}
              onChange={(e) => setConfig({ ...config, mqtt: { ...config.mqtt, brokerUrl: e.target.value } })}
              onBlur={() => proGate(() => persist(config))}
              placeholder="mqtt://broker.local"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                disabled={!allowed}
                type="number"
                value={config.mqtt.port}
                onChange={(e) =>
                  setConfig({ ...config, mqtt: { ...config.mqtt, port: Number(e.target.value) || 1883 } })
                }
                onBlur={() => proGate(() => persist(config))}
                placeholder="1883"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
              />
              <input
                disabled={!allowed}
                value={config.mqtt.topicPrefix}
                onChange={(e) => setConfig({ ...config, mqtt: { ...config.mqtt, topicPrefix: e.target.value } })}
                onBlur={() => proGate(() => persist(config))}
                placeholder="qbx/"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.mqtt.useTls}
                disabled={!allowed}
                onChange={(e) =>
                  proGate(() => persist({ ...config, mqtt: { ...config.mqtt, useTls: e.target.checked } }))
                }
              />
              TLS
            </label>
            <button
              type="button"
              disabled={!allowed || mqttTestBusy}
              onClick={() => proGate(() => void runMqttTest())}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-60"
            >
              <PlugZap className="w-3.5 h-3.5" />
              {mqttTestBusy
                ? t('integrations.testing', 'Проверка…')
                : t('integrations.mqttTest', 'Проверить TCP')}
            </button>
            {mqttTestResult && <p className="text-[11px] text-slate-500">{mqttTestResult}</p>}
          </section>

          <section className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold">Home Assistant</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.homeAssistant.enabled}
                disabled={!allowed}
                onChange={(e) =>
                  proGate(() =>
                    persist({ ...config, homeAssistant: { ...config.homeAssistant, enabled: e.target.checked } }),
                  )
                }
              />
              {t('integrations.enabled', 'Включить (черновик)')}
            </label>
            <input
              disabled={!allowed}
              value={config.homeAssistant.baseUrl}
              onChange={(e) =>
                setConfig({ ...config, homeAssistant: { ...config.homeAssistant, baseUrl: e.target.value } })
              }
              onBlur={() => proGate(() => persist(config))}
              placeholder="http://homeassistant.local:8123"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            />
            <input
              disabled={!allowed}
              type="password"
              value={config.homeAssistant.accessToken ?? ''}
              onChange={(e) =>
                setConfig({ ...config, homeAssistant: { ...config.homeAssistant, accessToken: e.target.value } })
              }
              onBlur={() => proGate(() => persist(config))}
              placeholder={t('integrations.haToken', 'Long-lived access token')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!allowed || haTestBusy}
              onClick={() => proGate(() => void runHaTest())}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-60"
            >
              <PlugZap className="w-3.5 h-3.5" />
              {haTestBusy ? t('integrations.testing', 'Проверка…') : t('integrations.haTest', 'Проверить API')}
            </button>
            {haTestResult && <p className="text-[11px] text-slate-500">{haTestResult}</p>}
          </section>

          <section className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold">Tuya</p>
            </div>
            <select
              disabled={!allowed}
              value={config.tuya.region}
              onChange={(e) => {
                const next = { ...config, tuya: { ...config.tuya, region: e.target.value } };
                setConfig(next);
                proGate(() => persist(next));
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            >
              <option value="eu">EU</option>
              <option value="us">US</option>
              <option value="cn">CN</option>
            </select>
            <p className="text-[11px] text-slate-400">{t('integrations.tuyaSoon', 'Cloud connector — следующий релиз')}</p>
          </section>
        </div>

        {saved && (
          <p className="text-xs text-emerald-600 mt-2">{t('integrations.saved', 'Сохранено')}</p>
        )}
      </AccountCard>

      <AccountCard
        title={t('integrations.journalTitle', 'Grow Journal в облаке')}
        description={t('integrations.journalHint', 'История грова синхронизируется с Supabase для workspace.')}
      >
        <p className="text-sm font-semibold">
          {t('integrations.retention', 'Хранение')}: {cloudHistoryRetentionLabel()}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {allowed
            ? t('integrations.retentionPro', 'Pro — полная история журнала в облаке.')
            : t('integrations.retentionFree', 'Free — последние 3 дня в облаке. Локальный журнал в браузере не ограничен.')}
        </p>
      </AccountCard>
    </div>
  );
};
