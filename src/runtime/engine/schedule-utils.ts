import type { Clock } from '../clock';

export function minutesSinceMidnight(clock: Clock): number {
  const date = clock.nowDate();
  return date.getHours() * 60 + date.getMinutes();
}

export function parseTimeToMinutes(value: string): number {
  const [hh, mm] = value.split(':').map(Number);
  return hh * 60 + mm;
}

export function isDayActive(scheduleDays: number[] | undefined, clock: Clock): boolean {
  if (!scheduleDays || scheduleDays.length === 0) return true;
  return scheduleDays.includes(clock.nowDate().getDay());
}

export function isWithinScheduleWindow(onTime: string, offTime: string, clock: Clock): boolean {
  const now = minutesSinceMidnight(clock);
  const start = parseTimeToMinutes(onTime);
  const end = parseTimeToMinutes(offTime);
  if (start === end) return false;
  if (start < end) {
    return now >= start && now < end;
  }
  return now >= start || now < end;
}

export function isScheduleActive(onTime: string, offTime: string, scheduleDays: number[] | undefined, clock: Clock): boolean {
  return isDayActive(scheduleDays, clock) && isWithinScheduleWindow(onTime, offTime, clock);
}
