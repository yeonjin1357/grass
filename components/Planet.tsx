"use client";

import { Suspense, useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import {
  Vector3,
  Quaternion,
  Euler,
  Color,
  IcosahedronGeometry,
  BufferAttribute,
  DoubleSide,
} from "three";
import { terrainElevation, type PlanetCell, type PlanetModel } from "@/lib/planet";
import { createAtmosphereMaterial } from "./AtmosphereMaterial";
import { useNatureModels, POOLS, type SubMesh } from "./useNatureModels";

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

/** 한 식물의 좌표계: 밑면=표면점, +Y를 표면 법선에 정렬 + 결정적 틸트/yaw. */
function plantFrame(c: PlanetCell): { q: Quaternion; base: Vector3 } {
  const dir = new Vector3(c.dir[0], c.dir[1], c.dir[2]);
  const qAlign = new Quaternion().setFromUnitVectors(UP, dir.clone());
  const tilt = (jit(c.seed, 0.37) - 0.5) * 0.1; // 숲은 곧게(±0.05rad)
  const yaw = jit(c.seed, 0.71) * Math.PI * 2;
  const qLocal = new Quaternion().setFromEuler(new Euler(tilt, yaw, 0));
  const q = qAlign.multiply(qLocal);
  const base = dir.multiplyScalar(c.surfaceRadius);
  return { q, base };
}

interface PlantItem {
  pos: Tuple3;
  q: Quaternion;
  s: number;
}

function plantItem(c: PlanetCell, scale: number): PlantItem {
  const { q, base } = plantFrame(c);
  // seed로 크기 ±15% 변주
  const s = scale * (0.85 + 0.3 * jit(c.seed, 0.11));
  return { pos: tup(base), q, s };
}

/** 한 모델 타입(서브메시 N개)을 아이템들 위에 인스턴싱. */
function ModelLayer({ submeshes, items }: { submeshes: SubMesh[]; items: PlantItem[] }) {
  if (items.length === 0) return null;
  return (
    <>
      {submeshes.map((sm, mi) => (
        <Instances
          key={mi}
          limit={items.length}
          range={items.length}
          geometry={sm.geometry}
          material={sm.material}
          castShadow
        >
          {items.map((it, i) => (
            <Instance key={i} position={it.pos} quaternion={it.q} scale={it.s} />
          ))}
        </Instances>
      ))}
    </>
  );
}

/** 풀에서 셀 seed로 결정적으로 모델 하나 선택. */
function pick(pool: readonly string[], seed: number): string {
  return pool[Math.floor(jit(seed, 0.91) * pool.length) % pool.length];
}

/** 식생 — 진짜 CC0 모델 인스턴싱, biome별 풀에서 다양하게 (useGLTF → Suspense). */
function Vegetation({ planet }: { planet: PlanetModel }) {
  const models = useNatureModels();

  // 모델명 → 인스턴스 아이템들 (셀마다 풀에서 골라 그룹핑)
  const layers = useMemo(() => {
    const groups = new Map<string, PlantItem[]>();
    const add = (name: string, it: PlantItem) => {
      const a = groups.get(name);
      if (a) a.push(it);
      else groups.set(name, [it]);
    };
    for (const c of planet.cells) {
      if (c.biome === "tree" && c.emergent) {
        add(pick(POOLS.hero, c.seed), plantItem(c, c.height * 1.5)); // 곧게 우뚝
      } else if (c.biome === "tree") {
        add(pick(POOLS.tree, c.seed), plantItem(c, c.height));
      } else if (c.biome === "shrub") {
        add(pick(POOLS.bush, c.seed), plantItem(c, c.height));
      } else if (c.biome === "grass") {
        add(pick(POOLS.grass, c.seed), plantItem(c, c.height));
      } else if (c.biome === "bare" && jit(c.seed, 0.5) < 0.12) {
        // 빈 날 일부에만 바위 흩뿌리기
        add(pick(POOLS.rock, c.seed), plantItem(c, planet.radius * 0.08));
      }
    }
    return [...groups.entries()];
  }, [planet]);

  return (
    <>
      {layers.map(([name, items]) => {
        const sm = models.get(name);
        return sm ? <ModelLayer key={name} submeshes={sm} items={items} /> : null;
      })}
    </>
  );
}

export function Planet({
  planet,
  isMobile = false,
}: {
  planet: PlanetModel;
  isMobile?: boolean;
}) {
  // ── 변위 지형 + 고도색 (로우폴리 각진 행성 — 에셋과 통일) ──
  const ground = useMemo(() => {
    // IcosahedronGeometry = 균일 삼각형 → 로우폴리 행성에 적합. detail 낮을수록 면이 큼.
    const detail = isMobile ? 3 : 4;
    const g = new IcosahedronGeometry(planet.radius, detail);
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

  // ── 달 (절대 규모) ──
  const moons = useMemo(() => {
    const arr: { pos: Tuple3; size: number }[] = [];
    for (let i = 0; i < planet.moonCount; i++) {
      const a = (i + 1) * 2.3999;
      const orbitR = planet.radius * (1.9 + i * 0.38);
      const yTilt = Math.sin((i + 1) * 1.7) * 0.5;
      arr.push({
        pos: [Math.cos(a) * orbitR, yTilt * orbitR, Math.sin(a) * orbitR],
        size: planet.radius * (0.09 + 0.03 * (i % 3)),
      });
    }
    return arr;
  }, [planet.moonCount, planet.radius]);

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

      {/* 변위 지형 (로우폴리 각진 면) */}
      <mesh geometry={ground} receiveShadow>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0} />
      </mesh>

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

      {/* 달 */}
      {moons.map((m, i) => (
        <mesh key={i} position={m.pos} castShadow>
          <sphereGeometry args={[m.size, 16, 16]} />
          <meshStandardMaterial color="#9a958c" roughness={1} metalness={0} />
        </mesh>
      ))}

      {/* 식생 — 진짜 CC0 모델 (로딩 동안 행성은 먼저 보임) */}
      <Suspense fallback={null}>
        <Vegetation planet={planet} />
      </Suspense>
    </group>
  );
}
