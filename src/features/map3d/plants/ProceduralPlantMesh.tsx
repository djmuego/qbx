import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { PlantVisualStage } from '../../../domain/grow/plant-growth-visual';
import { buildProceduralPlantSpec } from './procedural-plant-engine';

export interface ProceduralPlantMeshProps {
  heightM: number;
  canopyDiameterM: number;
  stage: PlantVisualStage;
  seed: string;
  role?: string;
}

function leafColor(base: string, accent: string, shade: number): string {
  const c1 = new THREE.Color(base);
  const c2 = new THREE.Color(accent);
  return c1.lerp(c2, shade * 0.45).getStyle();
}

export const ProceduralPlantMesh: React.FC<ProceduralPlantMeshProps> = ({
  heightM,
  canopyDiameterM,
  stage,
  seed,
  role,
}) => {
  const spec = useMemo(
    () => buildProceduralPlantSpec(stage, heightM, canopyDiameterM, seed, role),
    [stage, heightM, canopyDiameterM, seed, role],
  );

  const floorY = -spec.heightM / 2;

  return (
    <group>
      {spec.potHeightM > 0.02 && (
        <mesh position={[0, floorY + spec.potHeightM / 2, 0]} castShadow>
          <cylinderGeometry args={[spec.potRadiusM * 0.92, spec.potRadiusM, spec.potHeightM, 12]} />
          <meshStandardMaterial color={spec.potColor} roughness={0.88} metalness={0.02} />
        </mesh>
      )}

      {spec.stemHeightM > 0.02 && (
        <mesh position={[0, floorY + spec.potHeightM + spec.stemHeightM / 2, 0]} castShadow>
          <cylinderGeometry
            args={[spec.stemRadiusTop, spec.stemRadiusBottom, spec.stemHeightM, 8]}
          />
          <meshStandardMaterial color={spec.stemColor} roughness={0.82} metalness={0.02} />
        </mesh>
      )}

      {spec.branches.map((branch) => (
        <group
          key={branch.id}
          position={[0, branch.startY, 0]}
          rotation={[branch.pitch, branch.yaw, 0]}
        >
          <mesh position={[0, branch.length / 2, 0]} castShadow>
            <cylinderGeometry args={[branch.radiusTop, branch.radiusBottom, branch.length, 6]} />
            <meshStandardMaterial color={spec.stemColor} roughness={0.8} />
          </mesh>
        </group>
      ))}

      {spec.leaves.map((leaf) => (
        <mesh
          key={leaf.id}
          position={[leaf.x, leaf.y, leaf.z]}
          rotation={[leaf.pitch, leaf.yaw, leaf.roll]}
          castShadow
        >
          <boxGeometry args={[leaf.width, leaf.length, leaf.width * 0.35]} />
          <meshStandardMaterial
            color={leafColor(spec.leafColorBase, spec.leafColorAccent, leaf.shade)}
            roughness={0.72}
            metalness={0.02}
          />
        </mesh>
      ))}

      {spec.flowers.map((flower) => (
        <mesh key={flower.id} position={[flower.x, flower.y, flower.z]} castShadow>
          <sphereGeometry args={[flower.radius, 8, 8]} />
          <meshStandardMaterial color="#f472b6" roughness={0.55} emissive="#be185d" emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
};
