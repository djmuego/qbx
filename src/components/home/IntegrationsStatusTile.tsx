import React from 'react';
import { PlugZap, Home, Radio } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../i18n/LocaleContext';
import { loadIntegrationsAdvisory } from '../../application/integrations/integrations-advisory.store';
import { loadIntegrationsConfig } from '../../application/integrations/hub-integration.store';

export const IntegrationsStatusTile: React.FC = () => {
  const { activeWorkspaceId } = useAuth();
  const { t } = useLocale();

  if (!activeWorkspaceId) return null;

  const config = loadIntegrationsConfig(activeWorkspaceId);
  const advisory = loadIntegrationsAdvisory(activeWorkspaceId);
  const anyEnabled = config.mqtt.enabled || config.homeAssistant.enabled;

  if (!anyEnabled && !advisory) return null;

  const lastReading = advisory?.readings[advisory.readings.length - 1];

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 shadow-xs">
      <div className="flex items-center gap-2 mb-2">
        <PlugZap className="w-4 h-4 text-violet-500" />
        <h2 className="text-sm font-bold">{t('integrations.statusTitle', 'Внешние хабы')}</h2>
      </div>
      <ul className="text-[11px] text-slate-500 space-y-1">
        {config.mqtt.enabled && (
          <li className="flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            MQTT: {advisory?.mqttMonitorActive ? t('integrations.statusLive', 'monitor') : t('integrations.statusIdle', 'idle')}
            {config.mqtt.topicMappings.length > 0 && ` · ${config.mqtt.topicMappings.length} map`}
          </li>
        )}
        {config.homeAssistant.enabled && (
          <li className="flex items-center gap-1.5">
            <Home className="w-3 h-3" />
            HA: {advisory?.haEntityCount ?? config.homeAssistant.lastDiscovery?.entityCount ?? '—'}{' '}
            {t('integrations.haEntitiesOk', 'entities').toLowerCase()}
            {config.homeAssistant.entityBindings.length > 0 &&
              ` · ${config.homeAssistant.entityBindings.length} bind`}
          </li>
        )}
        {lastReading && (
          <li className="text-slate-400 font-mono truncate">
            {lastReading.deviceId}/{lastReading.inputId}={lastReading.value ?? '—'}
            {lastReading.unit ?? ''}
          </li>
        )}
      </ul>
    </div>
  );
};
