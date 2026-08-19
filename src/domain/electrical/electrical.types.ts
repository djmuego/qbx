/** Logical electrical twin. Not an installation drawing and not code-compliant design. */
export interface ElectricalFinding {
  code: string;
  message: string;
  placementId?: string;
}

export interface ElectricalPlan {
  spaceId?: string;
  schemaVersion: 1;
  status: 'proposal';
  disclaimer: string;
  generatedBy: string;
  links: Array<{ fromId: string; toId: string; kind: 'logical_power' }>;
  totalRatedW: number | null;
  findings: ElectricalFinding[];
  routes?: Array<{ id: string; points: Array<{ xM: number; yM: number; zM: number }>; lengthM: number }>;
}

export type LogicalPowerPlan = ElectricalPlan;
