import React, { useEffect, useRef, useState } from 'react';
import { useSimulator, CODE_TEMPLATES } from '../hooks/useSimulator';
import { Play, Square, Code, Terminal, RotateCcw } from 'lucide-react';
import { Resizer } from './Resizer';

export const CodeEditor: React.FC = () => {
  const {
    code,
    selectedTemplate,
    setCode,
    loadTemplate,
    serialLogs,
    clearSerialLogs,
    isRunning,
    startSimulation,
    stopSimulation
  } = useSimulator();

  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);
  const [serialHeight, setSerialHeight] = useState<number>(140);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Auto-scroll the serial monitor to bottom on new log
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [serialLogs]);

  // Compute line numbers based on code line count
  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 1);

  return (
    <div className="side-panel right" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Panel Title */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code size={16} style={{ color: 'var(--accent-blue)' }} />
          <span>ARDUINO CODE EDITOR</span>
        </div>
      </div>

      {/* Template selector and quick control bar */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-light)',
        background: 'rgba(255,255,255,0.01)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>PROJECT:</span>
          <select
            value={selectedTemplate}
            onChange={(e) => loadTemplate(e.target.value as keyof typeof CODE_TEMPLATES)}
            style={{
              flex: 1,
              background: '#0d0f13',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-light)',
              borderRadius: '6px',
              padding: '4px 8px',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
            disabled={isRunning}
          >
            <option value="blink">Blink LED</option>
            <option value="obstacleAvoidance">Obstacle Avoiding Robot</option>
            <option value="lightSensitive">Light Activated Motor</option>
          </select>

          <button
            onClick={() => loadTemplate(selectedTemplate === 'custom' ? 'blink' : (selectedTemplate as any))}
            className="btn btn-outline btn-sm"
            style={{ padding: '6px' }}
            disabled={isRunning}
            title="Reset code template"
          >
            <RotateCcw size={12} />
          </button>
        </div>

        {/* Quick simulator play/stop buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
          {!isRunning ? (
            <button className="btn btn-success btn-sm" onClick={startSimulation} style={{ height: '32px' }}>
              <Play size={14} fill="currentColor" />
              RUN CODE
            </button>
          ) : (
            <button className="btn btn-danger btn-sm" onClick={stopSimulation} style={{ height: '32px' }}>
              <Square size={14} fill="currentColor" />
              STOP
            </button>
          )}
        </div>
      </div>

      {/* Editor Body with Code Textarea and line numbers */}
      <div className="editor-container">
        <div className="code-textarea-wrapper" style={{ display: 'flex', position: 'relative', flex: 1, overflow: 'hidden' }}>
          {/* Line Numbers Column */}
          <div 
            ref={lineNumbersRef}
            style={{
              width: '36px',
              backgroundColor: '#090a0d',
              borderRight: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              padding: '16px 0',
              textAlign: 'right',
              paddingRight: '8px',
              userSelect: 'none',
              lineHeight: '1.5em',
              overflow: 'hidden',
              height: '100%'
            }}
          >
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} style={{ height: '1.5em' }}>{i + 1}</div>
            ))}
          </div>

          {/* Text Area */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onScroll={handleScroll}
            className="code-editor-textarea"
            spellCheck="false"
            style={{
              padding: '16px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              lineHeight: '1.5em',
              flex: 1,
              overflowY: 'auto'
            }}
            placeholder="// Write your Arduino sketch here..."
            disabled={isRunning}
          />
        </div>

        {/* Vertical Resizer above Serial Monitor */}
        <Resizer
          type="row"
          onResize={(deltaY) => {
            setSerialHeight((prev) => Math.max(60, Math.min(600, prev - deltaY)));
          }}
        />

        {/* Serial Monitor console */}
        <div className="serial-monitor" style={{ height: `${serialHeight}px`, flexShrink: 0 }}>
          <div style={{
            padding: '6px 14px',
            borderBottom: '1px solid var(--border-light)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Terminal size={14} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SERIAL MONITOR
              </span>
            </div>
            <button
              onClick={clearSerialLogs}
              className="btn btn-outline btn-sm"
              style={{ padding: '2px 6px', fontSize: '0.65rem', minHeight: 'auto' }}
            >
              Clear
            </button>
          </div>

          {/* Scrolling Serial Console output */}
          <div className="serial-logs">
            {serialLogs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Console is empty. Run simulation to log serial output...</span>
            ) : (
              serialLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
export default CodeEditor;
