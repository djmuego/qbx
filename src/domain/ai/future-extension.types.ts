import type { GrowAgentRecommendation } from './grow-agent-response.types';
import type { GrowContext } from './grow-context.types';

/** Future: User approval → runtime command. NOT implemented in this pass. */
export interface RecommendationExecutor {
  propose(recommendation: GrowAgentRecommendation): Promise<{ proposalId: string }>;
  approve(proposalId: string): Promise<void>;
  reject(proposalId: string): Promise<void>;
}

/** Future: compare grow runs / cycles */
export interface GrowRunAnalyzer {
  compareRuns(spaceId: string, runIds: string[]): Promise<{ summary: string }>;
}

/** Future: QBX Blueprints repository */
export interface BlueprintRepository {
  list(): Promise<{ id: string; name: string; cropId: string }[]>;
  get(id: string): Promise<unknown>;
}

/** Sense → Decide → Act → Learn pipeline extension point */
export interface CultivationPipeline {
  sense(context: GrowContext): GrowContext;
  analyze(context: GrowContext): unknown;
  recommend(context: GrowContext): GrowAgentRecommendation[];
}
