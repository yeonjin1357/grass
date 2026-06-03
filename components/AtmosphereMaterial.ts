import { ShaderMaterial, Color, BackSide, AdditiveBlending } from "three";

/**
 * 프레넬 림 글로우 대기 셰이더 (순수·캡처 안전 — 원격 에셋 없음).
 * BackSide 구에 입혀 실루엣 가장자리가 은은히 빛나는 대기 효과.
 */
export function createAtmosphereMaterial(colorHex: string): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: BackSide,
    uniforms: {
      uColor: { value: new Color(colorHex) },
      uIntensity: { value: 0.9 },
      uPower: { value: 3.0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      void main() {
        float f = pow(1.0 - max(dot(vN, vView), 0.0), uPower);
        gl_FragColor = vec4(uColor, f * uIntensity);
      }
    `,
  });
}
