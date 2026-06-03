"use client";

import dynamic from "next/dynamic";
import type { PlanetModel } from "@/lib/planet";

// three.js는 import 시 document에 접근하므로 SSR 금지.
// ssr:false dynamic은 (Next 15+) 클라이언트 컴포넌트 안에서 호출해야 한다.
const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

export function PlanetCanvas({ planet }: { planet: PlanetModel }) {
  return <Scene planet={planet} />;
}
