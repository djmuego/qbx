/** Visual 2D plan grid — independent of snap, tuned for grow planner UX. */
export function visualGridSteps(
  bounds: { lengthM: number; widthM: number },
  zoom = 1,
): {
  minorM: number;
  majorM: number;
  labelM: number;
} {
  const maxDim = Math.max(bounds.lengthM, bounds.widthM);
  let base = { minorM: 0.1, majorM: 0.5, labelM: 1 };
  if (maxDim > 25) base = { minorM: 0.5, majorM: 2.5, labelM: 5 };
  else if (maxDim > 8) base = { minorM: 0.25, majorM: 1, labelM: 2 };
  else if (maxDim > 3.5) base = { minorM: 0.1, majorM: 0.5, labelM: 1 };

  if (zoom < 0.65) {
    return { minorM: base.majorM, majorM: base.majorM * 2, labelM: base.labelM * 2 };
  }
  if (zoom > 1.8) return base;
  return { minorM: base.minorM, majorM: base.majorM, labelM: base.labelM };
}

export function gridAxisValues(lengthM: number, stepM: number): number[] {
  if (!(lengthM > 0) || !(stepM > 0)) return [0];
  const count = Math.round(lengthM / stepM);
  const values: number[] = [];
  for (let i = 0; i <= count; i += 1) {
    const value = Number((i * stepM).toFixed(4));
    if (value <= lengthM + 1e-6) values.push(Math.min(value, lengthM));
  }
  const last = values[values.length - 1] ?? 0;
  if (Math.abs(last - lengthM) > 1e-6) values.push(Number(lengthM.toFixed(4)));
  return values;
}

export function isGridMultiple(valueM: number, stepM: number): boolean {
  if (!(stepM > 0)) return false;
  return Math.abs(valueM / stepM - Math.round(valueM / stepM)) < 1e-6;
}

export function formatGridLabel(valueM: number): string {
  return `${Number(valueM.toFixed(2))} м`;
}

export function shouldLabelGridValue(valueM: number, endM: number, labelM: number): boolean {
  if (Math.abs(valueM) < 1e-6 || Math.abs(valueM - endM) < 1e-6) return true;
  if (labelM >= endM) return false;
  return isGridMultiple(valueM, labelM);
}
