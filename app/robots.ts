import type { MetadataRoute } from "next";

// 소셜 스크래퍼(Twitter/Slack/Facebook)가 OG 이미지 라우트를 가져올 수 있도록 전체 허용.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
  };
}
