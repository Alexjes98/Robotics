import React from 'react';
import { SimulatorProvider, useSimulator } from './hooks/useSimulator';
import { Breadboard2D } from './components/Breadboard2D';
import { Simulation3D } from './components/Simulation3D';
import { CodeEditor } from './components/CodeEditor';
import { ErrorModal } from './components/ErrorModal';
import { 
  Cpu, 
  Trash2, 
  Layers, 
  Play, 
  Square, 
  Lightbulb, 
  Battery, 
  Zap, 
  Eye, 
  Wifi,
  Grid,
  Activity
} from 'lucide-react';

const DashboardHeader: React.FC = () => {
  const { isRunning, startSimulation, stopSimulation } = useSimulator();

  return (
    <header className="app-header">
      <div className="header-logo">
        <Cpu size={22} style={{ filter: 'drop-shadow(0 0 6px var(--accent-blue))' }} />
        <span>ROBO-LAB // LEARNING PLATFORM</span>
      </div>

      {/* Simulation status indicator and run actions */}
      <div className="header-controls">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-light)',
          borderRadius: '6px',
          fontSize: '0.75rem'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isRunning ? 'var(--accent-green)' : 'var(--text-muted)',
            boxShadow: isRunning ? '0 0 8px var(--accent-green)' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ color: isRunning ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
            {isRunning ? 'SIMULATOR ACTIVE' : 'SYSTEM IDLE'}
          </span>
        </div>

        {!isRunning ? (
          <button className="btn btn-primary btn-sm" onClick={startSimulation}>
            <Play size={14} fill="currentColor" />
            COMPILE & PLAY
          </button>
        ) : (
          <button className="btn btn-danger btn-sm" onClick={stopSimulation}>
            <Square size={14} fill="currentColor" />
            EMERGENCY STOP
          </button>
        )}
      </div>
    </header>
  );
};

const ComponentsToolbox: React.FC = () => {
  const { components, addComponent, wires, deleteWire, isRunning } = useSimulator();

  const tools = [
    { name: 'Arduino Uno R3', desc: 'Main controller chip', type: 'arduino', icon: <Cpu size={16} />, color: 'var(--accent-blue)' },
    { name: 'L298N H-Bridge', desc: 'DC motor driver chip', type: 'hbridge', icon: <Layers size={16} />, color: 'var(--accent-red)' },
    { name: '9V Battery', desc: 'High-current motor power', type: 'battery', icon: <Battery size={16} />, color: 'var(--text-secondary)' },
    { name: 'Left DC Motor', desc: 'Left drive wheel actuator', type: 'motorL', icon: <Zap size={16} />, color: 'var(--accent-green)' },
    { name: 'Right DC Motor', desc: 'Right drive wheel actuator', type: 'motorR', icon: <Zap size={16} />, color: 'var(--accent-green)' },
    { name: 'HC-SR04 Sonar', desc: 'Ultrasonic rangefinder sensor', type: 'sensor', icon: <Wifi size={16} />, color: 'var(--accent-amber)' },
    { name: 'LED Indicator', desc: 'Basic signal bulb', type: 'led', icon: <Lightbulb size={16} />, color: 'var(--accent-purple)' },
    { name: 'Photoresistor (LDR)', desc: 'Ambient light sensor', type: 'ldr', icon: <Eye size={16} />, color: 'var(--accent-blue)' },
    { name: 'Protoboard / Breadboard', desc: 'Internal multi-connect block', type: 'breadboard', icon: <Grid size={16} />, color: 'var(--accent-blue)' },
    { name: 'Resistor (220Ω)', desc: 'Current-limiting safety element', type: 'resistor', icon: <Activity size={16} />, color: 'var(--accent-amber)' }
  ];

  return (
    <div className="side-panel">
      {/* Component Reference List */}
      <div className="panel-header">
        <span>Component Toolbox</span>
      </div>
      <div className="components-list">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
          Click to add to board:
        </div>
        {tools.map((tool, idx) => {
          const placedCount = components.filter(c => c.type === tool.type).length;
          const added = placedCount > 0;
          return (
            <div 
              key={idx} 
              className="component-card"
              onClick={() => !isRunning && addComponent(tool.type as any)}
              style={{
                cursor: isRunning ? 'default' : 'pointer',
                border: '1px solid var(--border-light)',
                transition: 'border-color 0.2s ease',
                background: added ? 'rgba(255,255,255,0.01)' : 'transparent'
              }}
            >
              <div className="component-icon" style={{ color: tool.color, backgroundColor: `${tool.color}15` }}>
                {tool.icon}
              </div>
              <div className="component-info" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="component-name">{tool.name}</span>
                  {added && (
                    <span style={{
                      fontSize: '0.6rem',
                      color: 'var(--accent-green)',
                      background: 'rgba(52, 211, 153, 0.1)',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontWeight: 'bold'
                    }}>
                      x{placedCount} Placed
                    </span>
                  )}
                </div>
                <span className="component-desc">{tool.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Wire Connection Manager */}
      <div className="connections-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            WIRING MANAGER
          </span>
          <span style={{
            fontSize: '0.65rem',
            background: 'rgba(255,255,255,0.05)',
            padding: '1px 5px',
            borderRadius: '4px',
            color: 'var(--text-muted)'
          }}>
            {wires.length} Wires
          </span>
        </div>

        <div className="connections-list">
          {wires.length === 0 ? (
            <div style={{
              display: 'flex',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '10px'
            }}>
              No connections established yet. Select matching pins to wire them together.
            </div>
          ) : (
            wires.map(wire => (
              <div key={wire.id} className="connection-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: wire.color,
                    display: 'inline-block'
                  }} />
                  <span className="connection-text" style={{ color: 'var(--text-primary)' }}>
                    {wire.from.componentId}.{wire.from.pinName} ➔ {wire.to.componentId}.{wire.to.pinName}
                  </span>
                </div>
                <button
                  onClick={() => deleteWire(wire.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(239,68,68,0.6)',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px'
                  }}
                  disabled={isRunning}
                  title="Remove wire connection"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const DashboardContent: React.FC = () => {
  return (
    <div className="dashboard-grid">
      {/* Left panel */}
      <ComponentsToolbox />

      {/* Center panel */}
      <div className="center-workspace">
        <Breadboard2D />
        <Simulation3D />
      </div>

      {/* Right panel */}
      <CodeEditor />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SimulatorProvider>
      <div className="app-container">
        <DashboardHeader />
        <DashboardContent />
        <ErrorModal />
      </div>
    </SimulatorProvider>
  );
};

export default App;
