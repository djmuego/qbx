import type { GrowPhaseId } from '../grow/grow-phase.types';
import type { AiChatMessage } from './advisor.types';

export type AgentStatus = 'ok' | 'attention' | 'critical' | 'waiting';

export type AgentInsightSeverity = 'info' | 'warning' | 'critical';

export interface AgentInsight {
  severity: AgentInsightSeverity;
  title: string;
  detail: string;
}

export interface AgentBriefing {
  status: AgentStatus;
  headline: string;
  summary: string;
  insights: AgentInsight[];
  watchItems: string[];
  nextSteps: string[];
  generatedAtMs: number;
}

export interface AgentMessage extends AiChatMessage {
  id: string;
  timestampMs: number;
}

export interface QbxSensorSnapshot {
  id: string;
  name: string;
  type: string;
  value: number | null;
  unit: string;
  status: string;
  optimalMin?: number;
  optimalMax?: number;
  hasLiveData: boolean;
}

export interface QbxOutputSnapshot {
  id: string;
  name: string;
  type: string;
  state: boolean | null;
  isAuto: boolean;
  deviceOnline: boolean;
}

export interface QbxAutomationSnapshot {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  runtimeStatus?: string;
}

export interface QbxSystemSnapshot {
  capturedAtMs: number;
  runtimeMode: 'hardware' | 'simulator';
  space: {
    id: string;
    name: string;
    type?: string;
    areaM2?: number;
    volumeM3?: number;
    description?: string;
  } | null;
  growPhase: GrowPhaseId;
  growPhaseName: string;
  growPhaseTargets: {
    lightCycle: string;
    targetTemp: string;
    targetHumidity: string;
  };
  emergencyActive: boolean;
  devices: {
    total: number;
    online: number;
    offline: number;
    names: string[];
  };
  sensors: QbxSensorSnapshot[];
  outputs: QbxOutputSnapshot[];
  automations: QbxAutomationSnapshot[];
  dataAvailability: {
    hasDevices: boolean;
    hasLiveSensorData: boolean;
    hasOutputs: boolean;
    hasAutomations: boolean;
  };
}

export type { AiChatMessage };
