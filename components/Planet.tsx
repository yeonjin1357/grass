"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { Quaternion, Vector3, BackSide, DoubleSide, AdditiveBlending } from "three";
import type { PlanetModel } from "@/lib/planet";

const UP = new Vector3(0, 1, 0);
const LIGHT_THRESHOLD = 0.5; // glow(0..1)가 이 이상인 날만 도시 불빛

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

  // 바쁜 날 = 타일 꼭대기에 얹힌 발광 구체(Bloom이 잡음).
  const lights = useMemo(
    () =>
      planet.cells
        .filter((c) => c.glow >= LIGHT_THRESHOLD)
        .map((c) => {
          const top = planet.radius + c.height;
          return {
            position: [c.dir[0] * top, c.dir[1] * top, c.dir[2] * top] as [
              number,
              number,
              number,
            ],
            size: c.tileSize * (0.28 + c.glow * 0.5),
          };
        }),
    [planet],
  );

  // 팔로워 수 → 토성형 고리 두께.
  const ringInner = planet.radius * 1.55;
  const ringOuter =
    ringInner +
    planet.radius * (0.2 + Math.min(1, Math.log10(1 + planet.followers) / 6) * 1.0);

  return (
    <group>
      {/* 대기(림 글로우) */}
      <mesh scale={1.07}>
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshBasicMaterial
          color={planet.coreColor}
          transparent
          opacity={0.12}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 코어 */}
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

      {/* 도시 불빛 (toneMapped:false → Bloom 발광) */}
      {lights.length > 0 && (
        <Instances limit={lights.length} range={lights.length}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#bdf5ff" toneMapped={false} />
          {lights.map((l, i) => (
            <Instance key={i} position={l.position} scale={l.size} />
          ))}
        </Instances>
      )}

      {/* 토성형 고리 (팔로워 스케일) */}
      <mesh rotation={[Math.PI / 2.4, 0.25, 0]}>
        <ringGeometry args={[ringInner, ringOuter, 96]} />
        <meshBasicMaterial
          color={planet.coreColor}
          transparent
          opacity={0.22}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
