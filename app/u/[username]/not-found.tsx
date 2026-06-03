import Link from "next/link";

export default function NotFound() {
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
      <h1 style={{ fontSize: 40 }}>🛰️ 행성을 찾을 수 없어요</h1>
      <p style={{ opacity: 0.8 }}>그런 GitHub username을 찾지 못했어요.</p>
      <Link href="/">← 다른 username 시도하기</Link>
    </main>
  );
}
