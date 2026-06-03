# Roadmap

각 단계는 그 자체로 "돌아가는 상태" — 중간에 멈춰도 데모가 된다.

## v1 — 단일 행성 + 공유 (≈ 2주말)

### Weekend 1 — 데이터 + 행성이 돈다  ✅ 완료 (2026-06-03)
- [x] 직접 스캐폴딩(비어있지 않은 dir라 create-next-app 대신) + 버전 핀 설치 + `next.config.ts`에 `transpilePackages:['three']`
  - 확정: `next@16.2.7 react@19.2.7 three@0.184.0 @react-three/fiber@9.6.1 @react-three/drei@10.7.7 @react-three/postprocessing@3.0.4` (peer 충돌 0)
- [x] 토큰: 로컬은 `GITHUB_TOKEN=$(gh auth token)`으로 처리(.env.local은 추후). 스모크로 검증.
- [x] `lib/github.ts` — 쿼리 인라인 + 타입 + 에러(`NOT_FOUND`→`GitHubUserNotFoundError`) + fetch `next:{revalidate:3600}`. tsx 실행 가능(Next 전용 import 없음).
- [x] `lib/planet.ts` — weeks 평탄화 → cells, `fibonacciSphere()` + 자체 색 그라디언트. 순수(three 미import) → 단위테스트 8/8.
- [x] `app/u/[username]/page.tsx`(Server, await params) → `components/PlanetCanvas.tsx`(client, `dynamic(ssr:false)`) → `Scene.tsx`/`Planet.tsx`
  - 코어 icosahedron + drei `<Instances>` 터레인(법선 정렬 quaternion) + `OrbitControls`
- [x] 검증: 스모크(torvalds 3029기여 출력) · vitest 8/8 · `npm run build` 통과 · 런타임 `/u/torvalds` 200 · 없는유저 404
- [ ] (미확인) 브라우저에서 실제 WebGL 렌더 육안 확인 — `npm run dev` 후 `/u/torvalds`

### Weekend 2 — wow + 공유 루프  ✅ 대부분 완료 (2026-06-03)
- [x] EffectComposer+Bloom + 발광 도시 불빛(meshBasicMaterial `toneMapped:false`) + drei Stars(절차적, 캡처 안전) + 언어색 코어/대기 + 토성 고리(followers 스케일). ContactShadows는 우주 부유 행성이라 생략.
- [x] `ShareBar.tsx` — 캡처는 `preserveDrawingBuffer:true` + `canvas.toBlob`(Bloom 합성 프레임 포함, gl.render 우회). 다운로드 PNG + 링크 복사.
- [x] `opengraph-image.tsx` — 2D Satori 카드(params await, Node 런타임, DejaVu ttf). ⚠️ 텍스트+표현식 혼합 div는 자식 2개로 셈 → 템플릿 문자열 단일자식. `generateMetadata`(og/twitter) + `app/robots.ts`. 검증: PNG 1200×630 (127KB).
- [x] `error.tsx`(세그먼트 에러 바운더리) + 랜딩/not-found(W1). loading.tsx는 스트리밍 소프트404(200) 유발 → 제거(진짜 404 유지, 로딩은 클라 Scene 스피너).
- [ ] (남음) README 결과 GIF, Vercel 배포 — 브라우저 캡처 + Vercel 계정 필요(수동 단계)

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
