#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  automationsEnvelopeSchema,
  devicesEnvelopeSchema,
  plantStoreEnvelopeSchema,
  settingsEnvelopeSchema,
  spaceMapsEnvelopeSchema,
  spacesEnvelopeSchema,
  unwrapEnvelope,
  unwrapPlantStore,
  unwrapSettings,
  wrapEnvelope,
  wrapPlantStore,
  wrapSettings,
  type LegacyDevice,
} from '../src/data/schemas/qbx.schemas.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const knowledgeRoot = resolve(process.env.QBX_KNOWLEDGE_ROOT || join(projectRoot, '../Obsibian/Obsibian/QBX'));
const outputDir = join(projectRoot, 'src/mock/generated');

function readKnowledgeJson(relativePath: string): unknown {
  const fullPath = join(knowledgeRoot, relativePath);
  const raw = readFileSync(fullPath, 'utf8');
  return JSON.parse(raw);
}

function fail(message: string): never {
  console.error(`sync-qbx-state: ${message}`);
  process.exit(1);
}

function normalizeDevices(devices: LegacyDevice[]): LegacyDevice[] {
  return devices.map((device) => ({
    ...device,
    inputs: device.inputs.map((input) => ({
      ...input,
      history: input.history ?? [],
    })),
  }));
}

function main() {
  console.log(`Reading knowledge store: ${knowledgeRoot}`);

  const spacesRaw = readKnowledgeJson('state/spaces.json');
  const devicesRaw = readKnowledgeJson('state/devices.json');
  const automationsRaw = readKnowledgeJson('state/automations.json');
  const settingsRaw = readKnowledgeJson('state/settings.json');
  const spaceMapsRaw = readKnowledgeJson('state/space-maps.json');
  const plantsRaw = readKnowledgeJson('state/plants.json');

  const spacesParsed = spacesEnvelopeSchema.safeParse(spacesRaw);
  if (!spacesParsed.success) fail(`Invalid spaces.json: ${spacesParsed.error.message}`);

  const devicesParsed = devicesEnvelopeSchema.safeParse(devicesRaw);
  if (!devicesParsed.success) fail(`Invalid devices.json: ${devicesParsed.error.message}`);

  const automationsParsed = automationsEnvelopeSchema.safeParse(automationsRaw);
  if (!automationsParsed.success) fail(`Invalid automations.json: ${automationsParsed.error.message}`);

  const settingsParsed = settingsEnvelopeSchema.safeParse(settingsRaw);
  if (!settingsParsed.success) fail(`Invalid settings.json: ${settingsParsed.error.message}`);

  const spaceMapsParsed = spaceMapsEnvelopeSchema.safeParse(spaceMapsRaw);
  if (!spaceMapsParsed.success) fail(`Invalid space-maps.json: ${spaceMapsParsed.error.message}`);

  const plantsParsed = plantStoreEnvelopeSchema.safeParse(plantsRaw);
  if (!plantsParsed.success) fail(`Invalid plants.json: ${plantsParsed.error.message}`);

  const spaces = unwrapEnvelope(spacesParsed.data);
  const devices = normalizeDevices(unwrapEnvelope(devicesParsed.data));
  const automations = unwrapEnvelope(automationsParsed.data);
  const settings = unwrapSettings(settingsParsed.data);
  const spaceMaps = unwrapEnvelope(spaceMapsParsed.data);
  const plantStore = unwrapPlantStore(plantsParsed.data);

  const spaceIds = new Set(spaces.map((s) => s.id));
  for (const map of spaceMaps) {
    if (!spaceIds.has(map.spaceId)) fail(`space-maps.json: unknown spaceId ${map.spaceId}`);
  }
  for (const plant of plantStore.plants) {
    if (!spaceIds.has(plant.spaceId)) fail(`plants.json: unknown spaceId ${plant.spaceId}`);
  }
  for (const group of plantStore.groups) {
    if (!spaceIds.has(group.spaceId)) fail(`plants.json group: unknown spaceId ${group.spaceId}`);
  }

  mkdirSync(outputDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    source: knowledgeRoot,
  };

  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(outputDir, 'spaces.json'), JSON.stringify(wrapEnvelope(spaces), null, 2));
  writeFileSync(join(outputDir, 'devices.json'), JSON.stringify(wrapEnvelope(devices), null, 2));
  writeFileSync(join(outputDir, 'automations.json'), JSON.stringify(wrapEnvelope(automations), null, 2));
  writeFileSync(join(outputDir, 'settings.json'), JSON.stringify(wrapSettings(settings), null, 2));
  writeFileSync(join(outputDir, 'space-maps.json'), JSON.stringify(wrapEnvelope(spaceMaps), null, 2));
  writeFileSync(join(outputDir, 'plants.json'), JSON.stringify(wrapPlantStore(plantStore), null, 2));

  console.log(`Generated fixtures in ${outputDir}`);
  console.log(`  spaces: ${spaces.length}`);
  console.log(`  devices: ${devices.length}`);
  console.log(`  automations: ${automations.length}`);
  console.log(`  spaceMaps: ${spaceMaps.length}`);
  console.log(`  plants: ${plantStore.plants.length}`);
}

main();
