import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { compileArduinoCode, type CompileResult } from '../utils/compiler';

// --- Pin Definition ---
export interface Pin {
  name: string;
  x: number; // local offset x relative to component
  y: number; // local offset y relative to component
  type: 'power' | 'gnd' | 'digital' | 'analog' | 'motor-out' | 'motor-in' | 'signal';
}

// --- Component Definition ---
export interface RoboticComponent {
  id: string; // unique, e.g. "arduino_0", "resistor_1"
  type: 'arduino' | 'hbridge' | 'motor' | 'sensor' | 'battery' | 'led' | 'ldr' | 'breadboard' | 'resistor' | 'spst' | 'spdt';
  label: string;
  x: number; // canvas absolute x
  y: number; // canvas absolute y
  width: number;
  height: number;
  pins: Pin[];
  
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'white';
  state?: 'open' | 'closed' | 'L1' | 'L2';

  // 3D positioning and rotation (Welding)
  x3d: number;
  y3d: number;
  z3d: number;
  rx3d: number; // Rotation X (pitch)
  ry3d: number; // Rotation Y (yaw)
  rz3d: number; // Rotation Z (roll)
}

// --- Wire Connection Definition ---
export interface WireConnection {
  id: string;
  from: { componentId: string; pinName: string };
  to: { componentId: string; pinName: string };
  color: string;
}

// --- Templates for Components ---
export const INITIAL_COMPONENTS: RoboticComponent[] = [
  {
    id: 'arduino',
    type: 'arduino',
    label: 'Arduino Uno R3',
    x: 320,
    y: 160,
    width: 200,
    height: 140,
    pins: [
      { name: '5V', x: 50, y: 140, type: 'power' },
      { name: '3.3V', x: 70, y: 140, type: 'power' },
      { name: 'GND1', x: 90, y: 140, type: 'gnd' },
      { name: 'GND2', x: 110, y: 140, type: 'gnd' },
      { name: 'A0', x: 130, y: 140, type: 'analog' },
      { name: 'A1', x: 150, y: 140, type: 'analog' },
      { name: 'A2', x: 170, y: 140, type: 'analog' },
      { name: 'A3', x: 190, y: 140, type: 'analog' },
      
      { name: 'D2', x: 190, y: 0, type: 'digital' },
      { name: 'D3', x: 175, y: 0, type: 'digital' },
      { name: 'D4', x: 160, y: 0, type: 'digital' },
      { name: 'D5', x: 145, y: 0, type: 'digital' },
      { name: 'D6', x: 130, y: 0, type: 'digital' },
      { name: 'D7', x: 115, y: 0, type: 'digital' },
      { name: 'D8', x: 100, y: 0, type: 'digital' },
      { name: 'D9', x: 85, y: 0, type: 'digital' },
      { name: 'D10', x: 70, y: 0, type: 'digital' },
      { name: 'D11', x: 55, y: 0, type: 'digital' },
      { name: 'D12', x: 40, y: 0, type: 'digital' },
      { name: 'D13', x: 25, y: 0, type: 'digital' },
      { name: 'GND3', x: 10, y: 0, type: 'gnd' },
    ],
    x3d: 0, y3d: 0.06, z3d: 0.1,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'hbridge',
    type: 'hbridge',
    label: 'L298N H-Bridge',
    x: 320,
    y: 380,
    width: 180,
    height: 120,
    pins: [
      { name: '12V', x: 20, y: 120, type: 'power' },
      { name: 'GND', x: 45, y: 120, type: 'gnd' },
      { name: '5V', x: 70, y: 120, type: 'power' },
      
      { name: 'IN1', x: 100, y: 120, type: 'signal' },
      { name: 'IN2', x: 120, y: 120, type: 'signal' },
      { name: 'IN3', x: 140, y: 120, type: 'signal' },
      { name: 'IN4', x: 160, y: 120, type: 'signal' },
      
      { name: 'OUT1', x: 0, y: 40, type: 'motor-out' },
      { name: 'OUT2', x: 0, y: 70, type: 'motor-out' },
      
      { name: 'OUT3', x: 180, y: 40, type: 'motor-out' },
      { name: 'OUT4', x: 180, y: 70, type: 'motor-out' },
    ],
    x3d: 0, y3d: 0.07, z3d: -0.18,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'battery',
    type: 'battery',
    label: '9V Battery',
    x: 60,
    y: 320,
    width: 100,
    height: 140,
    pins: [
      { name: '+', x: 30, y: 0, type: 'power' },
      { name: '-', x: 70, y: 0, type: 'gnd' }
    ],
    x3d: 0, y3d: 0.11, z3d: -0.32,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'motor',
    type: 'motor',
    label: 'DC Motor',
    x: 60,
    y: 80,
    width: 120,
    height: 80,
    pins: [
      { name: 'M+', x: 50, y: 80, type: 'motor-in' },
      { name: 'M-', x: 70, y: 80, type: 'motor-in' }
    ],
    x3d: -0.38, y3d: 0, z3d: 0,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'sensor',
    type: 'sensor',
    label: 'Ultrasonic (HC-SR04)',
    x: 60,
    y: 520,
    width: 140,
    height: 80,
    pins: [
      { name: 'VCC', x: 20, y: 80, type: 'power' },
      { name: 'Trig', x: 50, y: 80, type: 'signal' },
      { name: 'Echo', x: 90, y: 80, type: 'signal' },
      { name: 'GND', x: 120, y: 80, type: 'gnd' }
    ],
    x3d: 0, y3d: 0.08, z3d: 0.38,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'led',
    type: 'led',
    label: 'LED Indicator',
    x: 620,
    y: 320,
    width: 80,
    height: 100,
    pins: [
      { name: 'Anode', x: 25, y: 100, type: 'signal' },
      { name: 'Cathode', x: 55, y: 100, type: 'gnd' }
    ],
    x3d: 0.2, y3d: 0.06, z3d: -0.1,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'ldr',
    type: 'ldr',
    label: 'Light Sensor (LDR)',
    x: 620,
    y: 490,
    width: 100,
    height: 80,
    pins: [
      { name: 'VCC', x: 20, y: 80, type: 'power' },
      { name: 'Out', x: 50, y: 80, type: 'analog' },
      { name: 'GND', x: 80, y: 80, type: 'gnd' }
    ],
    x3d: 0.2, y3d: 0.05, z3d: 0.25,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'breadboard',
    type: 'breadboard',
    label: 'Breadboard',
    x: 200,
    y: 200,
    width: 240,
    height: 180,
    pins: [
      // vertical buses
      { name: 'V+1', x: 15, y: 30, type: 'power' },
      { name: 'V+2', x: 15, y: 70, type: 'power' },
      { name: 'V+3', x: 15, y: 110, type: 'power' },
      { name: 'V+4', x: 15, y: 150, type: 'power' },
      { name: 'G1', x: 35, y: 30, type: 'gnd' },
      { name: 'G2', x: 35, y: 70, type: 'gnd' },
      { name: 'G3', x: 35, y: 110, type: 'gnd' },
      { name: 'G4', x: 35, y: 150, type: 'gnd' },
      
      // rows 1-8
      { name: 'R1A', x: 70, y: 30, type: 'signal' },
      { name: 'R1B', x: 95, y: 30, type: 'signal' },
      { name: 'R1C', x: 120, y: 30, type: 'signal' },
      { name: 'R1D', x: 145, y: 30, type: 'signal' },
      { name: 'R1E', x: 170, y: 30, type: 'signal' },
      
      { name: 'R2A', x: 70, y: 50, type: 'signal' },
      { name: 'R2B', x: 95, y: 50, type: 'signal' },
      { name: 'R2C', x: 120, y: 50, type: 'signal' },
      { name: 'R2D', x: 145, y: 50, type: 'signal' },
      { name: 'R2E', x: 170, y: 50, type: 'signal' },
      
      { name: 'R3A', x: 70, y: 70, type: 'signal' },
      { name: 'R3B', x: 95, y: 70, type: 'signal' },
      { name: 'R3C', x: 120, y: 70, type: 'signal' },
      { name: 'R3D', x: 145, y: 70, type: 'signal' },
      { name: 'R3E', x: 170, y: 70, type: 'signal' },
      
      { name: 'R4A', x: 70, y: 90, type: 'signal' },
      { name: 'R4B', x: 95, y: 90, type: 'signal' },
      { name: 'R4C', x: 120, y: 90, type: 'signal' },
      { name: 'R4D', x: 145, y: 90, type: 'signal' },
      { name: 'R4E', x: 170, y: 90, type: 'signal' },
      
      { name: 'R5A', x: 70, y: 110, type: 'signal' },
      { name: 'R5B', x: 95, y: 110, type: 'signal' },
      { name: 'R5C', x: 120, y: 110, type: 'signal' },
      { name: 'R5D', x: 145, y: 110, type: 'signal' },
      { name: 'R5E', x: 170, y: 110, type: 'signal' },
      
      { name: 'R6A', x: 70, y: 130, type: 'signal' },
      { name: 'R6B', x: 95, y: 130, type: 'signal' },
      { name: 'R6C', x: 120, y: 130, type: 'signal' },
      { name: 'R6D', x: 145, y: 130, type: 'signal' },
      { name: 'R6E', x: 170, y: 130, type: 'signal' },
      
      { name: 'R7A', x: 70, y: 150, type: 'signal' },
      { name: 'R7B', x: 95, y: 150, type: 'signal' },
      { name: 'R7C', x: 120, y: 150, type: 'signal' },
      { name: 'R7D', x: 145, y: 150, type: 'signal' },
      { name: 'R7E', x: 170, y: 150, type: 'signal' },
      
      { name: 'R8A', x: 70, y: 170, type: 'signal' },
      { name: 'R8B', x: 95, y: 170, type: 'signal' },
      { name: 'R8C', x: 120, y: 170, type: 'signal' },
      { name: 'R8D', x: 145, y: 170, type: 'signal' },
      { name: 'R8E', x: 170, y: 170, type: 'signal' }
    ],
    x3d: 0, y3d: 0.04, z3d: 0.02,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'resistor',
    type: 'resistor',
    label: 'Resistor (220Ω)',
    x: 100,
    y: 100,
    width: 80,
    height: 40,
    pins: [
      { name: 'P1', x: 5, y: 20, type: 'signal' },
      { name: 'P2', x: 75, y: 20, type: 'signal' }
    ],
    x3d: -0.2, y3d: 0.05, z3d: -0.2,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'spst',
    type: 'spst',
    label: 'SPST Switch',
    x: 100,
    y: 100,
    width: 90,
    height: 50,
    pins: [
      { name: 'L1', x: 5, y: 25, type: 'signal' },
      { name: 'L2', x: 85, y: 25, type: 'signal' }
    ],
    state: 'open',
    x3d: -0.1, y3d: 0.05, z3d: -0.2,
    rx3d: 0, ry3d: 0, rz3d: 0
  },
  {
    id: 'spdt',
    type: 'spdt',
    label: 'SPDT Switch',
    x: 100,
    y: 100,
    width: 100,
    height: 60,
    pins: [
      { name: 'COM', x: 5, y: 30, type: 'signal' },
      { name: 'L1', x: 95, y: 15, type: 'signal' },
      { name: 'L2', x: 95, y: 45, type: 'signal' }
    ],
    state: 'L1',
    x3d: 0.1, y3d: 0.05, z3d: -0.2,
    rx3d: 0, ry3d: 0, rz3d: 0
  }
];

// --- Templates ---
export const CODE_TEMPLATES = {
  new: `// Clean sketch
void setup() {
  // put your setup code here, to run once:

}

void loop() {
  // put your main code here, to run repeatedly:

}`,
  blink: `// Template: Blink LED
int ledPin = 13; // Connected to D13

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("LED Blink Initialized");
}

void loop() {
  digitalWrite(ledPin, HIGH);
  Serial.println("LED is ON");
  delay(1000);
  
  digitalWrite(ledPin, LOW);
  Serial.println("LED is OFF");
  delay(1000);
}`,
  obstacleAvoidance: `// Template: Obstacle Avoiding Robot
// Connect H-Bridge inputs to Arduino digital pins:
int ENA_IN1 = 5; // Left Motor dir A
int ENA_IN2 = 6; // Left Motor dir B
int ENB_IN3 = 9; // Right Motor dir A
int ENB_IN4 = 10; // Right Motor dir B

// Connect Ultrasonic sensor pins:
int trigPin = 11;
int echoPin = 12;

int ledPin = 13; // Warning light

void setup() {
  pinMode(ENA_IN1, OUTPUT);
  pinMode(ENA_IN2, OUTPUT);
  pinMode(ENB_IN3, OUTPUT);
  pinMode(ENB_IN4, OUTPUT);
  
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  
  pinMode(ledPin, OUTPUT);
  
  Serial.begin(9600);
  Serial.println("Robot Obstacle Avoidance Active!");
}

void loop() {
  // Read distance from ultrasonic sensor
  digitalWrite(trigPin, LOW);
  delay(2);
  digitalWrite(trigPin, HIGH);
  delay(10);
  digitalWrite(trigPin, LOW);
  
  long distance = pulseIn(echoPin, HIGH);
  
  Serial.print("Sensor distance: ");
  Serial.print(distance);
  Serial.println(" cm");
  
  if (distance < 25) {
    Serial.println("Obstacle CLOSE! Reversing left...");
    digitalWrite(ledPin, HIGH);
    
    // Motor L: reverse
    digitalWrite(ENA_IN1, LOW);
    digitalWrite(ENA_IN2, HIGH);
    // Motor R: forward
    digitalWrite(ENB_IN3, HIGH);
    digitalWrite(ENB_IN4, LOW);
    
    delay(1200);
  } else {
    digitalWrite(ledPin, LOW);
    
    // Motor L: Forward
    digitalWrite(ENA_IN1, HIGH);
    digitalWrite(ENA_IN2, LOW);
    // Motor R: Forward
    digitalWrite(ENB_IN3, HIGH);
    digitalWrite(ENB_IN4, LOW);
    
    delay(200);
  }
}`,
  lightSensitive: `// Template: Light Activated Motors
int ldrPin = A0; // Light Sensor output to Analog 0
int motorIN1 = 5; // Left motor forward
int motorIN3 = 9; // Right motor forward

void setup() {
  pinMode(motorIN1, OUTPUT);
  pinMode(motorIN3, OUTPUT);
  Serial.begin(9600);
  Serial.println("Phototropic Simulator Active");
}

void loop() {
  int lightLevel = analogRead(ldrPin);
  Serial.print("Ambient Light: ");
  Serial.println(lightLevel);
  
  if (lightLevel < 400) {
    Serial.println("Darkness! Stopping motors.");
    digitalWrite(motorIN1, LOW);
    digitalWrite(motorIN3, LOW);
  } else {
    Serial.println("Light detected! Driving forward.");
    digitalWrite(motorIN1, HIGH);
    digitalWrite(motorIN3, HIGH);
  }
  delay(500);
}`
};

interface SimulatorContextType {
  components: RoboticComponent[];
  wires: WireConnection[];
  code: string;
  selectedTemplate: keyof typeof CODE_TEMPLATES | 'custom';
  isRunning: boolean;
  error: string | null;
  serialLogs: string[];
  activeWireColor: string;
  sensorDistance: number;
  lightLevel: number;
  ledOn: boolean;
  
  // Power states for components
  ledPowerStates: Record<string, 'unpowered' | 'powered' | 'blown'>;
  motorPowerStates: Record<string, number>; // motor ID -> speed (-255 to 255)
  selected3DId: string | null;

  // Actions
  setComponents: React.Dispatch<React.SetStateAction<RoboticComponent[]>>;
  addComponent: (type: RoboticComponent['type']) => void;
  deleteComponent: (id: string) => void;
  addWire: (from: { componentId: string; pinName: string }, to: { componentId: string; pinName: string }) => void;
  deleteWire: (id: string) => void;
  clearWires: () => void;
  setCode: (code: string) => void;
  loadTemplate: (templateName: keyof typeof CODE_TEMPLATES) => void;
  setActiveWireColor: (color: string) => void;
  startSimulation: () => void;
  stopSimulation: () => void;
  clearSerialLogs: () => void;
  setSensorDistance: (dist: number) => void;
  setLightLevel: (level: number) => void;
  resetRobotPos: () => void;
  setObstaclePos: (pos: [number, number, number]) => void;
  updateComponentPosition: (id: string, x: number, y: number) => void;
  updateComponentColor: (id: string, color: 'red' | 'green' | 'blue' | 'yellow' | 'white') => void;
  update3DPosition: (id: string, field: 'x3d' | 'y3d' | 'z3d' | 'rx3d' | 'ry3d' | 'rz3d', val: number) => void;
  setSelected3DId: (id: string | null) => void;
  closeErrorModal: () => void;
  toggleSwitch: (id: string) => void;
  
  // Rigid body offsets
  robotPos: [number, number, number];
  robotHeading: number;
  obstaclePos: [number, number, number];

  // Project Import/Export
  isLoadingProject: boolean;
  loadingSteps: string[];
  currentLoadingStep: string;
  saveProject: () => void;
  loadProjectData: (jsonData: string) => Promise<void>;
}

const SimulatorContext = createContext<SimulatorContextType | undefined>(undefined);

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [components, setComponents] = useState<RoboticComponent[]>([]);
  const [wires, setWires] = useState<WireConnection[]>([]);
  const [code, setCode] = useState<string>(CODE_TEMPLATES.blink);
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof CODE_TEMPLATES | 'custom'>('blink');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [activeWireColor, setActiveWireColor] = useState<string>('#ef4444');

  // HUD and Welder Selects
  const [selected3DId, setSelected3DId] = useState<string | null>(null);

  // Environmental inputs
  const [sensorDistance, setSensorDistance] = useState<number>(80);
  const [lightLevel, setLightLevel] = useState<number>(600);

  // Live Electrical simulation states
  const [ledPowerStates, setLedPowerStates] = useState<Record<string, 'unpowered' | 'powered' | 'blown'>>({});
  const [motorPowerStates, setMotorPowerStates] = useState<Record<string, number>>({});

  // 3D Kinematics State for custom welded group
  const [robotPos, setRobotPos] = useState<[number, number, number]>([0, 0.4, 0]);
  const [robotHeading, setRobotHeading] = useState<number>(0);
  const [obstaclePos, setObstaclePos] = useState<[number, number, number]>([0, 0.5, -4.5]);

  // Project Loading states
  const [isLoadingProject, setIsLoadingProject] = useState<boolean>(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [currentLoadingStep, setCurrentLoadingStep] = useState<string>('');

  // Refs for Arduino execution loop
  const executionRef = useRef<{
    setupGen?: Generator<any, void, any>;
    loopGen?: Generator<any, void, any>;
    delayMsRemaining: number;
    pinStates: Record<number, number>; // Arduino pin outputs (HIGH/LOW)
    pinModes: Record<number, string>;
  }>({
    delayMsRemaining: 0,
    pinStates: {},
    pinModes: {},
  });

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Load template
  const loadTemplate = (templateName: keyof typeof CODE_TEMPLATES) => {
    setCode(CODE_TEMPLATES[templateName]);
    setSelectedTemplate(templateName);
    stopSimulation();
  };

  // Drag component 2D coordinates
  const updateComponentPosition = (id: string, x: number, y: number) => {
    setComponents(prev => prev.map(comp => comp.id === id ? { ...comp, x, y } : comp));
  };

  // Update component color
  const updateComponentColor = (id: string, color: 'red' | 'green' | 'blue' | 'yellow' | 'white') => {
    setComponents(prev => prev.map(comp => comp.id === id ? { ...comp, color } : comp));
  };

  // Welder component 3D coordinates
  const update3DPosition = (id: string, field: 'x3d' | 'y3d' | 'z3d' | 'rx3d' | 'ry3d' | 'rz3d', val: number) => {
    setComponents(prev => prev.map(comp => comp.id === id ? { ...comp, [field]: val } : comp));
  };

  // Add a component (multiple allowed)
  const addComponent = (type: RoboticComponent['type']) => {
    const template = INITIAL_COMPONENTS.find(c => c.type === type);
    if (!template) return;

    const count = components.filter(c => c.type === type).length;
    const uniqueId = `${type}_${count}_${Math.random().toString(36).substr(2, 4)}`;
    
    // Position offset dynamically so they don't spawn completely on top of each other in 2D
    const offset = count * 20;

    const newComp: RoboticComponent = {
      ...template,
      id: uniqueId,
      label: `${template.label} #${count + 1}`,
      x: Math.max(10, Math.min(700, template.x + offset)),
      y: Math.max(10, Math.min(500, template.y + offset)),
      color: type === 'led' ? 'red' : undefined
    };

    setComponents(prev => [...prev, newComp]);
  };

  // Delete a component
  const deleteComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    // Prune wires
    setWires(prev => prev.filter(w => w.from.componentId !== id && w.to.componentId !== id));
    if (selected3DId === id) setSelected3DId(null);
    setIsRunning(false);
  };

  // Add a wiring connection
  const addWire = (from: { componentId: string; pinName: string }, to: { componentId: string; pinName: string }) => {
    if (from.componentId === to.componentId && from.pinName === to.pinName) return;

    // Check if connection already exists
    const duplicate = wires.some(w => 
      (w.from.componentId === from.componentId && w.from.pinName === from.pinName && 
       w.to.componentId === to.componentId && w.to.pinName === to.pinName) ||
      (w.from.componentId === to.componentId && w.from.pinName === to.pinName && 
       w.to.componentId === from.componentId && w.to.pinName === from.pinName)
    );
    if (duplicate) return;

    const newWire: WireConnection = {
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from,
      to,
      color: activeWireColor
    };
    setWires(prev => [...prev, newWire]);
  };

  const deleteWire = (id: string) => {
    setWires(prev => prev.filter(w => w.id !== id));
  };

  const clearWires = () => {
    setWires([]);
  };

  const clearSerialLogs = () => {
    setSerialLogs([]);
  };

  const resetRobotPos = () => {
    setRobotPos([0, 0.4, 0]);
    setRobotHeading(0);
    setSensorDistance(80);
  };

  const closeErrorModal = () => {
    setError(null);
  };

  const toggleSwitch = (id: string) => {
    setComponents(prev => prev.map(comp => {
      if (comp.id === id) {
        if (comp.type === 'spst') {
          return { ...comp, state: comp.state === 'closed' ? 'open' : 'closed' };
        } else if (comp.type === 'spdt') {
          return { ...comp, state: comp.state === 'L2' ? 'L1' : 'L2' };
        }
      }
      return comp;
    }));
  };

  // Graph tracer for electrical components
  const getConnectedComponents = (): { pinToComponentId: Record<string, string>; components: string[][] } => {
    const adj: Record<string, string[]> = {};
    
    // 1. Initialize empty lists for all pins
    components.forEach(c => {
      c.pins.forEach(p => {
        const pinKey = `${c.id}:${p.name}`;
        adj[pinKey] = [];
      });
    });

    // 2. Add wires
    wires.forEach(w => {
      const u = `${w.from.componentId}:${w.from.pinName}`;
      const v = `${w.to.componentId}:${w.to.pinName}`;
      if (adj[u] && adj[v]) {
        adj[u].push(v);
        adj[v].push(u);
      }
    });

    // 3. Add internal component connections
    components.forEach(c => {
      // BREADBOARD Row internals (R1A-R1E connect together, etc)
      if (c.type === 'breadboard') {
        // Rows 1 to 8
        for (let r = 1; r <= 8; r++) {
          const colPins = ['A', 'B', 'C', 'D', 'E'].map(col => `${c.id}:R${r}${col}`);
          for (let i = 0; i < colPins.length; i++) {
            for (let j = i + 1; j < colPins.length; j++) {
              const u = colPins[i];
              const v = colPins[j];
              if (adj[u] && adj[v]) {
                adj[u].push(v);
                adj[v].push(u);
              }
            }
          }
        }
        // Power rails
        const vccBus = ['V+1', 'V+2', 'V+3', 'V+4'].map(pName => `${c.id}:${pName}`);
        for (let i = 0; i < vccBus.length; i++) {
          for (let j = i + 1; j < vccBus.length; j++) {
            const u = vccBus[i];
            const v = vccBus[j];
            if (adj[u] && adj[v]) {
              adj[u].push(v);
              adj[v].push(u);
            }
          }
        }
        const gndBus = ['G1', 'G2', 'G3', 'G4'].map(pName => `${c.id}:${pName}`);
        for (let i = 0; i < gndBus.length; i++) {
          for (let j = i + 1; j < gndBus.length; j++) {
            const u = gndBus[i];
            const v = gndBus[j];
            if (adj[u] && adj[v]) {
              adj[u].push(v);
              adj[v].push(u);
            }
          }
        }
      }
      
      // SPST Switch internal connection when closed
      if (c.type === 'spst' && c.state === 'closed') {
        const u = `${c.id}:L1`;
        const v = `${c.id}:L2`;
        if (adj[u] && adj[v]) {
          adj[u].push(v);
          adj[v].push(u);
        }
      }

      // SPDT Switch internal connection depending on position
      if (c.type === 'spdt') {
        const com = `${c.id}:COM`;
        const targetPin = c.state === 'L2' ? `${c.id}:L2` : `${c.id}:L1`;
        if (adj[com] && adj[targetPin]) {
          adj[com].push(targetPin);
          adj[targetPin].push(com);
        }
      }
    });

    const visited = new Set<string>();
    const pinToComponentId: Record<string, string> = {};
    const componentsList: string[][] = [];
    let componentCounter = 0;

    Object.keys(adj).forEach(startPin => {
      if (!visited.has(startPin)) {
        const compId = `c_${componentCounter++}`;
        const currentComp: string[] = [];
        const queue = [startPin];
        visited.add(startPin);

        while (queue.length > 0) {
          const node = queue.shift()!;
          currentComp.push(node);
          pinToComponentId[node] = compId;

          adj[node].forEach(neighbor => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          });
        }
        componentsList.push(currentComp);
      }
    });

    return { pinToComponentId, components: componentsList };
  };

  // --- Circuits Validation ---
  const validateSchematic = (pinToComponentId: Record<string, string>): string[] => {
    const errors: string[] = [];

    const isConnected = (p1: string, p2: string): boolean => {
      return pinToComponentId[p1] !== undefined && pinToComponentId[p1] === pinToComponentId[p2];
    };

    const isConnectedToAny = (p1: string, targetPins: string[]): boolean => {
      return targetPins.some(tp => isConnected(p1, tp));
    };

    if (components.length === 0) {
      errors.push("The board is empty! Add components from the Toolbox to start simulating.");
      return errors;
    }

    // Short-circuits: Check battery + directly connected to battery -
    const batteryList = components.filter(c => c.type === 'battery');
    batteryList.forEach(bat => {
      if (isConnected(`${bat.id}:+`, `${bat.id}:-`)) {
        errors.push(`Short Circuit: Battery '${bat.label}' positive (+) is connected directly to negative (-). This will overheat and damage the battery!`);
      }
    });

    // Short-circuits: Arduino 5V/3.3V connected to GND
    const arduinoList = components.filter(c => c.type === 'arduino');
    arduinoList.forEach(ard => {
      const gnds = [`${ard.id}:GND1`, `${ard.id}:GND2`, `${ard.id}:GND3`];
      if (isConnectedToAny(`${ard.id}:5V`, gnds) || isConnectedToAny(`${ard.id}:3.3V`, gnds)) {
        errors.push(`Short Circuit: Arduino '${ard.label}' 5V or 3.3V rail is shorted directly to Ground (GND).`);
      }
    });

    return errors;
  };

  const startSimulation = () => {
    clearSerialLogs();
    
    const { pinToComponentId } = getConnectedComponents();
    const schematicErrors = validateSchematic(pinToComponentId);
    if (schematicErrors.length > 0) {
      setError(`Wiring Error:\n\n${schematicErrors.join('\n\n')}`);
      setIsRunning(false);
      return;
    }

    // Reset powered blowout state map
    setLedPowerStates({});
    setMotorPowerStates({});

    const hasArduino = components.some(c => c.type === 'arduino');
    if (hasArduino) {
      // Setup Arduino Mock Code Runner
      const getSensorState = (_type: 'analog' | 'digital', pin: number): number => {
        const arduinoInstance = components.find(c => c.type === 'arduino')!;
        const arduinoPinName = pin >= 14 ? `A${pin - 14}` : `D${pin}`;
        const arduinoPinKey = `${arduinoInstance.id}:${arduinoPinName}`;
        
        // Find LDR connected to it
        const ldrInstance = components.find(c => c.type === 'ldr');
        if (ldrInstance && pinToComponentId[arduinoPinKey] === pinToComponentId[`${ldrInstance.id}:Out`]) {
          return lightLevel;
        }
        
        // Find Ultrasonic sensor connected to it
        const sensorInstance = components.find(c => c.type === 'sensor');
        if (sensorInstance && pinToComponentId[arduinoPinKey] === pinToComponentId[`${sensorInstance.id}:Echo`]) {
          return Math.round(sensorDistance);
        }

        return 0;
      };

      const compiled: CompileResult = compileArduinoCode(code, getSensorState);
      if (!compiled.success) {
        setError(compiled.error || "Compilation Failed: Unknown error.");
        setIsRunning(false);
        return;
      }

      executionRef.current = {
        setupGen: compiled.setup!(),
        loopGen: compiled.loop!(),
        delayMsRemaining: 0,
        pinStates: {},
        pinModes: {},
      };
    } else {
      // Clear execution ref
      executionRef.current = {
        delayMsRemaining: 0,
        pinStates: {},
        pinModes: {},
      };
    }

    setIsRunning(true);
    setError(null);
    setSerialLogs(["--- Analog Simulation Started ---"]);

    import('canvas-confetti').then((confetti) => {
      confetti.default({ particleCount: 60, spread: 50, origin: { y: 0.8 } });
    }).catch(err => console.log(err));
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setLedPowerStates({});
    setMotorPowerStates({});
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Solver and Kinematics Simulation Tick Loop
  useEffect(() => {
    if (!isRunning) return;

    lastTimeRef.current = performance.now();

    const simulationTick = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      const refs = executionRef.current;
      const { pinToComponentId } = getConnectedComponents();
      
      const isConnected = (p1: string, p2: string): boolean => {
        return pinToComponentId[p1] !== undefined && pinToComponentId[p1] === pinToComponentId[p2];
      };

      // 1. Run Arduino compiler tick (if Arduino is present and powered)
      const arduino = components.find(c => c.type === 'arduino');
      let isArduinoRunning = false;

      if (arduino) {
        // Arduino is powered if GND is connected to a GND reference and 5V or power is connected
        // Let's assume Arduino is always powered by USB/battery or just directly runs for learning ease.
        isArduinoRunning = true;
      }

      if (isArduinoRunning && refs.loopGen) {
        if (refs.delayMsRemaining > 0) {
          refs.delayMsRemaining -= dt * 1000 * 2.0;
        } else {
          let running = true;
          let iterations = 0;
          const MAX_STEPS = 20;

          while (running && refs.delayMsRemaining <= 0 && iterations < MAX_STEPS) {
            iterations++;
            let currentGen = refs.setupGen;
            let isSetup = true;

            if (!currentGen || currentGen.next().done) {
              currentGen = refs.loopGen;
              isSetup = false;
              refs.setupGen = undefined;
            }

            if (!currentGen) {
              running = false;
              break;
            }

            let nextFeedValue: any = undefined;
            const lastYield = (currentGen as any)._lastYield;
            if (lastYield && lastYield.type === 'analogRead') {
              const pin = lastYield.pin;
              const pinName = pin >= 14 ? `A${pin - 14}` : `D${pin}`;
              const arduinoPinKey = `${arduino!.id}:${pinName}`;
              
              const ldr = components.find(c => c.type === 'ldr');
              if (ldr && isConnected(arduinoPinKey, `${ldr.id}:Out`)) {
                nextFeedValue = lightLevel;
              }
            }

            try {
              const result = currentGen.next(nextFeedValue);
              if (result.done) {
                if (!isSetup) {
                  const compiled = compileArduinoCode(code, () => 0);
                  refs.loopGen = compiled.loop!();
                }
                continue;
              }

              const step = result.value;
              (currentGen as any)._lastYield = step;

              if (!step || typeof step !== 'object') continue;

              switch (step.type) {
                case 'pinMode':
                  refs.pinModes[step.pin] = step.mode;
                  break;
                case 'digitalWrite':
                  refs.pinStates[step.pin] = step.val;
                  break;
                case 'analogWrite':
                  refs.pinStates[step.pin] = step.val;
                  break;
                case 'delay':
                  refs.delayMsRemaining = step.ms;
                  running = false;
                  break;
                case 'serial':
                  setSerialLogs(prev => {
                    const nextLogs = [...prev];
                    const valStr = step.val !== undefined ? String(step.val) : '';
                    if (nextLogs.length > 50) nextLogs.shift();
                    if (step.ln) nextLogs.push(valStr);
                    else if (nextLogs.length > 0) nextLogs[nextLogs.length - 1] += valStr;
                    else nextLogs.push(valStr);
                    return nextLogs;
                  });
                  break;
                case 'digitalRead':
                case 'analogRead':
                  running = false;
                  break;
              }
            } catch (err: any) {
              setError(`Runtime Error: ${err.message || 'Execution failed.'}`);
              setIsRunning(false);
              running = false;
            }
          }
        }
      }

      // 2. ANALOG ELECTRICAL NODAL SOLVER
      // List of power sources actively outputting voltage
      interface PowerSource {
        pinName: string;
        voltage: number;
        sourceId: string; // matches component ID
        type: 'vcc' | 'gnd';
      }

      const activeSources: PowerSource[] = [];

      // Battery sources
      components.forEach(c => {
        if (c.type === 'battery') {
          activeSources.push({ pinName: `${c.id}:+`, voltage: 9, sourceId: c.id, type: 'vcc' });
          activeSources.push({ pinName: `${c.id}:-`, voltage: 0, sourceId: c.id, type: 'gnd' });
        }
      });

      // Arduino power sources
      components.forEach(c => {
        if (c.type === 'arduino') {
          activeSources.push({ pinName: `${c.id}:5V`, voltage: 5, sourceId: c.id, type: 'vcc' });
          activeSources.push({ pinName: `${c.id}:3.3V`, voltage: 3.3, sourceId: c.id, type: 'vcc' });
          activeSources.push({ pinName: `${c.id}:GND1`, voltage: 0, sourceId: c.id, type: 'gnd' });
          activeSources.push({ pinName: `${c.id}:GND2`, voltage: 0, sourceId: c.id, type: 'gnd' });
          activeSources.push({ pinName: `${c.id}:GND3`, voltage: 0, sourceId: c.id, type: 'gnd' });

          // Arduino digital pins driven from code
          Object.keys(refs.pinStates).forEach(pinKey => {
            const pinNum = Number(pinKey);
            const pinVal = refs.pinStates[pinNum]; // 0 or 1, or PWM
            const pinName = pinNum >= 14 ? `A${pinNum - 14}` : `D${pinNum}`;
            
            if (pinVal > 0) {
              activeSources.push({ pinName: `${c.id}:${pinName}`, voltage: 5 * (pinVal / 255 || 1.0), sourceId: c.id, type: 'vcc' });
            } else {
              activeSources.push({ pinName: `${c.id}:${pinName}`, voltage: 0, sourceId: c.id, type: 'gnd' });
            }
          });
        }
      });

      // H-Bridge output logic (Primary pass to check H-Bridge Inputs IN1-IN4)
      const hbridges = components.filter(c => c.type === 'hbridge');
      const hbridgeStates: Record<string, { in1: number; in2: number; in3: number; in4: number; hasPower: boolean }> = {};

      hbridges.forEach(hb => {
        // H-Bridge has power if 12V and GND connect to the same battery loop
        let hasPower = false;
        
        components.forEach(bat => {
          if (bat.type === 'battery') {
            if (isConnected(`${hb.id}:12V`, `${bat.id}:+`) && isConnected(`${hb.id}:GND`, `${bat.id}:-`)) {
              hasPower = true;
            }
          }
        });

        // Find control inputs IN1-IN4 connected to VCC or GND sources
        const checkInputState = (pinName: string): number => {
          const pinKey = `${hb.id}:${pinName}`;
          let state = 0; // default LOW
          
          activeSources.forEach(src => {
            if (isConnected(pinKey, src.pinName)) {
              if (src.type === 'vcc') state = 1;
            }
          });
          return state;
        };

        const in1 = checkInputState('IN1');
        const in2 = checkInputState('IN2');
        const in3 = checkInputState('IN3');
        const in4 = checkInputState('IN4');

        hbridgeStates[hb.id] = { in1, in2, in3, in4, hasPower };

        // If powered, append H-bridge OUT pins as secondary power sources
        if (hasPower) {
          const driveVolts = 12.0; // battery voltage
          
          // Motor L (OUT1, OUT2)
          if (in1 === 1 && in2 === 0) {
            activeSources.push({ pinName: `${hb.id}:OUT1`, voltage: driveVolts, sourceId: hb.id, type: 'vcc' });
            activeSources.push({ pinName: `${hb.id}:OUT2`, voltage: 0, sourceId: hb.id, type: 'gnd' });
          } else if (in1 === 0 && in2 === 1) {
            activeSources.push({ pinName: `${hb.id}:OUT1`, voltage: 0, sourceId: hb.id, type: 'gnd' });
            activeSources.push({ pinName: `${hb.id}:OUT2`, voltage: driveVolts, sourceId: hb.id, type: 'vcc' });
          }

          // Motor R (OUT3, OUT4)
          if (in3 === 1 && in4 === 0) {
            activeSources.push({ pinName: `${hb.id}:OUT3`, voltage: driveVolts, sourceId: hb.id, type: 'vcc' });
            activeSources.push({ pinName: `${hb.id}:OUT4`, voltage: 0, sourceId: hb.id, type: 'gnd' });
          } else if (in3 === 0 && in4 === 1) {
            activeSources.push({ pinName: `${hb.id}:OUT3`, voltage: 0, sourceId: hb.id, type: 'gnd' });
            activeSources.push({ pinName: `${hb.id}:OUT4`, voltage: driveVolts, sourceId: hb.id, type: 'vcc' });
          }
        }
      });

      // BFS Pathfinding helper to check general connectivity (with or without resistors)
      const hasPathBetween = (pinA: string, pinB: string, includeResistors: boolean): boolean => {
        const adj: Record<string, string[]> = {};
        
        components.forEach(c => {
          c.pins.forEach(p => {
            adj[`${c.id}:${p.name}`] = [];
          });
        });

        // Wires
        wires.forEach(w => {
          const u = `${w.from.componentId}:${w.from.pinName}`;
          const v = `${w.to.componentId}:${w.to.pinName}`;
          if (adj[u] && adj[v]) {
            adj[u].push(v);
            adj[v].push(u);
          }
        });

        // Breadboards
        components.forEach(c => {
          if (c.type === 'breadboard') {
            for (let r = 1; r <= 8; r++) {
              const colPins = ['A', 'B', 'C', 'D', 'E'].map(col => `${c.id}:R${r}${col}`);
              for (let i = 0; i < colPins.length; i++) {
                for (let j = i + 1; j < colPins.length; j++) {
                  const u = colPins[i];
                  const v = colPins[j];
                  if (adj[u] && adj[v]) {
                    adj[u].push(v);
                    adj[v].push(u);
                  }
                }
              }
            }
            const vccBus = ['V+1', 'V+2', 'V+3', 'V+4'].map(pName => `${c.id}:${pName}`);
            for (let i = 0; i < vccBus.length; i++) {
              for (let j = i + 1; j < vccBus.length; j++) {
                const u = vccBus[i];
                const v = vccBus[j];
                if (adj[u] && adj[v]) {
                  adj[u].push(v);
                  adj[v].push(u);
                }
              }
            }
            const gndBus = ['G1', 'G2', 'G3', 'G4'].map(pName => `${c.id}:${pName}`);
            for (let i = 0; i < gndBus.length; i++) {
              for (let j = i + 1; j < gndBus.length; j++) {
                const u = gndBus[i];
                const v = gndBus[j];
                if (adj[u] && adj[v]) {
                  adj[u].push(v);
                  adj[v].push(u);
                }
              }
            }
          }

          // SPST Switch internal connection when closed
          if (c.type === 'spst' && c.state === 'closed') {
            const u = `${c.id}:L1`;
            const v = `${c.id}:L2`;
            if (adj[u] && adj[v]) {
              adj[u].push(v);
              adj[v].push(u);
            }
          }

          // SPDT Switch internal connection depending on position
          if (c.type === 'spdt') {
            const com = `${c.id}:COM`;
            const targetPin = c.state === 'L2' ? `${c.id}:L2` : `${c.id}:L1`;
            if (adj[com] && adj[targetPin]) {
              adj[com].push(targetPin);
              adj[targetPin].push(com);
            }
          }
        });

        // Resistors
        if (includeResistors) {
          components.forEach(c => {
            if (c.type === 'resistor') {
              const p1 = `${c.id}:P1`;
              const p2 = `${c.id}:P2`;
              if (adj[p1] && adj[p2]) {
                adj[p1].push(p2);
                adj[p2].push(p1);
              }
            }
          });
        }

        const queue: string[] = [pinA];
        const visited = new Set<string>([pinA]);

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (curr === pinB) return true;
          
          adj[curr]?.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          });
        }

        return false;
      };

      // Solve LEDs states
      const leds = components.filter(c => c.type === 'led');
      const nextLedStates: Record<string, 'unpowered' | 'powered' | 'blown'> = {};

      leds.forEach(led => {
        let powered = false;
        let blown = false;
        const anodeKey = `${led.id}:Anode`;
        const cathodeKey = `${led.id}:Cathode`;

        // Check if there is an active VCC source connecting to Anode and GND connecting to Cathode
        activeSources.forEach(srcVcc => {
          if (srcVcc.type === 'vcc' && hasPathBetween(anodeKey, srcVcc.pinName, true)) {
            activeSources.forEach(srcGnd => {
              if (srcGnd.type === 'gnd' && srcGnd.sourceId === srcVcc.sourceId && hasPathBetween(cathodeKey, srcGnd.pinName, true)) {
                powered = true;
                
                // If there is a direct copper path (no resistor) and voltage >= 5.0V, it blows up!
                const hasDirectPath = hasPathBetween(srcVcc.pinName, anodeKey, false);
                if (hasDirectPath && srcVcc.voltage >= 5.0) {
                  blown = true;
                }
              }
            });
          }
        });

        // Retain blown state once triggered during the run
        if (ledPowerStates[led.id] === 'blown' || blown) {
          nextLedStates[led.id] = 'blown';
        } else if (powered) {
          nextLedStates[led.id] = 'powered';
        } else {
          nextLedStates[led.id] = 'unpowered';
        }
      });
      setLedPowerStates(nextLedStates);

      // Solve DC Motors speed
      const motors = components.filter(c => c.type === 'motor');
      const nextMotorStates: Record<string, number> = {};

      motors.forEach(mot => {
        let speed = 0;
        const mpKey = `${mot.id}:M+`;
        const mmKey = `${mot.id}:M-`;

        // Check loops
        activeSources.forEach(srcVcc => {
          if (srcVcc.type === 'vcc') {
            activeSources.forEach(srcGnd => {
              if (srcGnd.type === 'gnd' && srcGnd.sourceId === srcVcc.sourceId) {
                if (hasPathBetween(mpKey, srcVcc.pinName, true) && hasPathBetween(mmKey, srcGnd.pinName, true)) {
                  speed = 255 * (srcVcc.voltage / 12.0 || 1.0); // forward
                } else if (hasPathBetween(mmKey, srcVcc.pinName, true) && hasPathBetween(mpKey, srcGnd.pinName, true)) {
                  speed = -255 * (srcVcc.voltage / 12.0 || 1.0); // reverse
                }
              }
            });
          }
        });
        nextMotorStates[mot.id] = Math.round(speed);
      });
      setMotorPowerStates(nextMotorStates);

      // 3. WELDED 3D KINEMATICS UPDATES
      // If we have motors that are spinning, they drive the custom welded assembly
      // Find left and right motor speeds dynamically
      let speedL = 0;
      let speedR = 0;

      components.forEach(c => {
        if (c.type === 'motor') {
          if (c.x3d < 0) {
            speedL += (nextMotorStates[c.id] || 0) / 255;
          } else {
            speedR += (nextMotorStates[c.id] || 0) / 255;
          }
        }
      });

      const linearSpeed = (speedL + speedR) * 0.8; // m/s
      const angularSpeed = (speedR - speedL) * 1.5; // rad/s

      setRobotHeading(prev => {
        let nextHeading = prev + angularSpeed * dt;
        if (nextHeading > Math.PI) nextHeading -= Math.PI * 2;
        if (nextHeading < -Math.PI) nextHeading += Math.PI * 2;
        return nextHeading;
      });

      setRobotPos(prev => {
        const nextHeading = robotHeading + angularSpeed * dt;
        const dx = linearSpeed * Math.sin(nextHeading) * dt;
        const dz = linearSpeed * Math.cos(nextHeading) * dt;
        
        let nx = prev[0] + dx;
        let nz = prev[2] + dz;

        if (nx > 9) nx = 9;
        if (nx < -9) nx = -9;
        if (nz > 9) nz = 9;
        if (nz < -9) nz = -9;

        // Bounding collider sphere with draggable obstacle
        const distToObstacle = Math.sqrt(
          Math.pow(nx - obstaclePos[0], 2) + 
          Math.pow(nz - obstaclePos[2], 2)
        );

        const minCollisionDist = 0.8;
        if (distToObstacle < minCollisionDist) {
          const angleToObstacle = Math.atan2(nx - obstaclePos[0], nz - obstaclePos[2]);
          nx = obstaclePos[0] + minCollisionDist * Math.sin(angleToObstacle);
          nz = obstaclePos[2] + minCollisionDist * Math.cos(angleToObstacle);
        }

        // Project vector for sonar readings (adjust relative to sensor 3D weld position)
        // For simplicity, we keep chassis-center sonar reading
        const rx = nx;
        const rz = nz;
        const ox = obstaclePos[0];
        const oz = obstaclePos[2];
        const dirX = Math.sin(nextHeading);
        const dirZ = Math.cos(nextHeading);
        const toObstacleX = ox - rx;
        const toObstacleZ = oz - rz;
        const projectedDist = toObstacleX * dirX + toObstacleZ * dirZ;
        const distance2D = Math.sqrt(toObstacleX * toObstacleX + toObstacleZ * toObstacleZ);
        const angleBetween = Math.acos(projectedDist / distance2D);

        let finalSensorDist = 150;
        if (projectedDist > 0 && angleBetween < 0.52) {
          const cmDist = (distance2D - 0.25) * 100;
          if (cmDist > 0 && cmDist < 200) {
            finalSensorDist = Math.max(2, cmDist);
          }
        }
        setSensorDistance(Math.round(finalSensorDist));

        return [nx, prev[1], nz];
      });

      animationFrameRef.current = requestAnimationFrame(simulationTick);
    };

    animationFrameRef.current = requestAnimationFrame(simulationTick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, robotHeading, obstaclePos, lightLevel, components, wires, ledPowerStates]);

  // Save the minimal project layout config to a text JSON file
  const saveProject = () => {
    const projectData = {
      version: '1.0.0',
      timestamp: Date.now(),
      components: components.map(comp => ({
        id: comp.id,
        type: comp.type,
        label: comp.label,
        x: comp.x,
        y: comp.y,
        color: comp.color,
        state: comp.state,
        x3d: comp.x3d,
        y3d: comp.y3d,
        z3d: comp.z3d,
        rx3d: comp.rx3d,
        ry3d: comp.ry3d,
        rz3d: comp.rz3d
      })),
      wires: wires.map(wire => ({
        from: wire.from,
        to: wire.to,
        color: wire.color
      })),
      code,
      selectedTemplate,
      sensorDistance,
      lightLevel,
      robotPos,
      robotHeading,
      obstaclePos
    };

    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `robolab_project_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reconstruct components and wires from minimal serialized project schema
  const loadProjectData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.components || !Array.isArray(data.components)) {
        throw new Error("Invalid project configuration: components list is missing.");
      }

      // Safeguard: Stop the running simulation thread
      stopSimulation();
      setIsLoadingProject(true);
      setLoadingSteps([]);

      const steps = [
        "Decompressing robotic project parameters...",
        "Restoring component entities and models...",
        "Calibrating 3D welder coordinates...",
        "Synthesizing wiring layout and pin configurations...",
        "Loading Arduino firmware compilation...",
        "Syncing workspace controls..."
      ];

      // Simulated timeline calibration delay for high-tech user feedback
      for (let i = 0; i < steps.length; i++) {
        setCurrentLoadingStep(steps[i]);
        setLoadingSteps(prev => [...prev, steps[i]]);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Reconstruct components from templates in INITIAL_COMPONENTS
      const reconstructedComponents: RoboticComponent[] = data.components.map((item: any) => {
        const template = INITIAL_COMPONENTS.find(c => c.type === item.type);
        if (!template) {
          throw new Error(`Unknown component type: ${item.type}`);
        }
        return {
          ...template,
          id: item.id,
          type: item.type,
          label: item.label || template.label,
          x: typeof item.x === 'number' ? item.x : template.x,
          y: typeof item.y === 'number' ? item.y : template.y,
          color: item.color,
          state: item.state || template.state,
          x3d: typeof item.x3d === 'number' ? item.x3d : template.x3d,
          y3d: typeof item.y3d === 'number' ? item.y3d : template.y3d,
          z3d: typeof item.z3d === 'number' ? item.z3d : template.z3d,
          rx3d: typeof item.rx3d === 'number' ? item.rx3d : template.rx3d,
          ry3d: typeof item.ry3d === 'number' ? item.ry3d : template.ry3d,
          rz3d: typeof item.rz3d === 'number' ? item.rz3d : template.rz3d
        };
      });

      // Reconstruct wires
      const reconstructedWires: WireConnection[] = (data.wires || []).map((w: any) => ({
        id: w.id || `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        from: w.from,
        to: w.to,
        color: w.color || activeWireColor
      }));

      // Update simulator context states
      setComponents(reconstructedComponents);
      setWires(reconstructedWires);
      if (typeof data.code === 'string') setCode(data.code);
      if (data.selectedTemplate) setSelectedTemplate(data.selectedTemplate);
      if (typeof data.sensorDistance === 'number') setSensorDistance(data.sensorDistance);
      if (typeof data.lightLevel === 'number') setLightLevel(data.lightLevel);
      if (Array.isArray(data.robotPos) && data.robotPos.length === 3) setRobotPos(data.robotPos);
      if (typeof data.robotHeading === 'number') setRobotHeading(data.robotHeading);
      if (Array.isArray(data.obstaclePos) && data.obstaclePos.length === 3) setObstaclePos(data.obstaclePos);

      setIsLoadingProject(false);
    } catch (err: any) {
      setIsLoadingProject(false);
      setError(`Failed to load project: ${err.message || 'Malformed schema.'}`);
    }
  };

  return (
    <SimulatorContext.Provider
      value={{
        components,
        wires,
        code,
        selectedTemplate,
        isRunning,
        error,
        serialLogs,
        activeWireColor,
        sensorDistance,
        lightLevel,
        ledOn: executionRef.current.pinStates[13] === 1,
        ledPowerStates,
        motorPowerStates,
        selected3DId,
        isLoadingProject,
        loadingSteps,
        currentLoadingStep,
        
        setComponents,
        addComponent,
        deleteComponent,
        addWire,
        deleteWire,
        clearWires,
        setCode,
        loadTemplate,
        setActiveWireColor,
        startSimulation,
        stopSimulation,
        clearSerialLogs,
        setSensorDistance,
        setLightLevel,
        resetRobotPos,
        setObstaclePos,
        updateComponentPosition,
        updateComponentColor,
        update3DPosition,
        setSelected3DId,
        closeErrorModal,
        toggleSwitch,
        saveProject,
        loadProjectData,
        
        robotPos,
        robotHeading,
        obstaclePos
      }}
    >
      {children}
    </SimulatorContext.Provider>
  );
};

export const useSimulator = () => {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within a SimulatorProvider');
  }
  return context;
};
