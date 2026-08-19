export interface SensorRecommendation {
  sensorType: string;
  priority: 'high' | 'medium' | 'low';
  valueReason: string;
  improvesTopics: string[];
}
