/** Extended trust model — VERIFIED requires registry sourceIds */
export type KnowledgeTrustLevel =
  | 'VERIFIED_PRIMARY'
  | 'VERIFIED_SECONDARY'
  | 'PROJECT_DECISION'
  | 'QBX_EMPIRICAL'
  | 'EXPERT_NOTE'
  | 'UNVERIFIED'
  /** @deprecated use VERIFIED_PRIMARY or VERIFIED_SECONDARY */
  | 'VERIFIED';

export type SourceType =
  | 'PEER_REVIEWED'
  | 'UNIVERSITY'
  | 'EXTENSION'
  | 'GOVERNMENT'
  | 'TEXTBOOK'
  | 'STANDARD'
  | 'MANUFACTURER'
  | 'INDUSTRY'
  | 'QBX_OBSERVATION'
  | 'EXPERT_NOTE'
  | 'UNVERIFIED';

export interface KnowledgeSource {
  id: string;
  title: string;
  organization?: string;
  authors?: string[];
  year?: string | number;
  url?: string;
  type: SourceType;
  topics?: string[];
  reviewedAt?: string;
  notes?: string;
}

export interface KnowledgeClaim {
  id: string;
  metric: string;
  unit: string;
  min?: number;
  max?: number;
  cropIds?: string[];
  stageIds?: string[];
  mediums?: string[];
  environmentTypes?: string[];
  trust: KnowledgeTrustLevel;
  sourceIds: string[];
  evidenceLevel?: 'primary' | 'secondary' | 'operational' | 'hypothesis';
}

export function normalizeTrustLevel(trust: string): KnowledgeTrustLevel {
  if (trust === 'VERIFIED') return 'VERIFIED_SECONDARY';
  return trust as KnowledgeTrustLevel;
}

export function isVerifiedTrust(trust: KnowledgeTrustLevel): boolean {
  return trust === 'VERIFIED' || trust === 'VERIFIED_PRIMARY' || trust === 'VERIFIED_SECONDARY';
}

export function trustRank(trust: KnowledgeTrustLevel): number {
  switch (trust) {
    case 'VERIFIED_PRIMARY':
      return 6;
    case 'VERIFIED':
    case 'VERIFIED_SECONDARY':
      return 5;
    case 'QBX_EMPIRICAL':
      return 4;
    case 'PROJECT_DECISION':
      return 3;
    case 'EXPERT_NOTE':
      return 2;
    case 'UNVERIFIED':
      return 0;
    default:
      return 0;
  }
}
