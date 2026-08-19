import React from 'react';
import type { MapPlacement } from '../../domain/map/space-map.types';
import type { PlantGrowthVisual } from '../../domain/grow/plant-growth-visual';
import {
  canvasLabelForPlacement,
  describeMapVisual,
  shouldShowCanvasLabel,
} from '../../domain/map/map-visual-language';
import { MapCategoryIcon } from './MapCategoryIcon';

interface MapPlacement2DProps {
  placement: MapPlacement;
  display: { xM: number; yM: number; widthM: number; heightM: number };
  ppm: number;
  bounds: { widthM: number };
  meterToSvg: (xM: number, yM: number) => { x: number; y: number };
  selected: boolean;
  hovered: boolean;
  growth: PlantGrowthVisual | null;
  plantName?: string;
  offline?: boolean;
  unbound?: boolean;
  editMode: boolean;
  dragging?: boolean;
  onPointerDown: (e: React.PointerEvent, mode: 'move' | 'resize' | 'rotate') => void;
}

export const MapPlacement2D: React.FC<MapPlacement2DProps> = ({
  placement,
  display,
  ppm,
  bounds,
  meterToSvg,
  selected,
  hovered,
  growth,
  plantName,
  offline,
  unbound,
  editMode,
  dragging,
  onPointerDown,
}) => {
  const hitTopLeft = meterToSvg(placement.xM, placement.yM + placement.heightM);
  const hitW = placement.widthM * ppm;
  const hitH = placement.heightM * ppm;
  const topLeft = meterToSvg(display.xM, display.yM + display.heightM);
  const w = display.widthM * ppm;
  const h = display.heightM * ppm;
  const cx = topLeft.x + w / 2;
  const cy = topLeft.y + h / 2;
  const hitCx = hitTopLeft.x + hitW / 2;
  const hitCy = hitTopLeft.y + hitH / 2;
  const visual = describeMapVisual(placement, { offline, unbound });
  const isPlant = placement.kind === 'plant';
  const showLabel = shouldShowCanvasLabel(placement, { selected, hovered });
  const label = canvasLabelForPlacement(placement, plantName);
  const touchPad = Math.max(8, (Math.min(hitW, hitH) * 0.18));
  const handleR = Math.max(8, Math.min(11, ppm * 0.04));
  const iconSize = Math.max(14, Math.min(isPlant ? w / 2.2 : 20, w * 0.55));

  return (
    <g
      transform={`rotate(${placement.rotationDeg} ${hitCx} ${hitCy})`}
      onPointerDown={(e) => onPointerDown(e, 'move')}
      className={editMode ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'}
      style={dragging ? { filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' } : undefined}
    >
      <title>{label || visual.symbol}</title>
      <rect
        x={hitTopLeft.x - touchPad}
        y={hitTopLeft.y - touchPad}
        width={hitW + touchPad * 2}
        height={hitH + touchPad * 2}
        fill="transparent"
        stroke="none"
      />
      {hovered && !selected && (
        <rect
          x={isPlant ? cx - w / 2 - 2 : topLeft.x - 2}
          y={isPlant ? cy - h / 2 - 2 : topLeft.y - 2}
          width={(isPlant ? w : hitW) + 4}
          height={(isPlant ? h : hitH) + 4}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1}
          rx={isPlant ? w / 2 : 6}
          opacity={0.8}
        />
      )}
      {isPlant ? (
        <>
          <ellipse
            cx={cx}
            cy={cy}
            rx={w / 2}
            ry={h / 2}
            fill={visual.fill}
            stroke={selected ? '#059669' : visual.stroke}
            strokeWidth={selected ? 2.5 : 1.5}
            opacity={growth && growth.scale < 0.2 ? 0.92 : 1}
          />
          <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
            <MapCategoryIcon
              category={visual.category}
              plantStage={growth?.visualStageIndex}
              size={iconSize}
              color={visual.text}
            />
          </g>
        </>
      ) : (
        <>
          <rect
            x={topLeft.x}
            y={topLeft.y}
            width={w}
            height={h}
            rx={6}
            fill={visual.fill}
            stroke={selected ? '#059669' : visual.stroke}
            strokeWidth={selected ? 2.5 : 1.5}
            opacity={offline ? 0.65 : 1}
          />
          <g transform={`translate(${cx - iconSize / 2}, ${cy - iconSize / 2})`}>
            <MapCategoryIcon category={visual.category} size={iconSize} color={visual.text} />
          </g>
          {showLabel && label && w > 28 && (
            <text x={cx} y={topLeft.y - 4} textAnchor="middle" fontSize={9} fill={visual.text} fontWeight={600}>
              {label}
            </text>
          )}
        </>
      )}
      {selected && editMode && (
        <>
          <rect
            x={isPlant ? cx - w / 2 : topLeft.x}
            y={isPlant ? cy - h / 2 : topLeft.y}
            width={isPlant ? w : hitW}
            height={isPlant ? h : hitH}
            fill="none"
            stroke="#059669"
            strokeWidth={2}
            rx={isPlant ? w / 2 : 6}
            strokeDasharray="4 2"
          />
          {!isPlant && (
            <>
              <circle
                cx={topLeft.x + hitW}
                cy={topLeft.y + hitH}
                r={handleR}
                fill="#fff"
                stroke="#059669"
                strokeWidth={2}
                onPointerDown={(e) => onPointerDown(e, 'resize')}
                className="cursor-nwse-resize"
              />
              <circle
                cx={cx}
                cy={topLeft.y - Math.max(14, handleR + 4)}
                r={handleR}
                fill="#fff"
                stroke="#059669"
                strokeWidth={2}
                onPointerDown={(e) => onPointerDown(e, 'rotate')}
                className="cursor-alias"
              />
            </>
          )}
        </>
      )}
      {unbound && (
        <circle cx={hitTopLeft.x + 6} cy={hitTopLeft.y + 6} r={4} fill="#f59e0b" stroke="#fff" strokeWidth={1} />
      )}
    </g>
  );
};
