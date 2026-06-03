"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { PlanetModel } from "@/lib/planet";
import { Planet } from "./Planet";

export default function Scene({ planet }: { planet: PlanetModel }) {
  return (
    <Canvas
      camera={{ position: [0, 0, planet.radius * 3.4], fov: 45 }}
      dpr={[1, 2]}
      // Bloom(EffectComposer) 합성 프레임을 캡처하려면 버퍼 보존 필요.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <color attach="background" args={["#05060a"]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 8, 4]} intensity={1.5} />
      <directionalLight position={[-6, -3, -5]} intensity={0.35} color="#6688ff" />

      <Stars radius={80} depth={40} count={2500} factor={3} saturation={0} fade speed={0.6} />

      <Planet planet={planet} />

      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={planet.radius * 1.8}
        maxDistance={planet.radius * 9}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.25}
          intensity={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  );
}
