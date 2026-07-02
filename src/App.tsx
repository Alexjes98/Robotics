import React from 'react';
import { SimulatorProvider, useSimulator } from './hooks/useSimulator';
import { Breadboard2D } from './components/Breadboard2D';
import { Simulation3D } from './components/Simulation3D';
import { CodeEditor } from './components/CodeEditor';
import { ErrorModal } from './components/ErrorModal';
import { Resizer } from './components/Resizer';
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
  Activity,
  Save,
  Upload,
  Loader2,
  ToggleLeft,
  ToggleRight,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { isRunning, startSimulation, stopSimulation, saveProject, loadProjectData } = useSimulator();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        loadProjectData(text);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset to allow importing the same file again
  };

  return (
    <header className="app-header">
      <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn btn-outline btn-sm"
          style={{
            padding: '6px',
            marginRight: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: sidebarOpen ? 'var(--border-light)' : 'var(--accent-blue)',
            color: sidebarOpen ? 'var(--text-secondary)' : 'var(--accent-blue)'
          }}
          title={sidebarOpen ? "Hide Component Toolbox & Wiring Manager" : "Show Component Toolbox & Wiring Manager"}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <Cpu size={22} style={{ filter: 'drop-shadow(0 0 6px var(--accent-blue))' }} />
        <span>ROBO-LAB // LEARNING PLATFORM</span>
      </div>

      {/* Simulation status indicator and run actions */}
      <div className="header-controls">
        {/* Project Load / Save actions */}
        <button 
          className="btn btn-outline btn-sm" 
          onClick={saveProject} 
          disabled={isRunning}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Save current project config to device"
        >
          <Save size={14} />
          SAVE PROJECT
        </button>

        <button 
          className="btn btn-outline btn-sm" 
          onClick={handleImportClick} 
          disabled={isRunning}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          title="Load project config from file"
        >
          <Upload size={14} />
          LOAD PROJECT
        </button>

        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".json,.robo" 
          onChange={handleFileChange} 
        />

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

const ComponentsToolbox: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { components, addComponent, wires, deleteWire, isRunning } = useSimulator();

  const tools = [
    { name: 'Arduino Uno R3', desc: 'Main controller chip', type: 'arduino', icon: <Cpu size={16} />, color: 'var(--accent-blue)' },
    { name: 'L298N H-Bridge', desc: 'DC motor driver chip', type: 'hbridge', icon: <Layers size={16} />, color: 'var(--accent-red)' },
    { name: '9V Battery', desc: 'High-current motor power', type: 'battery', icon: <Battery size={16} />, color: 'var(--text-secondary)' },
    { name: 'DC Motor', desc: 'Drive wheel actuator (position defines L/R side in 3D)', type: 'motor', icon: <Zap size={16} />, color: 'var(--accent-green)' },
    { name: 'HC-SR04 Sonar', desc: 'Ultrasonic rangefinder sensor', type: 'sensor', icon: <Wifi size={16} />, color: 'var(--accent-amber)' },
    { name: 'LED Indicator', desc: 'Basic signal bulb', type: 'led', icon: <Lightbulb size={16} />, color: 'var(--accent-purple)' },
    { name: 'Photoresistor (LDR)', desc: 'Ambient light sensor', type: 'ldr', icon: <Eye size={16} />, color: 'var(--accent-blue)' },
    { name: 'Protoboard / Breadboard', desc: 'Internal multi-connect block', type: 'breadboard', icon: <Grid size={16} />, color: 'var(--accent-blue)' },
    { name: 'Resistor (220Ω)', desc: 'Current-limiting safety element', type: 'resistor', icon: <Activity size={16} />, color: 'var(--accent-amber)' },
    { name: 'SPST Switch', desc: 'Single Pole Single Throw switch', type: 'spst', icon: <ToggleLeft size={16} />, color: 'var(--accent-purple)' },
    { name: 'SPDT Switch', desc: 'Single Pole Double Throw switch', type: 'spdt', icon: <ToggleRight size={16} />, color: 'var(--accent-amber)' }
  ];

  return (
    <div 
      className="side-panel"
      style={{
        width: isOpen ? '280px' : '0px',
        minWidth: isOpen ? '280px' : '0px',
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'all' : 'none',
        borderRight: isOpen ? '1px solid var(--border-light)' : 'none',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease, border-right 0.3s ease'
      }}
    >
      <div style={{ width: '280px', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Component Reference List */}
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Component Toolbox</span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              borderRadius: '4px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Collapse Sidebar"
          >
            <PanelLeftClose size={15} />
          </button>
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
    </div>
  );
};

interface ContentProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  codeEditorWidth: number;
  setCodeEditorWidth: React.Dispatch<React.SetStateAction<number>>;
  simulationHeight: number;
  setSimulationHeight: React.Dispatch<React.SetStateAction<number>>;
}

const DashboardContent: React.FC<ContentProps> = ({
  sidebarOpen,
  setSidebarOpen,
  codeEditorWidth,
  setCodeEditorWidth,
  simulationHeight,
  setSimulationHeight
}) => {
  return (
    <div className="dashboard-grid">
      {/* Left panel */}
      <ComponentsToolbox isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Center panel */}
      <div className="center-workspace">
        <Breadboard2D />
        <Resizer
          type="row"
          onResize={(deltaY) => {
            setSimulationHeight((prev) => {
              const next = prev - deltaY;
              return Math.max(150, Math.min(800, next));
            });
          }}
        />
        <div style={{ height: `${simulationHeight}px`, flexShrink: 0, position: 'relative' }}>
          <Simulation3D />
        </div>
      </div>

      {/* Vertical Resizer between Center Panel and Code Editor */}
      <Resizer
        type="col"
        onResize={(deltaX) => {
          setCodeEditorWidth((prev) => {
            const next = prev - deltaX;
            return Math.max(260, Math.min(800, next));
          });
        }}
      />

      {/* Right panel */}
      <div style={{ width: `${codeEditorWidth}px`, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CodeEditor />
      </div>
    </div>
  );
};

const ProjectLoaderOverlay: React.FC = () => {
  const { isLoadingProject, loadingSteps, currentLoadingStep } = useSimulator();

  if (!isLoadingProject) return null;

  return (
    <div className="project-loader-overlay">
      <div className="project-loader-card">
        <div className="project-loader-spinner">
          <Loader2 className="spinner-icon" size={42} />
        </div>
        <h3>Reconstructing Design</h3>
        <div className="current-step">{currentLoadingStep}</div>
        
        <div className="steps-list">
          {loadingSteps.map((step, idx) => (
            <div 
              key={idx} 
              className={`step-item ${idx < loadingSteps.length - 1 ? 'completed' : ''}`}
            >
              <span className="step-bullet">✓</span>
              <span className="step-text">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [codeEditorWidth, setCodeEditorWidth] = React.useState(340);
  const [simulationHeight, setSimulationHeight] = React.useState(320);

  return (
    <SimulatorProvider>
      <div className="app-container">
        <DashboardHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <DashboardContent 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          codeEditorWidth={codeEditorWidth}
          setCodeEditorWidth={setCodeEditorWidth}
          simulationHeight={simulationHeight}
          setSimulationHeight={setSimulationHeight}
        />
        <ErrorModal />
        <ProjectLoaderOverlay />
      </div>
    </SimulatorProvider>
  );
};

export default App;
