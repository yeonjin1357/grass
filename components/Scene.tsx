"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { ACESFilmicToneMapping } from "three";
import type { PlanetModel } from "@/lib/planet";
import { Planet } from "./Planet";

export default function Scene({ planet }: { planet: PlanetModel }) {
  const R = planet.radius;
  const isMobile = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches,
    [],
  );

  return (
    <Canvas
      camera={{ position: [0, R * 0.5, R * 4.2], fov: 40 }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      // 캡처용 버퍼 보존. postprocessing 없을 땐 안전(검은 깜빡임 원인은 EffectComposer였고 제거함).
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#0b1a16"]} />
      <fog attach="fog" args={["#0b1a16", R * 4.5, R * 11]} />

      <hemisphereLight args={["#fff4d6", "#1d4a2e", 0.85]} />
      <directionalLight
        position={[5, 7, 4]}
        intensity={isMobile ? 2.6 : 2.2}
        color="#ffe9c2"
      />
      <directionalLight position={[-6, 1, -4]} intensity={0.5} color="#9fc7ff" />
      <ambientLight intensity={0.32} />

      <Stars
        radius={80}
        depth={40}
        count={isMobile ? 700 : 1200}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      <Planet planet={planet} isMobile={isMobile} />

      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={R * 1.8}
        maxDistance={R * 9}
      />
      {/* [플리커 진단] EffectComposer(Bloom+Vignette) 일시 제거 — postprocessing이 범인인지 확인 */}
    </Canvas>
  );
}
