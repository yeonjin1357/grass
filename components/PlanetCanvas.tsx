"use client";

import dynamic from "next/dynamic";
import type { PlanetModel } from "@/lib/planet";

// three.js는 import 시 document에 접근하므로 SSR 금지.
// ssr:false dynamic은 (Next 15+) 클라이언트 컴포넌트 안에서 호출해야 한다.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <div className="spinner" />
      <p style={{ opacity: 0.7, fontSize: 14 }}>행성 그리는 중…</p>
    </div>
  ),
});

export function PlanetCanvas({ planet }: { planet: PlanetModel }) {
  return <Scene planet={planet} />;
}
