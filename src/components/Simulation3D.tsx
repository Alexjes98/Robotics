import React, { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import { useSimulator, type RoboticComponent } from '../hooks/useSimulator';
import { RotateCcw, Video, Sun, Move, Cpu, Layers, ChevronDown, ChevronUp, Upload, Trash2 } from 'lucide-react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// --- LED Colors 3D Hex Mapping ---
const get3DColorHex = (colorName?: string) => {
  switch (colorName) {
    case 'green': return '#10b981';
    case 'blue': return '#3b82f6';
    case 'yellow': return '#eab308';
    case 'white': return '#ffffff';
    default: return '#f43f5e'; // red
  }
};

// --- Reusable 3D Label Component with Minimal / Full / Hidden modes ---
const Comp3DLabel: React.FC<{
  label: string;
  detail?: string;
  color?: string;
  position?: [number, number, number];
  mode: 'full' | 'minimal' | 'hidden';
}> = ({ label, detail, color = '#38bdf8', position = [0, 0.08, 0], mode }) => {
  const [hovered, setHovered] = useState(false);
  if (mode === 'hidden') return null;
  const isCompact = mode === 'minimal' && !hovered;

  return (
    <Html position={position} center distanceFactor={4}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: isCompact ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.85)',
          color: color,
          border: `1px solid ${color}${isCompact ? '80' : '40'}`,
          borderRadius: isCompact ? '50%' : '4px',
          width: isCompact ? '14px' : 'auto',
          height: isCompact ? '14px' : 'auto',
          padding: isCompact ? '0' : '1px 5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isCompact ? '9px' : '8px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          boxShadow: isCompact ? `0 0 6px ${color}80` : '0 2px 4px rgba(0,0,0,0.4)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          pointerEvents: 'auto',
          zIndex: hovered ? 10 : 1
        }}
        title={`${label}${detail ? ` (${detail})` : ''}`}
      >
        {isCompact ? '•' : `${label}${detail ? ` (${detail})` : ''}`}
      </div>
    </Html>
  );
};

// --- Spin Wheel and Cylinder mesh for motors ---
const MotorWheel: React.FC<{
  comp: RoboticComponent;
  speed: number;
  isRunning: boolean;
  labelMode: 'full' | 'minimal' | 'hidden';
  hasWheelAttached: boolean;
}> = ({ comp, speed, isRunning, labelMode, hasWheelAttached }) => {
  const wheelRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (isRunning && wheelRef.current && speed !== 0) {
      wheelRef.current.rotation.x += (speed / 255) * 10 * delta;
    }
  });

  return (
    <group>
      {/* Motor casing block */}
      <mesh castShadow>
        <boxGeometry args={[0.08, 0.08, 0.12]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>
      {/* Actuator shaft */}
      <mesh position={[comp.x3d < 0 ? -0.05 : 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      {/* Driving wheel (renders if attached) */}
      {hasWheelAttached ? (
        <mesh ref={wheelRef} position={[comp.x3d < 0 ? -0.08 : 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
          <meshStandardMaterial color="#0f172a" roughness={0.9} />
          {/* Hubcap visualizer line */}
          <mesh position={[0, 0.045, 0]}>
            <boxGeometry args={[0.04, 0.01, 0.2]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </mesh>
      ) : (
        /* Bare axle collar if no wheel attached */
        <mesh position={[comp.x3d < 0 ? -0.08 : 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} />
        </mesh>
      )}
      <Comp3DLabel
        label={comp.x3d < 0 ? 'Motor L' : 'Motor R'}
        detail={hasWheelAttached ? `${speed} RPM` : 'No Wheel'}
        color="#f59e0b"
        position={[0, 0.26, 0]}
        mode={labelMode}
      />
    </group>
  );
};

// --- Inner 3D Component to get access to R3F hooks (useFrame, etc) ---
const RobotModel: React.FC = () => {
  const {
    components,
    isRunning,
    ledOn,
    robotPos,
    robotHeading,
    sensorDistance,
    lightLevel,
    ledPowerStates,
    motorPowerStates,
    selected3DId,
    setSelected3DId,
    labelMode3D,
    customMesh,
    setButtonState
  } = useSimulator();

  const robotGroupRef = useRef<THREE.Group>(null);

  // Parse and normalize custom mesh if provided
  const customChassisData = useMemo(() => {
    if (!customMesh) return null;
    try {
      if (customMesh.type === 'stl') {
        const loader = new STLLoader();
        const geo = loader.parse(customMesh.content as ArrayBuffer);
        geo.computeVertexNormals();
        geo.center();
        geo.computeBoundingBox();
        if (geo.boundingBox) {
          const sz = new THREE.Vector3();
          geo.boundingBox.getSize(sz);
          const maxDim = Math.max(sz.x, sz.y, sz.z);
          if (maxDim > 0) {
            const scale = 0.85 / maxDim;
            geo.scale(scale, scale, scale);
          }
        }
        return { type: 'geometry' as const, data: geo };
      } else if (customMesh.type === 'obj') {
        const loader = new OBJLoader();
        const group = loader.parse(customMesh.content as string);
        const box = new THREE.Box3().setFromObject(group);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        const center = new THREE.Vector3();
        box.getCenter(center);
        group.position.sub(center);
        const maxDim = Math.max(sz.x, sz.y, sz.z);
        if (maxDim > 0) {
          const scale = 0.85 / maxDim;
          group.scale.set(scale, scale, scale);
        }
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            m.material = new THREE.MeshStandardMaterial({
              color: '#334155',
              roughness: 0.4,
              metalness: 0.6
            });
          }
        });
        return { type: 'group' as const, data: group };
      }
    } catch (err) {
      console.error('Failed to parse custom mesh', err);
    }
    return null;
  }, [customMesh]);

  const hasWheelComponents = components.some(c => c.type === 'wheel');

  // Return specific bounding box dimensions for components selection overlay
  const getOutlineSize = (type: string): [number, number, number] => {
    switch (type) {
      case 'arduino': return [0.3, 0.08, 0.4];
      case 'hbridge': return [0.24, 0.08, 0.22];
      case 'battery': return [0.18, 0.16, 0.14];
      case 'motor': return [0.24, 0.28, 0.28];
      case 'sensor': return [0.24, 0.12, 0.08];
      case 'led': return [0.1, 0.1, 0.1];
      case 'ldr': return [0.1, 0.04, 0.1];
      case 'breadboard': return [0.52, 0.04, 0.42];
      case 'resistor': return [0.28, 0.06, 0.06];
      case 'spst': return [0.18, 0.1, 0.14];
      case 'spdt': return [0.2, 0.1, 0.14];
      case 'l293d': return [0.24, 0.06, 0.12];
      case 'button': return [0.12, 0.06, 0.12];
      case 'potentiometer': return [0.14, 0.12, 0.14];
      case 'oscilloscope': return [0.34, 0.22, 0.18];
      case 'wheel': return [0.12, 0.46, 0.46];
      default: return [0.2, 0.2, 0.2];
    }
  };

  return (
    <group
      ref={robotGroupRef}
      position={robotPos}
      rotation={[0, robotHeading, 0]}
    >
      {/* 3D Base Robot Chassis Plate (or Custom Mesh if loaded) */}
      {customChassisData ? (
        customChassisData.type === 'geometry' ? (
          <mesh geometry={customChassisData.data} castShadow receiveShadow>
            <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.6} />
          </mesh>
        ) : (
          <primitive object={customChassisData.data} />
        )
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.06, 0.8]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} transparent opacity={0.6} />
        </mesh>
      )}

      {/* Label: Chassis Base */}
      <Comp3DLabel
        label="Robot Base Chassis"
        detail={customMesh ? customMesh.name : 'Anchor'}
        color="#38bdf8"
        position={[0, -0.06, 0]}
        mode={labelMode3D}
      />

      {/* Caster Wheel front (Static pivot) */}
      <mesh position={[0, -0.1, 0.3]} castShadow>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} />
      </mesh>

      {/* Map through all dynamically placed components */}
      {components.map(comp => {
        const isSelected = selected3DId === comp.id;
        const outlineBox = getOutlineSize(comp.type);

        return (
          <group
            key={comp.id}
            position={[comp.x3d, comp.y3d, comp.z3d]}
            rotation={[comp.rx3d, comp.ry3d, comp.rz3d]}
            onClick={(e) => {
              e.stopPropagation();
              setSelected3DId(comp.id);
            }}
          >
            {/* Outline wireframe selector */}
            {isSelected && (
              <mesh>
                <boxGeometry args={outlineBox} />
                <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.6} />
              </mesh>
            )}

            {/* Arduino Uno R3 3D */}
            {comp.type === 'arduino' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.25, 0.03, 0.35]} />
                  <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="Uno R3"
                  color="#60a5fa"
                  position={[0, 0.08, 0]}
                  mode={labelMode3D}
                />
                {/* Built-in LED */}
                <mesh position={[-0.08, 0.02, 0.1]} castShadow>
                  <sphereGeometry args={[0.015, 8, 8]} />
                  <meshBasicMaterial color={ledOn ? '#10b981' : '#ef4444'} />
                  {ledOn && (
                    <pointLight color="#10b981" intensity={1.2} distance={0.4} />
                  )}
                </mesh>
              </>
            )}

            {/* H-Bridge Driver Module (L298N) 3D */}
            {comp.type === 'hbridge' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.2, 0.05, 0.18]} />
                  <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="L298N"
                  color="#f87171"
                  position={[0, 0.08, 0]}
                  mode={labelMode3D}
                />
              </>
            )}

            {/* Battery 9V 3D */}
            {comp.type === 'battery' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.1]} />
                  <meshStandardMaterial color="#111827" roughness={0.8} />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="9V DC"
                  color="#9ca3af"
                  position={[0, 0.1, 0]}
                  mode={labelMode3D}
                />
              </>
            )}

            {/* DC Motor 3D */}
            {comp.type === 'motor' && (
              <MotorWheel
                comp={comp}
                speed={motorPowerStates[comp.id] || 0}
                isRunning={isRunning}
                labelMode={labelMode3D}
                hasWheelAttached={!hasWheelComponents || components.some(c => c.type === 'wheel' && c.attachedMotorId === comp.id)}
              />
            )}

            {/* Ultrasonic Sensor (HC-SR04) 3D */}
            {comp.type === 'sensor' && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.2, 0.08, 0.02]} />
                  <meshStandardMaterial color="#065f46" />
                </mesh>
                <mesh position={[-0.05, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
                  <meshStandardMaterial color="#475569" roughness={0.4} />
                </mesh>
                <mesh position={[0.05, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
                  <meshStandardMaterial color="#475569" roughness={0.4} />
                </mesh>

                {/* Ultrasonic Sonar Cone Visualizer */}
                {isRunning && (
                  <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
                    <coneGeometry args={[0.3, 1.0, 16, 1, true]} />
                    <meshBasicMaterial
                      color="#fbbf24"
                      transparent
                      opacity={0.1}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                )}
                <Comp3DLabel
                  label={comp.label}
                  detail={`${sensorDistance}cm`}
                  color="#fbbf24"
                  position={[0, 0.1, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* LED Indicator 3D */}
            {comp.type === 'led' && (() => {
              const isPowered = ledPowerStates[comp.id] === 'powered';
              const isBlown = ledPowerStates[comp.id] === 'blown';
              const baseColor = get3DColorHex(comp.color);

              return (
                <group>
                  <mesh castShadow position={[0, -0.015, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
                    <meshStandardMaterial color="#64748b" metalness={0.7} />
                  </mesh>
                  <mesh castShadow position={[0, 0.015, 0]}>
                    <sphereGeometry args={[0.035, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshStandardMaterial
                      color={isBlown ? '#334155' : baseColor}
                      roughness={0.1}
                      transparent
                      opacity={isPowered ? 0.95 : 0.65}
                      emissive={isBlown ? '#000000' : baseColor}
                      emissiveIntensity={isPowered ? 300.0 : 0.0}
                    />
                  </mesh>
                  {isPowered && (
                    <pointLight color={baseColor} intensity={2} distance={0.9} />
                  )}
                  <Comp3DLabel
                    label={comp.label}
                    detail={isBlown ? 'BLOWN' : isPowered ? 'ON' : 'OFF'}
                    color={isBlown ? '#ef4444' : baseColor}
                    position={[0, 0.08, 0]}
                    mode={labelMode3D}
                  />
                </group>
              );
            })()}

            {/* LDR Light Sensor 3D */}
            {comp.type === 'ldr' && (
              <group>
                <mesh castShadow>
                  <cylinderGeometry args={[0.04, 0.04, 0.012, 16]} />
                  <meshStandardMaterial color="#ea580c" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.008, 0]}>
                  <boxGeometry args={[0.05, 0.002, 0.008]} />
                  <meshBasicMaterial color="#fb923c" />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail={`${lightLevel}`}
                  color="#fb923c"
                  position={[0, 0.06, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* Resistor 3D */}
            {comp.type === 'resistor' && (
              <group>
                <mesh castShadow position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                </mesh>
                <mesh castShadow position={[0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.005, 0.005, 0.12, 8]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                </mesh>
                <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.02, 0.02, 0.14, 12]} />
                  <meshStandardMaterial color="#fef08a" roughness={0.4} />
                </mesh>
                <mesh position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.021, 0.021, 0.012, 12]} />
                  <meshBasicMaterial color="#ef4444" />
                </mesh>
                <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.021, 0.021, 0.012, 12]} />
                  <meshBasicMaterial color="#ef4444" />
                </mesh>
                <mesh position={[0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.021, 0.021, 0.012, 12]} />
                  <meshBasicMaterial color="#78350f" />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="220Ω"
                  color="#94a3b8"
                  position={[0, 0.06, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* SPST Switch 3D */}
            {comp.type === 'spst' && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.16, 0.08, 0.12]} />
                  <meshStandardMaterial color="#334155" roughness={0.6} />
                </mesh>
                <group position={[0, 0.04, 0]} rotation={[comp.state === 'closed' ? 0 : 0.6, 0, 0]}>
                  <mesh castShadow position={[0, 0.03, 0]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                  </mesh>
                  <mesh castShadow position={[0, 0.06, 0]}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshBasicMaterial color="#ef4444" />
                  </mesh>
                </group>
                <Comp3DLabel
                  label={comp.label}
                  detail={comp.state === 'closed' ? 'CLOSED' : 'OPEN'}
                  color={comp.state === 'closed' ? '#4ade80' : '#f87171'}
                  position={[0, 0.15, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* SPDT Switch 3D */}
            {comp.type === 'spdt' && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.18, 0.08, 0.12]} />
                  <meshStandardMaterial color="#475569" roughness={0.6} />
                </mesh>
                <group position={[0, 0.04, 0]} rotation={[0, 0, comp.state === 'L2' ? 0.5 : -0.5]}>
                  <mesh castShadow position={[0, 0.03, 0]}>
                    <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                  </mesh>
                  <mesh castShadow position={[0, 0.06, 0]}>
                    <sphereGeometry args={[0.015, 8, 8]} />
                    <meshBasicMaterial color="#fbbf24" />
                  </mesh>
                </group>
                <Comp3DLabel
                  label={comp.label}
                  detail={comp.state === 'L2' ? 'COM➔L2' : 'COM➔L1'}
                  color="#38bdf8"
                  position={[0, 0.15, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* Half-Size Breadboard 3D */}
            {comp.type === 'breadboard' && (
              <group>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[0.5, 0.015, 0.4]} />
                  <meshStandardMaterial color="#f8fafc" roughness={0.85} />
                </mesh>
                <mesh position={[0, 0.008, 0]}>
                  <boxGeometry args={[0.48, 0.002, 0.38]} />
                  <meshStandardMaterial color="#e2e8f0" roughness={1.0} />
                </mesh>
                <mesh position={[-0.2, 0.009, 0]}>
                  <boxGeometry args={[0.006, 0.001, 0.36]} />
                  <meshBasicMaterial color="#f87171" />
                </mesh>
                <mesh position={[-0.18, 0.009, 0]}>
                  <boxGeometry args={[0.006, 0.001, 0.36]} />
                  <meshBasicMaterial color="#60a5fa" />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="400pts"
                  color="#94a3b8"
                  position={[0, 0.08, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* L293D DIP-16 Driver IC 3D */}
            {comp.type === 'l293d' && (
              <group>
                {/* DIP-16 Body */}
                <mesh castShadow>
                  <boxGeometry args={[0.22, 0.035, 0.09]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.7} />
                </mesh>
                {/* Pin 1 notch dot */}
                <mesh position={[-0.09, 0.02, 0]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.005, 12]} />
                  <meshBasicMaterial color="#334155" />
                </mesh>
                {/* Silkscreen text strip */}
                <mesh position={[0.01, 0.02, 0]}>
                  <boxGeometry args={[0.12, 0.001, 0.04]} />
                  <meshStandardMaterial color="#94a3b8" roughness={0.3} />
                </mesh>
                {/* Dual inline pins - 8 per side */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <group key={i} position={[-0.08 + i * 0.023, -0.02, 0]}>
                    <mesh position={[0, 0, 0.055]}>
                      <boxGeometry args={[0.008, 0.025, 0.02]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 0, -0.055]}>
                      <boxGeometry args={[0.008, 0.025, 0.02]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                    </mesh>
                  </group>
                ))}
                <Comp3DLabel
                  label={comp.label}
                  detail="L293D Quad-H"
                  color="#38bdf8"
                  position={[0, 0.08, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* Tactile Push Button 3D */}
            {comp.type === 'button' && (() => {
              const isPressed = comp.state === 'closed';
              return (
                <group
                  onClick={(e) => {
                    e.stopPropagation();
                    setButtonState(comp.id, !isPressed);
                  }}
                >
                  <mesh castShadow>
                    <boxGeometry args={[0.1, 0.03, 0.1]} />
                    <meshStandardMaterial color="#334155" roughness={0.5} />
                  </mesh>
                  <mesh position={[0, 0.016, 0]}>
                    <boxGeometry args={[0.09, 0.002, 0.09]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.8} />
                  </mesh>
                  {[[-0.045, -0.045], [0.045, -0.045], [-0.045, 0.045], [0.045, 0.045]].map(([lx, lz], i) => (
                    <mesh key={i} position={[lx, -0.02, lz]}>
                      <boxGeometry args={[0.012, 0.02, 0.012]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                    </mesh>
                  ))}
                  <mesh position={[0, isPressed ? 0.02 : 0.03, 0]} castShadow>
                    <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
                    <meshStandardMaterial color={isPressed ? '#991b1b' : '#ef4444'} roughness={0.3} />
                  </mesh>
                  <Comp3DLabel
                    label={comp.label}
                    detail={isPressed ? 'PRESSED' : 'RELEASED'}
                    color={isPressed ? '#ef4444' : '#94a3b8'}
                    position={[0, 0.08, 0]}
                    mode={labelMode3D}
                  />
                </group>
              );
            })()}

            {/* Rotary Potentiometer 3D */}
            {comp.type === 'potentiometer' && (() => {
              const potVal = parseInt(comp.state || '512', 10);
              const rotAngle = ((potVal / 1023) * 270 - 135) * (Math.PI / 180);
              return (
                <group>
                  <mesh castShadow position={[0, 0.02, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 0.04, 24]} />
                    <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0.045, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 0.015, 16]} />
                    <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                  </mesh>
                  <group position={[0, 0.065, 0]} rotation={[0, -rotAngle, 0]}>
                    <mesh castShadow>
                      <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
                    </mesh>
                    <mesh position={[0, 0.01, 0.016]}>
                      <boxGeometry args={[0.005, 0.02, 0.01]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                  </group>
                  {[-0.03, 0, 0.03].map((tx, idx) => (
                    <mesh key={idx} position={[tx, -0.01, -0.05]}>
                      <boxGeometry args={[0.01, 0.02, 0.02]} />
                      <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                    </mesh>
                  ))}
                  <Comp3DLabel
                    label={comp.label}
                    detail={`${potVal} (${Math.round((potVal / 1023) * 100)}%)`}
                    color="#38bdf8"
                    position={[0, 0.12, 0]}
                    mode={labelMode3D}
                  />
                </group>
              );
            })()}

            {/* Benchtop Oscilloscope 3D */}
            {comp.type === 'oscilloscope' && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.3, 0.18, 0.14]} />
                  <meshStandardMaterial color="#1e293b" roughness={0.6} />
                </mesh>
                <mesh position={[0, 0, 0.071]}>
                  <boxGeometry args={[0.28, 0.16, 0.005]} />
                  <meshStandardMaterial color="#334155" roughness={0.4} />
                </mesh>
                <mesh position={[-0.04, 0.02, 0.075]}>
                  <planeGeometry args={[0.16, 0.11]} />
                  <meshStandardMaterial color="#064e3b" roughness={0.1} emissive="#065f46" emissiveIntensity={0.5} />
                </mesh>
                <mesh position={[0.09, 0.04, 0.077]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
                  <meshStandardMaterial color="#64748b" metalness={0.7} />
                </mesh>
                <mesh position={[0.09, 0, 0.077]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.01, 12]} />
                  <meshStandardMaterial color="#64748b" metalness={0.7} />
                </mesh>
                <mesh position={[0.09, -0.04, 0.077]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.01, 0.01, 0.01, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="DSO 100MHz"
                  color="#10b981"
                  position={[0, 0.14, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}

            {/* Attachable Wheel 3D (Rendered only when not attached to motor) */}
            {comp.type === 'wheel' && !comp.attachedMotorId && (
              <group>
                <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
                  <meshStandardMaterial color="#0f172a" roughness={0.9} />
                  <mesh position={[0, 0.045, 0]}>
                    <boxGeometry args={[0.04, 0.01, 0.2]} />
                    <meshBasicMaterial color="#38bdf8" />
                  </mesh>
                </mesh>
                <Comp3DLabel
                  label={comp.label}
                  detail="Unattached"
                  color="#38bdf8"
                  position={[0, 0.26, 0]}
                  mode={labelMode3D}
                />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// --- Camera Management Component to track follow mode ---
const CameraController: React.FC<{ followMode: boolean }> = ({ followMode }) => {
  const { robotPos, robotHeading } = useSimulator();
  const { camera } = useThree();

  useFrame(() => {
    if (followMode) {
      const distance = 2.5;
      const height = 1.4;

      const angle = robotHeading;
      const targetCamX = robotPos[0] - distance * Math.sin(angle);
      const targetCamZ = robotPos[2] - distance * Math.cos(angle);
      const targetCamY = robotPos[1] + height;

      camera.position.x += (targetCamX - camera.position.x) * 0.08;
      camera.position.z += (targetCamZ - camera.position.z) * 0.08;
      camera.position.y += (targetCamY - camera.position.y) * 0.08;

      const lookAtTarget = new THREE.Vector3(
        robotPos[0] + 0.3 * Math.sin(angle),
        robotPos[1],
        robotPos[2] + 0.3 * Math.cos(angle)
      );
      camera.lookAt(lookAtTarget);
    }
  });

  return null;
};

// --- Main 3D Simulation Panel ---
export const Simulation3D: React.FC = () => {
  const {
    components,
    isRunning,
    lightLevel,
    setLightLevel,
    resetRobotPos,
    obstaclePos,
    setObstaclePos,
    selected3DId,
    setSelected3DId,
    update3DPosition,
    updateComponentColor,
    labelMode3D,
    setLabelMode3D,
    isWelderPanelOpen,
    setIsWelderPanelOpen,
    isEnvPanelOpen,
    setIsEnvPanelOpen,
    customMesh,
    setCustomMesh
  } = useSimulator();

  const [followCamera, setFollowCamera] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedComp = components.find(c => c.id === selected3DId);

  const handleObstacleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setObstaclePos([obstaclePos[0], obstaclePos[1], val]);
  };

  const handleMeshUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isStl = file.name.toLowerCase().endsWith('.stl');
    const isObj = file.name.toLowerCase().endsWith('.obj');
    if (!isStl && !isObj) {
      alert('Please upload an STL (.stl) or Wavefront OBJ (.obj) 3D file.');
      return;
    }
    const reader = new FileReader();
    if (isStl) {
      reader.onload = () => {
        if (reader.result) {
          setCustomMesh({ type: 'stl', content: reader.result as ArrayBuffer, name: file.name });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCustomMesh({ type: 'obj', content: reader.result, name: file.name });
        }
      };
      reader.readAsText(file);
    }
  };

  const cycleLabelMode = () => {
    if (labelMode3D === 'full') setLabelMode3D('minimal');
    else if (labelMode3D === 'minimal') setLabelMode3D('hidden');
    else setLabelMode3D('full');
  };

  return (
    <div className="workspace-3d" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 3D Panel Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(13,15,19,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 5
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} style={{ color: 'var(--accent-blue)' }} />
          3D ROBOT SIMULATION REAL-TIME
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 3-Way Label Mode Toggle */}
          <button
            className={`btn btn-outline btn-sm ${labelMode3D !== 'hidden' ? 'btn-primary' : ''}`}
            onClick={cycleLabelMode}
            title="Cycle labels: Full ➔ Minimal (dots) ➔ Hidden"
            style={{ fontSize: '0.75rem', height: '28px' }}
          >
            {labelMode3D === 'full' && 'Labels: Full'}
            {labelMode3D === 'minimal' && 'Labels: Minimal'}
            {labelMode3D === 'hidden' && 'Labels: Hidden'}
          </button>
          <button
            className={`btn btn-outline btn-sm ${followCamera ? 'btn-primary' : ''}`}
            onClick={() => setFollowCamera(!followCamera)}
            title="Lock camera to follow the robot"
            style={{ fontSize: '0.75rem', height: '28px' }}
          >
            <Video size={13} />
            {followCamera ? 'Follow: ON' : 'Follow: OFF'}
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={resetRobotPos}
            title="Reset robot position"
            style={{ fontSize: '0.75rem', height: '28px' }}
          >
            <RotateCcw size={13} />
            Reset Pos
          </button>
        </div>
      </div>

      {/* Left-side HUD 3D Welder Controller Panel (Collapsible) */}
      {!isWelderPanelOpen ? (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setIsWelderPanelOpen(true)}
          style={{
            position: 'absolute',
            top: '60px',
            left: '12px',
            zIndex: 5,
            background: 'rgba(20, 23, 29, 0.9)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontSize: '0.75rem'
          }}
          title="Open 3D Welder & Assembly Panel"
        >
          <Cpu size={14} style={{ color: 'var(--accent-green)' }} />
          <span>3D Welder</span>
          <ChevronDown size={14} />
        </button>
      ) : (
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '12px',
          zIndex: 5,
          width: '280px',
          maxHeight: 'calc(100% - 80px)',
          overflowY: 'auto',
          padding: '16px',
          background: 'rgba(20, 23, 29, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--border-light)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          color: 'var(--text-primary)'
        }}>
          {/* Header with collapse toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
              <Cpu size={14} style={{ color: 'var(--accent-green)' }} />
              <span>3D ASSEMBLY & WELDER</span>
            </div>
            <button
              onClick={() => setIsWelderPanelOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Minimize panel"
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {/* Custom Mesh Loading Section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '8px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Chassis Mesh (.STL/.OBJ)
              </span>
              {customMesh && (
                <button
                  onClick={() => setCustomMesh(null)}
                  title="Reset to default chassis"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <input
              type="file"
              accept=".stl,.obj"
              ref={fileInputRef}
              onChange={handleMeshUpload}
              style={{ display: 'none' }}
            />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: '0.7rem', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Upload size={12} />
              {customMesh ? `Mesh: ${customMesh.name.slice(0, 14)}...` : 'Load Custom Mesh'}
            </button>
          </div>

          {/* Component Selection Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Select Component to Position:</label>
            <select
              value={selected3DId || ''}
              onChange={(e) => setSelected3DId(e.target.value || null)}
              style={{
                background: '#0d0f13',
                border: '1px solid var(--border-light)',
                color: 'var(--text-primary)',
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Choose Component --</option>
              {components.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          {selectedComp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                Adjust local offsets on chassis:
              </div>

              {/* LED Color Picker HUD */}
              {selectedComp.type === 'led' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
                  <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>LED Bulb Color:</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                    {['red', 'green', 'blue', 'yellow', 'white'].map(cName => {
                      const cHex = get3DColorHex(cName);
                      const isActive = selectedComp.color === cName;
                      return (
                        <button
                          key={cName}
                          onClick={() => updateComponentColor(selectedComp.id, cName as any)}
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: cHex,
                            border: isActive ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                            boxShadow: isActive ? `0 0 6px ${cHex}` : 'none',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease',
                            transform: isActive ? 'scale(1.15)' : 'none'
                          }}
                          title={cName.toUpperCase()}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sliders for offsets */}
              {[
                { label: 'Position X', field: 'x3d', min: -1.0, max: 1.0, step: 0.02 },
                { label: 'Position Y', field: 'y3d', min: -0.2, max: 0.8, step: 0.01 },
                { label: 'Position Z', field: 'z3d', min: -1.0, max: 1.0, step: 0.02 },
                { label: 'Rotate Pitch (X)', field: 'rx3d', min: -Math.PI, max: Math.PI, step: 0.05 },
                { label: 'Rotate Yaw (Y)', field: 'ry3d', min: -Math.PI, max: Math.PI, step: 0.05 },
                { label: 'Rotate Roll (Z)', field: 'rz3d', min: -Math.PI, max: Math.PI, step: 0.05 },
              ].map(slider => (
                <div key={slider.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{slider.label}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {selectedComp[slider.field as keyof RoboticComponent] !== undefined
                        ? (selectedComp[slider.field as keyof RoboticComponent] as number).toFixed(2)
                        : '0.00'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={slider.min}
                    max={slider.max}
                    step={slider.step}
                    value={selectedComp[slider.field as keyof RoboticComponent] as number || 0}
                    onChange={(e) => update3DPosition(selectedComp.id, slider.field as any, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                    disabled={isRunning}
                  />
                </div>
              ))}

              <div style={{
                marginTop: '6px',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                lineHeight: '1.4',
                background: 'rgba(255,255,255,0.02)',
                padding: '6px',
                borderRadius: '4px',
                border: '1px dashed rgba(255,255,255,0.05)'
              }}>
                💡 <strong>Welding Tip:</strong> Move components on the chassis plate and lock them. Click on elements in 3D to focus them.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              No component selected. Click on a component in 3D or choose from the dropdown above to weld/move it.
            </div>
          )}
        </div>
      )}

      {/* Draggable HUD for Simulation Variables (Light Level / Obstacle Pos) (Collapsible) */}
      {!isEnvPanelOpen ? (
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setIsEnvPanelOpen(true)}
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 5,
            background: 'rgba(13, 15, 19, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            fontSize: '0.75rem'
          }}
          title="Open Environment Controls"
        >
          <Move size={12} style={{ color: 'var(--accent-blue)' }} />
          <span>Environment</span>
          <ChevronUp size={14} />
        </button>
      ) : (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 5,
          width: '240px',
          padding: '12px',
          background: 'rgba(13, 15, 19, 0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>
              <Move size={12} style={{ color: 'var(--accent-blue)' }} />
              <span>ENVIRONMENT CONTROLS</span>
            </div>
            <button
              onClick={() => setIsEnvPanelOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Minimize panel"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Obstacle Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span>Wall Distance:</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                {Math.round(Math.abs(obstaclePos[2] - 0.4))}m
              </span>
            </div>
            <input
              type="range"
              min="-8.0"
              max="-1.5"
              step="0.1"
              value={obstaclePos[2]}
              onChange={handleObstacleSlider}
              style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
            />
          </div>

          {/* Ambient Light Sensor Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Sun size={10} />
                Light Level (LDR):
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                {lightLevel} / 1023
              </span>
            </div>
            <input
              type="range"
              min="100"
              max="1023"
              step="10"
              value={lightLevel}
              onChange={(e) => setLightLevel(parseInt(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
            />
          </div>
        </div>
      )}

      {/* R3F Canvas */}
      <div style={{ flex: 1, height: '100%', width: '100%' }}>
        <Canvas
          shadows
          camera={{ position: [0, 2.5, 4.5], fov: 50 }}
          style={{ background: 'var(--canvas-bg, #090a0d)' }}
        >
          {/* Lights */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <pointLight position={[-6, 5, -6]} intensity={0.3} color="var(--accent-purple)" />

          {/* Ground Grid */}
          <Grid
            renderOrder={-1}
            position={[0, 0, 0]}
            args={[20, 20]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#1e293b"
            sectionSize={2.5}
            sectionThickness={1.2}
            sectionColor="#38bdf8"
            fadeDistance={18}
          />

          {/* Floor plane for shadows */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <shadowMaterial opacity={0.3} />
          </mesh>

          {/* Obstacle (Red Grid Wall) */}
          <mesh position={obstaclePos} castShadow receiveShadow>
            <boxGeometry args={[4, 1.2, 0.4]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
            <Comp3DLabel
              label="OBSTACLE"
              detail="Wall"
              color="#ef4444"
              position={[0, 0.7, 0]}
              mode={labelMode3D}
            />
          </mesh>

          {/* Robot Model (all components grouped) */}
          <RobotModel />

          {/* Camera controller for follow mode */}
          <CameraController followMode={followCamera} />

          {/* Orbit Controls (disabled in follow mode) */}
          {!followCamera && <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={1.5} maxDistance={15} />}
        </Canvas>
      </div>
    </div>
  );
};

export default Simulation3D;
