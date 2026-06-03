import type { PlanetModel } from "@/lib/planet";

/**
 * 화면 위 맥락 오버레이(캔버스 밖 DOM) — "이게 뭐지?"를 죽이는 핵심.
 * 하단 글래스 카드(누구/총기여/언어) + 범례(높이·발광 의미).
 */
export function PlanetHUD({
  username,
  planet,
}: {
  username: string;
  planet: PlanetModel;
}) {
  return (
    <>
      <div className="hud-card">
        <div className="hud-user">@{username}</div>
        <div className="hud-stats">
          {planet.totalContributions.toLocaleString()} contributions ·{" "}
          {planet.dayCount} days
        </div>
        {planet.topLanguageName && (
          <div className="hud-lang">
            <span
              className="hud-dot"
              style={{ background: planet.coreColor }}
            />
            {planet.topLanguageName}
          </div>
        )}
      </div>

      <div className="hud-legend">
        <span>🌱 적은 날 · 🌳 바쁜 날 · ✨ 가장 바쁜 날</span>
        <span>↕ 세로 = 시기 (위 ~1년 전 → 아래 최근)</span>
        <span>🔍 나무에 마우스 = 그날 날짜·커밋수</span>
      </div>
    </>
  );
}
