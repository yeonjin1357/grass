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

- 높이 = `contributionCount`를 **sqrt 압축 + biome 3단계**(grass/shrub/tree, bare는 안 그림)로. `contributionLevel`은 상대 분위수라 부적합.
- 지면: **`SphereGeometry`를 `terrainElevation(dir)` 노이즈로 CPU 변위**(useMemo 1회) + 고정 초록 `#3f7d44`. 식생도 동일 `terrainElevation`로 `surfaceRadius` 계산 → 표면에 정확히 심김(둥둥 X). 주력 언어색은 지면 아닌 대기/고리 액센트만.
- 고리: `ringGeometry`, followers 스케일(followers>0일 때만), 적도 평면 회전.

## 인스턴싱 & wow

- 식생 = **진짜 식물 인스턴싱**: 나무(`cylinderGeometry` 줄기 + `icosahedronGeometry(1,1)` 수관 blob), 덤불(blob), 잔디(`icosahedronGeometry(1,0)` tuft). bare는 안 그림. 셀 `seed`로 결정적 변주(높이/캐노피/틸트/색/yaw). 드로우콜 ≈ 8.
- **발광 베리**: **전역 상위 ~6일(`GLOW_TOP_N`)만** `glow>0` → 식물 꼭대기에 작은 구체 `meshBasicMaterial #ffd86b toneMapped:false` → Bloom. (상대 티어로 베리 폭발하던 버그 수정)
- **라이팅**: `hemisphereLight` + 골든아워 key(castShadow) + 차가운 fill + ambient, ACESFilmic exposure 1.05, `<fog>`, 프레넬 대기 셰이더.
- **그림자**: plain `PCFSoftShadowMap`(데스크탑), 모바일 off. ⚠️ **`<Environment>` IBL·`<SoftShadows>`·`vertexColors`는 헤드리스(SwiftShader)에서 회색 렌더 → 제거**. 실 GPU에선 동작하므로 재추가 가능(재추가 시 실기기 확인 필수).
- **Bloom + Vignette**: `<EffectComposer><Bloom 0.75/1.1 mipmapBlur/><Vignette/></EffectComposer>`.
- `OrbitControls makeDefault autoRotate`, drei `<Stars>` 배경. (바다 시도했으나 행성을 덮어 제거)

## 공유 루프 (성장 엔진)

두 산출물, 둘 다 핵심 (인터랙티브 3D만으론 트윗/README에 못 박혀 덜 퍼짐):

1. **다운로드 PNG (고해상도, 라이브 3D)** — `components/ShareBar.tsx`
   - **Bloom(EffectComposer)을 쓰므로** `gl.render`로 직접 그리면 효과가 빠짐 → `<Canvas gl={{preserveDrawingBuffer:true}}>` + `document.querySelector('canvas').toBlob('image/png')`로 **합성된(블룸 포함) 마지막 프레임**을 캡처.
   - 외부 버튼(ShareBar)이 canvas DOM을 직접 읽으므로 in-Canvas ref 브리지 불필요.
   - 원격 HDRI(`<Environment preset>`)는 캔버스 taint → SecurityError. 라이트 + 절차적 배경(`<color>`/`<fog>`/`<Stars>`)으로 캡처 안전.

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
| `contributionDays[].contributionCount` | **식생 단계 높이** (sqrt 압축: 0=bare 지면, 저=잔디, 중=덤불, 고=나무) | v1 |
| count 비율 | 따뜻한 초록 캐노피 색(grass→shrub→tree 보간) | v1 |
| **전역 상위 ~6일** | **골드 발광 베리** `#ffd86b`(Bloom) | v1 |
| 주력 언어색 | **대기/고리 액센트만** (지면은 항상 초록 `#3f7d44`) | v1 |
| `totalContributions` | 행성 반경 | v1 |
| `followers`/`repositories.totalCount` | 토성 고리 두께 | v1 |
| `totalCommit/PR/Issue/Review` | 위성(달) 개수 | v1.5 |
| 연속 커밋(streak) | 극지 오로라 밴드 | v1.5 |

새 매핑 추가 시 이 표를 먼저 갱신할 것.
