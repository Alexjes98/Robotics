export interface CompileResult {
  success: boolean;
  error?: string;
  setup?: () => Generator<any, void, any>;
  loop?: () => Generator<any, void, any>;
}

export function compileArduinoCode(code: string, getSensorState: (type: 'analog' | 'digital', pin: number) => number): CompileResult {
  try {
    // 1. Basic Syntax Check (Braces & Parentheses Balance)
    const braceStack: number[] = [];
    const parenStack: number[] = [];
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char === '{') braceStack.push(i);
      else if (char === '}') {
        if (braceStack.length === 0) {
          return { success: false, error: `Compilation Error: Unmatched closing brace '}' at position ${i}.` };
        }
        braceStack.pop();
      }
      else if (char === '(') parenStack.push(i);
      else if (char === ')') {
        if (parenStack.length === 0) {
          return { success: false, error: `Compilation Error: Unmatched closing parenthesis ')' at position ${i}.` };
        }
        parenStack.pop();
      }
    }

    if (braceStack.length > 0) {
      return { success: false, error: "Compilation Error: Unmatched opening brace '{'. Check your code structure." };
    }
    if (parenStack.length > 0) {
      return { success: false, error: "Compilation Error: Unmatched opening parenthesis '('. Check your code structure." };
    }

    // 2. Validate setup() and loop() existence
    if (!code.includes('setup') || !code.includes('loop')) {
      return { 
        success: false, 
        error: "Compilation Error: Code must define void setup() and void loop() functions." 
      };
    }

    // 3. Transpilation
    let jsCode = code;

    // Remove comments to prevent parsing issues
    jsCode = jsCode.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');

    // Collect all user-defined custom functions
    const customFunctions = new Set<string>();
    const funcDeclRegex = /\b(?:void|int|float|double|bool|long|unsigned\s+long|char|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
    let match: RegExpExecArray | null;
    while ((match = funcDeclRegex.exec(jsCode)) !== null) {
      const fnName = match[1];
      if (!['setup', 'loop', 'if', 'while', 'for', 'switch'].includes(fnName)) {
        customFunctions.add(fnName);
      }
    }

    // Replace function definitions with generator definitions
    // e.g. void setup() -> function* setup()
    jsCode = jsCode.replace(/\bvoid\s+setup\s*\(\s*\)/g, 'function* setup()');
    jsCode = jsCode.replace(/\bvoid\s+loop\s*\(\s*\)/g, 'function* loop()');

    // For custom functions, turn them into generator functions too, stripping parameter types
    jsCode = jsCode.replace(/\b(?:void|int|float|double|bool|long|unsigned\s+long|char|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*\{/g, (m, name, args) => {
      if (name === 'setup' || name === 'loop' || name === 'if' || name === 'while' || name === 'for' || name === 'switch') {
        return m;
      }
      // Strip types from parameters: e.g. "int speed, bool rev" -> "speed, rev"
      const cleanArgs = args.replace(/\b(?:int|float|double|bool|long|unsigned\s+long|char|String)\s+/g, '');
      return `function* ${name}(${cleanArgs}) {`;
    });

    // Replace function calls to custom functions with yield* so generators execute properly and pass returns
    customFunctions.forEach(fnName => {
      // Matches calls: fnName(...) that are not definitions or already yielded
      const callRegex = new RegExp(`(?<!function\\*\\s*)(?<!yield\\*\\s*)\\b${fnName}\\s*\\(`, 'g');
      jsCode = jsCode.replace(callRegex, `yield* ${fnName}(`);
    });

    // Replace variable declarations: int x = 5; -> let x = 5;
    // We match: int/float/double/bool/String, followed by letters/digits/comma/semicolon/equals, avoiding keywords.
    // Handles multi-line declarations or single line.
    jsCode = jsCode.replace(/\b(int|float|double|bool|long|unsigned\s+long|char|String)\s+([a-zA-Z_][a-zA-Z0-9_]*\s*(=|;|,))/g, 'let $2');
    // Replace standalone type declarations like `int i;` or `float temp;`
    jsCode = jsCode.replace(/\b(int|float|double|bool|long|unsigned\s+long|char|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/g, 'let $2;');

    // Replace constants
    // HIGH / LOW
    jsCode = jsCode.replace(/\bHIGH\b/g, '1');
    jsCode = jsCode.replace(/\bLOW\b/g, '0');
    jsCode = jsCode.replace(/\bINPUT\b/g, '"INPUT"');
    jsCode = jsCode.replace(/\bOUTPUT\b/g, '"OUTPUT"');
    jsCode = jsCode.replace(/\bINPUT_PULLUP\b/g, '"INPUT_PULLUP"');

    // Replace Arduino specific pin names (A0-A5)
    jsCode = jsCode.replace(/\bA0\b/g, '14');
    jsCode = jsCode.replace(/\bA1\b/g, '15');
    jsCode = jsCode.replace(/\bA2\b/g, '16');
    jsCode = jsCode.replace(/\bA3\b/g, '17');
    jsCode = jsCode.replace(/\bA4\b/g, '18');
    jsCode = jsCode.replace(/\bA5\b/g, '19');

    // Replace delay(ms) -> yield { type: 'delay', ms: ms }
    jsCode = jsCode.replace(/\bdelay\s*\(\s*([^)]+)\s*\)/g, 'yield { type: "delay", ms: ($1) }');

    // Replace digitalWrite(pin, val) -> yield { type: 'digitalWrite', pin, val }
    jsCode = jsCode.replace(/\bdigitalWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'yield { type: "digitalWrite", pin: ($1), val: ($2) }');

    // Replace analogWrite(pin, val) -> yield { type: 'analogWrite', pin, val }
    jsCode = jsCode.replace(/\banalogWrite\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'yield { type: "analogWrite", pin: ($1), val: ($2) }');

    // Replace pinMode(pin, mode) -> yield { type: 'pinMode', pin, mode }
    jsCode = jsCode.replace(/\bpinMode\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'yield { type: "pinMode", pin: ($1), mode: ($2) }');

    // Replace digitalRead(pin) -> yield { type: 'digitalRead', pin }
    jsCode = jsCode.replace(/\bdigitalRead\s*\(\s*([^)]+)\s*\)/g, '(yield { type: "digitalRead", pin: ($1) })');

    // Replace analogRead(pin) -> yield { type: 'analogRead', pin }
    jsCode = jsCode.replace(/\banalogRead\s*\(\s*([^)]+)\s*\)/g, '(yield { type: "analogRead", pin: ($1) })');

    // Replace pulseIn(pin, val) -> yield { type: 'pulseIn', pin, val }
    jsCode = jsCode.replace(/\bpulseIn\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, '(yield { type: "pulseIn", pin: ($1), val: ($2) })');

    // Replace Serial.println(msg) -> yield { type: 'serial', val: msg, ln: true }
    jsCode = jsCode.replace(/\bSerial\.println\s*\(\s*([^)]*)\s*\)/g, 'yield { type: "serial", val: ($1), ln: true }');
    jsCode = jsCode.replace(/\bSerial\.print\s*\(\s*([^)]*)\s*\)/g, 'yield { type: "serial", val: ($1), ln: false }');
    jsCode = jsCode.replace(/\bSerial\.begin\s*\(\s*([^)]*)\s*\)/g, '// Serial initialized');

    // 4. Sandbox Creation and Verification
    // We construct a function that will instantiate our generator setup and loop.
    // We pass support helper functions into the sandbox.
    const sandboxBuilder = new Function(
      'getSensorState',
      `
      const HIGH = 1;
      const LOW = 0;
      const INPUT = "INPUT";
      const OUTPUT = "OUTPUT";
      const INPUT_PULLUP = "INPUT_PULLUP";
      
      const A0 = 14, A1 = 15, A2 = 16, A3 = 17, A4 = 18, A5 = 19;

      const millis = () => Date.now();
      const micros = () => Date.now() * 1000;
      const constrain = (amt, low, high) => ((amt)<(low)?(low):((amt)>(high)?(high):(amt)));
      const map = (x, in_min, in_max, out_min, out_max) => (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
      const min = Math.min;
      const max = Math.max;
      const abs = Math.abs;
      const sq = (x) => x * x;
      const sqrt = Math.sqrt;
      const random = (min, max) => max === undefined ? Math.floor(Math.random() * min) : Math.floor(Math.random() * (max - min)) + min;
      
      ${jsCode}
      
      return { setup, loop };
      `
    );

    const compiled = sandboxBuilder(getSensorState);

    if (typeof compiled.setup !== 'function') {
      return { success: false, error: "Compilation Error: setup() is not defined or invalid." };
    }
    if (typeof compiled.loop !== 'function') {
      return { success: false, error: "Compilation Error: loop() is not defined or invalid." };
    }

    return {
      success: true,
      setup: compiled.setup,
      loop: compiled.loop
    };

  } catch (err: any) {
    return {
      success: false,
      error: `Compilation Error: ${err.message || 'Unknown syntax error.'}`
    };
  }
}
