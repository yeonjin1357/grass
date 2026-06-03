# Roadmap

각 단계는 그 자체로 "돌아가는 상태" — 중간에 멈춰도 데모가 된다.

## v1 — 단일 행성 + 공유 (≈ 2주말)

### Weekend 1 — 데이터 + 행성이 돈다
- [ ] `create-next-app`(TS, App Router) + 버전 핀 설치 + `next.config.js`에 `transpilePackages:['three']`
  - `three@0.184.0 @react-three/fiber@9.6.1 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4`
- [ ] `.env.local`에 `GITHUB_TOKEN` (먼저 `gh api graphql`로 스모크 테스트 — `docs/GITHUB-API.md`)
- [ ] `lib/github.ts` — 쿼리(`docs/query.graphql`) + 타입 + 에러 처리(`data.user===null`/`NOT_FOUND`) + 캐싱(revalidate 3600)
- [ ] `lib/planet.ts` — weeks 평탄화 → `cells[{date,count,color}]`, Fibonacci 좌표 + 법선 회전 + 자체 색 그라디언트
- [ ] `app/u/[username]/page.tsx`(Server, `dynamic(ssr:false)`) + `components/Scene.tsx`/`Planet.tsx`
  - 코어 sphere + `<Instances>` 터레인 + `OrbitControls` → **회색이어도 돌면 1차 성공**

### Weekend 2 — wow + 공유 루프
- [ ] `<EffectComposer><Bloom/>` + 발광 도시 불빛(`toneMapped:false`, intensity>1) + `<ContactShadows>` + 언어색 코어 + 토성 고리
  - ⚠️ 캡처 안전: 원격 HDRI `<Environment preset>` 대신 일반 라이트 + 절차적 배경(CORS taint 방지)
- [ ] `components/Capturer.tsx` + `ShareBar.tsx` — `gl.render`→`toBlob` 같은 프레임, ref 브리지 → 다운로드 PNG (빈 이미지 아닌지 확인)
- [ ] `app/u/[username]/opengraph-image.tsx` — 2D Satori 카드(`params` await, Node 런타임, ttf ArrayBuffer, `display:flex`) + `generateMetadata`(og/twitter) + `robots.txt` 허용
- [ ] `app/u/[username]/not-found.tsx` + 랜딩 `app/page.tsx`(username 입력)
- [ ] 모바일/로딩/에러 상태, README 결과 GIF, Vercel 배포

### v1 완료 검증 (`docs/ARCHITECTURE.md` + CLAUDE.md 기준)
1. `/u/torvalds` 행성 회전 · `/u/<없는유저>` 404 · 0-기여 계정 어두운 행성(크래시 X)
2. 다운로드 PNG 비어있지 않음 · `/u/torvalds/opengraph-image` 직접 렌더 · OG 디버거 unfurl
3. `npm run build` 통과 · 모바일 터치 · 드로우콜(Instances) 확인

## v1.5 — 배포 채널 확장
- [ ] **README 임베드 동적 카드** `/api/card?user=X` → SVG/PNG (github-readme-stats식 — 1순위 성장 레버)
- [ ] 캡처 PNG를 blob 스토리지(Vercel Blob / Supabase)에 username 키로 업로드 → OG 카드에 **실제 3D 썸네일** 임베드

## v2 — 깊이 & 바이럴
- [ ] **갤럭시 모드** — 여러 username을 한 화면 행성들로 비교(공유 별 주위 공전)
- [ ] 멀티년 히스토리(`contributionYears` 루프, 하한 `createdAt`)
- [ ] 위성(달) = 총 PR/이슈/리뷰 · 극지 오로라 = streak
- [ ] 애니메이션 GIF/WebM 내보내기(CCapture/MediaRecorder — 이땐 `preserveDrawingBuffer:true`)
- [ ] OAuth 로그인(선택) → private 기여 포함

## 비목표 (하지 않을 것)
- STL/3D 프린팅 — GitHub 공식 `gh-skyline`이 점유. 경쟁 금지.
- 스카이라인/도시/빌딩 바, 정원/식물 메타포 — 포화 레인(`CLAUDE.md` 참고).
