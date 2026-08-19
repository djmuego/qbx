/** Binds a Home Assistant entity_id to a QBX device input (advisory). */

export interface HomeAssistantEntityBinding {
  id: string;
  entityId: string;
  deviceId: string;
  inputId: string;
  label?: string;
}
