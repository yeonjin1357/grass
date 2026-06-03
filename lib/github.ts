/**
 * GitHub GraphQL 데이터 레이어.
 * - 잔디(기여 그래프) + 언어/스타/집계 카운트를 단일 쿼리(cost 1)로 가져온다.
 * - 토큰은 서버 전용(process.env.GITHUB_TOKEN). 클라이언트에 노출 금지.
 * - Next 전용 import 없음 → tsx 스모크 스크립트에서도 그대로 실행 가능.
 * 상세: docs/GITHUB-API.md
 */

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

export class GitHubUserNotFoundError extends Error {
  constructor(login: string) {
    super(`GitHub user not found: ${login}`);
    this.name = "GitHubUserNotFoundError";
  }
}

export class GitHubAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export interface ContributionDay {
  date: string; // "YYYY-MM-DD"
  weekday: number; // 0=Sun .. 6=Sat
  contributionCount: number; // 절대값 — 3D 높이에 사용
  contributionLevel: string; // NONE | FIRST_QUARTILE | ... | FOURTH_QUARTILE
  color: string; // GitHub 팔레트 헥스 (테마 의존)
}

export interface LanguageStat {
  name: string;
  color: string | null;
  size: number; // 누적 바이트
}

export interface GrassData {
  login: string;
  name: string | null;
  avatarUrl: string;
  followers: number;
  repoCount: number;
  hasAnyContributions: boolean;
  totalContributions: number;
  days: ContributionDay[];
  topLanguages: LanguageStat[];
  totals: {
    commits: number;
    pullRequests: number;
    issues: number;
    reviews: number;
  };
}

const QUERY = /* GraphQL */ `
  query GrassData($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      name
      login
      avatarUrl
      followers { totalCount }
      contributionsCollection(from: $from, to: $to) {
        hasAnyContributions
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              weekday
              contributionCount
              contributionLevel
              color
            }
          }
        }
      }
      repositories(
        ownerAffiliations: OWNER
        isFork: false
        privacy: PUBLIC
        first: 6
        orderBy: { field: STARGAZERS, direction: DESC }
      ) {
        totalCount
        nodes {
          primaryLanguage { name color }
          languages(first: 5, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node { name color }
            }
          }
        }
      }
    }
  }
`;

interface GraphQLError {
  type?: string;
  message: string;
}

/** GitHub GraphQL 응답 중 우리가 읽는 부분만 느슨하게 타이핑. */
interface RawUser {
  name: string | null;
  login: string;
  avatarUrl: string;
  followers: { totalCount: number };
  contributionsCollection: {
    hasAnyContributions: boolean;
    totalCommitContributions: number;
    totalIssueContributions: number;
    totalPullRequestContributions: number;
    totalPullRequestReviewContributions: number;
    contributionCalendar: {
      totalContributions: number;
      weeks: { contributionDays: ContributionDay[] }[];
    };
  };
  repositories: {
    totalCount: number;
    nodes: {
      primaryLanguage: { name: string; color: string | null } | null;
      languages: {
        edges: { size: number; node: { name: string; color: string | null } }[];
      };
    }[];
  };
}

/** Next.js fetch 캐싱 옵션을 받되, Next 밖(node/tsx)에서는 무시되도록 타입만 확장. */
type FetchInit = RequestInit & { next?: { revalidate?: number } };

/** 최근 365일 UTC 범위 (GitHub의 1년 캡 준수). */
function lastYearRange(now: Date): { from: string; to: string } {
  const to = now;
  const from = new Date(to.getTime() - 364 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function aggregateLanguages(user: RawUser): LanguageStat[] {
  const acc = new Map<string, LanguageStat>();
  for (const repo of user.repositories.nodes) {
    for (const edge of repo.languages.edges) {
      const existing = acc.get(edge.node.name);
      if (existing) {
        existing.size += edge.size;
      } else {
        acc.set(edge.node.name, {
          name: edge.node.name,
          color: edge.node.color,
          size: edge.size,
        });
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.size - a.size).slice(0, 5);
}

function normalize(user: RawUser): GrassData {
  const cc = user.contributionsCollection;
  const days: ContributionDay[] = cc.contributionCalendar.weeks.flatMap(
    (w) => w.contributionDays,
  );
  return {
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    followers: user.followers.totalCount,
    repoCount: user.repositories.totalCount,
    hasAnyContributions: cc.hasAnyContributions,
    totalContributions: cc.contributionCalendar.totalContributions,
    days,
    topLanguages: aggregateLanguages(user),
    totals: {
      commits: cc.totalCommitContributions,
      pullRequests: cc.totalPullRequestContributions,
      issues: cc.totalIssueContributions,
      reviews: cc.totalPullRequestReviewContributions,
    },
  };
}

/**
 * 한 유저의 잔디 + 통계를 가져온다.
 * @throws GitHubAuthError 토큰 없음/무효
 * @throws GitHubUserNotFoundError 존재하지 않는 username
 */
export async function fetchGrassData(
  login: string,
  now: Date = new Date(),
): Promise<GrassData> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubAuthError(
      "GITHUB_TOKEN is not set (server-only). 로컬은 GITHUB_TOKEN=$(gh auth token) 로 실행 가능.",
    );
  }

  const { from, to } = lastYearRange(now);
  const init: FetchInit = {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login, from, to } }),
    // Next 런타임에서만 의미 있음(노드/tsx에서는 무시됨).
    next: { revalidate: 3600 },
  };

  const res = await fetch(GITHUB_GRAPHQL, init);
  if (res.status === 401) {
    throw new GitHubAuthError("Invalid GITHUB_TOKEN (401 Unauthorized)");
  }

  const json = (await res.json()) as {
    data?: { user: RawUser | null };
    errors?: GraphQLError[];
  };

  const notFound =
    json.data?.user == null ||
    json.errors?.some((e) => e.type === "NOT_FOUND");
  if (notFound) {
    throw new GitHubUserNotFoundError(login);
  }

  if (json.errors && json.errors.length > 0) {
    throw new Error(
      `GitHub GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`,
    );
  }

  return normalize(json.data!.user!);
}
