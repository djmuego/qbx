import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import type * as THREE from 'three';
import type { MapPlacement } from '../../../domain/map/space-map.types';
import type { PlantVisualStage } from '../../../domain/grow/plant-growth-visual';
import { generatePlantGroupInstances } from '../../../domain/map/plant-group-layout';
import { ProceduralPlantMesh } from '../../../features/map3d/plants/ProceduralPlantMesh';

export interface TwinVisual {
  outputOn?: boolean;
  online?: boolean;
  emergencyOff?: boolean;
  reading?: string | null;
  visualState?: 'unbound' | 'online' | 'active' | 'manual' | 'offline' | 'error';
}

interface ProceduralObjectProps {
  placement: MapPlacement;
  plantStage?: PlantVisualStage;
  selected?: boolean;
  twin?: TwinVisual;
  onSelect: () => void;
  onPointerDown?: (e: { stopPropagation: () => void }) => void;
  onHover?: (hover: boolean) => void;
}

function plantHeightM(placement: MapPlacement): number {
  return placement.plantHeightM ?? placement.sizeZM ?? 0.45;
}

function plantCanopyM(placement: MapPlacement): number {
  return placement.canopyDiameterM ?? Math.max(placement.widthM, placement.heightM);
}

export const ProceduralObject: React.FC<ProceduralObjectProps> = ({
  placement,
  plantStage = 'vegetative',
  selected,
  twin,
  onSelect,
  onPointerDown,
  onHover,
}) => {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const spin = useRef<THREE.Group>(null);
  const muted = twin?.online === false || twin?.emergencyOff;
  const on = Boolean(twin?.outputOn) && !twin?.emergencyOff;
  const role = placement.role ?? placement.catalogId ?? '';
  const w = placement.widthM;
  const d = placement.heightM;
  const h = placement.sizeZM ?? 0.2;

  useFrame((_, delta) => {
    if (on && spin.current) spin.current.rotation.z += delta * 7;
  });

  const pos: [number, number, number] = [placement.xM + w / 2, (placement.zM ?? 0) + h / 2, placement.yM + d / 2];
  const rot: [number, number, number] = [
    ((placement.rotationXM ?? 0) * Math.PI) / 180,
    (placement.rotationDeg * Math.PI) / 180,
    ((placement.rotationZM ?? 0) * Math.PI) / 180,
  ];

  const status =
    twin?.emergencyOff ? '#ef4444' : twin?.online === false ? '#94a3b8' : twin?.online ? '#22c55e' : null;

  return (
    <group
      position={pos}
      rotation={rot}
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
        setHovered(true);
        onHover?.(true);
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover?.(false);
      }}
    >
      {placement.kind === 'plant' && (
        <ProceduralPlantMesh
          heightM={plantHeightM(placement)}
          canopyDiameterM={plantCanopyM(placement)}
          stage={plantStage}
          seed={placement.id}
          role={placement.role ?? placement.catalogId}
        />
      )}
      {placement.kind === 'plant_group' && (
        <group position={[-w / 2, -h / 2, -d / 2]}>
          {generatePlantGroupInstances(placement).map((inst) => {
            const pot = Math.max(0.12, Math.min(0.28, w / Math.max(placement.groupCols ?? 3, 2)));
            return (
              <group key={`${inst.row}-${inst.col}`} position={[inst.localXM + pot / 2, h / 2, inst.localYM + pot / 2]}>
                <ProceduralPlantMesh
                  heightM={Math.min(plantHeightM(placement), placement.sizeZM ?? 0.45)}
                  canopyDiameterM={Math.min(plantCanopyM(placement), pot * 1.6)}
                  stage={plantStage}
                  seed={`${placement.id}:${inst.row}:${inst.col}`}
                  role={placement.role ?? placement.catalogId}
                />
              </group>
            );
          })}
        </group>
      )}
      {placement.kind === 'light' && (
        <group>
          <mesh position={[0, h * 0.8, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.25, 6]} />
            <meshStandardMaterial color="#71717a" />
          </mesh>
          <mesh castShadow>
            <boxGeometry args={[w, Math.max(h, 0.045), d]} />
            <meshStandardMaterial
              color={on ? '#f8fafc' : '#57534e'}
              emissive={on ? '#fbbf24' : hovered ? '#f59e0b' : '#000'}
              emissiveIntensity={on ? 1.1 : hovered ? 0.2 : 0}
              roughness={0.3}
              metalness={0.25}
            />
          </mesh>
        </group>
      )}
      {(role === 'exhaust' || role === 'circulation' || role === 'intake' || placement.kind === 'equipment') &&
        placement.kind === 'equipment' &&
        role !== 'humidifier' &&
        role !== 'dehumidifier' &&
        role !== 'heater' &&
        role !== 'hvac' && (
          <group>
            <mesh>
              <cylinderGeometry args={[Math.min(w, d) * 0.48, Math.min(w, d) * 0.48, Math.max(h, 0.08), 20]} />
              <meshStandardMaterial color="#334155" metalness={0.45} roughness={0.35} />
            </mesh>
            <group ref={spin}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[Math.min(w, d) * 0.28, 0.015, 8, 16]} />
                <meshStandardMaterial color={on ? '#38bdf8' : '#94a3b8'} />
              </mesh>
            </group>
          </group>
        )}
      {(role === 'humidifier' || role === 'dehumidifier' || role === 'heater') && (
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={role === 'heater' ? '#fb7185' : '#64748b'} roughness={0.5} />
        </mesh>
      )}
      {role === 'hvac' && (
        <mesh castShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.3} roughness={0.4} />
        </mesh>
      )}
      {placement.kind === 'sensor' && (
        <group>
          <mesh>
            <boxGeometry args={[Math.max(w, 0.06), Math.max(h, 0.04), Math.max(d, 0.03)]} />
            <meshStandardMaterial color={muted ? '#71717a' : '#18181b'} roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh position={[0, 0, Math.max(d, 0.03) * 0.52]}>
            <boxGeometry args={[0.028, 0.012, 0.006]} />
            <meshStandardMaterial
              color={status ?? (twin?.visualState === 'offline' ? '#94a3b8' : '#22c55e')}
              emissive={status ?? '#22c55e'}
              emissiveIntensity={0.7}
            />
          </mesh>
        </group>
      )}
      {placement.kind === 'camera' && (
        <group>
          <mesh>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#3f3f46" />
          </mesh>
          <mesh position={[0, 0, d * 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.028, 0.034, 0.05, 12]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
        </group>
      )}
      {(placement.kind === 'irrigation' && (role === 'reservoir' || role === 'tank' || !role)) && (
        <mesh>
          <cylinderGeometry args={[w * 0.42, w * 0.45, h, 18]} />
          <meshStandardMaterial color="#2563eb" transparent opacity={0.5} roughness={0.2} />
        </mesh>
      )}
      {placement.kind === 'irrigation' && role === 'pump' && (
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={on ? '#38bdf8' : '#1d4ed8'} metalness={0.3} />
        </mesh>
      )}
      {placement.kind === 'irrigation' && role !== 'pump' && role !== 'reservoir' && role !== 'tank' && role !== '' && (
        <mesh>
          <boxGeometry args={[w, Math.max(h, 0.05), d]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      )}
      {placement.kind === 'hub' && (
        <group>
          <mesh>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color={muted ? '#a1a1aa' : '#6d28d9'} metalness={0.25} roughness={0.4} emissive="#5b21b6" emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[w * 0.28, h * 0.2, d * 0.52]}>
            <boxGeometry args={[0.03, 0.02, 0.01]} />
            <meshStandardMaterial color={twin?.online === false ? '#ef4444' : '#4ade80'} emissive={twin?.online === false ? '#ef4444' : '#22c55e'} emissiveIntensity={0.8} />
          </mesh>
        </group>
      )}
      {placement.kind === 'outlet' && (
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#eab308" />
        </mesh>
      )}
      {placement.kind === 'electrical_panel' && (
        <mesh>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color="#ea580c" metalness={0.4} roughness={0.35} />
        </mesh>
      )}
      {placement.kind === 'structure' && (role === 'rack' || role === 'grow_rack' || placement.rackLevels) && (
        <group>
          {Array.from({ length: placement.rackLevels ?? 3 }).map((_, i) => {
            const n = placement.rackLevels ?? 3;
            const y = -h / 2 + ((i + 0.5) / n) * h;
            return (
              <mesh key={i} position={[0, y, 0]}>
                <boxGeometry args={[w, 0.03, d]} />
                <meshStandardMaterial color="#71717a" metalness={0.5} roughness={0.35} />
              </mesh>
            );
          })}
          {([-1, 1] as const).flatMap((sx) =>
            ([-1, 1] as const).map((sz) => (
              <mesh key={`${sx}${sz}`} position={[(sx * w) / 2 - sx * 0.02, 0, (sz * d) / 2 - sz * 0.02]}>
                <boxGeometry args={[0.03, h, 0.03]} />
                <meshStandardMaterial color="#52525b" metalness={0.45} />
              </mesh>
            )),
          )}
        </group>
      )}
      {placement.kind === 'structure' && (role === 'table' || role === 'grow_bed' || role === 'tray' || role === 'pallet') && (
        <group>
          <mesh position={[0, h * 0.35, 0]} castShadow>
            <boxGeometry args={[w, 0.04, d]} />
            <meshStandardMaterial color={role === 'grow_bed' ? '#65a30d' : '#78716c'} metalness={0.2} roughness={0.5} />
          </mesh>
          {role !== 'tray' &&
            ([-1, 1] as const).flatMap((sx) =>
              ([-1, 1] as const).map((sz) => (
                <mesh key={`${sx}${sz}`} position={[(sx * w) / 2 * 0.85, -h * 0.15, (sz * d) / 2 * 0.85]}>
                  <boxGeometry args={[0.04, h * 0.7, 0.04]} />
                  <meshStandardMaterial color="#57534e" />
                </mesh>
              )),
            )}
        </group>
      )}
      {placement.kind === 'structure' && !role?.includes('rack') && role !== 'table' && role !== 'grow_bed' && role !== 'tray' && role !== 'pallet' && !placement.rackLevels && (
        <mesh castShadow>
          <boxGeometry args={[w, Math.max(h, 0.08), d]} />
          <meshStandardMaterial color={role === 'door' ? '#a8a29e' : role === 'window' ? '#7dd3fc' : '#a8a29e'} transparent={role === 'window'} opacity={role === 'window' ? 0.35 : 1} />
        </mesh>
      )}
      {(selected || hovered || (twin?.visualState && twin.visualState !== 'unbound' && twin.visualState !== 'online')) && (
        <mesh>
          <boxGeometry args={[w * 1.08, h * 1.12, d * 1.08]} />
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
            opacity={selected ? 0.95 : 0.45}
          />
        </mesh>
      )}
    </group>
  );
};
