export type SwitchOutputState = 'on' | 'off';

export interface OutputState {
  outputId: string;
  state: SwitchOutputState;
  timestampMs: number;
  level?: number;
}
