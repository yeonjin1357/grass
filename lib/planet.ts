/**
 * 잔디 데이터 → "살아있는 초록 행성" 모델 (순수 함수, 'three' import 없음).
 * - 서버 컴포넌트에서 안전하게 import 가능(three는 클라이언트 컴포넌트에서만).
 * - 좌표/티어 변환은 단위테스트 대상 (tests/planet.test.ts).
 * 상세: docs/ARCHITECTURE.md
 */

import type { GrassData } from "./github";

export type Vec3 = [number, number, number];

/** 활동량 → 식생 단계. bare는 렌더하지 않음(초록 지면이 그들의 땅). */
export type Biome = "bare" | "grass" | "shrub" | "tree";

export interface PlanetCell {
  date: string;
  count: number;
  /** 표면 법선(단위벡터). 클라이언트에서 +Y를 이 방향에 정렬해 식생을 세운다. */
  dir: Vec3;
  /** 식생 중심 위치 = dir * (radius + height/2). bare는 height 0. */
  position: Vec3;
  /** 식생 높이. bare=0, 활동일은 biome 밴드 높이. */
  height: number;
  /** 밑면 한 변 길이(렌더러가 biome별로 width 배율 적용). */
  tileSize: number;
  /** 따뜻한 초록 캐노피 색(헥스, 테마 비의존). */
  color: string;
  /** 0..1 블라썸 세기. tree 상단만 > 0 → 가장 바쁜 날만 발광. */
  glow: number;
  biome: Biome;
}

export interface PlanetModel {
  radius: number;
  /** 주력 언어색 — 대기/고리 "액센트"로만 사용(지면은 항상 초록). */
  coreColor: string;
  topLanguageName: string | null;
  totalContributions: number;
  busiestCount: number;
  dayCount: number;
  followers: number;
  cells: PlanetCell[];
}

const DEFAULT_ACCENT = "#3b82f6";
const GROUND_COLOR = "#2c6b3f";

// 따뜻한 초록 캐노피: grass(연한 초원) → shrub(중간) → tree(짙은 캐노피)
const GRASS_LO = "#7bb661";
const GRASS_HI = "#9fd85a";
const SHRUB_LO = "#3f9d4f";
const SHRUB_HI = "#5fc66a";
const TREE_LO = "#1f7a3a";
const TREE_HI = "#2ea043"; // GitHub 초록 회귀

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function gcd(a: number, b: number): number {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** count 두 색 사이 보간 (순수 문자열 연산, three 불필요). */
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

/**
 * count → biome + 밴드 내 위치(frac). sqrt 압축으로 한 폭주일이 나머지를
 * 0으로 깔아뭉개지 않게 → 1커밋=잔디, 보통=덤불, 많음=나무.
 */
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

/**
 * 달력 순서를 구면에 흩뿌리는 결정적 stride(랜덤 금지 → 공유 URL 결정성).
 * N과 서로소인 stride를 쓰면 전단사(겹침 없음).
 */
function coprimeStride(n: number): number {
  if (n <= 2) return 1;
  let s = Math.max(1, Math.round(n * 0.382));
  while (gcd(s, n) !== 1) s++;
  return s;
}

/** 잔디 데이터를 "살아있는 초록 행성" 모델로 변환. */
export function buildPlanet(data: GrassData): PlanetModel {
  const days = data.days;
  const n = days.length;
  const radius = radiusFor(data.totalContributions);

  const maxCount = days.reduce((m, d) => Math.max(m, d.contributionCount), 0);
  const tileSize =
    n > 0 ? Math.sqrt((4 * Math.PI * radius * radius) / n) * 0.55 : radius * 0.1;

  const dirs = fibonacciSphere(n);
  const stride = coprimeStride(n);

  const cells: PlanetCell[] = days.map((day, i) => {
    const dir = dirs[(i * stride) % Math.max(1, n)]; // 결정적 산포
    const { biome, frac } = tierFor(day.contributionCount, maxCount);

    let height = 0;
    let color = GROUND_COLOR;
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

    const dist = radius + height / 2;
    const position: Vec3 = [dir[0] * dist, dir[1] * dist, dir[2] * dist];
    const glow = biome === "tree" ? Math.min(1, 0.4 + 0.6 * frac) : 0;

    return {
      date: day.date,
      count: day.contributionCount,
      dir,
      position,
      height,
      tileSize,
      color,
      glow,
      biome,
    };
  });

  return {
    radius,
    coreColor: data.topLanguages[0]?.color ?? DEFAULT_ACCENT,
    topLanguageName: data.topLanguages[0]?.name ?? null,
    totalContributions: data.totalContributions,
    busiestCount: maxCount,
    dayCount: n,
    followers: data.followers,
    cells,
  };
}
