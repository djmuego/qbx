import React, { useMemo } from 'react';
import { Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { SpaceDimensions } from '../../../domain/space/space.types';
import type { EnvironmentPresetId } from '../../../domain/map/environment.types';
import type { MapPlacement } from '../../../domain/map/space-map.types';
import { generateEnvironment } from '../../../application/map/environment-generator';
import { isOutdoorPreset } from '../../../domain/map/environment.types';
import { materialSpec } from '../../../application/map/material-registry';

interface RoomEnvironmentProps {
  bounds: SpaceDimensions;
  preset: EnvironmentPresetId;
  placements?: MapPlacement[];
  showCeiling?: boolean;
  darkUi?: boolean;
  terrainProfile?: import('../../../domain/map/terrain.types').TerrainProfile;
}

function PartMesh({
  part,
  ghost,
  floorTexture,
}: {
  part: ReturnType<typeof generateEnvironment>['parts'][number];
  ghost?: boolean;
  floorTexture?: THREE.Texture | null;
}) {
  const mat = materialSpec(part.material);
  const transparent = ghost || (part.opacity != null && part.opacity < 0.99) || mat.opacity != null;
  const opacity = ghost ? 0.18 : (part.opacity ?? mat.opacity ?? 1);
  const args: [number, number, number] = [
    Math.max(part.widthM, 0.008),
    Math.max(part.heightM, 0.008),
    Math.max(part.depthM, 0.008),
  ];
  if (part.kind === 'vent') {
    return (
      <mesh position={[part.xM, part.zM, part.yM]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.03, 16]} />
        <meshStandardMaterial color={mat.color} metalness={0.7} roughness={0.3} />
      </mesh>
    );
  }
  const isFloor = part.kind === 'floor';
  if (isFloor && floorTexture) {
    const tex = floorTexture.clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, part.widthM / 0.6), Math.max(1, part.depthM / 0.6));
    tex.needsUpdate = true;
    return (
      <mesh position={[part.xM, part.zM, part.yM]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[part.widthM, part.depthM]} />
        <meshStandardMaterial map={tex} roughness={0.92} metalness={0.02} />
      </mesh>
    );
  }
  return (
    <mesh position={[part.xM, part.zM, part.yM]} receiveShadow={part.kind === 'floor' || part.kind === 'tray'} castShadow={part.kind === 'frame'}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color={mat.color}
        roughness={part.kind === 'floor' ? 0.88 : mat.roughness}
        metalness={mat.metalness}
        transparent={transparent}
        opacity={opacity}
        emissive={mat.emissive ?? '#000000'}
        emissiveIntensity={mat.emissive ? 0.15 : 0}
      />
    </mesh>
  );
}

export const RoomEnvironment: React.FC<RoomEnvironmentProps> = ({ bounds, preset, placements = [], showCeiling, darkUi, terrainProfile }) => {
  const env = useMemo(() => generateEnvironment(preset, bounds, terrainProfile), [preset, bounds, terrainProfile]);
  const indoor = preset === 'GROW_TENT' || preset === 'GROW_BOX' || preset === 'GROW_ROOM';
  const floorTex = useTexture('/assets/spatial/environment/floor-concrete-tile.png');
  const floorTexture = indoor ? floorTex : null;
  const tent = preset === 'GROW_TENT' || preset === 'GROW_BOX';
  const greenhouse = preset === 'GREENHOUSE';
  const outdoor = isOutdoorPreset(preset);
  const tables = useMemo(() => {
    const plants = placements.filter((p) => p.kind === 'plant');
    if (plants.length < 2) return [];
    const rows = new Map<string, MapPlacement[]>();
    for (const p of plants) {
      const key = (Math.round(p.yM * 5) / 5).toFixed(1);
      const list = rows.get(key) ?? [];
      list.push(p);
      rows.set(key, list);
    }
    return [...rows.values()]
      .filter((row) => row.length >= 2)
      .map((row) => {
        const minX = Math.min(...row.map((p) => p.xM));
        const maxX = Math.max(...row.map((p) => p.xM + p.widthM));
        const minY = Math.min(...row.map((p) => p.yM));
        const maxY = Math.max(...row.map((p) => p.yM + p.heightM));
        return { x: (minX + maxX) / 2, z: (minY + maxY) / 2, w: maxX - minX + 0.16, d: Math.max(0.28, maxY - minY + 0.1) };
      });
  }, [placements]);

  return (
    <group>
      {env.parts
        .filter((part) => {
          if (part.id === 'wall-front' && !tent) return false;
          if (!showCeiling && part.kind === 'ceiling' && !tent && !greenhouse) return false;
          return true;
        })
        .map((part) => {
          const ghost = part.id === 'wall-right' || part.id === 'wall-left' || part.kind === 'door';
          return <PartMesh key={part.id} part={part} ghost={ghost && !greenhouse} floorTexture={floorTexture} />;
        })}
      {tables.map((t, i) => (
        <mesh key={`viz-table-${i}`} position={[t.x, 0.08, t.z]} receiveShadow>
          <boxGeometry args={[t.w, 0.04, t.d]} />
          <meshStandardMaterial color="#a8a29e" metalness={0.3} roughness={0.45} />
        </mesh>
      ))}
      {!tent && (
        <gridHelper
          args={[
            Math.max(bounds.lengthM, bounds.widthM),
            Math.max(8, Math.round(Math.max(bounds.lengthM, bounds.widthM) * 4)),
            darkUi ? '#3f3f46' : '#a8a29e',
            darkUi ? '#27272a' : '#e7e5e4',
          ]}
          position={[bounds.lengthM / 2, 0.014, bounds.widthM / 2]}
        />
      )}
      <Html position={[bounds.lengthM / 2, 0.03, -0.14]} center>
        <div className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap pointer-events-none">
          {bounds.lengthM.toFixed(1)} m
        </div>
      </Html>
      <Html position={[-0.16, 0.03, bounds.widthM / 2]} center>
        <div className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap pointer-events-none">
          {bounds.widthM.toFixed(1)} m
        </div>
      </Html>
      {!outdoor && (
        <Html position={[-0.16, bounds.heightM / 2, bounds.widthM]} center>
          <div className="text-[10px] font-semibold text-zinc-500 whitespace-nowrap pointer-events-none">
            {bounds.heightM.toFixed(1)} m
          </div>
        </Html>
      )}
    </group>
  );
};
