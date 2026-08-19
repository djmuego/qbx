import { createHash, createHmac } from 'node:crypto';

const REGION_HOST: Record<string, string> = {
  eu: 'https://openapi.tuyaeu.com',
  us: 'https://openapi.tuyaus.com',
  cn: 'https://openapi.tuyacn.com',
  in: 'https://openapi.tuyain.com',
};

export function tuyaOpenApiHost(region: string): string {
  return REGION_HOST[region] ?? REGION_HOST.eu;
}

export function tuyaEmptyBodySha256(): string {
  return createHash('sha256').update('').digest('hex');
}

export function tuyaStringToSign(method: string, pathWithQuery: string): string {
  return `${method}\n${tuyaEmptyBodySha256()}\n\n${pathWithQuery}`;
}

export function tuyaSign(
  clientId: string,
  secret: string,
  timestampMs: string,
  nonce: string,
  stringToSign: string,
): string {
  const message = `${clientId}${timestampMs}${nonce}${stringToSign}`;
  return createHmac('sha256', secret).update(message).digest('hex').toUpperCase();
}

export async function testTuyaCloudCredentials(input: {
  region: string;
  accessId: string;
  accessSecret: string;
  timeoutMs: number;
}): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const accessId = input.accessId.trim();
  const accessSecret = input.accessSecret.trim();
  if (!accessId || !accessSecret) {
    return { ok: false, error: 'accessId and accessSecret required' };
  }

  const t = String(Date.now());
  const nonce = `qbx-${t}`;
  const path = '/v1.0/token?grant_type=1';
  const stringToSign = tuyaStringToSign('GET', path);
  const sign = tuyaSign(accessId, accessSecret, t, nonce, stringToSign);
  const url = `${tuyaOpenApiHost(input.region)}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        client_id: accessId,
        sign,
        t,
        nonce,
        sign_method: 'HMAC-SHA256',
      },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - started;
    const payload = (await response.json()) as { success?: boolean; msg?: string; code?: number };
    if (!response.ok || payload.success === false) {
      return {
        ok: false,
        latencyMs,
        error: payload.msg ?? `HTTP ${response.status}`,
      };
    }
    return { ok: true, latencyMs };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Request failed' };
  } finally {
    clearTimeout(timer);
  }
}
