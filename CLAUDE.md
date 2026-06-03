# CLAUDE.md

Claude Code가 이 저장소에서 작업할 때 매 세션 읽는 운영 매뉴얼이다. 사실은 라이브 GitHub API와 2026년 라이브러리/경쟁 조사로 검증됨(상세: `docs/`).

## 한 줄 소개

`grass` — GitHub `username`만 넣으면 그 사람의 1년 기여도(잔디)를 **회전하는 발광 행성**으로 그려주는 웹사이트. 바쁜 날은 행성 표면의 산맥이 되고, 활동 많은 영역은 밤의 도시 불빛처럼 빛난다(Bloom). 목표는 스타 가성비 1위 — 자기 행성을 캡처해 자랑하는 공유 루프가 곧 마케팅.

## 상태

- **Weekend 1 + 2 완료 (2026-06-03).** Next.js 16 + R3F, 데이터 레이어, 행성 매핑, `/u/[username]` 행성 씬 + **Bloom·발광 도시 불빛·별·토성 고리·언어색 코어**, **PNG 다운로드/링크 복사**(`ShareBar`), **동적 OG 카드**(`opengraph-image.tsx`, 2D Satori), error/404. 검증: vitest 8/8 · `npm run build` 통과 · 런타임 `/u/torvalds` 200 · 없는유저 404 · OG PNG 1200×630.
- 다음(v1 마감, 수동): **README 결과 GIF + Vercel 배포**. 그 후 v1.5(README 임베드 카드). `docs/ROADMAP.md`.
- 미확인: 브라우저에서 3D WebGL 육안 — `npm run dev` 후 `/u/<username>`.

## 왜 "행성"인가 (다른 메타포 금지)

경쟁 조사 결과 다음 레인은 **건드리지 말 것**:
- 🌱 정원/식물 — 포화 (gitgarden.dev, git-plants.com, marshallku, heypoom 등 4+ 라이브).
- 🏙️ 스카이라인/도시/빌딩 바 — 포화 (github-profile-3d-contrib 1.6k, GithubCity 1.3k, GitCity, **gh-skyline는 GitHub 공식**).
- 🎮 RPG 캐릭터 — 미점유 #1 갭이지만 리깅된 3D 아바타 = 아티스트 필요 → 우리 제약(무 아티스트)에 부적합.
- 🪐 **행성/우주 — 사실상 미점유 + 100% 절차적 생성 → 채택.**

## 스택 (버전 핀 — 깨면 빌드 깨짐)

```
next@15+ (App Router, React 19)
three@0.184.0            # ⚠️ postprocessing가 three<0.185로 캡 → 0.184.x 고정 필수
@react-three/fiber@9.6.1 # React 19 필요
@react-three/drei@10.7.7
@react-three/postprocessing@3.0.4   # postprocessing@6.39.1
```
TypeScript. 배포 Vercel. 데이터는 GitHub GraphQL(서버 전용 PAT).

## 명령 (스캐폴딩 후)

```bash
npm run dev      # 로컬 개발
npm run build    # 프로덕션 빌드 (배포 전 통과 필수)
npm run lint
# API 스모크 테스트 (토큰 필요):
gh api graphql -f query="$(cat docs/query.graphql)" -F login=torvalds -F from=... -F to=...
```

## 디렉터리 맵 (목표 구조)

```
app/
  page.tsx                         # 랜딩 + username 입력 (Server Component)
  u/[username]/page.tsx            # 서버 fetch → <Scene> dynamic(ssr:false); generateMetadata
  u/[username]/opengraph-image.tsx # 2D Satori 카드 (데이터 기반, WebGL 아님)
  u/[username]/not-found.tsx       # 없는 유저 처리
lib/
  github.ts                        # GraphQL 쿼리 + fetch + 타입 + 캐싱 + 에러
  planet.ts                        # weeks 평탄화 → cells, Fibonacci 좌표, 색 그라디언트
components/
  Scene.tsx                        # 'use client' Canvas + Bloom + OrbitControls + Capturer
  Planet.tsx                       # 코어 sphere + Instances(터레인) + Instances(불빛) + 고리
  Capturer.tsx                     # <Canvas> 내부, useThree로 캡처
  ShareBar.tsx                     # 다운로드/공유 버튼 (Capturer ref 브리지)
docs/                              # 설계 문서 (이 매뉴얼이 가리키는 곳)
```

## 반드시 지킬 불변식 (검증됨 — 어기면 버그)

1. **토큰은 서버에만.** GitHub GraphQL은 미인증 거부. `GITHUB_TOKEN`(classic PAT, scopeless 또는 `read:user`)은 서버 Route/Server Component에서만. 클라 번들 절대 금지.
2. **렌더 경계.** three는 import 시 `document`를 건드림 → SSR hydration 에러. Canvas는 `'use client'`, **Server Component**에서 `next/dynamic(..., { ssr:false })`로 로드(Next 15+는 `'use client'` 파일 내 ssr:false dynamic 금지). `next.config.js`에 `transpilePackages:['three']`.
3. **버전 핀.** postprocessing이 three<0.185로 캡 → `three@0.184.x` 고정. fiber9는 React19 필요.
4. **캡처.** `preserveDrawingBuffer` **OFF** 유지. `<Canvas>` 내부 컴포넌트가 `useThree`로 `gl.render(scene,camera)` 후 **같은 프레임에** `gl.domElement.toBlob(...)`. `onCreated`나 `await` 뒤엔 빈 이미지. 외부 버튼은 ref 브리지.
5. **CORS 오염.** drei `<Environment preset=...>`는 원격 CDN HDRI를 받아 캔버스를 taint → `toBlob` SecurityError. v1 캡처 안전책: 원격 HDRI 대신 일반 라이트 + 절차적 배경(또는 HDRI CORS 셀프호스팅).
6. **Bloom.** 발광 머티리얼은 `toneMapped:false` + emissiveIntensity>1 아니면 안 빛남. box 원점이 중앙 → `position.y += height/2`.
7. **API 데이터.** 높이엔 **`contributionCount`(절대값)** 사용. `contributionLevel`은 사용자별 상대 분위수라 절대 비교 불가. 색은 테마 안정성 위해 자체 그라디언트 권장(GitHub `color`/`isHalloween`은 옵션).
8. **에러 형태.** GraphQL 에러는 **HTTP 200 + 최상위 `errors[]`**. `data.user===null` && `errors[].type==='NOT_FOUND'` → `notFound()`. 0 기여는 정상(어두운 행성).
9. **Satori OG.** grid·z-index·WebGL·woff2 불가. 멀티차일드 컨테이너마다 `display:flex` 명시. 번들 500KB 캡. Next 16에서 `params`는 **Promise → await**.

## 컨벤션

- 데이터 → 비주얼 매핑의 단일 기준은 `docs/ARCHITECTURE.md` 표. 새 매핑 추가 시 거기 먼저 갱신.
- 친화적 빈-상태/에러: 없는 유저·0 기여·private-only(=`restrictedContributionsCount`)도 크래시 없이 그럴듯하게.
- 마찰 제로: 읽기 경로에 **로그인 없음**(username만). OAuth는 v2.

## 문서 색인

- `docs/ARCHITECTURE.md` — 시스템 설계·데이터 흐름·행성 좌표 수학·공유 루프.
- `docs/GITHUB-API.md` — 검증된 GraphQL 쿼리·필드 레퍼런스·에러·레이트리밋·엣지케이스.
- `docs/ROADMAP.md` — 빌드 단계 + v1.5/v2 백로그.
