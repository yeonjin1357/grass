# GitHub GraphQL API 레퍼런스

잔디(기여 그래프) 데이터의 **유일한** 출처는 GraphQL API다 (REST엔 contributions 엔드포인트 없음). 아래 모든 항목은 라이브 API(`torvalds`)로 직접 검증함.

엔드포인트: `POST https://api.github.com/graphql` · 헤더: `Authorization: bearer $GITHUB_TOKEN`

## 검증된 쿼리 (cost 1)

전체 쿼리는 [`query.graphql`](query.graphql)에도 보관. 변수는 **UTC**, `from`~`to`는 **1년 이하**:

```graphql
query GrassData($login: String!, $from: DateTime!, $to: DateTime!) {
  rateLimit { cost remaining resetAt }
  user(login: $login) {
    name login avatarUrl createdAt
    followers { totalCount }
    contributionsCollection(from: $from, to: $to) {
      hasAnyContributions
      restrictedContributionsCount            # 뷰어에게 가려진 private 기여 수
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoryContributions
      contributionYears                        # [2026,2025,...] 멀티년 루프용
      contributionCalendar {
        totalContributions
        isHalloween                            # 핼러윈엔 팔레트 뒤집힘
        colors                                 # 4색 팔레트(light→dark)
        weeks {
          firstDay
          contributionDays {
            date                               # "2024-01-03" (YYYY-MM-DD)
            weekday                            # 0=Sun .. 6=Sat
            contributionCount                  # 절대 카운트 → 3D 높이에 사용
            contributionLevel                  # NONE|FIRST_QUARTILE|...|FOURTH_QUARTILE
            color                              # 헥스 "#9be9a8" / 0이면 "#ebedf0"
          }
        }
      }
    }
    repositories(
      ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC,
      first: 6, orderBy: { field: STARGAZERS, direction: DESC }
    ) {
      totalCount
      nodes {
        name stargazerCount forkCount
        primaryLanguage { name color }
        languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
          totalSize
          edges { size node { name color } }   # size=바이트, color=언어색 헥스
        }
      }
    }
  }
}
```

변수 예:
```json
{ "login": "torvalds", "from": "2025-06-03T00:00:00Z", "to": "2026-06-03T00:00:00Z" }
```

## 필드 레퍼런스 (검증값)

| 필드 | 타입 | 비고 |
|---|---|---|
| `contributionDays[].contributionCount` | Int | **절대값** — 3D 높이에 사용 |
| `contributionDays[].color` | String | 헥스. 0 = `#ebedf0`. 단, GitHub 서버 테마 반영 |
| `contributionDays[].contributionLevel` | enum | 사용자별 **상대 분위수** — 절대 비교 금지 |
| `contributionDays[].weekday` | Int | 0=Sun..6=Sat. **시(hour) 데이터 없음** (night-owl 불가) |
| `contributionCalendar.totalContributions` | Int | 범위 합계 |
| `contributionCalendar.colors` | [String!] | 4색 팔레트 |
| `repositories.nodes[].primaryLanguage.color` | String | 언어색 헥스 (예: Rust `#dea584`) |
| `languages.edges[].size` | Int | 바이트. SIZE DESC 정렬로 주력 언어 추출 |
| `restrictedContributionsCount` | Int | 가려진 private 기여 수 |
| `contributionYears` | [Int!] | 활동 연도 — 멀티년 루프 |

## 인증

- **토큰 필수.** 미인증 요청은 GraphQL 엔드포인트가 즉시 거부(REST와 다름).
- 공개 calendar: **classic PAT scope 불필요**, 또는 `read:user`. fine-grained PAT도 가능.
- private 기여: 토큰 소유자=대상 유저 **AND** 프로필 "Include private contributions on my profile" ON 일 때만 포함. 그 외엔 `restrictedContributionsCount`로 집계만.
- **서버 전용.** 토큰을 클라 번들/리포에 넣지 말 것.

## 날짜 범위 규칙

- `from`/`to`는 `DateTime`(ISO 8601). **span ≤ 1년** (초과 시 `VALIDATION` 에러).
- 미지정 시 기본 범위는 **토큰 소유자(viewer) 타임존** 기준 최근 1년 → 결정적 출력 위해 **항상 명시 UTC** 권장.
- 멀티년: `contributionYears` 열거 후 연도별 1회씩 호출(하한 `user.createdAt`).

## 레이트리밋

- PAT: **5,000 points/hour**. 우리 쿼리 cost **1**.
- 보조 한도: **2,000 points/분**, 동시요청 100, 90s CPU/60s.
- 노드 비용 = 중첩 first/last 곱의 합 (예: `repos(first:50){issues(first:10)}` = 50 + 500 = 550).
- → username 키로 **1~6h 캐싱** 필수(스파이크 방어).

## 에러 & 엣지케이스

- 에러는 **HTTP 200 + 최상위 `errors[]`** 로 옴. status만 보지 말 것.
  ```json
  // 없는 유저
  { "data": { "user": null },
    "errors": [{ "type": "NOT_FOUND", "message": "Could not resolve to a User with the login of '...'." }] }
  // 범위 > 1년
  { "errors": [{ "type": "VALIDATION", "message": "The total time spanned by 'from' and 'to' must not exceed 1 year" }] }
  ```
  → `data.user===null` && `errors[].type==='NOT_FOUND'` 면 `notFound()`.
- **0 기여**: calendar는 여전히 전체 격자 반환(모든 날 count:0, `#ebedf0`). 에러 아님 → 어두운 행성으로 렌더.
- **경계 주(week)**: 첫/마지막 주는 7일 미만일 수 있음 → 평탄화 시 패딩/클램프.
- **테마 의존**: 반환 `color`/`colors`/`isHalloween`은 GitHub 현재 테마 반영 → 안정적 룩 원하면 `contributionCount`로 자체 그라디언트 산출.

## 스모크 테스트

```bash
gh api graphql -f query="$(cat docs/query.graphql)" \
  -F login=torvalds -F from=2025-06-03T00:00:00Z -F to=2026-06-03T00:00:00Z
```
잔디 배열 + repos가 콘솔에 찍히면 데이터 레이어 준비 완료.
