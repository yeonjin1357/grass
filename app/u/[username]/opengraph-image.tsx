import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fetchGrassData } from "@/lib/github";

// Node.js 런타임 기본(edge 불필요) — readFile로 로컬 ttf 로드 가능.
export const alt = "grass — GitHub 기여도 3D 행성";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Params = { params: Promise<{ username: string }> };

export default async function Image({ params }: Params) {
  const { username } = await params; // Next 16: params는 Promise

  // Satori는 woff2 불가 → 정적 ttf(ArrayBuffer).
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/og-regular.ttf")),
    readFile(join(process.cwd(), "assets/og-bold.ttf")),
  ]);

  let total = 0;
  let langs: string[] = [];
  let planetColor = "#3b82f6";
  let found = true;
  try {
    const data = await fetchGrassData(username);
    total = data.totalContributions;
    langs = data.topLanguages.slice(0, 3).map((l) => l.name);
    planetColor = data.topLanguages[0]?.color ?? planetColor;
  } catch {
    found = false; // 없는 유저/에러 → 일반 카드로 폴백
  }

  const light = "#e8f6ff";

  return new ImageResponse(
    (
      // Satori = flexbox 서브셋. grid/z-index/WebGL 불가.
      // ⚠️ 자식 노드 2개 이상인 div는 반드시 display:flex (텍스트+표현식 혼합도 2개로 셈)
      // → 텍스트는 템플릿 문자열로 단일 자식 처리.
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          gap: 64,
          padding: 72,
          background: "linear-gradient(135deg, #05060a 0%, #0c1322 100%)",
          color: "white",
          fontFamily: "DejaVu",
        }}
      >
        {/* 2D 행성 (radial-gradient + glow) */}
        <div
          style={{
            display: "flex",
            width: 360,
            height: 360,
            borderRadius: 360,
            background: `radial-gradient(circle at 34% 30%, ${light} 0%, ${planetColor} 44%, #05060a 100%)`,
            boxShadow: `0 0 90px 12px ${planetColor}`,
          }}
        />

        {/* 텍스트 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 66, fontWeight: 700 }}>{`@${username}`}</div>
          {found ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 40, opacity: 0.92 }}>
                {`${total.toLocaleString()} contributions`}
              </div>
              {langs.length > 0 && (
                <div style={{ fontSize: 30, opacity: 0.7 }}>
                  {`Top: ${langs.join(", ")}`}
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 34, opacity: 0.8 }}>a GitHub planet</div>
          )}
          <div style={{ fontSize: 26, opacity: 0.6, marginTop: 8 }}>
            grass · your GitHub year as a planet
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DejaVu", data: regular, weight: 400, style: "normal" },
        { name: "DejaVu", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
