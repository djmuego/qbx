import type { Output } from './equipment.types';

export type OutputTwinMode = 'off' | 'on' | 'auto';

export function resolveOutputTwinMode(output: Pick<Output, 'isAuto' | 'state'>): OutputTwinMode {
  if (output.isAuto) return 'auto';
  return output.state ? 'on' : 'off';
}
