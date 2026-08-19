#!/usr/bin/env node
/** Quick 3D plant procedural QA — verify map loads in 3D without texture billboards. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../docs/qa/spatial-assets-final');
const BASE = process.argv[2] ?? 'http://localhost:3002';

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.locator('nav.hidden button', { hasText: 'Карта' }).click();
  await page.waitForTimeout(1500);
  await page.locator('button', { hasText: /^3D$/ }).first().click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, 'procedural-plants-3d.png') });
  console.log('saved procedural-plants-3d.png');
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
