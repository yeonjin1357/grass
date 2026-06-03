/**
 * 데이터 레이어 스모크 테스트 — 잔디 데이터가 실제로 들어오는지 콘솔로 확인.
 * 실행: GITHUB_TOKEN=$(gh auth token) npx tsx scripts/smoke.ts torvalds
 */
import { fetchGrassData } from "../lib/github";

async function main() {
  const login = process.argv[2] ?? "torvalds";
  const data = await fetchGrassData(login);

  console.log(`\n@${data.login}${data.name ? ` (${data.name})` : ""}`);
  console.log(
    `총 기여(최근 1년): ${data.totalContributions}  ·  일수: ${data.days.length}  ·  팔로워: ${data.followers}  ·  레포: ${data.repoCount}`,
  );
  console.log(`상위 언어: ${data.topLanguages.map((l) => l.name).join(", ") || "-"}`);
  console.log(
    `집계: commits=${data.totals.commits} prs=${data.totals.pullRequests} issues=${data.totals.issues} reviews=${data.totals.reviews}`,
  );

  const counts = data.days.map((d) => d.contributionCount);
  console.log(`\n처음 14일 일별 기여 수: ${counts.slice(0, 14).join(" ")}`);

  const busiest = [...data.days]
    .sort((a, b) => b.contributionCount - a.contributionCount)
    .slice(0, 5);
  console.log(
    `가장 바쁜 날 Top5: ${busiest.map((d) => `${d.date}=${d.contributionCount}`).join(", ")}`,
  );
  console.log(`최대 일일 기여: ${counts.length ? Math.max(...counts) : 0}\n`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
