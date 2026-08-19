import { describe, expect, it } from 'vitest';
import { parseHomeAssistantNumericState } from './home-assistant-state-parser';

describe('parseHomeAssistantNumericState', () => {
  it('parses numeric and boolean states', () => {
    expect(parseHomeAssistantNumericState('23.5')).toBe(23.5);
    expect(parseHomeAssistantNumericState('on')).toBe(1);
    expect(parseHomeAssistantNumericState('off')).toBe(0);
    expect(parseHomeAssistantNumericState('unavailable')).toBeNull();
  });
});
