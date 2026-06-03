# 🪐 grass

**GitHub username을 넣으면, 1년 기여도(잔디)가 살아있는 행성이 됩니다.**

바쁜 커밋 날은 행성 표면의 산맥이 되고, 활동이 몰린 영역은 밤의 도시 불빛처럼 빛납니다. 주력 언어가 행성의 색을, 팔로워 수가 토성 같은 고리를 만듭니다. 회전시키고, 캡처하고, 자랑하세요.

> 정적 스카이라인은 그만. 당신의 GitHub를 하나의 세계로.

## ✨ 무엇이 다른가

기존 3D GitHub 시각화는 거의 다 **회색 빌딩 스카이라인**(공식 `gh-skyline` 포함)이거나 **2D 정원 SVG**입니다. `grass`는 **기여도 기반 행성** — 아무도 점유하지 않은 메타포 — 를 100% 절차적 생성(procedural)으로 그려, 아티스트 에셋 없이도 한 장의 스크린샷으로 압도합니다.

## 🔭 작동 원리

GitHub GraphQL API 한 번의 호출이 1년치 일별 기여 수(`contributionCount`)와 색, 그리고 top 레포·언어·스타·총 커밋/PR/이슈/리뷰까지 돌려줍니다. 그 ~365개의 숫자를 구면(Fibonacci sphere)에 뿌려 높이로 산맥을 세우면 — 행성이 됩니다. 자세한 메커니즘은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)와 [`docs/GITHUB-API.md`](docs/GITHUB-API.md).

## 🚀 퀵스타트

> 상태: 문서 단계. 아래는 스캐폴딩 후 동작할 흐름입니다([`docs/ROADMAP.md`](docs/ROADMAP.md) 참고).

```bash
git clone <repo> && cd grass
npm install
cp .env.example .env.local   # GITHUB_TOKEN 채우기 (아래)
npm run dev                  # http://localhost:3000
```

방문: `http://localhost:3000/u/torvalds`

### GITHUB_TOKEN

GitHub GraphQL은 공개 데이터라도 토큰이 **필수**입니다. [Personal Access Token](https://github.com/settings/tokens)을 발급(**classic, scope 불필요** 또는 `read:user`)해 `.env.local`의 `GITHUB_TOKEN`에 넣으세요. **서버 전용** — 클라이언트에 노출하거나 커밋하지 마세요.

## 🛠️ 스택

Next.js (App Router) · React Three Fiber · drei · @react-three/postprocessing · TypeScript · Vercel. 버전 핀과 이유는 [`CLAUDE.md`](CLAUDE.md).

## 🗺️ 로드맵

- **v1** — 단일 행성 + 다운로드 PNG + 동적 OG 소셜 카드.
- **v1.5** — README 임베드 카드 엔드포인트(github-readme-stats식 배포).
- **v2** — 갤럭시(멀티유저 비교) · 멀티년 히스토리 · GIF 내보내기 · 달/오로라.

전체: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## 📄 라이선스

[MIT](LICENSE).
