"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { PlanetModel } from "@/lib/planet";
import { Planet } from "./Planet";

export default function Scene({ planet }: { planet: PlanetModel }) {
  return (
    <Canvas
      camera={{ position: [0, 0, planet.radius * 3.4], fov: 45 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={["#05060a"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 8, 4]} intensity={1.4} />
      <directionalLight position={[-6, -3, -5]} intensity={0.4} color="#88aaff" />
      <Planet planet={planet} />
      <OrbitControls
        makeDefault
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.5}
        minDistance={planet.radius * 1.6}
        maxDistance={planet.radius * 8}
      />
    </Canvas>
  );
}
