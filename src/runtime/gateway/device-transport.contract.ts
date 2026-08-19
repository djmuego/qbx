export interface DeviceTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(command: unknown): Promise<unknown>;
  subscribe(onMessage: (payload: unknown) => void): () => void;
}

export interface DeviceTransportFactory {
  createTransport(): DeviceTransport;
}
