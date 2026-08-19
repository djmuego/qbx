/** @deprecated Use grow-agent.service — legacy adapter for Space Advisor and imports */
export {
  analyzeGrowContext as analyzeSystem,
  askGrowAgent as askAgent,
  createLocalAnalysis as createLocalBriefing,
  analysisToBriefing,
  buildGrowContext,
} from './grow-agent.service';

export type { BuildGrowContextInput } from './grow-context.builder';