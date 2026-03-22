'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type SphereState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SphereProps {
  state: SphereState;
  audioLevel?: number; // 0-1, 마이크 음량
}

// 커스텀 쉐이더 - Siri 스타일의 노이즈 파동 구체
const vertexShader = `
  uniform float uTime;
  uniform float uNoiseStrength;
  uniform float uState; // 0=idle, 1=listening, 2=thinking, 3=speaking

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  // 3D 심플렉스 노이즈 근사 함수
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normal;
    vPosition = position;

    float speed = uState == 0.0 ? 0.3 : uState == 1.0 ? 1.5 : uState == 2.0 ? 0.8 : 2.0;
    float noise = snoise(position * 2.0 + uTime * speed);
    vNoise = noise;

    vec3 newPosition = position + normal * noise * uNoiseStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uState; // 0=idle, 1=listening, 2=thinking, 3=speaking

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vNoise;

  void main() {
    // 기본 은색 팔레트
    vec3 silverBase = vec3(0.85, 0.87, 0.90);
    vec3 silverHighlight = vec3(0.95, 0.97, 1.0);
    vec3 thinkingColor = vec3(0.5, 0.7, 1.0); // 파란빛 (thinking 상태)

    // 노이즈 기반 shimmer 효과
    float shimmer = smoothstep(-0.3, 0.5, vNoise);
    vec3 color = mix(silverBase, silverHighlight, shimmer);

    // thinking 상태: 은색 → 파란빛으로 pulse
    if (uState == 2.0) {
      float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
      color = mix(color, thinkingColor, pulse * 0.5);
    }

    // fresnel 효과로 가장자리 살짝 어둡게
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDir), 2.0);
    color = mix(color, vec3(0.6, 0.65, 0.7), fresnel * 0.3);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function SphereInner({ state, audioLevel = 0 }: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // 상태별 노이즈 강도 설정
  const noiseStrengthByState: Record<SphereState, number> = {
    idle: 0.03,
    listening: 0.08 + audioLevel * 0.15,
    thinking: 0.06,
    speaking: 0.10,
  };

  const stateIndex: Record<SphereState, number> = {
    idle: 0,
    listening: 1,
    thinking: 2,
    speaking: 3,
  };

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNoiseStrength: { value: noiseStrengthByState[state] },
      uState: { value: stateIndex[state] },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const material = meshRef.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uNoiseStrength.value = noiseStrengthByState[state];
    material.uniforms.uState.value = stateIndex[state];

    // idle: 천천히 회전
    if (state === 'idle') {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* 64×64 세그먼트: 시각 품질 유지하면서 정점 수 4배 감소 (모바일 프레임드랍 방지) */}
      <sphereGeometry args={[1.5, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function Sphere({ state, audioLevel }: SphereProps) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#aaccff" />
      <SphereInner state={state} audioLevel={audioLevel} />
    </Canvas>
  );
}
