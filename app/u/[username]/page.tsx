import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchGrassData,
  GitHubUserNotFoundError,
  type GrassData,
} from "@/lib/github";
import { buildPlanet } from "@/lib/planet";
import { PlanetCanvas } from "@/components/PlanetCanvas";
import { ShareBar } from "@/components/ShareBar";
import { PlanetHUD } from "@/components/PlanetHUD";

type Params = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username}의 행성 — grass`;
  const description = `${username}의 GitHub 1년 기여도를 살아있는 3D 행성으로.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
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

      {/* 상단 바: 홈 + 공유 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 18px",
          pointerEvents: "none",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#e8eaf0",
            textDecoration: "none",
            pointerEvents: "auto",
          }}
        >
          🌱 grass
        </Link>
        <ShareBar username={username} />
      </div>

      <PlanetHUD username={username} planet={planet} />
    </main>
  );
}
