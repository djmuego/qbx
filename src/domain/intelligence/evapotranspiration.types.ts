export interface EvapotranspirationInput {
  airTempC?: number;
  relativeHumidityPercent?: number;
  ppfd?: number;
  airflow?: boolean;
  cropId?: string;
  canopyFactor?: number;
}

export interface EvapotranspirationEstimate {
  available: boolean;
  demandIndex?: number;
  unit?: string;
  basis: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface EvapotranspirationProvider {
  estimate(input: EvapotranspirationInput): EvapotranspirationEstimate;
}
