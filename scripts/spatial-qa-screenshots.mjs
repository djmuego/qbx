#!/usr/bin/env node
/** Capture spatial asset QA screenshots via Playwright. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../docs/qa/spatial-assets-final');
const BASE = process.argv[2] ?? 'http://localhost:3000';

async function main() {
  const { chromium } = await import('playwright');
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();

  async function openMap(page, mobile) {
    if (mobile) {
      await page.locator('div.md\\:hidden nav button', { hasText: 'Карта' }).click({ force: true });
    } else {
      await page.locator('nav.hidden button', { hasText: 'Карта' }).click();
    }
    await page.waitForSelector('canvas, svg[width]', { timeout: 20000 });
    await page.waitForTimeout(1200);
  }

  async function switch3d(page) {
    const btn = page.locator('button', { hasText: /^3D$/ });
    if (await btn.count()) await btn.first().click();
    await page.waitForTimeout(2500);
  }

  async function switch2d(page) {
    const btn = page.locator('button', { hasText: /^2D$/ });
    if (await btn.count()) await btn.first().click();
    await page.waitForTimeout(1200);
  }

  async function shot(name, width, height, setup) {
    const mobile = width < 500;
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1000);
    await openMap(page, mobile);
    await setup(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log('saved', name);
    await page.close();
  }

  await shot('desktop-2d', 1280, 800, switch2d);
  await shot('desktop-3d', 1280, 800, switch3d);
  await shot('mobile-390-2d', 390, 844, switch2d);
  await shot('mobile-390-3d', 390, 844, switch3d);
  await shot('equipment-assets', 1280, 800, switch3d);
  await shot('plant-stage-seedling', 1280, 800, switch3d);
  await shot('plant-stage-vegetative', 1280, 800, switch3d);
  await shot('plant-stage-flowering', 1280, 800, switch3d);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
