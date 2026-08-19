/** Future computer vision — contracts only */
export interface PlantImageObservation {
  id: string;
  growRunId?: string;
  timestampMs: number;
  stageId?: string;
  tags?: string[];
  note?: string;
}

export interface VisualSymptom {
  id: string;
  label: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface VisionAssessment {
  observationId: string;
  symptoms: VisualSymptom[];
  notes: string[];
  requiresConfirmation: boolean;
}

export interface VisionProvider {
  assess(observation: PlantImageObservation): Promise<VisionAssessment>;
}
