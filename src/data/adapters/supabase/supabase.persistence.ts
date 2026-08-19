import type { SupabaseClient } from '@supabase/supabase-js';
import type { DataPersistenceAdapter } from '../persistence-adapter';
import type { Space } from '../../../domain/space/space.types';
import type { Device } from '../../../domain/device/device.types';
import type { Automation } from '../../../domain/automation/automation.types';
import type { AppSettings } from '../../../domain/settings/settings.types';
import type { SpaceMap } from '../../../domain/map/space-map.types';
import type { Plant, PlantGroup } from '../../../domain/grow/plant.types';
import { stripEphemeralAutomation, stripEphemeralDevice } from '../export-sanitize';

export interface SupabasePersistenceContext {
  client: SupabaseClient;
  workspaceId: string;
  userId: string;
}

export class SupabasePersistenceAdapter implements DataPersistenceAdapter {
  constructor(private readonly ctx: SupabasePersistenceContext) {}

  async persistSpaces(spaces: Space[]): Promise<void> {
    if (!spaces.length) return;
    const rows = spaces.map((s) => ({
      id: s.id,
      workspace_id: this.ctx.workspaceId,
      payload: s,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.ctx.client.from('spaces').upsert(rows, { onConflict: 'workspace_id,id' });
    if (error) throw new Error(error.message);
  }

  async persistDevices(devices: Device[]): Promise<void> {
    const sanitized = devices.map(stripEphemeralDevice);
    if (!sanitized.length) return;
    const rows = sanitized.map((d) => ({
      id: d.id,
      workspace_id: this.ctx.workspaceId,
      space_id: d.spaceId,
      payload: d,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.ctx.client.from('devices').upsert(rows, { onConflict: 'workspace_id,id' });
    if (error) throw new Error(error.message);
  }

  async persistAutomations(automations: Automation[]): Promise<void> {
    const sanitized = automations.map(stripEphemeralAutomation);
    if (!sanitized.length) return;
    const rows = sanitized.map((a) => ({
      id: a.id,
      workspace_id: this.ctx.workspaceId,
      space_id: a.spaceId,
      payload: a,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.ctx.client.from('automations').upsert(rows, { onConflict: 'workspace_id,id' });
    if (error) throw new Error(error.message);
  }

  async persistSettings(settings: AppSettings): Promise<void> {
    const { error } = await this.ctx.client.from('user_preferences').upsert(
      {
        workspace_id: this.ctx.workspaceId,
        user_id: this.ctx.userId,
        payload: settings,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id,user_id' },
    );
    if (error) throw new Error(error.message);
  }

  async persistSpaceMaps(maps: SpaceMap[]): Promise<void> {
    if (!maps.length) return;
    const rows = maps.map((m) => ({
      space_id: m.spaceId,
      workspace_id: this.ctx.workspaceId,
      payload: m,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await this.ctx.client.from('spatial_maps').upsert(rows, { onConflict: 'workspace_id,space_id' });
    if (error) throw new Error(error.message);
  }

  async persistPlants(plants: Plant[], groups: PlantGroup[]): Promise<void> {
    if (plants.length) {
      const rows = plants.map((p) => ({
        id: p.id,
        workspace_id: this.ctx.workspaceId,
        space_id: p.spaceId,
        payload: p,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await this.ctx.client.from('plants').upsert(rows, { onConflict: 'workspace_id,id' });
      if (error) throw new Error(error.message);
    }
    if (groups.length) {
      const rows = groups.map((g) => ({
        id: g.id,
        workspace_id: this.ctx.workspaceId,
        space_id: g.spaceId,
        payload: g,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await this.ctx.client.from('plant_groups').upsert(rows, { onConflict: 'workspace_id,id' });
      if (error) throw new Error(error.message);
    }
  }

  async deleteSpace(spaceId: string): Promise<void> {
    await this.ctx.client.from('spaces').delete().eq('workspace_id', this.ctx.workspaceId).eq('id', spaceId);
    await this.deleteSpaceMap(spaceId);
  }

  async deleteDevice(deviceId: string): Promise<void> {
    await this.ctx.client.from('devices').delete().eq('workspace_id', this.ctx.workspaceId).eq('id', deviceId);
  }

  async deleteAutomation(automationId: string): Promise<void> {
    await this.ctx.client.from('automations').delete().eq('workspace_id', this.ctx.workspaceId).eq('id', automationId);
  }

  async deletePlant(plantId: string): Promise<void> {
    await this.ctx.client.from('plants').delete().eq('workspace_id', this.ctx.workspaceId).eq('id', plantId);
  }

  async deletePlantGroup(groupId: string): Promise<void> {
    await this.ctx.client.from('plant_groups').delete().eq('workspace_id', this.ctx.workspaceId).eq('id', groupId);
  }

  async deleteSpaceMap(spaceId: string): Promise<void> {
    await this.ctx.client.from('spatial_maps').delete().eq('workspace_id', this.ctx.workspaceId).eq('space_id', spaceId);
  }
}
