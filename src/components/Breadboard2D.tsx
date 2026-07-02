import React, { useState, useRef, useEffect } from 'react';
import { useSimulator, type RoboticComponent } from '../hooks/useSimulator';
import { Trash2 } from 'lucide-react';

const getLedColors = (colorName?: string, isBlown?: boolean, isPowered?: boolean) => {
  if (isBlown) return { fill: '#334155', stroke: '#1e293b', glow: 'none' };
  
  let color = '#ef4444'; // default red
  let stroke = '#e11d48';
  let glowColor = '#f43f5e';
  
  switch (colorName) {
    case 'green':
      color = isPowered ? '#10b981' : '#047857';
      stroke = '#059669';
      glowColor = '#34d399';
      break;
    case 'blue':
      color = isPowered ? '#3b82f6' : '#1d4ed8';
      stroke = '#2563eb';
      glowColor = '#60a5fa';
      break;
    case 'yellow':
      color = isPowered ? '#eab308' : '#a16207';
      stroke = '#ca8a04';
      glowColor = '#fde047';
      break;
    case 'white':
      color = isPowered ? '#f8fafc' : '#64748b';
      stroke = '#cbd5e1';
      glowColor = '#ffffff';
      break;
    default: // red
      color = isPowered ? '#ef4444' : '#b91c1c';
      stroke = '#dc2626';
      glowColor = '#f87171';
      break;
  }

  return {
    fill: color,
    stroke,
    glow: isPowered ? `drop-shadow(0 0 10px ${glowColor})` : 'none'
  };
};

export const Breadboard2D: React.FC = () => {
  const {
    components,
    wires,
    activeWireColor,
    addWire,
    deleteWire,
    clearWires,
    updateComponentPosition,
    deleteComponent,
    isRunning,
    ledOn,
    sensorDistance,
    lightLevel,
    ledPowerStates,
    motorPowerStates,
    setActiveWireColor,
    toggleSwitch
  } = useSimulator();

  // Canvas Pan & Zoom state
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1.0);
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pin wiring state
  const [selectedPin, setSelectedPin] = useState<{ componentId: string; pinName: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state
  const [draggedCompId, setDraggedCompId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Wire colors
  const wireColors = [
    { name: 'Red (VCC)', value: '#ef4444' },
    { name: 'Black (GND)', value: '#1e1b4b' }, // dark indigo/black
    { name: 'Blue (Signal)', value: '#38bdf8' },
    { name: 'Yellow (Signal)', value: '#fbbf24' },
    { name: 'Green (Signal)', value: '#22c55e' }
  ];

  // Convert client cursor coords to SVG canvas relative coordinates (under current pan and zoom)
  const getSVGCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  // Get absolute coordinates of a pin on the canvas
  const getPinCoords = (compId: string, pinName: string) => {
    const comp = components.find(c => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const pin = comp.pins.find(p => p.name === pinName);
    if (!pin) return { x: 0, y: 0 };
    return {
      x: comp.x + pin.x,
      y: comp.y + pin.y
    };
  };

  // Keyboard space-bar listeners for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        // Prevent default spacebar scrolling
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.key === 'Escape') setSelectedPin(null);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Attach non-passive wheel listener directly to SVG for zoom control
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleSvgWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.08;
      const delta = e.deltaY < 0 ? 1 : -1;
      setZoom(prev => {
        const nextZoom = prev + delta * zoomIntensity;
        return Math.max(0.4, Math.min(2.5, nextZoom));
      });
    };

    svg.addEventListener('wheel', handleSvgWheel, { passive: false });
    return () => {
      svg.removeEventListener('wheel', handleSvgWheel);
    };
  }, []);

  // Handle SVG Mouse Down (Start Pan)
  const handleSVGMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSpacePressed) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      e.preventDefault();
    }
  };

  // Handle Canvas Mouse Move (for panning, wire previews, and dragging components)
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
      return;
    }

    const coords = getSVGCoords(e.clientX, e.clientY);
    setMousePos(coords);

    if (draggedCompId) {
      const newX = Math.round(coords.x - dragOffset.current.x);
      const newY = Math.round(coords.y - dragOffset.current.y);
      updateComponentPosition(draggedCompId, newX, newY);
      hasDraggedRef.current = true;
    }
  };

  // Handle Drag Start
  const handleCompMouseDown = (compId: string, e: React.MouseEvent) => {
    if (isRunning || isSpacePressed) return; // Prevent dragging component if spacebar is down
    e.stopPropagation();
    
    const comp = components.find(c => c.id === compId);
    if (!comp) return;
    
    const coords = getSVGCoords(e.clientX, e.clientY);
    dragOffset.current = {
      x: coords.x - comp.x,
      y: coords.y - comp.y
    };
    setDraggedCompId(compId);
    hasDraggedRef.current = false;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedCompId(null);
  };

  const handleComponentClick = (comp: RoboticComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    if (comp.type === 'spst' || comp.type === 'spdt') {
      toggleSwitch(comp.id);
    }
  };

  // Handle Pin Clicks (Wiring)
  const handlePinClick = (compId: string, pinName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) return; // Disable wiring during simulation

    if (!selectedPin) {
      // Start wiring from this pin
      setSelectedPin({ componentId: compId, pinName });
    } else {
      // Connect to this pin
      if (selectedPin.componentId !== compId || selectedPin.pinName !== pinName) {
        addWire(selectedPin, { componentId: compId, pinName });
      }
      setSelectedPin(null);
    }
  };

  // Compute Bezier control points for curved wires
  const getWirePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const midY = (y1 + y2) / 2;
    const midX = (x1 + x2) / 2;

    if (dy > dx) {
      return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    }
  };

  // Determine cursor based on action state
  const getCanvasCursor = () => {
    if (isPanning) return 'grabbing';
    if (isSpacePressed) return 'grab';
    return 'default';
  };

  return (
    <div className="center-workspace" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* 2D Header / Wire controls */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(13,15,19,0.5)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 5
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            2D BREADBOARD EDITOR
          </span>
          {selectedPin && (
            <span style={{
              fontSize: '0.75rem',
              color: 'var(--accent-blue)',
              background: 'rgba(56, 189, 248, 0.1)',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              animation: 'pulse 1.5s infinite'
            }}>
              Wiring: Connect {selectedPin.componentId}.{selectedPin.pinName} (Esc to cancel)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Wire Color Selection */}
          <div className="wire-color-picker">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '4px' }}>WIRE:</span>
            {wireColors.map(color => (
              <button
                key={color.value}
                className={`color-dot ${activeWireColor === color.value ? 'active' : ''}`}
                style={{ backgroundColor: color.value === '#1e1b4b' ? '#334155' : color.value }}
                onClick={() => setActiveWireColor(color.value)}
                title={color.name}
              />
            ))}
          </div>

          <button
            className="btn btn-outline btn-sm"
            onClick={clearWires}
            disabled={isRunning || wires.length === 0}
            title="Clear all wire connections"
            style={{ padding: '6px 10px' }}
          >
            <Trash2 size={13} />
            Reset Board
          </button>
        </div>
      </div>

      {/* SVG Canvas Workspace */}
      <div className="workspace-2d" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Overlay info */}
        <div className="workspace-overlay-info">
          <span>💡 Hold [SPACE] and drag to move canvas. Scroll to zoom. Click toolbox to place components.</span>
        </div>

        {/* Floating Zoom Controls HUD */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          zIndex: 5,
          display: 'flex',
          gap: '6px',
          padding: '4px 6px',
          background: 'rgba(13, 15, 19, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--border-light)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <button
            className="btn btn-outline btn-sm"
            style={{ padding: '4px', minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setZoom(prev => Math.max(0.4, prev - 0.1))}
            title="Zoom Out"
          >
            -
          </button>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            alignSelf: 'center',
            minWidth: '40px',
            textAlign: 'center',
            color: 'var(--text-primary)'
          }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn btn-outline btn-sm"
            style={{ padding: '4px', minWidth: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setZoom(prev => Math.min(2.5, prev + 0.1))}
            title="Zoom In"
          >
            +
          </button>
          <button
            className="btn btn-outline btn-sm"
            style={{ padding: '2px 6px', fontSize: '0.65rem', height: '24px' }}
            onClick={() => {
              setZoom(1.0);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset Pan & Zoom"
          >
            Reset
          </button>
        </div>

        {/* Real-time Telemetry (Breadboard Mode) */}
        {isRunning && (() => {
          const hasMotorL = components.some(c => c.type === 'motor' && c.x3d < 0);
          const hasMotorR = components.some(c => c.type === 'motor' && c.x3d >= 0);
          const hasSensor = components.some(c => c.type === 'sensor');
          const hasLdr = components.some(c => c.type === 'ldr');
          const hasLed = components.some(c => c.type === 'led' || c.type === 'arduino');

          const speedL = components
            .filter(c => c.type === 'motor' && c.x3d < 0)
            .map(c => motorPowerStates[c.id] || 0)
            .reduce((sum, val) => sum + val, 0);
          
          const speedR = components
            .filter(c => c.type === 'motor' && c.x3d >= 0)
            .map(c => motorPowerStates[c.id] || 0)
            .reduce((sum, val) => sum + val, 0);

          return (
            <div className="active-telemetry" style={{ zIndex: 4 }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '4px', marginBottom: '4px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                ⚡ TELEMETRY (LIVE)
              </div>
              {hasMotorL && (
                <div className="telemetry-row">
                  <span className="telemetry-label">Motor L Speed:</span>
                  <span className={`telemetry-value ${speedL !== 0 ? 'green' : ''}`}>
                    {speedL} PWM
                  </span>
                </div>
              )}
              {hasMotorR && (
                <div className="telemetry-row">
                  <span className="telemetry-label">Motor R Speed:</span>
                  <span className={`telemetry-value ${speedR !== 0 ? 'green' : ''}`}>
                    {speedR} PWM
                  </span>
                </div>
              )}
              {hasSensor && (
                <div className="telemetry-row">
                  <span className="telemetry-label">Sonar Distance:</span>
                  <span className="telemetry-value amber">{sensorDistance} cm</span>
                </div>
              )}
              {hasLdr && (
                <div className="telemetry-row">
                  <span className="telemetry-label">LDR Sensor:</span>
                  <span className="telemetry-value blue">{lightLevel} / 1023</span>
                </div>
              )}
              {hasLed && (
                <div className="telemetry-row">
                  <span className="telemetry-label">LED Signal:</span>
                  <span className={`telemetry-value ${ledOn ? 'green' : 'muted'}`}>
                    {ledOn ? 'ON (HIGH)' : 'OFF (LOW)'}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={handleSVGMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ display: 'block', background: '#0d0f13', cursor: getCanvasCursor() }}
        >
          {/* Grid lines patterns */}
          <defs>
            <pattern id="dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#1e293b" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />

          {/* Render Zoomed and Panned Canvas Contents */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            
            {/* Render Wire Connections */}
            {wires.map(wire => {
              const start = getPinCoords(wire.from.componentId, wire.from.pinName);
              const end = getPinCoords(wire.to.componentId, wire.to.pinName);
              
              return (
                <g key={wire.id} className="wire-group">
                  <path
                    d={getWirePath(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="10"
                    style={{ cursor: isRunning ? 'default' : 'pointer' }}
                    onClick={() => !isRunning && deleteWire(wire.id)}
                  />
                  <path
                    d={getWirePath(start.x, start.y, end.x, end.y)}
                    fill="none"
                    stroke={wire.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{ pointerEvents: 'none' }}
                  />
                  {isRunning && (
                    <circle r="3" fill="#ffffff">
                      <animateMotion
                        dur="1.5s"
                        repeatCount="indefinite"
                        path={getWirePath(start.x, start.y, end.x, end.y)}
                      />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* Live Wire Drawing Preview */}
            {selectedPin && (
              <path
                d={getWirePath(
                  getPinCoords(selectedPin.componentId, selectedPin.pinName).x,
                  getPinCoords(selectedPin.componentId, selectedPin.pinName).y,
                  mousePos.x,
                  mousePos.y
                )}
                fill="none"
                stroke={activeWireColor}
                strokeWidth="2"
                strokeDasharray="4 4"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* Render Components */}
            {components.map(comp => {
              let headerColor = '#1e3a8a';
              let bodyColor = '#172554';
              let strokeColor = 'rgba(56, 189, 248, 0.4)';

              if (comp.type === 'hbridge') {
                headerColor = '#7f1d1d';
                bodyColor = '#450a0a';
                strokeColor = 'rgba(239, 68, 68, 0.4)';
              } else if (comp.type === 'battery') {
                headerColor = '#1f2937';
                bodyColor = '#111827';
                strokeColor = 'rgba(156, 163, 175, 0.4)';
              } else if (comp.type === 'motor') {
                headerColor = '#115e59';
                bodyColor = '#042f2e';
                strokeColor = 'rgba(20, 184, 166, 0.4)';
              } else if (comp.type === 'sensor') {
                headerColor = '#065f46';
                bodyColor = '#022c22';
                strokeColor = 'rgba(52, 211, 153, 0.4)';
              } else if (comp.type === 'led') {
                headerColor = '#581c87';
                bodyColor = '#2e1065';
                strokeColor = 'rgba(167, 139, 250, 0.4)';
              } else if (comp.type === 'ldr') {
                headerColor = '#7c2d12';
                bodyColor = '#431407';
                strokeColor = 'rgba(251, 191, 36, 0.4)';
              } else if (comp.type === 'spst') {
                headerColor = '#334155';
                bodyColor = '#1e293b';
                strokeColor = 'rgba(148, 163, 184, 0.4)';
              } else if (comp.type === 'spdt') {
                headerColor = '#475569';
                bodyColor = '#0f172a';
                strokeColor = 'rgba(203, 213, 225, 0.4)';
              }

              return (
                <g
                  key={comp.id}
                  transform={`translate(${comp.x}, ${comp.y})`}
                  onMouseDown={(e) => handleCompMouseDown(comp.id, e)}
                  onClick={(e) => handleComponentClick(comp, e)}
                  style={{ cursor: (comp.type === 'spst' || comp.type === 'spdt') ? 'pointer' : (isRunning ? 'default' : (isSpacePressed ? 'grab' : 'move')) }}
                >
                  {/* Shadow */}
                  <rect
                    x="2"
                    y="4"
                    width={comp.width}
                    height={comp.height}
                    rx="8"
                    fill="rgba(0,0,0,0.5)"
                    filter="blur(4px)"
                  />

                  {/* Component Base Box */}
                  <rect
                    width={comp.width}
                    height={comp.height}
                    rx="8"
                    fill={bodyColor}
                    stroke={strokeColor}
                    strokeWidth="1.5"
                  />

                  {/* Header Strip */}
                  <rect
                    width={comp.width}
                    height="26"
                    rx="8"
                    clipPath="inset(0 0 18px 0)"
                    fill={headerColor}
                  />
                  <line
                    x1="0"
                    y1="26"
                    x2={comp.width}
                    y2="26"
                    stroke="rgba(255,255,255,0.06)"
                  />

                  {/* Header Text */}
                  <text
                    x="10"
                    y="17"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    letterSpacing="0.3"
                    style={{ pointerEvents: 'none', fontFamily: 'var(--font-sans)' }}
                  >
                    {comp.label}
                  </text>

                  {/* Component Deletion Button (X) */}
                  {!isRunning && (
                    <g
                      transform={`translate(${comp.width - 18}, 4)`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteComponent(comp.id);
                      }}
                    >
                      <title>{`Delete ${comp.label}`}</title>
                      <circle r="7" fill="rgba(239, 68, 68, 0.95)" />
                      <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                  )}

                  {/* Component Custom Rendering */}
                  {comp.type === 'arduino' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="50" y="50" width="100" height="30" rx="2" fill="#0f172a" stroke="rgba(255,255,255,0.05)" />
                      <text x="65" y="68" fill="rgba(255,255,255,0.2)" fontSize="10" fontFamily="var(--font-mono)">ATMEGA328P</text>
                      <rect x="-10" y="30" width="30" height="40" rx="3" fill="#64748b" />
                      <rect x="-5" y="90" width="30" height="35" rx="3" fill="#1e293b" />
                      <circle cx="28" cy="18" r="3" fill={ledOn ? '#10b981' : '#ef4444'} />
                      <text x="35" y="21" fill="rgba(255,255,255,0.4)" fontSize="7">L</text>
                    </g>
                  )}

                  {comp.type === 'hbridge' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="70" y="35" width="40" height="50" fill="#1e293b" rx="2" />
                      <line x1="75" y1="35" x2="75" y2="85" stroke="#475569" strokeWidth="2" />
                      <line x1="82" y1="35" x2="82" y2="85" stroke="#475569" strokeWidth="2" />
                      <line x1="90" y1="35" x2="90" y2="85" stroke="#475569" strokeWidth="2" />
                      <line x1="98" y1="35" x2="98" y2="85" stroke="#475569" strokeWidth="2" />
                      <line x1="105" y1="35" x2="105" y2="85" stroke="#475569" strokeWidth="2" />
                      <rect x="65" y="70" width="50" height="25" fill="#0f172a" rx="1" />
                      <text x="74" y="86" fill="rgba(255,255,255,0.2)" fontSize="10" fontFamily="var(--font-mono)">L298N</text>
                    </g>
                  )}

                  {comp.type === 'battery' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="10" y="40" width="80" height="80" rx="4" fill="#0f172a" />
                      <text x="25" y="80" fill="var(--text-muted)" fontSize="20" fontWeight="bold">9V</text>
                      <rect x="25" y="-6" width="10" height="6" fill="#94a3b8" />
                      <rect x="65" y="-6" width="10" height="6" fill="#94a3b8" />
                    </g>
                  )}

                  {comp.type === 'motor' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="10" y="30" width="100" height="40" rx="4" fill="#1e293b" />
                      <circle cx="30" cy="50" r="15" fill="#f59e0b" />
                      <circle cx="30" cy="50" r="5" fill="#94a3b8" />
                      {isRunning && (motorPowerStates[comp.id] || 0) !== 0 && (
                        <path
                          d="M 30 35 A 15 15 0 0 1 45 50"
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        >
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0 30 50"
                            to={(motorPowerStates[comp.id] || 0) > 0 ? "360 30 50" : "-360 30 50"}
                            dur="1s"
                            repeatCount="indefinite"
                          />
                        </path>
                      )}
                    </g>
                  )}

                  {comp.type === 'sensor' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <circle cx="35" cy="45" r="22" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                      <circle cx="105" cy="45" r="22" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                      <circle cx="35" cy="45" r="14" fill="#020617" />
                      <circle cx="105" cy="45" r="14" fill="#020617" />
                      <line x1="20" y1="45" x2="50" y2="45" stroke="rgba(255,255,255,0.15)" />
                      <line x1="35" y1="30" x2="35" y2="60" stroke="rgba(255,255,255,0.15)" />
                      <line x1="90" y1="45" x2="120" y2="45" stroke="rgba(255,255,255,0.15)" />
                      <line x1="105" y1="30" x2="105" y2="60" stroke="rgba(255,255,255,0.15)" />
                      {isRunning && (
                        <text x="70" y="50" fill="var(--accent-amber)" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">
                          {sensorDistance}cm
                        </text>
                      )}
                    </g>
                  )}

                  {comp.type === 'led' && (() => {
                    const isPowered = ledPowerStates[comp.id] === 'powered';
                    const isBlown = ledPowerStates[comp.id] === 'blown';
                    const ledColors = getLedColors(comp.color, isBlown, isPowered);
                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <circle
                          cx="40"
                          cy="50"
                          r="16"
                          fill={ledColors.fill}
                          stroke={ledColors.stroke}
                          strokeWidth="1.5"
                          style={{
                            filter: ledColors.glow
                          }}
                        />
                        <line x1="56" y1="40" x2="56" y2="60" stroke={ledColors.stroke} strokeWidth="2" />
                        {isBlown && (
                          <text x="40" y="53" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">BLOWN</text>
                        )}
                      </g>
                    );
                  })()}

                  {comp.type === 'ldr' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <circle cx="50" cy="45" r="18" fill="#c2410c" stroke="#ea580c" strokeWidth="1.5" />
                      <path
                        d="M 38 45 Q 42 35 45 45 T 52 45 T 58 45"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                      />
                      {isRunning && (
                        <text x="50" y="32" fill="var(--accent-blue)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">
                          L:{lightLevel}
                        </text>
                      )}
                    </g>
                  )}

                  {comp.type === 'resistor' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <line x1="0" y1="20" x2="20" y2="20" stroke="#94a3b8" strokeWidth="2" />
                      <line x1="60" y1="20" x2="80" y2="20" stroke="#94a3b8" strokeWidth="2" />
                      <rect x="20" y="12" width="40" height="16" rx="3" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
                      <rect x="28" y="12" width="3" height="16" fill="#ef4444" />
                      <rect x="35" y="12" width="3" height="16" fill="#ef4444" />
                      <rect x="42" y="12" width="3" height="16" fill="#78350f" />
                      <rect x="52" y="12" width="3" height="16" fill="#eab308" />
                    </g>
                  )}

                  {comp.type === 'spst' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="15" y="32" width="60" height="12" rx="2" fill="#0f172a" stroke="rgba(255,255,255,0.05)" />
                      <circle cx="25" cy="38" r="3.5" fill="#94a3b8" />
                      <circle cx="65" cy="38" r="3.5" fill="#94a3b8" />
                      {comp.state === 'closed' ? (
                        <line x1="25" y1="38" x2="65" y2="38" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" />
                      ) : (
                        <line x1="25" y1="38" x2="55" y2="22" stroke="#f87171" strokeWidth="3" strokeLinecap="round" />
                      )}
                      <rect x="27" y="10" width="36" height="10" rx="2" fill={comp.state === 'closed' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)'} />
                      <text
                        x="45"
                        y="18"
                        fill={comp.state === 'closed' ? '#4ade80' : '#f87171'}
                        fontSize="7"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                      >
                        {comp.state === 'closed' ? 'CLOSED' : 'OPEN'}
                      </text>
                    </g>
                  )}

                  {comp.type === 'spdt' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="15" y="12" width="70" height="36" rx="2" fill="#0f172a" stroke="rgba(255,255,255,0.05)" />
                      <circle cx="25" cy="30" r="3.5" fill="#94a3b8" />
                      <circle cx="75" cy="20" r="3.5" fill="#94a3b8" />
                      <circle cx="75" cy="40" r="3.5" fill="#94a3b8" />
                      {comp.state === 'L2' ? (
                        <line x1="25" y1="30" x2="75" y2="40" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                      ) : (
                        <line x1="25" y1="30" x2="75" y2="20" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
                      )}
                      <text
                        x="50"
                        y="43"
                        fill="#cbd5e1"
                        fontSize="6.5"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                      >
                        {comp.state === 'L2' ? 'COM ➔ L2' : 'COM ➔ L1'}
                      </text>
                    </g>
                  )}

                  {comp.type === 'breadboard' && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x="0" y="0" width={comp.width} height={comp.height} fill="#f1f5f9" rx="4" stroke="#cbd5e1" strokeWidth="2" />
                      <line x1="15" y1="20" x2="15" y2="160" stroke="#f87171" strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="35" y1="20" x2="35" y2="160" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
                      <text x="15" y="15" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">+</text>
                      <text x="35" y="14" fill="#3b82f6" fontSize="8" fontWeight="bold" textAnchor="middle">-</text>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(r => (
                        <text key={r} x="53" y={30 + (r - 1) * 20 + 3} fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">
                          {r}
                        </text>
                      ))}
                      {['a', 'b', 'c', 'd', 'e'].map((col, idx) => (
                        <text key={col} x={70 + idx * 25} y={18} fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">
                          {col}
                        </text>
                      ))}
                    </g>
                  )}

                  {/* Render Component Pins */}
                  {comp.pins.map(pin => {
                    const isPinSelected = selectedPin?.componentId === comp.id && selectedPin?.pinName === pin.name;
                    
                    let textAnchor: 'middle' | 'start' | 'end' = 'middle';
                    let labelY = pin.y + (pin.y === 0 ? 12 : -8);
                    if (pin.x === 0) {
                      textAnchor = 'start';
                      labelY = pin.y + 4;
                    } else if (pin.x === comp.width) {
                      textAnchor = 'end';
                      labelY = pin.y + 4;
                    }

                    let pinColor = '#4b5563';
                    if (pin.type === 'power') pinColor = '#ef4444';
                    else if (pin.type === 'gnd') pinColor = '#000000';
                    else if (pin.type === 'analog') pinColor = '#a78bfa';
                    else if (pin.type === 'signal') pinColor = '#38bdf8';

                    const isBreadboardPin = comp.type === 'breadboard';
                    const pinRadius = isBreadboardPin ? 3.5 : 4.5;
                    const pinFill = isPinSelected ? 'var(--accent-blue)' : (isBreadboardPin ? '#334155' : pinColor);
                    const pinStroke = isBreadboardPin ? '#cbd5e1' : '#ffffff';

                    return (
                      <g key={pin.name}>
                        {comp.type !== 'breadboard' && comp.type !== 'resistor' && (
                          <text
                            x={pin.x === 0 ? 8 : (pin.x === comp.width ? pin.x - 8 : pin.x)}
                            y={labelY}
                            fill="var(--text-secondary)"
                            fontSize="8.5"
                            fontWeight="600"
                            fontFamily="var(--font-mono)"
                            textAnchor={textAnchor}
                            style={{ pointerEvents: 'none', userSelect: 'none' }}
                          >
                            {pin.name}
                          </text>
                        )}

                        <circle
                          className={`pin-node ${isPinSelected ? 'selected' : ''}`}
                          cx={pin.x}
                          cy={pin.y}
                          r={pinRadius}
                          fill={pinFill}
                          stroke={pinStroke}
                          strokeWidth={isBreadboardPin ? 0.5 : 1}
                          onClick={(e) => handlePinClick(comp.id, pin.name, e)}
                        >
                          <title>{`Pin: ${comp.label}.${pin.name}`}</title>
                        </circle>
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
};
export default Breadboard2D;
