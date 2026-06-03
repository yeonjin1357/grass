"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { Quaternion, Vector3, BackSide, DoubleSide, AdditiveBlending } from "three";
import type { PlanetCell, PlanetModel } from "@/lib/planet";

const UP = new Vector3(0, 1, 0);

type ConeArgs = [number, number, number]; // radius, height, radialSegments

/** 한 biome의 식생을 cone 인스턴싱으로 (드로우콜 1). */
function VegLayer({
  cells,
  geomArgs,
  widthMul,
  roughness,
}: {
  cells: PlanetCell[];
  geomArgs: ConeArgs;
  widthMul: number;
  roughness: number;
}) {
  const items = useMemo(
    () =>
      cells.map((c) => ({
        position: c.position,
        color: c.color,
        scale: [c.tileSize * widthMul, c.height, c.tileSize * widthMul] as [
          number,
          number,
          number,
        ],
        quaternion: new Quaternion().setFromUnitVectors(
          UP,
          new Vector3(c.dir[0], c.dir[1], c.dir[2]),
        ),
      })),
    [cells, widthMul],
  );

  if (items.length === 0) return null;

  return (
    <Instances limit={items.length} range={items.length}>
      <coneGeometry args={geomArgs} />
      <meshStandardMaterial roughness={roughness} metalness={0} />
      {items.map((t, i) => (
        <Instance
          key={i}
          position={t.position}
          quaternion={t.quaternion}
          scale={t.scale}
          color={t.color}
        />
      ))}
    </Instances>
  );
}

export function Planet({ planet }: { planet: PlanetModel }) {
  const grass = useMemo(
    () => planet.cells.filter((c) => c.biome === "grass"),
    [planet],
  );
  const shrub = useMemo(
    () => planet.cells.filter((c) => c.biome === "shrub"),
    [planet],
  );
  const trees = useMemo(
    () => planet.cells.filter((c) => c.biome === "tree"),
    [planet],
  );

  // 가장 바쁜 날 = 나무 꼭대기의 골드 블라썸.
  const blossoms = useMemo(
    () =>
      trees
        .filter((c) => c.glow > 0)
        .map((c) => {
          const top = planet.radius + c.height;
          return {
            position: [c.dir[0] * top, c.dir[1] * top, c.dir[2] * top] as [
              number,
              number,
              number,
            ],
            size: c.tileSize * (0.18 + c.glow * 0.35),
          };
        }),
    [trees, planet.radius],
  );

  // 팔로워 → 고리 두께 (언어색 액센트).
  const ringInner = planet.radius * 1.55;
  const ringOuter =
    ringInner +
    planet.radius * (0.2 + Math.min(1, Math.log10(1 + planet.followers) / 6) * 1.0);

  return (
    <group>
      {/* 대기 림글로우 (언어색 액센트) */}
      <mesh scale={1.06}>
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshBasicMaterial
          color={planet.coreColor}
          transparent
          opacity={0.16}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 안쪽 따뜻한 초록 대기 밴드 */}
      <mesh scale={1.025}>
        <sphereGeometry args={[planet.radius, 48, 48]} />
        <meshBasicMaterial
          color="#bdf0c0"
          transparent
          opacity={0.08}
          side={BackSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 초록 지면 (bare 날들의 땅) */}
      <mesh>
        <icosahedronGeometry args={[planet.radius, 12]} />
        <meshStandardMaterial color="#2c6b3f" roughness={0.95} metalness={0} />
      </mesh>

      {/* 식생: 잔디 / 덤불 / 나무 (bare 제외) */}
      <VegLayer cells={grass} geomArgs={[0.5, 1, 5]} widthMul={1.15} roughness={0.9} />
      <VegLayer cells={shrub} geomArgs={[0.5, 1, 6]} widthMul={0.95} roughness={0.85} />
      <VegLayer cells={trees} geomArgs={[0.42, 1, 6]} widthMul={0.8} roughness={0.8} />

      {/* 가장 바쁜 날 = 골드 블라썸 (toneMapped:false → Bloom 발광) */}
      {blossoms.length > 0 && (
        <Instances limit={blossoms.length} range={blossoms.length}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#ffd86b" toneMapped={false} />
          {blossoms.map((b, i) => (
            <Instance key={i} position={b.position} scale={b.size} />
          ))}
        </Instances>
      )}

      {/* 토성형 고리 (followers 액센트) */}
      {planet.followers > 0 && (
        <mesh rotation={[Math.PI / 2.4, 0.25, 0]}>
          <ringGeometry args={[ringInner, ringOuter, 96]} />
          <meshBasicMaterial
            color={planet.coreColor}
            transparent
            opacity={0.18}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}
