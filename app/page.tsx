import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        padding: 24,
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 52 }}>🪐 grass</h1>
      <p style={{ maxWidth: 460, opacity: 0.8, lineHeight: 1.6, fontSize: 18 }}>
        GitHub username을 넣으면, 1년 기여도(잔디)가 살아있는 행성이 됩니다.
      </p>
      <UsernameForm />
      <p style={{ opacity: 0.4, fontSize: 13 }}>예: torvalds, gaearon, sindresorhus</p>
    </main>
  );
}
