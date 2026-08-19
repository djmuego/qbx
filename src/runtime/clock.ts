export interface Clock {
  nowMs(): number;
  nowDate(): Date;
}

export class SystemClock implements Clock {
  nowMs(): number {
    return Date.now();
  }

  nowDate(): Date {
    return new Date();
  }
}

export class FakeClock implements Clock {
  private currentMs: number;

  constructor(startMs?: number) {
    this.currentMs = startMs ?? new Date(2026, 7, 18, 12, 0, 0).getTime();
  }

  nowMs(): number {
    return this.currentMs;
  }

  nowDate(): Date {
    return new Date(this.currentMs);
  }

  advanceMs(ms: number): void {
    this.currentMs += ms;
  }

  setMs(ms: number): void {
    this.currentMs = ms;
  }

  setTime(hours: number, minutes: number, day = 18, month = 7, year = 2026): void {
    this.currentMs = new Date(year, month - 1, day, hours, minutes, 0).getTime();
  }
}
