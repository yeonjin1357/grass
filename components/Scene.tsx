"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Environment, Lightformer } from "@react-three/drei";
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
      // 캡처용 버퍼 보존. postprocessing(EffectComposer) 없을 땐 안전 — 검은 깜빡임 원인이 그거였음.
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={["#0b1a16"]} />
      <fog attach="fog" args={["#0b1a16", R * 4.5, R * 11]} />

      {/* drei <SoftShadows>(PCSS)는 three@0.184와 셰이더 비호환(unpackRGBAToDepth) → 제거.
          대신 Canvas의 내장 PCFSoftShadowMap 사용(컴파일 안전). */}
      <hemisphereLight args={["#fff4d6", "#1d4a2e", 0.7]} />
      <directionalLight
        position={[5, 7, 4]}
        intensity={isMobile ? 2.4 : 2.0}
        color="#ffe9c2"
        castShadow={!isMobile}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={R * 8}
        shadow-camera-left={-R * 1.6}
        shadow-camera-right={R * 1.6}
        shadow-camera-top={R * 1.6}
        shadow-camera-bottom={-R * 1.6}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <directionalLight position={[-6, 1, -4]} intensity={0.4} color="#9fc7ff" />
      <ambientLight intensity={0.18} />

      {/* 절차적 IBL — inline Lightformer라 원격 fetch 없음 = 캡처 안전 (EffectComposer는 플리커로 계속 off) */}
      <Environment frames={1} resolution={128}>
        <Lightformer
          form="rect"
          intensity={2.0}
          color="#ffe9c2"
          scale={[10, 10, 1]}
          position={[5, 7, 4]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#9fc7ff"
          scale={[10, 10, 1]}
          position={[-6, 2, -4]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="ring"
          intensity={0.5}
          color="#3a7d4a"
          scale={[8, 8, 1]}
          position={[0, -6, 0]}
          target={[0, 0, 0]}
        />
      </Environment>

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
    </Canvas>
  );
}
