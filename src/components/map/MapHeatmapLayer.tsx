import React, { useMemo } from 'react';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { HeatmapResult } from '../../domain/map/spatial-intelligence.types';
import {
  formatHeatmapValue,
  heatmapCellColor,
  heatmapValueRange,
  interpolateHeatmapGrid,
} from '../../application/intelligence/heatmap-interpolation';

interface MapHeatmapLayerProps {
  heatmap: HeatmapResult;
  bounds: SpaceDimensions;
  ppm: number;
  meterToSvg: (xM: number, yM: number) => { x: number; y: number };
}

export const MapHeatmapLayer: React.FC<MapHeatmapLayerProps> = ({ heatmap, bounds, ppm, meterToSvg }) => {
  const cells = useMemo(
    () =>
      heatmap.available
        ? interpolateHeatmapGrid({
            points: heatmap.measured,
            lengthM: bounds.lengthM,
            widthM: bounds.widthM,
          })
        : [],
    [heatmap, bounds.lengthM, bounds.widthM],
  );

  const range = useMemo(() => heatmapValueRange(heatmap.measured), [heatmap.measured]);

  if (!heatmap.available || heatmap.metric === 'vpd') return null;

  const metric = heatmap.metric;

  return (
    <g pointerEvents="none" opacity={0.72}>
      {cells.map((cell) => {
        const topLeft = meterToSvg(cell.xM, cell.yM + cell.heightM);
        return (
          <rect
            key={`${cell.xM}-${cell.yM}`}
            x={topLeft.x}
            y={topLeft.y}
            width={cell.widthM * ppm}
            height={cell.heightM * ppm}
            fill={heatmapCellColor(metric, cell.value, range.min, range.max)}
            stroke="none"
          />
        );
      })}
      {heatmap.measured.map((point) => {
        const c = meterToSvg(point.xM, point.yM);
        return (
          <g key={point.sensorId}>
            <circle cx={c.x} cy={c.y} r={7} fill="#ffffffcc" stroke="#0f172a" strokeWidth={1.5} />
            <text x={c.x} y={c.y + 3} textAnchor="middle" fontSize={8} fontWeight={700} fill="#0f172a">
              {metric === 'temperature' ? point.value.toFixed(1) : point.value.toFixed(0)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

export function heatmapLegendStops(metric: 'temperature' | 'humidity', min: number, max: number): string[] {
  return [0, 0.5, 1].map((t) => heatmapCellColor(metric, min + (max - min) * t, min, max));
}

export function heatmapLegendLabels(metric: 'temperature' | 'humidity', min: number, max: number): [string, string, string] {
  return [
    formatHeatmapValue(metric, min),
    formatHeatmapValue(metric, (min + max) / 2),
    formatHeatmapValue(metric, max),
  ];
}
