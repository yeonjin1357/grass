import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchGrassData,
  GitHubUserNotFoundError,
  type GrassData,
} from "@/lib/github";
import { buildPlanet } from "@/lib/planet";
import { PlanetCanvas } from "@/components/PlanetCanvas";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}의 행성 — grass`,
    description: `${username}의 GitHub 1년 기여도를 3D 행성으로.`,
  };
}

export default async function UserPlanetPage({ params }: Params) {
  const { username } = await params;

  let data: GrassData;
  try {
    data = await fetchGrassData(username);
  } catch (err) {
    if (err instanceof GitHubUserNotFoundError) notFound();
    throw err;
  }

  const planet = buildPlanet(data);

  return (
    <main style={{ position: "fixed", inset: 0 }}>
      <PlanetCanvas planet={planet} />
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 18,
          fontSize: 13,
          opacity: 0.7,
          pointerEvents: "none",
        }}
      >
        @{username} · {planet.totalContributions.toLocaleString()} contributions ·
        grass
      </div>
    </main>
  );
}
