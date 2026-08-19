import type { Plugin } from 'vite';
import {
  parseBrokerHost,
  readBody,
  sendJson,
  testHomeAssistantApi,
  testTcpReachable,
} from './integration-proxy-utils';

interface MqttTestBody {
  brokerUrl?: string;
  port?: number;
  timeoutMs?: number;
}

interface HaTestBody {
  baseUrl?: string;
  accessToken?: string;
  timeoutMs?: number;
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
            note: 'TCP reachability only — MQTT subscribe ships in next connector pass',
          });
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Connection failed',
          });
        }
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

      server.middlewares.use('/api/integrations/tuya/status', async (req, res) => {
        if (req.method !== 'GET') {
          sendJson(res, 405, { error: 'Method not allowed' });
          return;
        }
        sendJson(res, 200, {
          ok: false,
          error: 'Tuya cloud connector not implemented — config draft only',
        });
      });
    },
  };
}
