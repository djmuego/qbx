import type { Plugin } from 'vite';
import {
  parseBrokerHost,
  readBody,
  sendJson,
  fetchHomeAssistantBoundStates,
  fetchHomeAssistantEntitySummary,
  testHomeAssistantApi,
  testTcpReachable,
} from './integration-proxy-utils';
import {
  getMqttBridgeMessages,
  getMqttBridgeStatus,
  startMqttBridge,
  stopMqttBridge,
} from './mqtt-bridge';

interface MqttTestBody {
  brokerUrl?: string;
  port?: number;
  timeoutMs?: number;
  useTls?: boolean;
  topicPrefix?: string;
  topicMappings?: Array<{
    id: string;
    topicPattern: string;
    deviceId: string;
    inputId: string;
    label?: string;
    unit?: string;
  }>;
}

interface HaTestBody {
  baseUrl?: string;
  accessToken?: string;
  timeoutMs?: number;
  entityIds?: string[];
}

export function integrationsProxyPlugin(): Plugin {
  return {
    name: 'qbx-integrations-proxy',
    configureServer(server) {
      server.middlewares.use('/api/integrations/mqtt/test', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}') as MqttTestBody;
          const host = parseBrokerHost(body.brokerUrl ?? '');
          const port = Number(body.port) || 1883;
          const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 4000, 1000), 10000);

          if (!host) {
            sendJson(res, 400, { ok: false, error: 'brokerUrl required' });
            return;
          }

          const latencyMs = await testTcpReachable(host, port, timeoutMs);
          sendJson(res, 200, {
            ok: true,
            host,
            port,
            latencyMs,
            note: 'TCP reachability — use Subscribe for live topic monitor (dev proxy, not runtime injection)',
          });
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Connection failed',
          });
        }
      });

      server.middlewares.use('/api/integrations/mqtt/subscribe', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}') as MqttTestBody;
          const status = await startMqttBridge({
            brokerUrl: body.brokerUrl ?? '',
            port: Number(body.port) || 1883,
            topicPrefix: body.topicPrefix ?? 'qbx/',
            useTls: Boolean(body.useTls),
            topicMappings: body.topicMappings ?? [],
          });
          sendJson(res, 200, { ok: true, status });
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Subscribe failed',
          });
        }
      });

      server.middlewares.use('/api/integrations/mqtt/unsubscribe', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        stopMqttBridge();
        sendJson(res, 200, { ok: true });
      });

      server.middlewares.use('/api/integrations/mqtt/status', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        sendJson(res, 200, getMqttBridgeStatus());
      });

      server.middlewares.use('/api/integrations/mqtt/messages', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        const url = new URL(req.url ?? '', 'http://localhost');
        const limit = Number(url.searchParams.get('limit')) || 20;
        sendJson(res, 200, { messages: getMqttBridgeMessages(limit) });
      });

      server.middlewares.use('/api/integrations/home-assistant/test', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}') as HaTestBody;
          const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 6000, 2000), 15000);
          const result = await testHomeAssistantApi(
            body.baseUrl ?? '',
            body.accessToken ?? '',
            timeoutMs,
          );
          sendJson(res, 200, result);
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Request failed',
          });
        }
      });

      server.middlewares.use('/api/integrations/home-assistant/entities', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}') as HaTestBody;
          const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 8000, 2000), 20000);
          const result = await fetchHomeAssistantEntitySummary(
            body.baseUrl ?? '',
            body.accessToken ?? '',
            timeoutMs,
          );
          sendJson(res, 200, result);
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Request failed',
          });
        }
      });

      server.middlewares.use('/api/integrations/home-assistant/states', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw || '{}') as HaTestBody;
          const timeoutMs = Math.min(Math.max(Number(body.timeoutMs) || 8000, 2000), 20000);
          const result = await fetchHomeAssistantBoundStates(
            body.baseUrl ?? '',
            body.accessToken ?? '',
            body.entityIds ?? [],
            timeoutMs,
          );
          sendJson(res, 200, result);
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Request failed',
          });
        }
      });

      server.middlewares.use('/api/integrations/tuya/status', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        sendJson(res, 200, {
          ok: false,
          implemented: false,
          status: 'draft',
          error: 'Tuya cloud connector not implemented — save region in config only',
        });
      });
    },
  };
}
