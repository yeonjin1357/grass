"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 36 }}>🚀 행성 생성에 실패했어요</h1>
      <p style={{ opacity: 0.8, maxWidth: 420, lineHeight: 1.6 }}>
        잠시 후 다시 시도해 주세요. GitHub API 일시 오류이거나 요청이 많을 수
        있어요.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={reset}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "none",
            background: "#2ea043",
            color: "white",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          다시 시도
        </button>
        <Link href="/" style={{ alignSelf: "center" }}>
          홈으로
        </Link>
      </div>
    </main>
  );
}
