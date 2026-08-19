import React, { Suspense } from 'react';
import { Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { SpatialAssetDescriptor, SpatialBillboardMode } from '../../../domain/map/visual-assets.types';
import type { TwinVisual } from '../../../components/map/spatial3d/ProceduralObject';

interface SpatialSpriteProps {
  asset: SpatialAssetDescriptor;
  widthM: number;
  heightM: number;
  selected?: boolean;
  hovered?: boolean;
  twin?: TwinVisual;
  onSelect: () => void;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
  onHover?: (hover: boolean) => void;
  floorShadow?: boolean;
}

function BillboardWrap({ mode, children }: { mode: SpatialBillboardMode; children: React.ReactNode }) {
  if (mode === 'vertical-billboard') {
    return (
      <Billboard follow lockX lockZ>
        {children}
      </Billboard>
    );
  }
  if (mode === 'camera-facing') {
    return <Billboard follow>{children}</Billboard>;
  }
  return <>{children}</>;
}

function SpritePlane({
  url,
  widthM,
  heightM,
  selected,
  hovered,
  outputOn,
}: {
  url: string;
  widthM: number;
  heightM: number;
  selected?: boolean;
  hovered?: boolean;
  outputOn?: boolean;
}) {
  const texture = useTexture(url);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return (
    <mesh>
      <planeGeometry args={[widthM, heightM]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.12}
        depthWrite
        side={THREE.DoubleSide}
        color={outputOn ? '#fff4cc' : selected ? '#ecfdf5' : hovered ? '#f8fafc' : '#ffffff'}
      />
    </mesh>
  );
}

function CrossBillboardPlanes({
  url,
  widthM,
  heightM,
  selected,
  hovered,
  outputOn,
}: {
  url: string;
  widthM: number;
  heightM: number;
  selected?: boolean;
  hovered?: boolean;
  outputOn?: boolean;
}) {
  return (
    <>
      <SpritePlane url={url} widthM={widthM} heightM={heightM} selected={selected} hovered={hovered} outputOn={outputOn} />
      <group rotation={[0, Math.PI / 2, 0]}>
        <SpritePlane url={url} widthM={widthM} heightM={heightM} selected={selected} hovered={hovered} outputOn={outputOn} />
      </group>
    </>
  );
}

export const SpatialSprite: React.FC<SpatialSpriteProps> = ({
  asset,
  widthM,
  heightM,
  selected,
  hovered,
  twin,
  onSelect,
  onPointerDown,
  onHover,
  floorShadow,
}) => {
  const url = asset.source;
  if (!url) return null;
  const hitW = Math.max(widthM, 0.2);
  const hitH = Math.max(heightM, 0.24);
  const anchorY = asset.anchor === 'bottom-center' ? heightM / 2 : asset.anchor === 'top-center' ? -heightM / 2 : 0;

  const spriteContent =
    asset.billboard === 'cross-billboard' ? (
      <CrossBillboardPlanes
        url={url}
        widthM={widthM}
        heightM={heightM}
        selected={selected}
        hovered={hovered}
        outputOn={Boolean(twin?.outputOn) && !twin?.emergencyOff}
      />
    ) : (
      <BillboardWrap mode={asset.billboard}>
        <SpritePlane
          url={url}
          widthM={widthM}
          heightM={heightM}
          selected={selected}
          hovered={hovered}
          outputOn={Boolean(twin?.outputOn) && !twin?.emergencyOff}
        />
      </BillboardWrap>
    );

  return (
    <group position={[0, anchorY, 0]}>
      {floorShadow && asset.anchor === 'bottom-center' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -heightM / 2 + 0.004, 0.02]}>
          <circleGeometry args={[Math.max(widthM * 0.28, 0.06), 16]} />
          <meshBasicMaterial color="#000" transparent opacity={0.18} depthWrite={false} />
        </mesh>
      )}
      <Suspense fallback={null}>{spriteContent}</Suspense>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown?.(e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover?.(true);
        }}
        onPointerOut={() => onHover?.(false)}
      >
        <boxGeometry args={[hitW, hitH, Math.max(0.08, widthM * 0.35)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(selected || hovered || twin?.visualState === 'offline' || twin?.visualState === 'error' || twin?.visualState === 'active' || twin?.visualState === 'manual') && (
        <mesh>
          <boxGeometry args={[hitW * 1.06, hitH * 1.08, Math.max(0.1, widthM * 0.4)]} />
          <meshBasicMaterial
            color={
              twin?.visualState === 'error'
                ? '#ef4444'
                : twin?.visualState === 'offline'
                  ? '#94a3b8'
                  : twin?.visualState === 'manual'
                    ? '#f59e0b'
                    : twin?.visualState === 'active'
                      ? '#22c55e'
                      : selected
                        ? '#10b981'
                        : '#94a3b8'
            }
            wireframe
            transparent
            opacity={selected ? 0.95 : 0.4}
          />
        </mesh>
      )}
    </group>
  );
};

/** GLB-ready. Unused until a registry entry sets glbUrl / renderType=model. */
export const SpatialModel: React.FC<{ url: string; widthM: number; heightM: number; depthM: number }> = () => {
  return null;
};
