"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { ACESFilmicToneMapping } from "three";
import type { PlanetModel } from "@/lib/planet";
import { Planet } from "./Planet";

export default function Scene({ planet }: { planet: PlanetModel }) {
  const R = planet.radius;
  return (
    <Canvas
      // 살짝 위에서 내려다보는 각 → "행성"으로 즉시 읽힘
      camera={{ position: [0, R * 0.6, R * 3.2], fov: 42 }}
      dpr={[1, 2]}
      // Bloom 합성 프레임 캡처용 버퍼 보존
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      {/* 딥 포레스트 틸 배경 + 포그(깊이감) — 순흑 금지 */}
      <color attach="background" args={["#0b1a16"]} />
      <fog attach="fog" args={["#0b1a16", R * 4.5, R * 11]} />

      {/* HDRI 없이 야외광: 따뜻한 하늘 + 초록 대지 바운스 */}
      <hemisphereLight args={["#fff4d6", "#1d4a2e", 0.9]} />
      {/* key: 골든아워 태양 */}
      <directionalLight position={[5, 7, 4]} intensity={2.2} color="#ffe9c2" />
      {/* fill: 그림자면이 새카맣지 않게 차가운 보조광 */}
      <directionalLight position={[-6, 1, -4]} intensity={0.55} color="#9fc7ff" />
      <ambientLight intensity={0.25} />

      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.5} />

      <Planet planet={planet} />

      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={R * 1.8}
        maxDistance={R * 9}
      />

      {/* 골드 블라썸만 발광하도록 threshold 높게 */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.75}
          luminanceSmoothing={0.2}
          intensity={1.1}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
