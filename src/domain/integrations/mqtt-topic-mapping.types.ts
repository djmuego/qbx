/** Maps MQTT topic patterns to QBX device inputs (advisory / future runtime bridge). */

export interface MqttTopicMapping {
  id: string;
  /** MQTT pattern — supports `+` single-level and trailing `#` */
  topicPattern: string;
  deviceId: string;
  inputId: string;
  label?: string;
  unit?: string;
}

export interface MqttMappedReading {
  mappingId: string;
  topic: string;
  deviceId: string;
  inputId: string;
  label?: string;
  value: number | null;
  unit?: string;
  receivedAtMs: number;
}
