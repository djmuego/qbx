export interface MqttConnectionTestResult {
  ok: boolean;
  host?: string;
  port?: number;
  latencyMs?: number;
  note?: string;
  error?: string;
}

export async function testMqttBrokerConnection(input: {
  brokerUrl: string;
  port: number;
}): Promise<MqttConnectionTestResult> {
  const response = await fetch('/api/integrations/mqtt/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as MqttConnectionTestResult;
}
