import React, { useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Grid } from '@react-three/drei';
import { useSimulator, type RoboticComponent } from '../hooks/useSimulator';
import { RotateCcw, Video, Sun, Move, Cpu, Layers } from 'lucide-react';
import * as THREE from 'three';

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

// --- Spin Wheel and Cylinder mesh for motors ---
const MotorWheel: React.FC<{
  comp: RoboticComponent;
  speed: number;
  isRunning: boolean;
  showLabels: boolean;
}> = ({ comp, speed, isRunning, showLabels }) => {
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
      <mesh position={[comp.type === 'motorL' ? -0.05 : 0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
      </mesh>
      {/* Big driving wheel */}
      <mesh ref={wheelRef} position={[comp.type === 'motorL' ? -0.08 : 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 24]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
        {/* Hubcap visualizer line */}
        <mesh position={[0, 0.045, 0]}>
          <boxGeometry args={[0.04, 0.01, 0.2]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </mesh>
      {showLabels && (
        <Html position={[0, 0.26, 0]} center distanceFactor={4}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '8px', background: 'rgba(0,0,0,0.65)', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
            {comp.type === 'motorL' ? 'Motor L' : 'Motor R'} ({speed} RPM)
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Inner 3D Component to get access to R3F hooks (useFrame, etc) ---
const RobotModel: React.FC<{ showLabels: boolean }> = ({ showLabels }) => {
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
    setSelected3DId
  } = useSimulator();

  const robotGroupRef = useRef<THREE.Group>(null);

  // Return specific bounding box dimensions for components selection overlay
  const getOutlineSize = (type: string): [number, number, number] => {
    switch (type) {
      case 'arduino': return [0.3, 0.08, 0.4];
      case 'hbridge': return [0.24, 0.08, 0.22];
      case 'battery': return [0.18, 0.16, 0.14];
      case 'motorL':
      case 'motorR': return [0.24, 0.28, 0.28];
      case 'sensor': return [0.24, 0.12, 0.08];
      case 'led': return [0.1, 0.1, 0.1];
      case 'ldr': return [0.1, 0.04, 0.1];
      case 'breadboard': return [0.52, 0.04, 0.42];
      case 'resistor': return [0.28, 0.06, 0.06];
      default: return [0.2, 0.2, 0.2];
    }
  };

  return (
    <group
      ref={robotGroupRef}
      position={robotPos}
      rotation={[0, robotHeading, 0]}
    >
      {/* 3D Base Robot Chassis Plate (Welded base anchor) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.06, 0.8]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} transparent opacity={0.6} />
      </mesh>

      {/* Label: Chassis */}
      {showLabels && (
        <Html position={[0, -0.06, 0]} center distanceFactor={4}>
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '9px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'var(--font-sans)'
          }}>
            Robot Base Anchor
          </div>
        </Html>
      )}

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

            {/* Render component-specific 3D meshes */}
            {comp.type === 'arduino' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.25, 0.03, 0.35]} />
                  <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
                </mesh>
                {showLabels && (
                  <Html position={[0, 0.08, 0]} center distanceFactor={4}>
                    <div style={{ color: '#60a5fa', fontSize: '8px', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '1px 3px', borderRadius: '3px' }}>
                      {comp.label}
                    </div>
                  </Html>
                )}

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

            {comp.type === 'hbridge' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.2, 0.05, 0.18]} />
                  <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
                </mesh>
                {showLabels && (
                  <Html position={[0, 0.08, 0]} center distanceFactor={4}>
                    <div style={{ color: '#f87171', fontSize: '8px', fontWeight: 'bold', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '1px 3px', borderRadius: '3px' }}>
                      {comp.label}
                    </div>
                  </Html>
                )}
              </>
            )}

            {comp.type === 'battery' && (
              <>
                <mesh castShadow>
                  <boxGeometry args={[0.14, 0.12, 0.1]} />
                  <meshStandardMaterial color="#111827" roughness={0.8} />
                </mesh>
                {showLabels && (
                  <Html position={[0, 0.1, 0]} center distanceFactor={4}>
                    <div style={{ color: '#9ca3af', fontSize: '8px', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '1px 3px', borderRadius: '3px' }}>
                      {comp.label}
                    </div>
                  </Html>
                )}
              </>
            )}

            {(comp.type === 'motorL' || comp.type === 'motorR') && (
              <MotorWheel
                comp={comp}
                speed={motorPowerStates[comp.id] || 0}
                isRunning={isRunning}
                showLabels={showLabels}
              />
            )}

            {comp.type === 'sensor' && (
              <group>
                <mesh castShadow>
                  <boxGeometry args={[0.2, 0.08, 0.02]} />
                  <meshStandardMaterial color="#065f46" />
                </mesh>
                {/* Left cylinder eye */}
                <mesh position={[-0.05, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
                  <meshStandardMaterial color="#475569" roughness={0.4} />
                </mesh>
                {/* Right cylinder eye */}
                <mesh position={[0.05, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.04, 16]} />
                  <meshStandardMaterial color="#475569" roughness={0.4} />
                </mesh>

                {/* Ultrasonic Sensor Sonar Cone Visualizer */}
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
                {showLabels && (
                  <Html position={[0, 0.1, 0]} center distanceFactor={4}>
                    <div style={{
                      background: 'rgba(0,0,0,0.85)',
                      color: '#fbbf24',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      borderRadius: '3px',
                      padding: '1px 4px',
                      fontSize: '8px',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap'
                    }}>
                      HC-SR04: {sensorDistance}cm
                    </div>
                  </Html>
                )}
              </group>
            )}
            {comp.type === 'led' && (() => {
              const isPowered = ledPowerStates[comp.id] === 'powered';
              const isBlown = ledPowerStates[comp.id] === 'blown';
              const baseColor = get3DColorHex(comp.color);

              return (
                <group>
                  {/* Holder */}
                  <mesh castShadow position={[0, -0.015, 0]}>
                    <cylinderGeometry args={[0.04, 0.04, 0.01, 16]} />
                    <meshStandardMaterial color="#64748b" metalness={0.7} />
                  </mesh>
                  {/* Bulb Dome */}
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
                  {/* Light Glow */}
                  {isPowered && (
                    <pointLight color={baseColor} intensity={2} distance={0.9} />
                  )}
                  {showLabels && (
                    <Html position={[0, 0.08, 0]} center distanceFactor={4}>
                      <div style={{
                        color: isBlown ? '#ef4444' : baseColor,
                        fontSize: '7px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        background: 'rgba(0,0,0,0.5)',
                        padding: '1px 3px',
                        borderRadius: '3px'
                      }}>
                        {comp.label} {isBlown ? '(BLOWN)' : ''}
                      </div>
                    </Html>
                  )}
                </group>
              );
            })()}

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
                {showLabels && (
                  <Html position={[0, 0.06, 0]} center distanceFactor={4}>
                    <div style={{
                      background: 'rgba(0,0,0,0.85)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '3px',
                      padding: '1px 3px',
                      fontSize: '7px',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap'
                    }}>
                      LDR: {lightLevel}
                    </div>
                  </Html>
                )}
              </group>
            )}

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
                {showLabels && (
                  <Html position={[0, 0.06, 0]} center distanceFactor={4}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '7px', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '1px 3px', borderRadius: '3px' }}>
                      {comp.label}
                    </div>
                  </Html>
                )}
              </group>
            )}

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
                {showLabels && (
                  <Html position={[0, 0.08, 0]} center distanceFactor={4}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '7.5px', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.5)', padding: '1px 3px', borderRadius: '3px' }}>
                      {comp.label}
                    </div>
                  </Html>
                )}
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
    updateComponentColor
  } = useSimulator();

  const [followCamera, setFollowCamera] = useState<boolean>(false);
  const [show3DLabels, setShow3DLabels] = useState<boolean>(true);

  const selectedComp = components.find(c => c.id === selected3DId);

  const handleObstacleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setObstaclePos([obstaclePos[0], obstaclePos[1], val]);
  };

  return (
    <div className="workspace-3d" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* 3D Panel Header */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(13,15,19,0.7)',
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
          <button
            className={`btn btn-outline btn-sm ${show3DLabels ? 'btn-primary' : ''}`}
            onClick={() => setShow3DLabels(!show3DLabels)}
            title="Toggle text labels in 3D scene"
            style={{ fontSize: '0.75rem', height: '28px' }}
          >
            {show3DLabels ? 'Labels: Visible' : 'Labels: Hidden'}
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

      {/* Left-side HUD 3D Welder Controller Panel */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: '12px',
        zIndex: 5,
        width: '280px',
        maxHeight: 'calc(100% - 80px)',
        overflowY: 'auto',
        padding: '16px',
        background: 'rgba(20, 23, 29, 0.9)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-light)',
        borderRadius: '10px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        color: 'var(--text-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '6px' }}>
          <Cpu size={14} style={{ color: 'var(--accent-green)' }} />
          <span>3D ASSEMBLY & WELDER</span>
        </div>

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

      {/* Draggable HUD for Simulation Variables (Light Level / Obstacle Pos) */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        zIndex: 5,
        width: '240px',
        padding: '12px',
        background: 'rgba(13, 15, 19, 0.85)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px' }}>
          <Move size={12} style={{ color: 'var(--accent-blue)' }} />
          <span>ENVIRONMENT CONTROLS</span>
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

      {/* R3F Canvas */}
      <div style={{ flex: 1, height: '100%', width: '100%' }}>
        <Canvas
          shadows
          camera={{ position: [0, 2.5, 4.5], fov: 50 }}
          style={{ background: '#090a0d' }}
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

          {/* Cyberpunk Ground Grid */}
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

          {/* Draggable Obstacle (Red Grid Wall) */}
          <mesh position={obstaclePos} castShadow receiveShadow>
            <boxGeometry args={[4, 1.2, 0.4]} />
            <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
            <Html position={[0, 0.7, 0]} center distanceFactor={4}>
              <div style={{
                background: 'rgba(239, 68, 68, 0.95)',
                color: '#ffffff',
                border: '1px solid #ffffff',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 0 10px rgba(239,68,68,0.5)'
              }}>
                🚨 OBSTACLE
              </div>
            </Html>
          </mesh>

          {/* Robot Model (all components grouped) */}
          <RobotModel showLabels={show3DLabels} />

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
