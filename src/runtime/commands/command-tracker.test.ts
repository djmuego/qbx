import { describe, expect, it } from 'vitest';
import { CommandTracker } from './command-tracker';
import { FakeClock } from '../clock';

describe('CommandTracker', () => {
  it('marks commands as timeout when no acknowledgement', () => {
    const clock = new FakeClock(0);
    const tracker = new CommandTracker(clock, 1000);
    tracker.create('out-1', 'dev-1', true);
    clock.advanceMs(1500);
    const expired = tracker.expireTimedOut();
    expect(expired).toHaveLength(1);
    expect(expired[0].status).toBe('timeout');
  });
});
