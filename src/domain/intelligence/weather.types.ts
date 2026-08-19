export interface WeatherSnapshot {
  outsideTempC?: number;
  outsideRhPercent?: number;
  solarRadiation?: number;
  windSpeed?: number;
  rain?: boolean;
  forecastNote?: string;
  capturedAtMs: number;
}

export interface WeatherProvider {
  getCurrent(spaceId: string): Promise<WeatherSnapshot | null>;
  isRelevant(environmentType: string): boolean;
}
