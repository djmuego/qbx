import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const generatedDir = join(import.meta.dirname, 'generated');

describe('knowledge compiler output', () => {
  it('produces claims and compile report after sync', () => {
    expect(existsSync(join(generatedDir, 'knowledge-claims.json'))).toBe(true);
    expect(existsSync(join(generatedDir, 'compile-report.json'))).toBe(true);
    const report = JSON.parse(readFileSync(join(generatedDir, 'compile-report.json'), 'utf8')) as {
      documentCount: number;
      claimCount: number;
    };
    expect(report.documentCount).toBeGreaterThanOrEqual(25);
    expect(report.claimCount).toBeGreaterThan(10);
  });
});
