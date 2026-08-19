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
  loadIntegrationsAdvisory,
  saveIntegrationsAdvisory,
} from '../../../application/integrations/integrations-advisory.store';
import {
  fetchHomeAssistantEntities,
  fetchHomeAssistantBoundStates,
  fetchMqttBridgeMessages,
  fetchMqttBridgeStatus,
  startMqttTopicMonitor,
  stopMqttTopicMonitor,
  testHomeAssistantConnection,
  testMqttBrokerConnection,
  testTuyaCloudConnection,
} from '../../../application/integrations/integrations-connection.api';
import type { MqttBridgeMessageResult } from '../../../application/integrations/integrations-connection.api';
import type { WorkspaceIntegrationsConfig } from '../../../domain/integrations/hub-integration.types';
import type { MqttTopicMapping } from '../../../domain/integrations/mqtt-topic-mapping.types';
import type { HomeAssistantEntityBinding } from '../../../domain/integrations/home-assistant-binding.types';
import { parseHomeAssistantNumericState } from '../../../application/integrations/home-assistant-state-parser';

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
  const [haEntitiesBusy, setHaEntitiesBusy] = useState(false);
  const [haStatesBusy, setHaStatesBusy] = useState(false);
  const [tuyaTestBusy, setTuyaTestBusy] = useState(false);
  const [tuyaTestResult, setTuyaTestResult] = useState<string | null>(null);
  const [mqttMonitorBusy, setMqttMonitorBusy] = useState(false);
  const [mqttMonitorActive, setMqttMonitorActive] = useState(false);
  const [mqttMessages, setMqttMessages] = useState<MqttBridgeMessageResult[]>([]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setConfig(loadIntegrationsConfig(activeWorkspaceId));
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!mqttMonitorActive || !activeWorkspaceId || !config) return;
    const persistAdvisory = (
      status: Awaited<ReturnType<typeof fetchMqttBridgeStatus>>,
      messages: MqttBridgeMessageResult[],
    ) => {
      saveIntegrationsAdvisory({
        workspaceId: activeWorkspaceId,
        updatedAtMs: Date.now(),
        mqttMonitorActive: status.active && status.connected,
        mqttMappingCount: config.mqtt.topicMappings.length,
        haBindingCount: config.homeAssistant.entityBindings.length,
        haEntityCount: config.homeAssistant.lastDiscovery?.entityCount ?? null,
        readings: messages
          .filter((m) => m.mapped)
          .map((m) => ({
            source: 'mqtt' as const,
            topic: m.topic,
            deviceId: m.mapped!.deviceId,
            inputId: m.mapped!.inputId,
            value: m.mapped!.value,
            unit: m.mapped!.unit,
            receivedAtMs: m.receivedAtMs,
          })),
      });
    };
    const poll = async () => {
      try {
        const status = await fetchMqttBridgeStatus();
        setMqttMonitorActive(status.active && status.connected);
        const { messages } = await fetchMqttBridgeMessages(12);
        setMqttMessages(messages);
        persistAdvisory(status, messages);
      } catch {
        setMqttMonitorActive(false);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => window.clearInterval(timer);
  }, [mqttMonitorActive, activeWorkspaceId, config]);

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

  const runMqttMonitor = async () => {
    if (!config?.mqtt.brokerUrl.trim()) {
      setMqttTestResult(t('integrations.mqttNoBroker', 'Укажите адрес брокера'));
      return;
    }
    setMqttMonitorBusy(true);
    setMqttTestResult(null);
    try {
      const result = await startMqttTopicMonitor({
        brokerUrl: config.mqtt.brokerUrl,
        port: config.mqtt.port,
        topicPrefix: config.mqtt.topicPrefix,
        useTls: config.mqtt.useTls,
        topicMappings: config.mqtt.topicMappings,
      });
      if (result.ok && result.status) {
        setMqttMonitorActive(true);
        setMqttTestResult(
          t('integrations.mqttMonitorOn', 'MQTT monitor активен') +
            ` · ${result.status.topicFilter} (${result.status.brokerHost}:${result.status.port})`,
        );
      } else {
        setMqttTestResult(result.error ?? t('integrations.mqttFail', 'Не удалось подключиться'));
      }
    } catch (e) {
      setMqttTestResult(e instanceof Error ? e.message : t('integrations.mqttFail', 'Не удалось подключиться'));
    } finally {
      setMqttMonitorBusy(false);
    }
  };

  const stopMqttMonitor = async () => {
    await stopMqttTopicMonitor();
    setMqttMonitorActive(false);
    setMqttMessages([]);
    setMqttTestResult(t('integrations.mqttMonitorOff', 'MQTT monitor остановлен'));
  };

  const updateMapping = (id: string, patch: Partial<MqttTopicMapping>) => {
    const topicMappings = config.mqtt.topicMappings.map((m) => (m.id === id ? { ...m, ...patch } : m));
    persist({ ...config, mqtt: { ...config.mqtt, topicMappings } });
  };

  const addMapping = () => {
    const prefix = config.mqtt.topicPrefix.endsWith('/') ? config.mqtt.topicPrefix : `${config.mqtt.topicPrefix}/`;
    const row: MqttTopicMapping = {
      id: `map-${Date.now()}`,
      topicPattern: `${prefix}+/temp`,
      deviceId: '',
      inputId: '',
      unit: '°C',
    };
    persist({ ...config, mqtt: { ...config.mqtt, topicMappings: [...config.mqtt.topicMappings, row] } });
  };

  const removeMapping = (id: string) => {
    persist({
      ...config,
      mqtt: { ...config.mqtt, topicMappings: config.mqtt.topicMappings.filter((m) => m.id !== id) },
    });
  };

  const updateHaBinding = (id: string, patch: Partial<HomeAssistantEntityBinding>) => {
    const entityBindings = config.homeAssistant.entityBindings.map((b) =>
      b.id === id ? { ...b, ...patch } : b,
    );
    persist({ ...config, homeAssistant: { ...config.homeAssistant, entityBindings } });
  };

  const addHaBinding = () => {
    const sample = config.homeAssistant.lastDiscovery?.sampleEntities[0] ?? 'sensor.example';
    const row: HomeAssistantEntityBinding = {
      id: `habind-${Date.now()}`,
      entityId: sample,
      deviceId: '',
      inputId: '',
    };
    persist({
      ...config,
      homeAssistant: {
        ...config.homeAssistant,
        entityBindings: [...config.homeAssistant.entityBindings, row],
      },
    });
  };

  const removeHaBinding = (id: string) => {
    persist({
      ...config,
      homeAssistant: {
        ...config.homeAssistant,
        entityBindings: config.homeAssistant.entityBindings.filter((b) => b.id !== id),
      },
    });
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

  const runHaEntityDiscovery = async () => {
    if (!config.homeAssistant.baseUrl.trim()) {
      setHaTestResult(t('integrations.haNoUrl', 'Укажите URL Home Assistant'));
      return;
    }
    if (!config.homeAssistant.accessToken?.trim()) {
      setHaTestResult(t('integrations.haNoToken', 'Укажите long-lived access token'));
      return;
    }
    setHaEntitiesBusy(true);
    setHaTestResult(null);
    try {
      const result = await fetchHomeAssistantEntities({
        baseUrl: config.homeAssistant.baseUrl,
        accessToken: config.homeAssistant.accessToken,
      });
      if (result.ok) {
        const topDomains = Object.entries(result.domainCounts ?? {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([domain, count]) => `${domain}:${count}`)
          .join(', ');
        const snapshot = {
          entityCount: result.entityCount ?? 0,
          domainCounts: result.domainCounts ?? {},
          sampleEntities: result.sampleEntities ?? [],
          discoveredAt: new Date().toISOString(),
        };
        persist({
          ...config,
          homeAssistant: { ...config.homeAssistant, lastDiscovery: snapshot },
        });
        if (activeWorkspaceId) {
          saveIntegrationsAdvisory({
            workspaceId: activeWorkspaceId,
            updatedAtMs: Date.now(),
            mqttMonitorActive: false,
            mqttMappingCount: config.mqtt.topicMappings.length,
            haBindingCount: config.homeAssistant.entityBindings.length,
            haEntityCount: snapshot.entityCount,
            readings: [],
          });
        }
        setHaTestResult(
          `${t('integrations.haEntitiesOk', 'Сущностей')}: ${result.entityCount ?? 0}` +
            (topDomains ? ` · ${topDomains}` : '') +
            (result.latencyMs ? ` (${result.latencyMs}ms)` : '') +
            ` · ${t('integrations.haSaved', 'сохранено')}`,
        );
      } else {
        setHaTestResult(result.error ?? t('integrations.haFail', 'Не удалось подключиться'));
      }
    } catch (e) {
      setHaTestResult(e instanceof Error ? e.message : t('integrations.haFail', 'Не удалось подключиться'));
    } finally {
      setHaEntitiesBusy(false);
    }
  };

  const runHaStatePoll = async () => {
    if (!config.homeAssistant.baseUrl.trim()) {
      setHaTestResult(t('integrations.haNoUrl', 'Укажите URL Home Assistant'));
      return;
    }
    if (!config.homeAssistant.accessToken?.trim()) {
      setHaTestResult(t('integrations.haNoToken', 'Укажите long-lived access token'));
      return;
    }
    if (config.homeAssistant.entityBindings.length === 0) {
      setHaTestResult(t('integrations.haBindingsEmpty', 'Нет привязок'));
      return;
    }
    setHaStatesBusy(true);
    setHaTestResult(null);
    try {
      const result = await fetchHomeAssistantBoundStates({
        baseUrl: config.homeAssistant.baseUrl,
        accessToken: config.homeAssistant.accessToken,
        entityIds: config.homeAssistant.entityBindings.map((b) => b.entityId),
      });
      if (result.ok && result.states) {
        const summary = result.states.map((s) => `${s.entityId}=${s.state}`).join(', ');
        setHaTestResult(`${t('integrations.haStatesOk', 'States')}: ${summary}`);
        if (activeWorkspaceId) {
          const now = Date.now();
          const readings = config.homeAssistant.entityBindings.flatMap((binding) => {
            const state = result.states?.find((s) => s.entityId === binding.entityId);
            if (!state) return [];
            return [
              {
                source: 'home_assistant' as const,
                entityId: binding.entityId,
                deviceId: binding.deviceId,
                inputId: binding.inputId,
                value: parseHomeAssistantNumericState(state.state),
                unit: state.unit,
                receivedAtMs: now,
              },
            ];
          });
          const prev = loadIntegrationsAdvisory(activeWorkspaceId);
          saveIntegrationsAdvisory({
            workspaceId: activeWorkspaceId,
            updatedAtMs: now,
            mqttMonitorActive: prev?.mqttMonitorActive ?? false,
            mqttMappingCount: config.mqtt.topicMappings.length,
            haBindingCount: config.homeAssistant.entityBindings.length,
            haEntityCount: config.homeAssistant.lastDiscovery?.entityCount ?? prev?.haEntityCount ?? null,
            readings: [...(prev?.readings.filter((r) => r.source === 'mqtt') ?? []), ...readings].slice(-24),
          });
        }
      } else {
        setHaTestResult(result.error ?? t('integrations.haFail', 'Не удалось подключиться'));
      }
    } catch (e) {
      setHaTestResult(e instanceof Error ? e.message : t('integrations.haFail', 'Не удалось подключиться'));
    } finally {
      setHaStatesBusy(false);
    }
  };

  const runTuyaTest = async () => {
    if (!config.tuya.accessId?.trim() || !config.tuya.accessSecret?.trim()) {
      setTuyaTestResult(t('integrations.tuyaNoCreds', 'Укажите Access ID и Access Secret'));
      return;
    }
    setTuyaTestBusy(true);
    setTuyaTestResult(null);
    try {
      const result = await testTuyaCloudConnection({
        region: config.tuya.region,
        accessId: config.tuya.accessId,
        accessSecret: config.tuya.accessSecret,
      });
      setTuyaTestResult(
        result.ok
          ? `${t('integrations.tuyaOk', 'Tuya Cloud OK')}${result.latencyMs ? ` (${result.latencyMs}ms)` : ''}`
          : (result.error ?? t('integrations.tuyaFail', 'Не удалось подключиться')),
      );
    } catch (e) {
      setTuyaTestResult(e instanceof Error ? e.message : t('integrations.tuyaFail', 'Не удалось подключиться'));
    } finally {
      setTuyaTestBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <AccountCard
        title={t('integrations.title', 'Внешние хабы')}
        description={t(
          'integrations.hint',
          'Внешние хабы: MQTT monitor, HA auto-poll states (advisory), Tuya token check. Runtime injection только в sim bridge.',
        )}
      >
        <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
          {t('integrations.qbxHubNote', 'Собственный QBX Zigbee Hub подключается позже — железо в пути.')}
        </p>

        <label className="flex items-center gap-2 text-xs mt-3">
          <input
            type="checkbox"
            checked={config.simBridgeEnabled}
            disabled={!allowed}
            onChange={(e) =>
              proGate(() => persist({ ...config, simBridgeEnabled: e.target.checked }))
            }
          />
          {t('integrations.simBridge', 'Sim bridge: MQTT/HA → twin sensors (только dev:sim)')}
        </label>

        {!allowed && (
          <p className="text-xs text-violet-700 dark:text-violet-300 mt-2 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            {t('integrations.proRequired', 'Настройка внешних хабов — Pro. Live runtime mapping — отдельный этап.')}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  {t('integrations.mqttMappings', 'Topic → device mapping')}
                </p>
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => proGate(addMapping)}
                  className="text-[10px] font-semibold text-lime-700 dark:text-lime-300"
                >
                  + {t('integrations.mqttAddMapping', 'Добавить')}
                </button>
              </div>
              {config.mqtt.topicMappings.length === 0 ? (
                <p className="text-[10px] text-slate-400">{t('integrations.mqttMappingsEmpty', 'Нет правил')}</p>
              ) : (
                config.mqtt.topicMappings.map((mapping) => (
                  <div key={mapping.id} className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                    <input
                      disabled={!allowed}
                      value={mapping.topicPattern}
                      onChange={(e) => updateMapping(mapping.id, { topicPattern: e.target.value })}
                      placeholder="qbx/+/temp"
                      className="col-span-2 px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      disabled={!allowed}
                      value={mapping.deviceId}
                      onChange={(e) => updateMapping(mapping.id, { deviceId: e.target.value })}
                      placeholder="deviceId"
                      className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      disabled={!allowed}
                      value={mapping.inputId}
                      onChange={(e) => updateMapping(mapping.id, { inputId: e.target.value })}
                      placeholder="inputId"
                      className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      disabled={!allowed}
                      onClick={() => proGate(() => removeMapping(mapping.id))}
                      className="col-span-2 text-[10px] text-rose-600 text-left"
                    >
                      {t('common.delete', 'Удалить')}
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="flex flex-wrap gap-2">
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
              {!mqttMonitorActive ? (
                <button
                  type="button"
                  disabled={!allowed || mqttMonitorBusy}
                  onClick={() => proGate(() => void runMqttMonitor())}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-lime-100 dark:bg-lime-950/50 text-[11px] font-semibold text-lime-800 dark:text-lime-200 disabled:opacity-60"
                >
                  <Radio className="w-3.5 h-3.5" />
                  {mqttMonitorBusy
                    ? t('integrations.testing', 'Проверка…')
                    : t('integrations.mqttSubscribe', 'Subscribe monitor')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => proGate(() => void stopMqttMonitor())}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-[11px] font-semibold text-rose-600"
                >
                  {t('integrations.mqttUnsubscribe', 'Stop monitor')}
                </button>
              )}
            </div>
            {mqttTestResult && <p className="text-[11px] text-slate-500">{mqttTestResult}</p>}
            {mqttMessages.length > 0 && (
              <ul className="text-[10px] text-slate-500 space-y-1 max-h-28 overflow-y-auto font-mono">
                {mqttMessages
                  .slice()
                  .reverse()
                  .map((m) => (
                    <li key={`${m.receivedAtMs}-${m.topic}`}>
                      {m.topic}: {m.payload.slice(0, 60)}
                      {m.mapped && (
                        <span className="text-lime-600 dark:text-lime-400">
                          {' '}
                          → {m.mapped.deviceId}/{m.mapped.inputId}=
                          {m.mapped.value ?? '—'}
                          {m.mapped.unit ?? ''}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            )}
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!allowed || haTestBusy}
                onClick={() => proGate(() => void runHaTest())}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-60"
              >
                <PlugZap className="w-3.5 h-3.5" />
                {haTestBusy ? t('integrations.testing', 'Проверка…') : t('integrations.haTest', 'Проверить API')}
              </button>
              <button
                type="button"
                disabled={!allowed || haEntitiesBusy}
                onClick={() => proGate(() => void runHaEntityDiscovery())}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-60"
              >
                <Home className="w-3.5 h-3.5" />
                {haEntitiesBusy
                  ? t('integrations.testing', 'Проверка…')
                  : t('integrations.haEntities', 'Список сущностей')}
              </button>
              <button
                type="button"
                disabled={!allowed || haStatesBusy}
                onClick={() => proGate(() => void runHaStatePoll())}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-100 dark:bg-violet-950/50 text-[11px] font-semibold text-violet-800 dark:text-violet-200 disabled:opacity-60"
              >
                {haStatesBusy ? t('integrations.testing', 'Проверка…') : t('integrations.haPollStates', 'Poll states')}
              </button>
            </div>
            {haTestResult && <p className="text-[11px] text-slate-500">{haTestResult}</p>}
            {config.homeAssistant.lastDiscovery && (
              <p className="text-[10px] text-slate-400">
                {t('integrations.haLastDiscovery', 'Последний discovery')}:{' '}
                {config.homeAssistant.lastDiscovery.entityCount}{' '}
                {t('integrations.haEntitiesOk', 'Сущностей').toLowerCase()} ·{' '}
                {new Date(config.homeAssistant.lastDiscovery.discoveredAt).toLocaleString()}
              </p>
            )}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                  {t('integrations.haBindings', 'Entity → device binding')}
                </p>
                <button
                  type="button"
                  disabled={!allowed}
                  onClick={() => proGate(addHaBinding)}
                  className="text-[10px] font-semibold text-violet-700 dark:text-violet-300"
                >
                  + {t('integrations.haAddBinding', 'Добавить')}
                </button>
              </div>
              {config.homeAssistant.entityBindings.length === 0 ? (
                <p className="text-[10px] text-slate-400">{t('integrations.haBindingsEmpty', 'Нет привязок')}</p>
              ) : (
                config.homeAssistant.entityBindings.map((binding) => (
                  <div key={binding.id} className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                    <input
                      disabled={!allowed}
                      list="ha-entity-samples"
                      value={binding.entityId}
                      onChange={(e) => updateHaBinding(binding.id, { entityId: e.target.value })}
                      placeholder="sensor.temp"
                      className="col-span-2 px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      disabled={!allowed}
                      value={binding.deviceId}
                      onChange={(e) => updateHaBinding(binding.id, { deviceId: e.target.value })}
                      placeholder="deviceId"
                      className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <input
                      disabled={!allowed}
                      value={binding.inputId}
                      onChange={(e) => updateHaBinding(binding.id, { inputId: e.target.value })}
                      placeholder="inputId"
                      className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      disabled={!allowed}
                      onClick={() => proGate(() => removeHaBinding(binding.id))}
                      className="col-span-2 text-[10px] text-rose-600 text-left"
                    >
                      {t('common.delete', 'Удалить')}
                    </button>
                  </div>
                ))
              )}
              <datalist id="ha-entity-samples">
                {(config.homeAssistant.lastDiscovery?.sampleEntities ?? []).map((entity) => (
                  <option key={entity} value={entity} />
                ))}
              </datalist>
            </div>
          </section>

          <section className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold">Tuya</p>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={config.tuya.enabled}
                disabled={!allowed}
                onChange={(e) =>
                  proGate(() => persist({ ...config, tuya: { ...config.tuya, enabled: e.target.checked } }))
                }
              />
              {t('integrations.enabled', 'Включить')}
            </label>
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
              <option value="in">IN</option>
            </select>
            <input
              disabled={!allowed}
              value={config.tuya.accessId ?? ''}
              onChange={(e) => setConfig({ ...config, tuya: { ...config.tuya, accessId: e.target.value } })}
              onBlur={() => proGate(() => persist(config))}
              placeholder={t('integrations.tuyaAccessId', 'Access ID')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            />
            <input
              disabled={!allowed}
              type="password"
              value={config.tuya.accessSecret ?? ''}
              onChange={(e) => setConfig({ ...config, tuya: { ...config.tuya, accessSecret: e.target.value } })}
              onBlur={() => proGate(() => persist(config))}
              placeholder={t('integrations.tuyaAccessSecret', 'Access Secret')}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 disabled:opacity-60"
            />
            <button
              type="button"
              disabled={!allowed || tuyaTestBusy}
              onClick={() => proGate(() => void runTuyaTest())}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-[11px] font-semibold disabled:opacity-60"
            >
              <PlugZap className="w-3.5 h-3.5" />
              {tuyaTestBusy
                ? t('integrations.testing', 'Проверка…')
                : t('integrations.tuyaTest', 'Проверить Cloud API')}
            </button>
            {tuyaTestResult && <p className="text-[11px] text-slate-500">{tuyaTestResult}</p>}
            <p className="text-[11px] text-slate-400">
              {t('integrations.tuyaHint', 'Health-check токена. Маппинг устройств в twin — после hub transport.')}
            </p>
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
