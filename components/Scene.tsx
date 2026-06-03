"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { ACESFilmicToneMapping, PCFSoftShadowMap } from "three";
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
      shadows={isMobile ? false : { type: PCFSoftShadowMap }}
      // Bloom 합성 프레임 캡처용 버퍼 보존
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
        castShadow={!isMobile}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={R * 8}
        shadow-camera-left={-R * 1.6}
        shadow-camera-right={R * 1.6}
        shadow-camera-top={R * 1.6}
        shadow-camera-bottom={-R * 1.6}
        shadow-bias={-0.0005}
        shadow-normalBias={0.04}
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

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.75}
          luminanceSmoothing={0.2}
          intensity={1.1}
          mipmapBlur
        />
        <Vignette offset={0.25} darkness={0.6} eskil={false} />
      </EffectComposer>
    </Canvas>
  );
}
