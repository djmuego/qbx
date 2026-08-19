import net from 'node:net';

export function readBody(req: import('http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export function sendJson(res: import('http').ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function parseBrokerHost(raw: string): string {
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

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed.includes('://')) return trimmed;
  return `http://${trimmed}`;
}

export function testTcpReachable(host: string, port: number, timeoutMs: number): Promise<number> {
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

export async function testHomeAssistantApi(
  baseUrl: string,
  accessToken: string,
  timeoutMs: number,
): Promise<{ ok: boolean; version?: string; latencyMs?: number; error?: string }> {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return { ok: false, error: 'baseUrl required' };

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/api/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, latencyMs };
    }
    const payload = (await response.json()) as { message?: string };
    return {
      ok: true,
      version: payload.message ?? 'API running',
      latencyMs,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface HomeAssistantEntitySummary {
  ok: boolean;
  entityCount?: number;
  domainCounts?: Record<string, number>;
  sampleEntities?: string[];
  latencyMs?: number;
  error?: string;
}

export async function fetchHomeAssistantEntitySummary(
  baseUrl: string,
  accessToken: string,
  timeoutMs: number,
): Promise<HomeAssistantEntitySummary> {
  const base = normalizeBaseUrl(baseUrl);
  if (!base) return { ok: false, error: 'baseUrl required' };
  if (!accessToken.trim()) return { ok: false, error: 'accessToken required' };

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/api/states`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}`, latencyMs };
    }

    const states = (await response.json()) as Array<{ entity_id: string }>;
    const domainCounts: Record<string, number> = {};
    for (const state of states) {
      const domain = state.entity_id.split('.')[0] ?? 'unknown';
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1;
    }

    return {
      ok: true,
      entityCount: states.length,
      domainCounts,
      sampleEntities: states.slice(0, 8).map((s) => s.entity_id),
      latencyMs,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Request failed',
    };
  } finally {
    clearTimeout(timer);
  }
}
