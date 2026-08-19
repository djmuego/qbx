export interface TargetRange {
  min?: number;
  max?: number;
  preferred?: number;
  unit?: string;
}

export interface GrowTargets {
  temperatureDay?: TargetRange;
  temperatureNight?: TargetRange;
  humidity?: TargetRange;
  vpd?: TargetRange;
  co2?: TargetRange;
  lightHours?: TargetRange;
  photoperiod?: string;
  soilMoisture?: TargetRange;
  ph?: TargetRange;
  ec?: TargetRange;
  source: 'crop' | 'stage' | 'user' | 'default' | 'unknown';
}
