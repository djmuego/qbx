import type { GrowAgentAnalysis } from '../../domain/ai/grow-agent-response.types';
import type { AgentBriefing, AgentMessage } from '../../domain/ai/agent.types';
import { analysisToBriefing } from './grow-agent.service';

const BRIEFING_KEY = 'qbx_grow_agent_analysis_v2';
const CHAT_KEY = 'qbx_agent_chat_v1';

function briefingKey(spaceId: string) {
  return `${BRIEFING_KEY}_${spaceId}`;
}

function chatKey(spaceId: string) {
  return `${CHAT_KEY}_${spaceId}`;
}

export function loadAgentAnalysis(spaceId: string): GrowAgentAnalysis | null {
  if (!spaceId || typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(briefingKey(spaceId));
    return raw ? (JSON.parse(raw) as GrowAgentAnalysis) : null;
  } catch {
    return null;
  }
}

export function saveAgentAnalysis(spaceId: string, analysis: GrowAgentAnalysis): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.setItem(briefingKey(spaceId), JSON.stringify(analysis));
  void import('./ai-cloud.persistence').then((m) => m.cloudSaveAgentAnalysis(spaceId, analysis));
}

/** Legacy briefing loader */
export function loadAgentBriefing(spaceId: string): AgentBriefing | null {
  const analysis = loadAgentAnalysis(spaceId);
  return analysis ? analysisToBriefing(analysis) : null;
}

export function saveAgentBriefing(spaceId: string, briefing: AgentBriefing): void {
  // no-op path — prefer saveAgentAnalysis
  void briefing;
  void spaceId;
}

export function loadAgentChat(spaceId: string): AgentMessage[] {
  if (!spaceId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(chatKey(spaceId));
    return raw ? (JSON.parse(raw) as AgentMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveAgentChat(spaceId: string, messages: AgentMessage[]): void {
  if (!spaceId || typeof window === 'undefined') return;
  const trimmed = messages.slice(-50);
  localStorage.setItem(chatKey(spaceId), JSON.stringify(trimmed));
  void import('./ai-cloud.persistence').then((m) => m.cloudSaveAgentChat(spaceId, trimmed));
}

export function clearAgentChat(spaceId: string): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.removeItem(chatKey(spaceId));
  void import('./ai-cloud.persistence').then((m) => m.cloudClearAgentChat(spaceId));
}
