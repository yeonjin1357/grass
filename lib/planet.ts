/**
 * 잔디 데이터 → 행성 모델 변환 (순수 함수, 'three' import 없음).
 * - 서버 컴포넌트에서 안전하게 import 가능(three는 클라이언트 컴포넌트에서만).
 * - 좌표 변환은 단위테스트 대상 (tests/planet.test.ts).
 * 상세: docs/ARCHITECTURE.md
 */

import type { GrassData } from "./github";

export type Vec3 = [number, number, number];

export interface PlanetCell {
  date: string;
  count: number;
  /** 표면 법선(단위벡터). 클라이언트에서 +Y를 이 방향에 정렬해 타일을 세운다. */
  dir: Vec3;
  /** 타일 중심 위치 = dir * (radius + height/2). */
  position: Vec3;
  /** 타일 높이(스파이크). 최소 MIN_HEIGHT로 클램프. */
  height: number;
  /** 타일 밑면 한 변 길이. */
  tileSize: number;
  /** 자체 그라디언트 색(헥스, 테마 비의존). */
  color: string;
  /** 0..1 정규화 활동도. 도시 불빛(발광) 세기/표시 여부에 사용. */
  glow: number;
}

export interface PlanetModel {
  radius: number;
  /** 코어/대기 색 — 주력 언어색에서. */
  coreColor: string;
  totalContributions: number;
  followers: number;
  cells: PlanetCell[];
}

const MIN_HEIGHT = 0.05;
const DEFAULT_CORE_COLOR = "#3b82f6";

/** count 기반 자체 그라디언트 (어두운 청록 → 밝은 라임). GitHub 테마와 무관. */
const GRADIENT: readonly string[] = [
  "#0e2a1e", // 0 (거의 흙)
  "#196b3f",
  "#2ea043",
  "#56d364",
  "#aef78b", // 최댓값 근처
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function colorForRatio(ratio: number): string {
  if (ratio <= 0) return GRADIENT[0];
  const idx = clamp(Math.ceil(ratio * (GRADIENT.length - 1)), 1, GRADIENT.length - 1);
  return GRADIENT[idx];
}

/**
 * N개 점을 구면에 균등 분포시키는 Fibonacci sphere.
 * 반환은 단위벡터(법선) 배열.
 */
export function fibonacciSphere(n: number): Vec3[] {
  if (n <= 0) return [];
  if (n === 1) return [[0, 1, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5)); // 황금각
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // 1 → -1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

/** totalContributions를 완만하게 반경으로. */
function radiusFor(total: number): number {
  return clamp(2 + Math.log10(1 + total) * 0.7, 2, 5);
}

/** 잔디 데이터를 행성 모델로 변환. */
export function buildPlanet(data: GrassData): PlanetModel {
  const days = data.days;
  const n = days.length;
  const radius = radiusFor(data.totalContributions);

  const maxCount = days.reduce((m, d) => Math.max(m, d.contributionCount), 0);
  // 구면 타일 한 변: 표면적/개수 기반으로 적당히.
  const tileSize =
    n > 0 ? Math.sqrt((4 * Math.PI * radius * radius) / n) * 0.62 : radius * 0.1;
  const heightRange = radius * 0.9;

  const dirs = fibonacciSphere(n);
  const cells: PlanetCell[] = days.map((day, i) => {
    const dir = dirs[i];
    const ratio = maxCount > 0 ? day.contributionCount / maxCount : 0;
    const height = MIN_HEIGHT + ratio * heightRange;
    const dist = radius + height / 2;
    const position: Vec3 = [dir[0] * dist, dir[1] * dist, dir[2] * dist];
    return {
      date: day.date,
      count: day.contributionCount,
      dir,
      position,
      height,
      tileSize,
      color: colorForRatio(ratio),
      glow: ratio,
    };
  });

  const coreColor = data.topLanguages[0]?.color ?? DEFAULT_CORE_COLOR;

  return {
    radius,
    coreColor,
    totalContributions: data.totalContributions,
    followers: data.followers,
    cells,
  };
}
