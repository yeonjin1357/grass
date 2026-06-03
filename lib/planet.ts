/**
 * 잔디 데이터 → "자연스러운 살아있는 세계" 모델 (순수 함수, 'three' import 없음).
 * - 서버 컴포넌트에서 안전하게 import 가능(three는 클라이언트 컴포넌트에서만).
 * - 좌표/티어/지형 변환은 단위테스트 대상 (tests/planet.test.ts).
 * 상세: docs/ARCHITECTURE.md
 */

import type { GrassData } from "./github";

export type Vec3 = [number, number, number];

/** 활동량 → 식생 단계. bare는 렌더하지 않음(지형이 그들의 땅). */
export type Biome = "bare" | "grass" | "shrub" | "tree";

export interface PlanetCell {
  date: string;
  count: number;
  /** 표면 법선(단위벡터, Fibonacci sphere를 결정적으로 산포). */
  dir: Vec3;
  /** 지형 변위가 반영된 그 지점의 표면 반경. */
  surfaceRadius: number;
  /** 식생 중심 위치 = dir * (surfaceRadius + height/2). bare는 height 0. */
  position: Vec3;
  /** 식생 높이. bare=0, 활동일은 biome 밴드 높이. */
  height: number;
  /** 밑면 한 변 길이(렌더러가 biome별로 배율 적용). */
  tileSize: number;
  /** 따뜻한 초록 캐노피 색(헥스). */
  color: string;
  /** 0..1 블라썸 세기. tree 상단만 > 0. */
  glow: number;
  biome: Biome;
  /** 0..1 결정적 시드 → 인스턴스 변주(높이/틸트/색/yaw). */
  seed: number;
}

export interface PlanetModel {
  radius: number;
  /** 지형 변위 진폭(= radius * RELIEF_FRACTION). */
  relief: number;
  /** 주력 언어색 — 대기/고리 "액센트"로만 사용. */
  coreColor: string;
  topLanguageName: string | null;
  totalContributions: number;
  busiestCount: number;
  dayCount: number;
  followers: number;
  cells: PlanetCell[];
}

const DEFAULT_ACCENT = "#3b82f6";
const RELIEF_FRACTION = 0.13;
const GLOW_TOP_N = 6; // 전역 상위 N일만 발광(베리 폭발 방지)

const GRASS_LO = "#7bb661";
const GRASS_HI = "#9fd85a";
const SHRUB_LO = "#3f9d4f";
const SHRUB_HI = "#5fc66a";
const TREE_LO = "#1f7a3a";
const TREE_HI = "#2ea043";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

// ── 결정적 절차 노이즈 (순수, Math.random 금지) ──

/** 0..1 해시. 같은 입력 → 같은 출력. */
export function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, z: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z);
  const xf = x - xi,
    yf = y - yi,
    zf = z - zi;
  const u = smooth(xf),
    v = smooth(yf),
    w = smooth(zf);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) =>
    hash3(xi + dx, yi + dy, zi + dz);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  ); // 0..1
}

/** 단위 방향 → fBm 고도 ~[-1,1]. 지면(Planet.tsx)과 셀이 동일하게 쓰는 단일 진실원. */
export function terrainElevation(dir: Vec3): number {
  const F = 1.7; // 기본 주파수(대륙 크기)
  let amp = 1,
    freq = F,
    sum = 0,
    norm = 0;
  for (let o = 0; o < 4; o++) {
    sum +=
      amp *
      (valueNoise(dir[0] * freq + 11, dir[1] * freq + 23, dir[2] * freq + 37) *
        2 -
        1);
    norm += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return sum / norm;
}

function tierFor(
  count: number,
  maxCount: number,
): { biome: Biome; frac: number } {
  if (count <= 0) return { biome: "bare", frac: 0 };
  const r = maxCount > 0 ? Math.sqrt(count / maxCount) : 0;
  if (r < 0.25) return { biome: "grass", frac: r / 0.25 };
  if (r < 0.6) return { biome: "shrub", frac: (r - 0.25) / 0.35 };
  return { biome: "tree", frac: (r - 0.6) / 0.4 };
}

export function fibonacciSphere(n: number): Vec3[] {
  if (n <= 0) return [];
  if (n === 1) return [[0, 1, 0]];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const pts: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

function radiusFor(total: number): number {
  return clamp(2 + Math.log10(1 + total) * 0.7, 2, 5);
}

function coprimeStride(n: number): number {
  if (n <= 2) return 1;
  let s = Math.max(1, Math.round(n * 0.382));
  while (gcd(s, n) !== 1) s++;
  return s;
}

/** 잔디 데이터를 "자연스러운 세계" 모델로 변환. */
export function buildPlanet(data: GrassData): PlanetModel {
  const days = data.days;
  const n = days.length;
  const radius = radiusFor(data.totalContributions);
  const relief = radius * RELIEF_FRACTION;

  const maxCount = days.reduce((m, d) => Math.max(m, d.contributionCount), 0);
  // 발광은 "가장 바쁜 날"만 — 전역 상위 N일의 임계 count.
  const sortedDesc = days
    .map((d) => d.contributionCount)
    .filter((c) => c > 0)
    .sort((a, b) => b - a);
  const glowThreshold =
    sortedDesc.length === 0
      ? Infinity
      : sortedDesc[Math.min(GLOW_TOP_N - 1, sortedDesc.length - 1)];

  const tileSize =
    n > 0 ? Math.sqrt((4 * Math.PI * radius * radius) / n) * 0.55 : radius * 0.1;

  const dirs = fibonacciSphere(n);
  const stride = coprimeStride(n);

  const cells: PlanetCell[] = days.map((day, i) => {
    const dir = dirs[(i * stride) % Math.max(1, n)];
    const { biome, frac } = tierFor(day.contributionCount, maxCount);

    let height = 0;
    let color = GRASS_LO;
    if (biome === "grass") {
      height = radius * (0.05 + 0.13 * frac);
      color = lerpHex(GRASS_LO, GRASS_HI, frac);
    } else if (biome === "shrub") {
      height = radius * (0.18 + 0.24 * frac);
      color = lerpHex(SHRUB_LO, SHRUB_HI, frac);
    } else if (biome === "tree") {
      height = radius * (0.42 + 0.53 * frac);
      color = lerpHex(TREE_LO, TREE_HI, frac);
    }

    const surfaceRadius = radius + relief * terrainElevation(dir);
    const dist = surfaceRadius + height / 2;
    const position: Vec3 = [dir[0] * dist, dir[1] * dist, dir[2] * dist];
    const glow =
      day.contributionCount > 0 && day.contributionCount >= glowThreshold
        ? Math.min(1, day.contributionCount / maxCount)
        : 0;
    const seed = hash3(dir[0] * 12.9, dir[1] * 78.2, dir[2] * 37.7);

    return {
      date: day.date,
      count: day.contributionCount,
      dir,
      surfaceRadius,
      position,
      height,
      tileSize,
      color,
      glow,
      biome,
      seed,
    };
  });

  return {
    radius,
    relief,
    coreColor: data.topLanguages[0]?.color ?? DEFAULT_ACCENT,
    topLanguageName: data.topLanguages[0]?.name ?? null,
    totalContributions: data.totalContributions,
    busiestCount: maxCount,
    dayCount: n,
    followers: data.followers,
    cells,
  };
}
