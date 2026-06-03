"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import {
  Vector3,
  Quaternion,
  Euler,
  Color,
  SphereGeometry,
  BufferAttribute,
  DoubleSide,
} from "three";
import { terrainElevation, type PlanetCell, type PlanetModel } from "@/lib/planet";
import { createAtmosphereMaterial } from "./AtmosphereMaterial";

const UP = new Vector3(0, 1, 0);

type Tuple3 = [number, number, number];
const tup = (v: Vector3): Tuple3 => [v.x, v.y, v.z];

/** 결정적 변주값 (0..1), seed + 오프셋에서. */
function jit(seed: number, off: number): number {
  const s = Math.sin((seed + off) * 6.2831 * 97.0) * 43758.5;
  return s - Math.floor(s);
}

/** 한 식물의 좌표계: 표면 법선 정렬 + 결정적 틸트/yaw. */
function plantFrame(c: PlanetCell): { q: Quaternion; up: Vector3; base: Vector3 } {
  const dir = new Vector3(c.dir[0], c.dir[1], c.dir[2]);
  const qAlign = new Quaternion().setFromUnitVectors(UP, dir.clone());
  const tilt = (jit(c.seed, 0.37) - 0.5) * 0.35;
  const yaw = jit(c.seed, 0.71) * Math.PI * 2;
  const qLocal = new Quaternion().setFromEuler(new Euler(tilt, yaw, 0));
  const q = qAlign.multiply(qLocal);
  const up = UP.clone().applyQuaternion(q);
  const base = dir.multiplyScalar(c.surfaceRadius);
  return { q, up, base };
}

export function Planet({
  planet,
  isMobile = false,
}: {
  planet: PlanetModel;
  isMobile?: boolean;
}) {
  const ts = planet.cells[0]?.tileSize ?? planet.radius * 0.1;

  // ── 변위 지형 (한 번만) ──
  const ground = useMemo(() => {
    const seg = isMobile ? 96 : 140;
    const g = new SphereGeometry(planet.radius, seg, seg);
    const pos = g.attributes.position as BufferAttribute;
    const v = new Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const e = terrainElevation([v.x, v.y, v.z]);
      v.multiplyScalar(planet.radius + planet.relief * e);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [planet.radius, planet.relief, isMobile]);

  // ── 나무 (줄기 + 수관) ──
  const trees = useMemo(
    () =>
      planet.cells
        .filter((c) => c.biome === "tree")
        .map((c) => {
          const { q, up, base } = plantFrame(c);
          const h = c.height * (0.85 + 0.3 * jit(c.seed, 0.11));
          const canopyR = c.height * 0.34 * (0.85 + 0.3 * jit(c.seed, 0.23));
          const trunkH = h * 0.45;
          const trunkPos = base.clone().add(up.clone().multiplyScalar(trunkH / 2));
          const canopyPos = base
            .clone()
            .add(up.clone().multiplyScalar(trunkH + canopyR * 0.7));
          const col = new Color(c.color).multiplyScalar(0.85 + 0.3 * jit(c.seed, 0.53));
          return { q, trunkPos, canopyPos, trunkH, canopyR, col, glow: c.glow, seed: c.seed };
        }),
    [planet],
  );

  // ── 발광 베리 (전역 상위 ~6일만 glow>0) ──
  const berries = useMemo(() => {
    const arr: { pos: Tuple3; size: number }[] = [];
    for (const c of planet.cells) {
      if (c.glow <= 0) continue;
      const { up, base } = plantFrame(c);
      const top = base.clone().add(up.clone().multiplyScalar(c.height));
      for (let k = 0; k < 2; k++) {
        const a = (c.seed + k * 0.31) * 6.2831 * 53.0;
        const off = new Vector3(Math.sin(a), Math.cos(a * 1.7), Math.sin(a * 0.3))
          .normalize()
          .multiplyScalar(ts * 0.5);
        arr.push({ pos: tup(top.clone().add(off)), size: ts * 0.22 });
      }
    }
    return arr;
  }, [planet, ts]);

  // ── 덤불 ──
  const shrubs = useMemo(
    () =>
      planet.cells
        .filter((c) => c.biome === "shrub")
        .map((c) => {
          const { q, up, base } = plantFrame(c);
          const r = c.height * 0.46 * (0.85 + 0.3 * jit(c.seed, 0.23));
          const pos = base.clone().add(up.clone().multiplyScalar(r * 0.55));
          const col = new Color(c.color).multiplyScalar(0.85 + 0.3 * jit(c.seed, 0.53));
          return { q, pos, r, col };
        }),
    [planet],
  );

  // ── 잔디 ──
  const grass = useMemo(
    () =>
      planet.cells
        .filter((c) => c.biome === "grass")
        .map((c) => {
          const { q, up, base } = plantFrame(c);
          const h = c.height * (0.85 + 0.3 * jit(c.seed, 0.11));
          const pos = base.clone().add(up.clone().multiplyScalar(h / 2));
          const col = new Color(c.color).multiplyScalar(0.85 + 0.3 * jit(c.seed, 0.53));
          return { q, pos, h, col };
        }),
    [planet],
  );

  const atmoMat = useMemo(
    () => createAtmosphereMaterial(planet.coreColor),
    [planet.coreColor],
  );

  const ringInner = planet.radius * 1.55;
  const ringOuter =
    ringInner +
    planet.radius * (0.2 + Math.min(1, Math.log10(1 + planet.followers) / 6) * 1.0);

  return (
    <group>
      {/* 대기 프레넬 림 */}
      <mesh scale={1.12} material={atmoMat}>
        <sphereGeometry args={[planet.radius, 48, 48]} />
      </mesh>

      {/* 변위 지형 (초록 대지) */}
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial color="#3f7d44" roughness={0.92} metalness={0} />
      </mesh>

      {/* 나무 줄기 */}
      {trees.length > 0 && (
        <Instances limit={trees.length} range={trees.length} castShadow>
          <cylinderGeometry args={[0.7, 1.0, 1, 6]} />
          <meshStandardMaterial color="#5b3a26" roughness={0.85} metalness={0} />
          {trees.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.trunkPos)}
              quaternion={t.q}
              scale={[ts * 0.16, t.trunkH, ts * 0.16]}
            />
          ))}
        </Instances>
      )}

      {/* 나무 수관 */}
      {trees.length > 0 && (
        <Instances limit={trees.length} range={trees.length} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.7} metalness={0} />
          {trees.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.canopyPos)}
              quaternion={t.q}
              scale={[t.canopyR * 1.05, t.canopyR * 0.9, t.canopyR * 1.05]}
              color={t.col}
            />
          ))}
        </Instances>
      )}

      {/* 덤불 */}
      {shrubs.length > 0 && (
        <Instances limit={shrubs.length} range={shrubs.length} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.75} metalness={0} />
          {shrubs.map((s, i) => (
            <Instance
              key={i}
              position={tup(s.pos)}
              quaternion={s.q}
              scale={[s.r * 1.2, s.r * 0.8, s.r * 1.2]}
              color={s.col}
            />
          ))}
        </Instances>
      )}

      {/* 잔디 */}
      {grass.length > 0 && (
        <Instances limit={grass.length} range={grass.length}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial roughness={0.85} metalness={0} />
          {grass.map((g, i) => (
            <Instance
              key={i}
              position={tup(g.pos)}
              quaternion={g.q}
              scale={[ts * 0.9, g.h, ts * 0.6]}
              color={g.col}
            />
          ))}
        </Instances>
      )}

      {/* 발광 베리 (Bloom) */}
      {berries.length > 0 && (
        <Instances limit={berries.length} range={berries.length}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#ffd86b" toneMapped={false} />
          {berries.map((b, i) => (
            <Instance key={i} position={b.pos} scale={b.size} />
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
