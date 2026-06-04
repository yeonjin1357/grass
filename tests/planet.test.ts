import { describe, it, expect } from "vitest";
import {
  fibonacciSphere,
  buildPlanet,
  terrainElevation,
  hash3,
} from "../lib/planet";
import type { GrassData, ContributionDay } from "../lib/github";

function day(date: string, count: number): ContributionDay {
  return {
    date,
    weekday: 0,
    contributionCount: count,
    contributionLevel: "NONE",
    color: "#ebedf0",
  };
}

function fakeData(counts: number[]): GrassData {
  return {
    login: "test",
    name: "Test",
    avatarUrl: "",
    followers: 0,
    repoCount: 0,
    hasAnyContributions: counts.some((c) => c > 0),
    totalContributions: counts.reduce((a, b) => a + b, 0),
    days: counts.map((c, i) =>
      day(`2026-01-${String((i % 28) + 1).padStart(2, "0")}`, c),
    ),
    topLanguages: [],
    totals: { commits: 0, pullRequests: 0, issues: 0, reviews: 0 },
  };
}

describe("fibonacciSphere", () => {
  it("returns N unit vectors", () => {
    const pts = fibonacciSphere(365);
    expect(pts).toHaveLength(365);
    for (const [x, y, z] of pts) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    }
  });

  it("produces distinct points", () => {
    const pts = fibonacciSphere(200);
    const uniq = new Set(pts.map((p) => p.join(",")));
    expect(uniq.size).toBe(200);
  });

  it("handles edge counts", () => {
    expect(fibonacciSphere(0)).toHaveLength(0);
    expect(fibonacciSphere(1)).toEqual([[0, 1, 0]]);
  });
});

describe("buildPlanet", () => {
  it("maps each day to a cell", () => {
    const planet = buildPlanet(fakeData([0, 5, 20]));
    expect(planet.cells).toHaveLength(3);
  });

  it("treats zero-contribution days as bare ground (not rendered)", () => {
    const planet = buildPlanet(fakeData([0, 0, 0]));
    for (const c of planet.cells) {
      expect(c.biome).toBe("bare");
      expect(c.height).toBe(0);
    }
  });

  it("gives active days a non-bare biome with positive height", () => {
    const planet = buildPlanet(fakeData([1, 5, 30]));
    for (const c of planet.cells) {
      expect(c.biome).not.toBe("bare");
      expect(c.height).toBeGreaterThan(0);
    }
  });

  it("positions tiles at surfaceRadius + height/2 along a unit surface normal", () => {
    const planet = buildPlanet(fakeData([1, 10, 30]));
    for (const c of planet.cells) {
      expect(Math.hypot(...c.dir)).toBeCloseTo(1, 5);
      const posLen = Math.hypot(...c.position);
      expect(posLen).toBeCloseTo(c.surfaceRadius + c.height / 2, 4);
    }
  });

  it("gives busier days taller tiles", () => {
    const planet = buildPlanet(fakeData([1, 50]));
    expect(planet.cells[1].height).toBeGreaterThan(planet.cells[0].height);
  });

  it("derives core color from the top language when present", () => {
    const data = fakeData([1, 2]);
    data.topLanguages = [{ name: "Rust", color: "#dea584", size: 1000 }];
    expect(buildPlanet(data).coreColor).toBe("#dea584");
  });

  it("keeps cells in chronological order (위도=시간축)", () => {
    const planet = buildPlanet(fakeData([1, 2, 3, 4, 5]));
    const dates = planet.cells.map((c) => c.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe("magnitude (절대 규모)", () => {
  it("magnitude·radius·moonCount grow with total contributions", () => {
    const small = buildPlanet(fakeData([1, 1, 1]));
    const big = buildPlanet(fakeData(Array(60).fill(60)));
    expect(big.magnitude).toBeGreaterThan(small.magnitude);
    expect(big.radius).toBeGreaterThan(small.radius);
    expect(big.moonCount).toBeGreaterThanOrEqual(small.moonCount);
    expect(big.magnitude).toBeLessThanOrEqual(1);
    expect(small.magnitude).toBeGreaterThanOrEqual(0);
  });

  it("marks only the busiest (tree-tier) days as emergent 거목", () => {
    const planet = buildPlanet(fakeData([1, 1, 1, 1, 1, 1, 1, 1, 1, 99]));
    const peak = planet.cells.find((c) => c.count === 99)!;
    expect(peak.emergent).toBe(true);
    expect(planet.cells.filter((c) => c.count === 1).every((c) => !c.emergent)).toBe(
      true,
    );
  });

  it("assigns a tier name by total", () => {
    expect(buildPlanet(fakeData([1, 1])).tierName).toBe("새싹 행성");
  });
});

describe("terrain noise & determinism", () => {
  it("terrainElevation is deterministic and bounded ~[-1,1]", () => {
    for (let i = 0; i < 60; i++) {
      const raw: [number, number, number] = [
        Math.cos(i),
        Math.sin(i * 1.3),
        Math.sin(i * 0.7),
      ];
      const len = Math.hypot(...raw) || 1;
      const dir: [number, number, number] = [
        raw[0] / len,
        raw[1] / len,
        raw[2] / len,
      ];
      const a = terrainElevation(dir);
      expect(a).toBe(terrainElevation(dir)); // deterministic
      expect(a).toBeGreaterThanOrEqual(-1.05);
      expect(a).toBeLessThanOrEqual(1.05);
    }
  });

  it("surfaceRadius == radius + relief * elevation(dir)", () => {
    const planet = buildPlanet(fakeData([1, 2, 3, 4, 5]));
    for (const c of planet.cells) {
      expect(c.surfaceRadius).toBeCloseTo(
        planet.radius + planet.relief * terrainElevation(c.dir),
        6,
      );
    }
  });

  it("cell.seed is in [0,1] and deterministic for its dir", () => {
    const planet = buildPlanet(fakeData([1, 2, 3]));
    for (const c of planet.cells) {
      expect(c.seed).toBeGreaterThanOrEqual(0);
      expect(c.seed).toBeLessThanOrEqual(1);
      expect(c.seed).toBeCloseTo(
        hash3(c.dir[0] * 12.9, c.dir[1] * 78.2, c.dir[2] * 37.7),
        6,
      );
    }
  });
});
