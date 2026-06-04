"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import {
  Box3,
  Vector3,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  type BufferGeometry,
  type Material,
} from "three";

/** 인스턴싱용 서브메시(대개 모델당 1개). */
export interface SubMesh {
  geometry: BufferGeometry;
  material: Material;
}

/**
 * CC0 Kenney Nature Kit — `/public/models/nature/*.glb`(동일출처 → 캡처 안전).
 * biome별로 **여러 종류** 풀을 두고 셀 seed로 결정적으로 골라 획일성을 없앤다.
 */
export const POOLS = {
  // 잎나무(일반 tree) — 초록 통일 (blocks/cone 등 이질적인 건 제외)
  tree: [
    "tree_default", "tree_oak", "tree_detailed", "tree_fat", "tree_thin",
    "tree_small", "tree_simple", "tree_plateau", "tree_tall",
    "tree_pineRoundA", "tree_pineRoundB",
  ],
  // 거목(emergent) — 키 큰 침엽수만 (palm 제외: 막대처럼 보임)
  hero: [
    "tree_pineTallA", "tree_pineTallB", "tree_pineTallC", "tree_pineTallD",
    "tree_pineTallA_detailed",
  ],
  // 덤불(shrub) — 초록 덤불만 (선인장/꽃/버섯 제외)
  bush: [
    "plant_bush", "plant_bushDetailed", "plant_bushLarge",
    "plant_bushLargeTriangle", "plant_bushSmall", "plant_bushTriangle",
  ],
  // 풀(grass) — 초록만 (청록 grass_leafs·꽃·버섯 제외)
  grass: ["grass", "grass_large", "plant_flatShort", "plant_flatTall"],
  // 빈 날 소량 장식 — 바위/돌
  rock: [
    "rock_smallA", "rock_smallB", "rock_smallC", "rock_smallD",
    "stone_smallA", "stone_smallB",
  ],
} as const;

const ALL = Array.from(new Set(Object.values(POOLS).flat()));
const pathOf = (n: string) => `/models/nature/${n}.glb`;
ALL.forEach((n) => useGLTF.preload(pathOf(n)));

/** gltf 씬의 모든 메시를 추출해 노드변환 베이크 + 밑면 y=0·xz중심·단위높이 정규화. */
function extractNormalized(scene: Object3D): SubMesh[] {
  const subs: SubMesh[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o: Object3D) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const geometry = m.geometry.clone();
    geometry.applyMatrix4(m.matrixWorld);
    // Kenney GLB 리팩은 baseColor가 청록(teal)이고 metalness=1·unlit·무텍스처.
    // → 머티리얼 이름으로 자연색을 덮어쓰고 라이팅 받는 lit + flatShading(로우폴리)로 교체.
    const src = Array.isArray(m.material) ? m.material[0] : m.material;
    const name = (src.name || "").toLowerCase();
    let color = "#5aa84e"; // 기본 초록(잎/풀)
    if (/bark|wood|trunk|dirt|stump|log|branch/.test(name)) color = "#6b4a2f"; // 갈색
    else if (/rock|stone|pebble|cliff/.test(name)) color = "#8d887b"; // 회갈색
    else if (/dark/.test(name)) color = "#2f7a48"; // 짙은 침엽
    const material = new MeshStandardMaterial({
      color,
      roughness: 0.95,
      metalness: 0,
      flatShading: true,
    });
    subs.push({ geometry, material });
  });

  const box = new Box3();
  for (const s of subs) {
    s.geometry.computeBoundingBox();
    if (s.geometry.boundingBox) box.union(s.geometry.boundingBox);
  }
  const size = new Vector3();
  box.getSize(size);
  const h = size.y || 1;
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  for (const s of subs) {
    s.geometry.translate(-cx, -box.min.y, -cz);
    s.geometry.scale(1 / h, 1 / h, 1 / h);
  }
  return subs;
}

/** 모델명 → 정규화된 서브메시[] 맵. */
export function useNatureModels(): Map<string, SubMesh[]> {
  const gltfs = useGLTF(ALL.map(pathOf)) as unknown as { scene: Object3D }[];
  return useMemo(() => {
    const map = new Map<string, SubMesh[]>();
    ALL.forEach((n, i) => map.set(n, extractNormalized(gltfs[i].scene)));
    return map;
  }, [gltfs]);
}
