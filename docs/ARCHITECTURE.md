# Architecture

`grass`의 시스템 설계. 모든 기술 주장은 라이브 GitHub API + 2026 라이브러리 문서로 검증됨.

## 데이터 흐름

```
 [브라우저] /u/:username
     │
     ▼
 app/u/[username]/page.tsx  ── Server Component (서버에서만 토큰 사용)
     │   lib/github.ts: GraphQL 1회 호출 (cost 1), revalidate 캐싱
     ▼
 ┌─────────────────────────────────────────────┐
 │ GitHub GraphQL  api.github.com/graphql        │
 │  user → contributionsCollection               │
 │       → contributionCalendar → weeks → days   │  ← 핵심: ~365개 숫자 격자
 │  + repositories(언어/스타) + 집계 카운트       │
 └─────────────────────────────────────────────┘
     │  { days[], languages, totals, followers }
     ▼
 lib/planet.ts: weeks 평탄화 → cells[{date,count,color,pos,rot}]
     │            (Fibonacci sphere 좌표 + 법선 회전 + 자체 색 그라디언트)
     ▼
 components/Scene.tsx  ── 'use client', next/dynamic(ssr:false)로 로드
     │   <Canvas> → <Planet> (Instances 터레인+불빛, 코어 sphere, 고리)
     │            → <EffectComposer><Bloom/> → OrbitControls
     │            → <Capturer> (useThree)
     ├────────────► [다운로드 PNG]  gl.render → toBlob (같은 프레임)
     │
 app/u/[username]/opengraph-image.tsx  ── 2D Satori 카드 (데이터 기반)
     └────────────► [소셜 unfurl]  og:image / twitter:summary_large_image
```

핵심 통찰: GitHub이 잔디를 **숫자 격자**로 그대로 내려준다. 3D는 "그 숫자를 어떤 모양으로 둘까"라는 디자인 문제일 뿐. 스크래핑 없음.

## 렌더 경계 (SSR 안전)

- `three`는 import 시 `document`에 접근 → SSR 시 hydration 에러.
- 따라서 `<Canvas>`가 든 `Scene.tsx`는 `'use client'`.
- `page.tsx`(**Server Component**)에서 `const Scene = dynamic(() => import('@/components/Scene'), { ssr:false })`.
  - Next 15+는 `'use client'` 파일 **안의** `ssr:false` dynamic을 금지 → 반드시 Server Component에서.
- `next.config.js`: `transpilePackages: ['three']`.

## 행성 지오메트리 (유일한 수학)

365개 타일을 구면에 고르게 분포 → **Fibonacci sphere**:

```ts
const golden = Math.PI * (3 - Math.sqrt(5));   // 황금각
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2;             // 1 → -1
  const r = Math.sqrt(1 - y * y);
  const t = golden * i;
  const dir = new Vector3(Math.cos(t) * r, y, Math.sin(t) * r); // 단위벡터(법선)
  const height = Math.max(0.05, normalize(count));
  // 타일 위치: 표면에서 height/2 만큼 바깥 (box 원점이 중앙이므로)
  const position = dir.clone().multiplyScalar(R + height / 2);
  // 타일 방향: +Y축을 표면 법선에 정렬
  const quat = new Quaternion().setFromUnitVectors(new Vector3(0,1,0), dir);
}
```

- 높이 = `contributionCount`(절대값) 정규화. `contributionLevel`은 상대 분위수라 절대 높이엔 부적합.
- 코어: `icosahedronGeometry` + `meshStandardMaterial`, 주력 언어 색조.
- 고리: `torusGeometry`, 팔로워/레포 수로 스케일, 적도 평면 회전.

## 인스턴싱 & wow

- 365 타일을 개별 Mesh로 두면 드로우콜 폭발 → drei `<Instances limit={N}>` + 단일 geometry/material, 각 `<Instance>`에 position/rotation/scale/color. 드로우콜 1.
- **불빛**: 바쁜 날(임계치 초과)만 두 번째 `<Instances>`의 작은 emissive 구체. `toneMapped={false}` + emissiveIntensity>1.
- **Bloom**: `<EffectComposer><Bloom luminanceThreshold mipmapBlur /></EffectComposer>` — 불빛만 빛나게 threshold 튜닝. 이게 "프리미엄" 인상의 8할.
- `OrbitControls makeDefault autoRotate`, `<Float>` 드리프트, `<ContactShadows>`.

## 공유 루프 (성장 엔진)

두 산출물, 둘 다 핵심 (인터랙티브 3D만으론 트윗/README에 못 박혀 덜 퍼짐):

1. **다운로드 PNG (고해상도, 라이브 3D)**
   - `preserveDrawingBuffer` **OFF**.
   - `<Canvas>` 내부 `Capturer`가 `useThree()`로 `{gl,scene,camera}` 받아 **같은 프레임**에 `gl.render(scene,camera)` → `gl.domElement.toBlob(cb,'image/png')`.
   - `onCreated`/`await` 뒤엔 빈 이미지. `useThree`는 Canvas 내부에서만 → 외부 버튼은 `useImperativeHandle` ref로 브리지.
   - 원격 HDRI(`<Environment preset>`)는 캔버스 taint → SecurityError. v1은 일반 라이트 + 절차적 배경으로 캡처 안전 확보.

2. **동적 OG 카드 (2D, 소셜 unfurl)**
   - Satori = flexbox 서브셋(grid·z-index·**WebGL 불가**) → 라이브 3D 못 그림.
   - `app/u/[username]/opengraph-image.tsx`: CSS radial-gradient 원 + 발광 점 몇 개로 **단순화한 행성** + `@username` + `totalContributions` + top 언어 + URL.
   - Next 16: `params`는 **Promise → await**. Node 런타임 기본. ttf 폰트 ArrayBuffer. `size={1200×630}`, `contentType:'image/png'`.
   - `generateMetadata`로 `og:`/`twitter:summary_large_image` 매칭. `robots.txt`에 라우트 허용(스크래퍼 접근).
   - 데이터 기반이라 스토리지 불필요 + 스크래퍼 chicken-and-egg 없음. (실제 3D 썸네일 임베드는 v1.5.)

## 캐싱 & 레이트리밋

- GraphQL: 5,000 pts/hr (PAT), 보조 한도 2,000 pts/분. 우리 쿼리는 cost 1.
- username 키로 1~6h 캐싱(`unstable_cache` 또는 `fetch next:{revalidate:3600}`). 바이럴 스파이크 방어.

## 데이터 → 비주얼 매핑 (단일 기준표)

| GitHub 데이터 | 행성 비주얼 | 버전 |
|---|---|---|
| `contributionDays[].contributionCount` | 표면 타일 높이(산맥) | v1 |
| 자체 그라디언트(count) | 타일 색 | v1 |
| 바쁜 날(임계치↑) | 발광 도시 불빛(Bloom) | v1 |
| 주력 언어색(레포 집계) | 코어/대기 색조 | v1 |
| `totalContributions` | 행성 반경 | v1 |
| `followers`/`repositories.totalCount` | 토성 고리 두께 | v1 |
| `totalCommit/PR/Issue/Review` | 위성(달) 개수 | v1.5 |
| 연속 커밋(streak) | 극지 오로라 밴드 | v1.5 |

새 매핑 추가 시 이 표를 먼저 갱신할 것.
