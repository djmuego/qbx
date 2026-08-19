import { describe, expect, it } from 'vitest';
import { tuyaEmptyBodySha256, tuyaOpenApiHost, tuyaSign, tuyaStringToSign } from './tuya-sign';

describe('tuya-sign', () => {
  it('uses known empty-body sha256', () => {
    expect(tuyaEmptyBodySha256()).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('maps region hosts and produces uppercase HMAC', () => {
    expect(tuyaOpenApiHost('us')).toBe('https://openapi.tuyaus.com');
    const stringToSign = tuyaStringToSign('GET', '/v1.0/token?grant_type=1');
    const sign = tuyaSign('client', 'secret', '1', 'nonce', stringToSign);
    expect(sign).toMatch(/^[A-F0-9]{64}$/);
  });
});
