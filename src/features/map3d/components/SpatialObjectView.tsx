import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import type { MapPlacement } from '../../../domain/map/space-map.types';
import {
  placementForGrowthRender,
  resolvePlacementGrowthVisual,
} from '../../../domain/grow/plant-growth-visual';
import { ProceduralObject, type TwinVisual } from '../../../components/map/spatial3d/ProceduralObject';
import { resolveSpatialAsset, spriteVisualSize, type ResolveSpatialAssetContext } from '../assets/resolve-spatial-asset';
import { SpatialSprite } from './SpatialSprite';

interface SpatialObjectViewProps {
  placement: MapPlacement;
  selected?: boolean;
  twin?: TwinVisual;
  resolveCtx?: ResolveSpatialAssetContext;
  onSelect: () => void;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
  onHover?: (hover: boolean) => void;
}

class SpriteErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* missing texture → procedural */
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

function placementPose(placement: MapPlacement, visualH: number): { pos: [number, number, number]; rot: [number, number, number] } {
  const w = placement.widthM;
  const d = placement.heightM;
  const z0 = placement.zM ?? 0;
  return {
    pos: [placement.xM + w / 2, z0 + visualH / 2, placement.yM + d / 2],
    rot: [
      ((placement.rotationXM ?? 0) * Math.PI) / 180,
      (placement.rotationDeg * Math.PI) / 180,
      ((placement.rotationZM ?? 0) * Math.PI) / 180,
    ],
  };
}

export const SpatialObjectView: React.FC<SpatialObjectViewProps> = React.memo(({
  placement,
  selected,
  twin,
  resolveCtx,
  onSelect,
  onPointerDown,
  onHover,
}) => {
  const growth =
    placement.kind === 'plant' || placement.kind === 'plant_group'
      ? resolvePlacementGrowthVisual(placement, resolveCtx?.plant, {
          growPhase: resolveCtx?.growPhase,
          cropStartedAt: resolveCtx?.cropStartedAt,
          previewAgeDays: resolveCtx?.previewAgeDays,
        })
      : null;
  const renderPlacement = growth ? placementForGrowthRender(placement, growth) : placement;

  if (placement.kind === 'plant' || placement.kind === 'plant_group') {
    return (
      <ProceduralObject
        placement={renderPlacement}
        plantStage={growth?.stage ?? 'vegetative'}
        selected={selected}
        twin={twin}
        onSelect={onSelect}
        onPointerDown={onPointerDown}
        onHover={onHover}
      />
    );
  }

  const asset = resolveSpatialAsset(renderPlacement, { ...resolveCtx, growthVisual: growth });
  const procedural = (
    <ProceduralObject
      placement={renderPlacement}
      selected={selected}
      twin={twin}
      onSelect={onSelect}
      onPointerDown={onPointerDown}
      onHover={onHover}
    />
  );

  const useSprite = asset.renderType === 'sprite' && Boolean(asset.source) && asset.objectSprite;
  if (!useSprite) return procedural;

  const size = spriteVisualSize(renderPlacement, asset, growth);
  const floor = (placement.mounting ?? 'floor') === 'floor';
  const pose = placementPose(placement, size.heightM);
  const floorY = asset.anchor === 'bottom-center' ? placement.zM ?? 0 : pose.pos[1];
  const groupPos: [number, number, number] =
    asset.anchor === 'bottom-center'
      ? [placement.xM + placement.widthM / 2, floorY, placement.yM + placement.heightM / 2]
      : pose.pos;

  return (
    <group position={groupPos} rotation={pose.rot}>
      <SpriteErrorBoundary fallback={procedural}>
        <SpatialSprite
          asset={asset}
          widthM={size.widthM}
          heightM={size.heightM}
          selected={selected}
          hovered={false}
          twin={twin}
          floorShadow={floor}
          onSelect={onSelect}
          onPointerDown={onPointerDown}
          onHover={onHover}
        />
      </SpriteErrorBoundary>
    </group>
  );
});
