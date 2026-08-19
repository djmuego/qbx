import type { Plugin } from 'vite';
import net from 'node:net';

interface MqttTestBody {
  brokerUrl?: string;
  port?: number;
  timeoutMs?: number;
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function sendJson(res: import('http').ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function parseBrokerHost(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    if (trimmed.includes('://')) {
      return new URL(trimmed).hostname;
    }
  } catch {
    // fall through
  }
  return trimmed.split(':')[0] ?? '';
}

function testTcpReachable(host: string, port: number, timeoutMs: number): Promise<number> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once('connect', () => {
      clearTimeout(timer);
      socket.end();
      resolve(Date.now() - started);
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
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
            note: 'TCP reachability only — MQTT auth/subscribe not implemented yet',
          });
        } catch (e) {
          sendJson(res, 200, {
            ok: false,
            error: e instanceof Error ? e.message : 'Connection failed',
          });
        }
      });
    },
  };
}
