/** Parse Home Assistant entity state string to numeric sensor value. */

export function parseHomeAssistantNumericState(state: string): number | null {
  const trimmed = state.trim();
  if (!trimmed || trimmed === 'unavailable' || trimmed === 'unknown') return null;
  if (trimmed === 'on') return 1;
  if (trimmed === 'off') return 0;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
