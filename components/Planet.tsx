"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { Quaternion, Vector3 } from "three";
import type { PlanetModel } from "@/lib/planet";

const UP = new Vector3(0, 1, 0);

export function Planet({ planet }: { planet: PlanetModel }) {
  // 각 타일의 +Y축을 표면 법선(dir)에 정렬하는 quaternion을 미리 계산.
  const tiles = useMemo(
    () =>
      planet.cells.map((c) => ({
        position: c.position,
        scale: [c.tileSize, c.height, c.tileSize] as [number, number, number],
        color: c.color,
        quaternion: new Quaternion().setFromUnitVectors(
          UP,
          new Vector3(c.dir[0], c.dir[1], c.dir[2]),
        ),
      })),
    [planet],
  );

  return (
    <group>
      {/* 행성 코어 */}
      <mesh>
        <icosahedronGeometry args={[planet.radius, 8]} />
        <meshStandardMaterial
          color={planet.coreColor}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>

      {/* 잔디 → 표면 산맥 (인스턴싱, 드로우콜 1) */}
      <Instances limit={tiles.length} range={tiles.length}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.55} metalness={0.05} />
        {tiles.map((t, i) => (
          <Instance
            key={i}
            position={t.position}
            quaternion={t.quaternion}
            scale={t.scale}
            color={t.color}
          />
        ))}
      </Instances>
    </group>
  );
}
