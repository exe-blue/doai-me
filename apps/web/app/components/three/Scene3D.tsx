'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ============================================
// Floating Sphere Component
// ============================================

function FloatingSphere({ 
  position, 
  scale = 1, 
  color = '#FBBF24',
  speed = 1,
  distort = 0.3
}: { 
  position: [number, number, number]; 
  scale?: number;
  color?: string;
  speed?: number;
  distort?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * speed * 0.3) * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.1;
    }
  });

  return (
    <Float
      speed={speed}
      rotationIntensity={0.5}
      floatIntensity={1}
    >
      <mesh ref={meshRef} position={position} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.6}
          distort={distort}
          speed={2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </Float>
  );
}

// ============================================
// Floating Torus Component
// ============================================

function FloatingTorus({ 
  position, 
  scale = 1, 
  color = '#FBBF24',
  speed = 1
}: { 
  position: [number, number, number]; 
  scale?: number;
  color?: string;
  speed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * speed * 0.2;
      meshRef.current.rotation.y = state.clock.elapsedTime * speed * 0.3;
    }
  });

  return (
    <Float speed={speed * 0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <torusGeometry args={[1, 0.3, 32, 100]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.4}
          roughness={0.3}
          metalness={0.9}
        />
      </mesh>
    </Float>
  );
}

// ============================================
// Particles Component
// ============================================

function Particles({ count = 100, isDark = false }: { count?: number; isDark?: boolean }) {
  const points = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={isDark ? '#FBBF24' : '#D97706'}
        transparent
        opacity={isDark ? 0.6 : 0.4}
        sizeAttenuation
      />
    </points>
  );
}

// ============================================
// Grid Plane
// ============================================

function GridPlane({ isDark = false }: { isDark?: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, 0]}>
      <planeGeometry args={[50, 50, 50, 50]} />
      <meshBasicMaterial
        color={isDark ? '#1a1a1a' : '#f0f0f0'}
        wireframe
        transparent
        opacity={isDark ? 0.1 : 0.15}
      />
    </mesh>
  );
}

// ============================================
// Camera Controller
// ============================================

function CameraController() {
  const { camera } = useThree();
  
  useFrame((state) => {
    // 마우스 위치에 따른 미세한 카메라 이동
    const x = (state.mouse.x * 0.5);
    const y = (state.mouse.y * 0.3);
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, x, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, y + 2, 0.05);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ============================================
// Main Scene Component
// ============================================

function SceneContent({ isDark = false }: { isDark?: boolean }) {
  const primaryColor = '#FBBF24';
  const secondaryColor = isDark ? '#a78bfa' : '#8b5cf6';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isDark ? 0.3 : 0.6} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={isDark ? 0.5 : 1} 
        color={isDark ? '#ffffff' : '#fffbeb'}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color={primaryColor} />

      {/* Camera Controller */}
      <CameraController />

      {/* Main Spheres */}
      <FloatingSphere 
        position={[-3, 1, -2]} 
        scale={1.5} 
        color={primaryColor}
        speed={0.8}
        distort={0.4}
      />
      <FloatingSphere 
        position={[3, -1, -3]} 
        scale={1} 
        color={secondaryColor}
        speed={1.2}
        distort={0.3}
      />
      <FloatingSphere 
        position={[0, 2, -5]} 
        scale={0.8} 
        color={isDark ? '#f0f0f0' : '#374151'}
        speed={0.6}
        distort={0.2}
      />

      {/* Torus */}
      <FloatingTorus 
        position={[4, 2, -4]} 
        scale={0.6} 
        color={primaryColor}
        speed={0.5}
      />

      {/* Particles */}
      <Particles count={150} isDark={isDark} />

      {/* Grid */}
      <GridPlane isDark={isDark} />

      {/* Environment */}
      <Environment preset={isDark ? 'night' : 'city'} />
    </>
  );
}

// ============================================
// Exported Component
// ============================================

export default function Scene3D({ isDark = false }: { isDark?: boolean }) {
  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        style={{ 
          background: 'transparent',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <Suspense fallback={null}>
          <SceneContent isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  );
}

// ============================================
// Minimal Background Version (Performance)
// ============================================

export function Scene3DMinimal({ isDark = false }: { isDark?: boolean }) {
  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ 
          antialias: false,
          alpha: true,
          powerPreference: 'low-power'
        }}
        style={{ 
          background: 'transparent',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <Particles count={80} isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  );
}

