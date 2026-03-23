'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type SphereState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface SphereProps {
  state: SphereState;
  audioLevel?: number; // 0-1, 마이크 음량
}

// 미러볼 스타일 셰이더 — 노멀을 타일로 양자화해 작은 거울 조각을 시뮬레이션
const vertexShader = `
  uniform float uTime;
  uniform float uNoiseStrength;
  uniform float uState;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  // 심플렉스 노이즈 (미세한 표면 진동용)
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
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;

    // 아주 미세한 진동 (미러볼은 기본적으로 매끄러워야 함)
    float speed = uState == 1.0 ? 2.0 : uState == 3.0 ? 2.5 : 0.4;
    float noise = snoise(position * 3.0 + uTime * speed);
    vec3 newPosition = position + normal * noise * uNoiseStrength;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uState;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(-vPosition);

    // ── 미러 타일 ──────────────────────────────────────────
    // 노멀 벡터를 격자로 양자화 → 각 타일이 독립적인 평면 거울처럼 동작
    float tiles = 9.0;
    vec3 tileN = normalize(floor(n * tiles + 0.5) / tiles);

    // 타일 경계선: 양자화된 노멀과 원래 노멀의 차이로 가장자리 감지
    float edgeDist = length(n - tileN);
    float isEdge = smoothstep(0.08, 0.14, edgeDist);

    // ── 다중 광원 스펙큘러 (디스코볼 빛 점들) ─────────────
    // 회전하는 가상의 조명들 → 시간에 따라 빛 점이 이동
    float t = uTime * 0.4;
    vec3 light1 = normalize(vec3(cos(t) * 2.0, 2.5, sin(t) * 2.0));
    vec3 light2 = normalize(vec3(-cos(t * 0.7) * 2.5, 1.5, sin(t * 0.7) * 1.5));
    vec3 light3 = normalize(vec3(sin(t * 1.3) * 1.5, -1.5, cos(t * 1.3) * 2.5));
    vec3 light4 = normalize(vec3(1.5, -cos(t * 0.5) * 2.0, sin(t * 0.5) * 2.0));

    float sharpness = 180.0;
    // 각 광원마다 다른 색상 → 컬러풀한 빛 점
    vec3 spec = vec3(0.0);
    spec += pow(max(dot(reflect(-light1, tileN), viewDir), 0.0), sharpness) * vec3(1.0, 0.90, 0.80) * 4.0;
    spec += pow(max(dot(reflect(-light2, tileN), viewDir), 0.0), sharpness) * vec3(0.7, 0.85, 1.0)  * 3.0;
    spec += pow(max(dot(reflect(-light3, tileN), viewDir), 0.0), sharpness) * vec3(0.9, 1.0,  0.75) * 2.5;
    spec += pow(max(dot(reflect(-light4, tileN), viewDir), 0.0), sharpness) * vec3(1.0, 0.7,  0.9)  * 2.0;

    // ── 타일 고유 색상 (노멀 방향으로 HSV 색조 부여) ──────
    // atan2(z, x) → 수평 색조, tileN.y → 명도 변화
    float hue = atan(tileN.z, tileN.x) / 6.28318 + 0.5; // 0~1
    vec3 tileHue = vec3(
      sin(hue * 6.28318 + 0.0)   * 0.18 + 0.52,
      sin(hue * 6.28318 + 2.094) * 0.15 + 0.55,
      sin(hue * 6.28318 + 4.189) * 0.18 + 0.58
    );
    // 상하 방향으로 밝기 변화 (위=밝, 아래=어둠)
    tileHue += tileN.y * 0.08;

    vec3 darkBase   = vec3(0.03, 0.03, 0.04); // 거울 사이 어두운 틈
    vec3 mirrorBase = tileHue;                 // 컬러 타일

    // Fresnel: 가장자리는 약간 밝게
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.5);
    mirrorBase += fresnel * 0.12;

    vec3 color = mix(mirrorBase, darkBase, isEdge);

    // ── 스펙큘러 합성 ──────────────────────────────────────
    // 타일 위에만 스펙큘러 적용 (경계선은 어두움)
    float mirrorMask = 1.0 - isEdge;
    color += spec * mirrorMask;

    // ── 상태별 컬러 변조 ───────────────────────────────────
    if (uState == 1.0) {
      // listening: 파란빛 틴트
      color = mix(color, color + vec3(0.0, 0.05, 0.15), 0.6);
    } else if (uState == 2.0) {
      // thinking: 은은한 골드 펄스
      float pulse = sin(uTime * 4.0) * 0.5 + 0.5;
      color = mix(color, color + vec3(0.15, 0.10, 0.0), pulse * 0.4);
    } else if (uState == 3.0) {
      // speaking: 무지개빛 iridescence
      float wave = sin(uTime * 6.0 + vWorldPosition.y * 4.0) * 0.5 + 0.5;
      vec3 rainbow = vec3(
        sin(wave * 3.14159) * 0.3,
        sin(wave * 3.14159 + 2.094) * 0.2,
        sin(wave * 3.14159 + 4.189) * 0.3
      );
      color += rainbow * mirrorMask * 0.5;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

function SphereInner({ state, audioLevel = 0 }: SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  // 미러볼은 기본적으로 매끄러워야 하므로 noise strength 대폭 축소
  const noiseStrengthByState: Record<SphereState, number> = {
    idle:      0.004,
    listening: 0.006 + audioLevel * 0.012,
    thinking:  0.005,
    speaking:  0.008,
  };

  const stateIndex: Record<SphereState, number> = {
    idle: 0, listening: 1, thinking: 2, speaking: 3,
  };

  const uniforms = useMemo(
    () => ({
      uTime:          { value: 0 },
      uNoiseStrength: { value: noiseStrengthByState.idle },
      uState:         { value: 0 },
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

    // 항상 천천히 회전 (미러볼처럼)
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.75, 128, 128]} />
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
    <Canvas camera={{ position: [0, 0, 3], fov: 40 }}>
      <ambientLight intensity={0.1} />
      <pointLight position={[3, 4, 3]}  intensity={2}   color="#ffffff" />
      <pointLight position={[-4, 2, 2]} intensity={1.5} color="#c0d8ff" />
      <pointLight position={[0, -3, 4]} intensity={1}   color="#ffd0c0" />
      <SphereInner state={state} audioLevel={audioLevel} />
    </Canvas>
  );
}
