import { describe, it, expect } from "vitest";
import { fibonacciSphere, buildPlanet } from "../lib/planet";
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

  it("clamps height to a positive minimum even for all-zero days", () => {
    const planet = buildPlanet(fakeData([0, 0, 0]));
    for (const c of planet.cells) {
      expect(c.height).toBeGreaterThanOrEqual(0.05);
    }
  });

  it("positions tiles at radius + height/2 along a unit surface normal", () => {
    const planet = buildPlanet(fakeData([1, 10, 30]));
    for (const c of planet.cells) {
      expect(Math.hypot(...c.dir)).toBeCloseTo(1, 5);
      const posLen = Math.hypot(...c.position);
      expect(posLen).toBeCloseTo(planet.radius + c.height / 2, 4);
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
});
