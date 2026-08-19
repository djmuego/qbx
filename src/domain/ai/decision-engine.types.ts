import type { GrowAgentConfidence } from './grow-agent-response.types';
import type { AiAutonomyLevel } from './autonomy.types';

/**
 * Semantic intent — AI never emits raw relay commands.
 * QBX maps intent → available equipment + safe automation path.
 */
export type AgronomicIntentKind =
  | 'maintain_climate'
  | 'reduce_temperature'
  | 'increase_humidity'
  | 'decrease_humidity'
  | 'irrigate'
  | 'adjust_lighting'
  | 'adjust_co2'
  | 'ventilate'
  | 'investigate_anomaly'
  | 'none';

export interface AgronomicIntent {
  kind: AgronomicIntentKind;
  /** Human-readable goal, e.g. «снизить температуру до целевого диапазона» */
  goal: string;
  targetParameter?: 'temperature' | 'humidity' | 'vpd' | 'co2' | 'substrate_moisture' | 'ec' | 'ph' | 'ppfd' | 'dli';
  targetRange?: { min?: number; max?: number; unit?: string };
  urgency: 'low' | 'medium' | 'high';
  confidence: GrowAgentConfidence;
  reasoning: string[];
  evidence: string[];
}

/** Proposed action after AI analysis — awaits Safety + user policy */
export interface ActionProposal {
  id: string;
  spaceId: string;
  createdAtMs: number;
  intent: AgronomicIntent;
  title: string;
  description: string;
  expectedEffect: string;
  risk: string;
  /** Mapped by Equipment Role Resolver — not GPIO */
  suggestedEquipmentRoles: string[];
  autonomyRequired: AiAutonomyLevel;
  expiresAtMs?: number;
}

export type SafetyVerdictStatus = 'approved' | 'denied' | 'modified' | 'deferred';

/** Deterministic Safety Engine output — LLM cannot override */
export interface SafetyVerdict {
  proposalId: string;
  status: SafetyVerdictStatus;
  evaluatedAtMs: number;
  /** Why approved/denied — always deterministic rules */
  reasons: string[];
  /** If modified: safe alternative parameters */
  modifiedIntent?: AgronomicIntent;
  blockedBy?: ('emergency_off' | 'offline_device' | 'conflict' | 'limit' | 'missing_sensor')[];
}

export type ExecutionStatus = 'pending' | 'sent' | 'confirmed' | 'failed' | 'timeout' | 'no_effect';

/** Result after Automation Engine / Runtime — fed back to AI for effect check */
export interface ExecutionResult {
  proposalId: string;
  status: ExecutionStatus;
  executedAtMs: number;
  runtimeCommandIds?: string[];
  /** FACT from sensors after action window */
  observedEffect?: string;
  anomalyDetected?: boolean;
}

/** Full pipeline contract — implementation per Pass, not in advisory-only phase */
export interface DecisionEngine {
  proposeIntent(context: unknown): Promise<ActionProposal[]>;
  evaluateSafety(proposal: ActionProposal): Promise<SafetyVerdict>;
  executeApproved(proposal: ActionProposal, verdict: SafetyVerdict): Promise<ExecutionResult>;
  verifyEffect(proposal: ActionProposal, result: ExecutionResult): Promise<{ success: boolean; followUp?: ActionProposal }>;
}
