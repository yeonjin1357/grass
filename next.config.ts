import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // three.js는 ESM/소스 형태로 배포되는 일부 모듈을 포함하므로 트랜스파일 대상에 포함.
  transpilePackages: ["three"],
};

export default nextConfig;
