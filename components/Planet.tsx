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

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
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

  // ── 변위 지형 + 고도색 (한 번만) ──
  const ground = useMemo(() => {
    const seg = isMobile ? 64 : 96;
    const g = new SphereGeometry(planet.radius, seg, seg);
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const v = new Vector3();
    const cBeach = new Color("#c9b27a");
    const cGrass = new Color("#3f7d44");
    const cRock = new Color("#6f7355");
    const cSnow = new Color("#dfe7e0");
    const tmp = new Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const e = terrainElevation([v.x, v.y, v.z]);
      v.multiplyScalar(planet.radius + planet.relief * e);
      pos.setXYZ(i, v.x, v.y, v.z);
      // 고도 밴드: 해변 → 풀 → 바위 → 설산
      tmp.copy(cBeach).lerp(cGrass, smoothstep(-0.1, 0.02, e));
      tmp.lerp(cRock, smoothstep(0.45, 0.65, e));
      tmp.lerp(cSnow, smoothstep(0.72, 0.92, e));
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    pos.needsUpdate = true;
    g.setAttribute("color", new BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [planet.radius, planet.relief, isMobile]);

  // ── 나무 (줄기 + 수관) — emergent(거목)은 별도 그룹으로 빠짐 ──
  const trees = useMemo(
    () =>
      planet.cells
        .filter((c) => c.biome === "tree" && !c.emergent)
        .map((c) => {
          const { q, up, base } = plantFrame(c);
          const h = c.height * (0.85 + 0.3 * jit(c.seed, 0.11));
          const canopyR = c.height * 0.34 * (0.85 + 0.3 * jit(c.seed, 0.23));
          const trunkH = h * 0.45;
          const trunkPos = base.clone().add(up.clone().multiplyScalar(trunkH / 2));
          const canopyPos = base
            .clone()
            .add(up.clone().multiplyScalar(trunkH + canopyR * 0.7));
          // 윗 수관 lobe (풍성한 실루엣)
          const lobeR = canopyR * 0.62;
          const lobePos = base
            .clone()
            .add(up.clone().multiplyScalar(trunkH + canopyR * 1.25));
          const col = new Color(c.color).multiplyScalar(0.85 + 0.3 * jit(c.seed, 0.53));
          return { q, trunkPos, canopyPos, canopyR, lobePos, lobeR, trunkH, col };
        }),
    [planet],
  );

  // ── 거목(emergent): 가장 바쁜 날들이 우뚝 솟음 (긴 줄기 + 적층 수관) ──
  const giants = useMemo(
    () =>
      planet.cells
        .filter((c) => c.emergent)
        .map((c) => {
          const { q, up, base } = plantFrame(c);
          const h = c.height * (2.2 + 0.6 * jit(c.seed, 0.11)); // 우뚝
          const trunkH = h * 0.5;
          const canopyR = c.height * 0.5 * (0.9 + 0.2 * jit(c.seed, 0.23));
          const trunkPos = base.clone().add(up.clone().multiplyScalar(trunkH / 2));
          const canopyPos = base
            .clone()
            .add(up.clone().multiplyScalar(trunkH + canopyR * 0.6));
          const topPos = base
            .clone()
            .add(up.clone().multiplyScalar(trunkH + canopyR * 1.5));
          const col = new Color(c.color).multiplyScalar(0.9 + 0.2 * jit(c.seed, 0.53));
          return { q, trunkPos, canopyPos, topPos, trunkH, canopyR, col };
        }),
    [planet],
  );

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
          const pos = base.clone().add(up.clone().multiplyScalar(h * 0.3));
          const col = new Color(c.color).multiplyScalar(0.85 + 0.3 * jit(c.seed, 0.53));
          return { q, pos, h, col };
        }),
    [planet],
  );

  const atmoMat = useMemo(
    () => createAtmosphereMaterial(planet.coreColor),
    [planet.coreColor],
  );

  // ── 달 (절대 규모: moonCount개 궤도) ──
  const moons = useMemo(() => {
    const arr: { pos: Tuple3; size: number }[] = [];
    for (let i = 0; i < planet.moonCount; i++) {
      const a = (i + 1) * 2.3999; // 황금각 비슷하게 분산
      const orbitR = planet.radius * (1.9 + i * 0.38);
      const yTilt = Math.sin((i + 1) * 1.7) * 0.5;
      arr.push({
        pos: [Math.cos(a) * orbitR, yTilt * orbitR, Math.sin(a) * orbitR],
        size: planet.radius * (0.09 + 0.03 * (i % 3)),
      });
    }
    return arr;
  }, [planet.moonCount, planet.radius]);

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

      {/* 변위 지형 (고도색) */}
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
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

      {/* 나무 윗 수관 lobe */}
      {trees.length > 0 && (
        <Instances limit={trees.length} range={trees.length} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.7} metalness={0} />
          {trees.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.lobePos)}
              quaternion={t.q}
              scale={[t.lobeR * 1.05, t.lobeR * 0.95, t.lobeR * 1.05]}
              color={t.col}
            />
          ))}
        </Instances>
      )}

      {/* 거목(emergent): 줄기 */}
      {giants.length > 0 && (
        <Instances limit={giants.length} range={giants.length} castShadow>
          <cylinderGeometry args={[0.55, 0.9, 1, 7]} />
          <meshStandardMaterial color="#5b3a26" roughness={0.85} metalness={0} />
          {giants.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.trunkPos)}
              quaternion={t.q}
              scale={[ts * 0.3, t.trunkH, ts * 0.3]}
            />
          ))}
        </Instances>
      )}

      {/* 거목: 큰 수관 (길쭉) */}
      {giants.length > 0 && (
        <Instances limit={giants.length} range={giants.length} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.65} metalness={0} />
          {giants.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.canopyPos)}
              quaternion={t.q}
              scale={[t.canopyR * 1.15, t.canopyR * 1.5, t.canopyR * 1.15]}
              color={t.col}
            />
          ))}
        </Instances>
      )}

      {/* 거목: 윗 spire */}
      {giants.length > 0 && (
        <Instances limit={giants.length} range={giants.length} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.65} metalness={0} />
          {giants.map((t, i) => (
            <Instance
              key={i}
              position={tup(t.topPos)}
              quaternion={t.q}
              scale={[t.canopyR * 0.75, t.canopyR * 0.95, t.canopyR * 0.75]}
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
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial roughness={0.85} metalness={0} />
          {grass.map((g, i) => (
            <Instance
              key={i}
              position={tup(g.pos)}
              quaternion={g.q}
              scale={[ts * 1.25, g.h * 0.6, ts * 1.25]}
              color={g.col}
            />
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
            opacity={0.1}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 달 (절대 규모) */}
      {moons.map((m, i) => (
        <mesh key={i} position={m.pos} castShadow>
          <sphereGeometry args={[m.size, 16, 16]} />
          <meshStandardMaterial color="#9a958c" roughness={1} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
