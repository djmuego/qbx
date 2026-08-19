import type { RuntimeEvent, RuntimeEventType } from '../types/events.types';
import { DEFAULT_EVENT_LOG_LIMIT } from '../types/runtime-state.types';

export class EventLog {
  private events: RuntimeEvent[] = [];
  private seq = 0;

  constructor(private readonly limit = DEFAULT_EVENT_LOG_LIMIT) {}

  record(
    type: RuntimeEventType,
    timestampMs: number,
    message: string,
    meta: Omit<RuntimeEvent, 'id' | 'type' | 'timestampMs' | 'message'> = {},
  ): RuntimeEvent {
    const event: RuntimeEvent = {
      id: `evt-${++this.seq}-${timestampMs}`,
      type,
      timestampMs,
      message,
      ...meta,
    };
    this.events.push(event);
    if (this.events.length > this.limit) {
      this.events.splice(0, this.events.length - this.limit);
    }
    return event;
  }

  list(): RuntimeEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
