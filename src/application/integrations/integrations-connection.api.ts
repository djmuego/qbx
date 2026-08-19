export interface MqttConnectionTestResult {
  ok: boolean;
  host?: string;
  port?: number;
  latencyMs?: number;
  note?: string;
  error?: string;
}

export interface HomeAssistantTestResult {
  ok: boolean;
  version?: string;
  latencyMs?: number;
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

export async function testHomeAssistantConnection(input: {
  baseUrl: string;
  accessToken: string;
}): Promise<HomeAssistantTestResult> {
  const response = await fetch('/api/integrations/home-assistant/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return (await response.json()) as HomeAssistantTestResult;
}
